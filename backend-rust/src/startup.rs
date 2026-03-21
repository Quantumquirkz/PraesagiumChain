//! Application bootstrap: wires all services, middleware, and the router into a runnable app.
//!
//! When RUN_INDEXER_ONLY=1, use `run_indexer_only` to run only the event indexer (no API).

use axum::Router;
use axum::extract::DefaultBodyLimit;
use std::sync::Arc;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tracing::info;

use crate::config::Config;
use crate::db::Database;
use crate::middleware;
use crate::router::build_router;
use crate::clickhouse::ClickHouseClient;
use crate::services::{
    AiService, Cache, ChainlinkFeedsService, EventBus, GeminiProvider, HuggingFaceProvider,
    HybridPredictor, IndexerState, MarketService, MockAiProvider, PredictionService, ReputationService,
    SourcesRegistry,
};
use crate::state::AppState;

/// Runs only the on-chain event indexer (no HTTP API). Use when RUN_INDEXER_ONLY=1.
/// Requires RPC_URL and PREDICTION_MARKET_ADDRESS. Runs until process receives SIGTERM/Ctrl+C.
pub async fn run_indexer_only(config: Config, db: Database) -> anyhow::Result<()> {
    let (rpc_url, contract_addr) = match (&config.rpc_url, &config.prediction_market_address) {
        (Some(u), Some(a)) if !u.is_empty() && !a.trim().is_empty() => (u.clone(), a.trim().to_string()),
        _ => {
            return Err(anyhow::anyhow!(
                "RUN_INDEXER_ONLY requires RPC_URL and PREDICTION_MARKET_ADDRESS to be set"
            ));
        }
    };
    let contract_address: ethers::types::Address = contract_addr
        .parse()
        .map_err(|_| anyhow::anyhow!("PREDICTION_MARKET_ADDRESS is not a valid Ethereum address (0x + 40 hex)"))?;

    let market_service = Arc::new(MarketService::new(db.clone()));
    let reputation_service = Arc::new(ReputationService::new(db.clone()));
    let start_block = config.start_block;
    let shared_state = IndexerState::new(start_block.unwrap_or(0));
    let event_bus = EventBus::new();

    info!("Starting indexer-only mode (no API). Contract: {:?}", contract_address);
    let mut indexer = crate::services::indexer::EventIndexer::new_with_state(
        &rpc_url,
        contract_address,
        market_service,
        reputation_service,
        start_block,
        shared_state,
        event_bus,
    )
    .await?;
    indexer.start().await?;
    Ok(())
}

/// Builds the full Axum application with all layers and routes.
pub async fn build_app(config: Config, db: Database) -> anyhow::Result<Router> {
    if config.is_production() && config.jwt_secret.as_deref().is_none_or(|s| s.trim().is_empty()) {
        return Err(anyhow::anyhow!(
            "JWT_SECRET must be set in production (ENVIRONMENT=production). Use a strong random secret."
        ));
    }

    let started_at = chrono::Utc::now().timestamp();
    let cache = Arc::new(Cache::new());
    let event_bus = EventBus::new();

    let market_service = Arc::new(MarketService::new(db.clone()));
    let prediction_service = Arc::new(PredictionService::new(
        db.clone(),
        cache.clone(),
        config.prediction_cache_ttl,
    ));
    let reputation_service = Arc::new(ReputationService::new(db.clone()));

    let ai_provider: Arc<dyn crate::services::ai::AiProvider> = match config.ai_provider.as_str() {
        "gemini" => {
            if let Some(key) = config.gemini_api_key.clone() {
                let model = config
                    .gemini_model
                    .clone()
                    .unwrap_or_else(|| "gemini-2.0-flash".to_string());
                Arc::new(GeminiProvider::new(key, model))
            } else {
                Arc::new(MockAiProvider)
            }
        }
        "huggingface" => {
            if let (Some(key), Some(model)) =
                (config.hf_api_key.clone(), config.hf_model.clone())
            {
                Arc::new(HuggingFaceProvider::new(key, model))
            } else {
                Arc::new(MockAiProvider)
            }
        }
        _ => Arc::new(MockAiProvider),
    };
    let ai_service = Arc::new(AiService::new(ai_provider));
    let hybrid_predictor = Arc::new(HybridPredictor::new(ai_service.clone()));

    let http_client = Arc::new(
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("reqwest client"),
    );

    let sources_registry = Arc::new(SourcesRegistry::new(
        (*http_client).clone(),
        config.finnhub_api_key.clone(),
    ));

    let indexer_state: Option<Arc<IndexerState>> =
        try_spawn_indexer_background(&config, &market_service, &reputation_service, &event_bus)?;

    spawn_cache_cleanup_task(cache.clone());

    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(config.rate_limit_per_second)
            .burst_size(config.rate_limit_burst)
            .finish()
            .expect("invalid rate limit config"),
    );

    let cors = cors_layer(&config);
    let redis_url = config.redis_url.clone();
    let rpc_url = config.rpc_url.clone();
    let eth_feed = config.chainlink_eth_usd_feed.clone();
    let btc_feed = config.chainlink_btc_usd_feed.clone();
    let config_arc = Arc::new(config);

    let nonce_store = crate::api::auth::new_nonce_store(redis_url.as_deref())
        .map_err(|e| anyhow::anyhow!("Nonce store: {}", e))?;
    let chainlink_feeds = ChainlinkFeedsService::from_config(
        rpc_url.as_deref(),
        eth_feed.as_deref(),
        btc_feed.as_deref(),
    )
    .map_err(|e| anyhow::anyhow!("Chainlink feeds: {}", e))?
    .map(Arc::new);

    let clickhouse = config_arc
        .clickhouse_url
        .as_deref()
        .and_then(crate::clickhouse::ClickHouseClient::new)
        .map(Arc::new);

    if let Some(ref ch) = clickhouse {
        spawn_clickhouse_event_sink(ch.clone(), event_bus.clone());
        info!("ClickHouse analytics enabled");
    }

    let state = Arc::new(AppState {
        market_service,
        prediction_service,
        reputation_service,
        ai_service,
        hybrid_predictor,
        sources_registry,
        cache,
        http_client,
        config: config_arc,
        db,
        event_bus,
        indexer_state,
        started_at,
        nonce_store,
        chainlink_feeds,
    });

    /// Max request body size: 2 MB. Larger bodies get 413. See docs/audit.md.
    const BODY_LIMIT_BYTES: usize = 2 * 1024 * 1024;

    let router = build_router(state)
        .layer(DefaultBodyLimit::max(BODY_LIMIT_BYTES))
        .layer(middleware::tracing::TracingLayer)
        .layer(middleware::request_id::RequestIdLayer)
        .layer(GovernorLayer { config: governor_conf })
        .layer(cors);

    info!("Application built successfully");
    Ok(router)
}

