use axum::{extract::State, Json};
use std::sync::Arc;

use crate::error::Result;
use crate::models::{RunPredictRequest, RunPredictResponse};
use crate::state::AppState;

const MAX_SERIES_LEN: usize = 10_000;

pub async fn run_predict(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RunPredictRequest>,
) -> Result<Json<RunPredictResponse>> {
    if req.time_series.len() > MAX_SERIES_LEN {
        return Err(crate::error::AppError::Validation(format!(
            "time_series exceeds max {} points",
            MAX_SERIES_LEN
        )));
    }
    let result = state
        .prediction_service
        .run_prediction(&req.time_series, req.market_id)
        .await;

    if let Some(market_id) = req.market_id {
        state
            .market_service
            .set_prediction(
                market_id,
                result.probability,
                Some(result.uncertainty),
                Some(result.model_version.clone()),
                Some(hex::encode(result.model_hash)),
            )
            .await?;
    }

    Ok(Json(RunPredictResponse {
        prediction: result,
        market_id: req.market_id,
    }))
}
