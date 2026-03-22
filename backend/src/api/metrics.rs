//! Metrics endpoint for production observability.
//!
//! GET /api/metrics
//! Returns cache stats, market counts, indexer state, and server uptime.

use axum::{extract::State, Json};
use std::sync::Arc;

use crate::error::Result;
use crate::services::indexer_state::IndexerSnapshot;
use crate::state::AppState;

#[derive(serde::Serialize)]
pub struct MetricsResponse {
    pub cache: CacheMetrics,
    pub markets: MarketMetrics,
    /// Indexer metrics. `null` when the indexer is not configured.
    pub indexer: Option<IndexerSnapshot>,
    /// Seconds since the server started.
    pub uptime_seconds: u64,
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
    State(state): State<Arc<AppState>>,
) -> Result<Json<MetricsResponse>> {
    let cache_stats = state.cache.stats().await;
    let market_stats = state.market_service.get_stats().await?;

    let indexer = state
        .indexer_state
        .as_ref()
        .map(|s| s.snapshot());

    let now = chrono::Utc::now().timestamp();
    let uptime_seconds = (now - state.started_at).max(0) as u64;

    Ok(Json(MetricsResponse {
        cache: CacheMetrics {
            cached_predictions: cache_stats.cached_predictions,
        },
        markets: MarketMetrics {
            total: market_stats.total_markets,
            open: market_stats.open_markets,
            resolved: market_stats.resolved_markets,
        },
        indexer,
        uptime_seconds,
    }))
}
