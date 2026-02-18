mod api;
mod config;
mod db;
mod error;
mod models;
mod services;

#[cfg(test)]
mod tests;

use axum::{
    extract::Extension,
    routing::{get, post, patch},
    Router,
};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;

use crate::config::Config;
use crate::db::Database;
use crate::services::{AiService, Cache, GeminiProvider, HuggingFaceProvider, HybridPredictor, MarketService, MockAiProvider, PredictionService, ReputationService};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("praesagium_backend=debug,tower_http=debug")
        .init();

    // Load .env from project root (backend-rust parent = root)
    let root_env = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join(".env");
    dotenv::from_path(&root_env).ok();
    dotenv::dotenv().ok();
    let config = Config::from_env()?;
    let db = Database::new(&config.database_url).await?;
    db.migrate().await?;

    let cache = Arc::new(Cache::new());

    let db_clone = db.clone();
    let db_rep = db.clone();
    let market_service = Arc::new(MarketService::new(db));
    let prediction_service = Arc::new(PredictionService::new(db_clone, cache.clone()));
    let reputation_service = Arc::new(ReputationService::new(db_rep));

    let ai_provider: Arc<dyn crate::services::ai::AiProvider> = match config.ai_provider.as_str() {
        "gemini" => {
            if let Some(key) = config.gemini_api_key.clone() {
                let model = config.gemini_model.clone().unwrap_or_else(|| "gemini-1.5-flash".to_string());
                Arc::new(GeminiProvider::new(key, model))
            } else {
                Arc::new(MockAiProvider)
            }
        }
        "huggingface" => {
            if let (Some(key), Some(model)) = (config.hf_api_key.clone(), config.hf_model.clone()) {
                Arc::new(HuggingFaceProvider::new(key, model))
            } else {
                Arc::new(MockAiProvider)
            }
        }
        _ => Arc::new(MockAiProvider),
    };
    let ai_service = Arc::new(AiService::new(ai_provider));
    let hybrid_predictor = Arc::new(HybridPredictor::new(ai_service.clone(), cache.clone()));

    if let (Some(rpc_url), Some(contract_addr)) = (&config.rpc_url, &config.prediction_market_address) {
        let contract_address: ethers::types::Address = contract_addr.parse()?;
        let market_service_clone = market_service.clone();
        
        tokio::spawn(async move {
            if let Ok(mut indexer) = crate::services::indexer::EventIndexer::new(
                rpc_url,
                contract_address,
                market_service_clone,
                config.start_block,
            )
            .await
            {
                if let Err(e) = indexer.start().await {
                    tracing::error!("Indexer error: {}", e);
                }
            }
        });
    }

    tokio::spawn(async move {
        let cache_clone = cache.clone();
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
            cache_clone.cleanup_expired().await;
        }
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/markets", get(api::markets::list).post(api::markets::create))
        .route("/api/markets/conditional", post(api::markets::create_conditional))
        .route("/api/markets/stats", get(api::markets::stats))
        .route("/api/markets/:id", get(api::markets::get_by_id))
        .route("/api/markets/:id/status", patch(api::markets::update_status))
        .route("/api/markets/:id/prediction", post(api::markets::set_prediction))
        .route("/api/markets/:id/predictions", get(api::markets::get_predictions))
        .route("/api/markets/:id/ai/predict", post(api::ai::market_ai_predict))
        .route("/api/predict", post(api::predictions::run_predict))
        .route("/api/predict/hybrid", post(api::hybrid::hybrid_predict))
        .route("/api/ai/sentiment", post(api::ai::sentiment))
        .route("/api/weather/rained", get(api::report::weather_rained))
        .route("/api/price/above", get(api::report::price_above))
        .route("/api/sports/winner", get(api::report::sports_winner))
        .route("/api/reputation/:address", get(api::reputation::get_reputation))
        .route("/api/metrics", get(api::metrics::get_metrics))
        .layer(Extension(market_service))
        .layer(Extension(prediction_service))
        .layer(Extension(ai_service))
        .layer(Extension(hybrid_predictor))
        .layer(Extension(reputation_service))
        .layer(Extension(cache))
        .layer(CorsLayer::permissive());

    let addr = format!("0.0.0.0:{}", config.port);
    info!("Backend listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "praesagiumchain-backend",
        "language": "rust"
    }))
}
