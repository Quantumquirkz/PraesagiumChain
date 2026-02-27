use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use std::sync::Arc;

use crate::error::Result;
use crate::services::CreatorReputation;
use crate::state::AppState;

pub async fn get_reputation(
    State(state): State<Arc<AppState>>,
    Path(address): Path<String>,
) -> Result<Json<CreatorReputation>> {
    let rep = state.reputation_service.get_reputation(&address).await?;
    Ok(Json(rep))
}

#[derive(Deserialize)]
pub struct ListReputationQuery {
    limit: Option<i64>,
    offset: Option<i64>,
}

/// GET /api/reputation?limit=20&offset=0
/// Returns creators ordered by reputation_score descending (leaderboard).
pub async fn list_reputation(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListReputationQuery>,
) -> Result<Json<Vec<CreatorReputation>>> {
    let limit = params.limit.unwrap_or(20).min(100).max(1);
    let offset = params.offset.unwrap_or(0).max(0);
    let rows = state.reputation_service.list(limit, offset).await?;
    Ok(Json(rows))
}
