use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::error::Result;
use crate::models::{
    CreateConditionalMarketRequest, CreateMarketRequest, MarketStats, MarketView, PaginatedResponse,
    SetPredictionRequest, UpdateStatusRequest,
};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct ListQuery {
    page: Option<i64>,
    limit: Option<i64>,
    status: Option<String>,
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQuery>,
) -> Result<Json<PaginatedResponse<MarketView>>> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100).max(1);
    let status = params.status.as_deref();
    let result = state.market_service.list(page, limit, status).await?;
    Ok(Json(result))
}

pub async fn get_by_id(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<MarketView>> {
    let market = state.market_service.get_by_id(id).await?;
    Ok(Json(market))
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateMarketRequest>,
) -> Result<impl IntoResponse> {
    let market = state.market_service.create(req).await?;
    if let Some(ref creator) = market.creator {
        let _ = state.reputation_service.on_market_created(creator).await;
    }
    Ok((StatusCode::CREATED, Json(market)))
}

pub async fn create_conditional(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateConditionalMarketRequest>,
) -> Result<impl IntoResponse> {
    let market = state.market_service.create_conditional(req).await?;
    if let Some(ref creator) = market.creator {
        let _ = state.reputation_service.on_market_created(creator).await;
    }
    Ok((StatusCode::CREATED, Json(market)))
}

pub async fn update_status(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<Json<MarketView>> {
    let market = state.market_service.update_status(id, req.clone()).await?;
    state.cache.invalidate_market(id).await;
    if req.status == "Resolved" {
        if let (Some(ref creator), Some(ref outcome)) = (&market.creator, &req.outcome) {
            let _ = state.reputation_service.on_market_resolved(creator, id, outcome).await;
        }
    }
    Ok(Json(market))
}

pub async fn set_prediction(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(req): Json<SetPredictionRequest>,
) -> Result<Json<MarketView>> {
    let market = state
        .market_service
        .set_prediction(id, req.probability, req.uncertainty, req.model_version, req.model_hash)
        .await?;
    state.cache.invalidate_market(id).await;
    Ok(Json(market))
}

pub async fn get_predictions(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Query(params): Query<std::collections::HashMap<String, i64>>,
) -> Result<Json<Vec<crate::models::PredictionView>>> {
    let limit = params.get("limit").copied().unwrap_or(10).min(100).max(1);
    let predictions = state.market_service.get_predictions(id, limit).await?;
    Ok(Json(predictions))
}

pub async fn stats(
    State(state): State<Arc<AppState>>,
) -> Result<Json<MarketStats>> {
    let stats = state.market_service.get_stats().await?;
    Ok(Json(stats))
}
