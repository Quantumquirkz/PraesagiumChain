//! Application bootstrap: wires all services, middleware, and the router into a runnable app.

use axum::Router;
use std::sync::Arc;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tracing::info;

use crate::config::Config;
use crate::db::Database;
use crate::middleware;
use crate::router::build_router;
use crate::services::{
    AiService, Cache, GeminiProvider, HuggingFaceProvider, HybridPredictor, MarketService,
    MockAiProvider, PredictionService, ReputationService, SourcesRegistry,
};
use crate::state::AppState;

/// Builds the full Axum application with all layers and routes.
pub async fn build_app(config: Config, db: Database) -> anyhow::Result<Router> {
    let cache = Arc::new(Cache::new());

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
    let hybrid_predictor = Arc::new(HybridPredictor::new(ai_service.clone(), cache.clone()));

    let http_client = Arc::new(
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("reqwest client"),
    );

    let sources_registry = Arc::new(SourcesRegistry::new(
        (*http_client).clone(),
        config.finnhub_api_key.clone(),
        config.newsapi_key.clone(),
    ));

    // Spawn event indexer if RPC and contract address are configured
    if let (Some(rpc_url), Some(contract_addr)) =
        (&config.rpc_url, &config.prediction_market_address)
    {
        if !rpc_url.is_empty() && !contract_addr.trim().is_empty() {
            let rpc_url = rpc_url.clone();
            let contract_address: ethers::types::Address = contract_addr
                .trim()
                .parse()
                .map_err(|_| {
                    anyhow::anyhow!(
                        "PREDICTION_MARKET_ADDRESS is not a valid Ethereum address (0x + 40 hex)"
                    )
                })?;
            let market_svc = market_service.clone();
            let rep_svc = reputation_service.clone();
            let start_block = config.start_block;

            tokio::spawn(async move {
                if let Ok(mut indexer) = crate::services::indexer::EventIndexer::new(
                    &rpc_url,
                    contract_address,
                    market_svc,
                    rep_svc,
                    start_block,
                )
                .await
                {
                    if let Err(e) = indexer.start().await {
                        tracing::error!("Indexer error: {}", e);
                    }
                }
            });
        }
    }

    // Periodic cache cleanup
    let cache_cleanup = cache.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
            cache_cleanup.cleanup_expired().await;
        }
    });

    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(config.rate_limit_per_second)
            .burst_size(config.rate_limit_burst)
            .finish()
            .expect("invalid rate limit config"),
    );

    let cors = cors_layer(&config);
    let config_arc = Arc::new(config);

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
    });

    let router = build_router(state)
        .layer(middleware::tracing::TracingLayer)
        .layer(middleware::request_id::RequestIdLayer)
        .layer(GovernorLayer { config: governor_conf })
        .layer(cors);

    info!("Application built successfully");
    Ok(router)
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
