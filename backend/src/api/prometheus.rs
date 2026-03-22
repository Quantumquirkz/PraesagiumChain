//! Prometheus text exposition at `GET /metrics` (OpenMetrics-style labels-free gauges).
//! JSON observability remains at `GET /api/metrics`.

use axum::{
    extract::State,
    http::{header::CONTENT_TYPE, HeaderMap, HeaderValue},
    response::IntoResponse,
};
use std::sync::Arc;

use crate::state::AppState;

pub async fn metrics_prometheus(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let now = chrono::Utc::now().timestamp();
    let uptime = (now - state.started_at).max(0) as u64;
    let db_ok = sqlx::query("SELECT 1")
        .execute(state.db.pool())
        .await
        .is_ok();
    let cache_stats = state.cache.stats().await;

    let mut body = String::new();
    body.push_str("# HELP praesagium_uptime_seconds Uptime in seconds since process start.\n");
    body.push_str("# TYPE praesagium_uptime_seconds gauge\n");
    body.push_str(&format!("praesagium_uptime_seconds {}\n", uptime));
    body.push_str("# HELP praesagium_db_up 1 if PostgreSQL is reachable.\n");
    body.push_str("# TYPE praesagium_db_up gauge\n");
    body.push_str(&format!("praesagium_db_up {}\n", if db_ok { 1 } else { 0 }));
    body.push_str("# HELP praesagium_predictions_cached Cached prediction entries.\n");
    body.push_str("# TYPE praesagium_predictions_cached gauge\n");
    body.push_str(&format!(
        "praesagium_predictions_cached {}\n",
        cache_stats.cached_predictions
    ));

    let mut headers = HeaderMap::new();
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_static("text/plain; version=0.0.4; charset=utf-8"),
    );
    (headers, body)
}
