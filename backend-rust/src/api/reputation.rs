use axum::extract::{Path, State};
use axum::Json;
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
