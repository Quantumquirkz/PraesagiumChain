//! Admin endpoints for development (e.g. reset markets). Only enabled when ENVIRONMENT != production.

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use std::sync::Arc;

use crate::state::AppState;

/// DELETE /api/admin/clear-markets — removes all markets and related data.
/// Only allowed when ENVIRONMENT is not "production".
pub async fn clear_markets(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let is_prod = state
        .config
        .environment
        .as_deref()
        .map(|e| e.eq_ignore_ascii_case("production"))
        .unwrap_or(false);

    if is_prod {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "clear-markets is disabled in production" })),
        );
    }

    match state.market_service.delete_all().await {
        Ok(n) => (
            StatusCode::OK,
            Json(serde_json::json!({ "deleted": n, "message": "All markets cleared" })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}