/// Starts the on-chain indexer in a background task when RPC and contract are set.
fn try_spawn_indexer_background(
    config: &Config,
    market_service: &Arc<MarketService>,
    reputation_service: &Arc<ReputationService>,
    event_bus: &EventBus,
) -> anyhow::Result<Option<Arc<IndexerState>>> {
    let (Some(rpc_url), Some(contract_addr)) = (&config.rpc_url, &config.prediction_market_address) else {
        return Ok(None);
    };
    if rpc_url.is_empty() || contract_addr.trim().is_empty() {
        return Ok(None);
    }
    let contract_address: ethers::types::Address = contract_addr
        .trim()
        .parse()
        .map_err(|_| {
            anyhow::anyhow!("PREDICTION_MARKET_ADDRESS is not a valid Ethereum address (0x + 40 hex)")
        })?;
    let rpc_url = rpc_url.clone();
    let market_svc = market_service.clone();
    let rep_svc = reputation_service.clone();
    let start_block = config.start_block;
    let shared_state = IndexerState::new(start_block.unwrap_or(0));
    let shared_state_clone = shared_state.clone();
    let bus_clone = event_bus.clone();

    tokio::spawn(async move {
        if let Ok(mut indexer) = crate::services::indexer::EventIndexer::new_with_state(
            &rpc_url,
            contract_address,
            market_svc,
            rep_svc,
            start_block,
            shared_state_clone,
            bus_clone,
        )
        .await
        {
            if let Err(e) = indexer.start().await {
                tracing::error!("Indexer error: {}", e);
            }
        }
    });

    Ok(Some(shared_state))
}

fn spawn_cache_cleanup_task(cache: Arc<Cache>) {
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
            cache.cleanup_expired().await;
        }
    });
}

fn spawn_clickhouse_event_sink(ch: Arc<ClickHouseClient>, event_bus: EventBus) {
    let mut subscriber = event_bus.subscribe();
    tokio::spawn(async move {
        loop {
            match subscriber.recv().await {
                Ok(event) => ch.insert_market_event(&event),
                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                    tracing::debug!("ClickHouse event subscriber lagged by {} events", n);
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            }
        }
    });
}

fn cors_layer(config: &Config) -> CorsLayer {
    match &config.cors_origins {
        Some(origins) if !origins.is_empty() => {
            let headers: Vec<_> = origins
                .iter()
                .filter_map(|s| axum::http::header::HeaderValue::try_from(s.as_str()).ok())
                .collect();
            if headers.is_empty() {
                CorsLayer::permissive()
            } else {
                CorsLayer::new().allow_origin(AllowOrigin::list(headers))
            }
        }
        _ => CorsLayer::permissive(),
    }
}
