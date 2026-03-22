//! Admin endpoints for development (e.g. reset markets). Disabled in production.
//! Non-production: requires `ADMIN_API_KEY` and matching `X-Admin-Token` header.

use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use std::sync::Arc;

use crate::config::Config;
use crate::state::AppState;

/// Constant-time equality for API key comparison.
fn secure_token_eq(a: &str, b: &str) -> bool {
    let ab = a.as_bytes();
    let bb = b.as_bytes();
    if ab.len() != bb.len() {
        return false;
    }
    ab.iter()
        .zip(bb.iter())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

/// Returns `Err` with HTTP response when admin delete is not allowed or token is wrong.
fn require_admin_delete(config: &Config, headers: &HeaderMap) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    if config.is_production() {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "admin delete endpoints are disabled in production" })),
        ));
    }

    let Some(expected) = config
        .admin_api_key
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    else {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Set ADMIN_API_KEY in the environment to use DELETE /api/admin/* (send matching X-Admin-Token header)"
            })),
        ));
    };

    let provided = headers
        .get("x-admin-token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !secure_token_eq(provided, expected) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid or missing X-Admin-Token" })),
        ));
    }

    Ok(())
}

/// DELETE /api/admin/markets/:id — removes a single market and its related data.
pub async fn delete_market(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    if let Err(resp) = require_admin_delete(&state.config, &headers) {
        return resp.into_response();
    }

    match state.market_service.delete_by_id(id).await {
        Ok(n) => (
            StatusCode::OK,
            Json(serde_json::json!({ "deleted": n, "message": if n > 0 { "Market deleted" } else { "Market not found" } })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

/// DELETE /api/admin/clear-markets — removes all markets and related data.
pub async fn clear_markets(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if let Err(resp) = require_admin_delete(&state.config, &headers) {
        return resp.into_response();
    }

    match state.market_service.delete_all().await {
        Ok(n) => (
            StatusCode::OK,
            Json(serde_json::json!({ "deleted": n, "message": "All markets cleared" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}
