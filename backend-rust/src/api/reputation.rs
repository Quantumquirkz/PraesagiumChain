use axum::extract::{Extension, Path};
use axum::Json;
use std::sync::Arc;

use crate::error::Result;
use crate::services::{CreatorReputation, ReputationService};

pub async fn get_reputation(
    Path(address): Path<String>,
    Extension(service): Extension<Arc<ReputationService>>,
) -> Result<Json<CreatorReputation>> {
    let rep = service.get_reputation(&address).await?;
    Ok(Json(rep))
}
