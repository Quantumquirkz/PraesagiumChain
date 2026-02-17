use axum::{
    extract::Extension,
    Json,
};
use std::sync::Arc;

use crate::error::Result;
use crate::models::{RunPredictRequest, RunPredictResponse};
use crate::services::{MarketService, PredictionService};

pub async fn run_predict(
    Extension(prediction_service): Extension<Arc<PredictionService>>,
    Extension(market_service): Extension<Arc<MarketService>>,
    Json(req): Json<RunPredictRequest>,
) -> Result<Json<RunPredictResponse>> {
    let result = prediction_service
        .run_prediction(&req.time_series, req.market_id)
        .await;

    if let Some(market_id) = req.market_id {
        let _ = market_service
            .set_prediction(
                market_id,
                result.probability,
                Some(result.uncertainty),
                Some(result.model_version.clone()),
                Some(hex::encode(result.model_hash)),
            )
            .await;
    }

    Ok(Json(RunPredictResponse {
        prediction: result,
        market_id: req.market_id,
    }))
}
