//! GET /api/markets/:id/resolutions — audit trail for CRE resolutions.

use axum::{
    extract::{Path, State},
    Json,
};
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::models::MarketResolution;
use crate::state::AppState;

pub async fn list_resolutions(
    State(state): State<Arc<AppState>>,
    Path(market_id): Path<i64>,
) -> Result<Json<Vec<MarketResolution>>> {
    let rows: Vec<MarketResolution> = sqlx::query_as::<_, MarketResolution>(
        "SELECT id, market_id, resolution_type, outcome, confidence, source, raw_value, resolved_at \
         FROM market_resolutions WHERE market_id = $1 ORDER BY resolved_at DESC LIMIT 100",
    )
    .bind(market_id)
    .fetch_all(state.db.pool())
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("list_resolutions: {}", e)))?;

    Ok(Json(rows))
}
