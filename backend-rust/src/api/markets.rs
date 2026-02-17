use axum::{
    extract::{Path, Query, Extension},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing::info;

use crate::error::{AppError, Result};
use crate::models::{
    CreateMarketRequest, MarketView, PaginatedResponse, SetPredictionRequest, UpdateStatusRequest,
    MarketStats,
};
use crate::services::MarketService;

#[derive(Deserialize)]
pub struct ListQuery {
    page: Option<i64>,
    limit: Option<i64>,
    status: Option<String>,
}

pub async fn list(
    Query(params): Query<ListQuery>,
    Extension(service): Extension<Arc<MarketService>>,
) -> Result<Json<PaginatedResponse<MarketView>>> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100).max(1);
    let status = params.status.as_deref();

    let result = service.list(page, limit, status).await?;
    Ok(Json(result))
}

pub async fn get_by_id(
    Path(id): Path<i64>,
    Extension(service): Extension<Arc<MarketService>>,
) -> Result<Json<MarketView>> {
    let market = service.get_by_id(id).await?;
    Ok(Json(market))
}

pub async fn create(
    Extension(service): Extension<Arc<MarketService>>,
    Json(req): Json<CreateMarketRequest>,
) -> Result<impl IntoResponse> {
    let market = service.create(req).await?;
    Ok((StatusCode::CREATED, Json(market)))
}

pub async fn update_status(
    Path(id): Path<i64>,
    Extension(service): Extension<Arc<MarketService>>,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<Json<MarketView>> {
    let market = service.update_status(id, req).await?;
    Ok(Json(market))
}

pub async fn set_prediction(
    Path(id): Path<i64>,
    Extension(service): Extension<Arc<MarketService>>,
    Json(req): Json<SetPredictionRequest>,
) -> Result<Json<MarketView>> {
    let market = service
        .set_prediction(
            id,
            req.probability,
            req.uncertainty,
            req.model_version,
            req.model_hash,
        )
        .await?;
    Ok(Json(market))
}

pub async fn get_predictions(
    Path(id): Path<i64>,
    Query(params): Query<std::collections::HashMap<String, i64>>,
    Extension(service): Extension<Arc<MarketService>>,
) -> Result<Json<Vec<crate::models::PredictionView>>> {
    let limit = params.get("limit").copied().unwrap_or(10).min(100).max(1);
    let predictions = service.get_predictions(id, limit).await?;
    Ok(Json(predictions))
}

pub async fn stats(
    Extension(service): Extension<Arc<MarketService>>,
) -> Result<Json<MarketStats>> {
    let stats = service.get_stats().await?;
    Ok(Json(stats))
}
