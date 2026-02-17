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
use crate::services::{Cache, MarketService, PredictionService};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("praesagium_backend=debug,tower_http=debug")
        .init();

    dotenv::dotenv().ok();
    let config = Config::from_env()?;
    let db = Database::new(&config.database_url).await?;
    db.migrate().await?;

    let cache = Arc::new(Cache::new());

    let db_clone = db.clone();
    let market_service = Arc::new(MarketService::new(db));
    let prediction_service = Arc::new(PredictionService::new(db_clone, cache.clone()));

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
        .route("/api/markets/stats", get(api::markets::stats))
        .route("/api/markets/:id", get(api::markets::get_by_id))
        .route("/api/markets/:id/status", patch(api::markets::update_status))
        .route("/api/markets/:id/prediction", post(api::markets::set_prediction))
        .route("/api/markets/:id/predictions", get(api::markets::get_predictions))
        .route("/api/predict", post(api::predictions::run_predict))
        .route("/api/metrics", get(api::metrics::get_metrics))
        .layer(Extension(market_service))
        .layer(Extension(prediction_service))
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
