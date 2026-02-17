//! Metrics endpoint for observability.

use axum::{extract::Extension, Json};
use std::sync::Arc;

use crate::error::Result;
use crate::services::{Cache, MarketService};

#[derive(serde::Serialize)]
pub struct MetricsResponse {
    pub cache: CacheMetrics,
    pub markets: MarketMetrics,
}

#[derive(serde::Serialize)]
pub struct CacheMetrics {
    pub cached_predictions: usize,
}

#[derive(serde::Serialize)]
pub struct MarketMetrics {
    pub total: i64,
    pub open: i64,
    pub resolved: i64,
}

pub async fn get_metrics(
    Extension(cache): Extension<Arc<Cache>>,
    Extension(market_service): Extension<Arc<MarketService>>,
) -> Result<Json<MetricsResponse>> {
    let cache_stats = cache.stats().await;
    let market_stats = market_service.get_stats().await?;

    Ok(Json(MetricsResponse {
        cache: CacheMetrics {
            cached_predictions: cache_stats.cached_predictions,
        },
        markets: MarketMetrics {
            total: market_stats.total_markets,
            open: market_stats.open_markets,
            resolved: market_stats.resolved_markets,
        },
    }))
}
