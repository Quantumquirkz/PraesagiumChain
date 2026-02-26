use axum::{
    extract::{Path, State},
    Json,
};
use std::sync::Arc;

use crate::constants::MAX_TEXT_LEN;
use crate::error::Result;
use crate::state::AppState;

#[derive(Debug, serde::Deserialize)]
pub struct SentimentRequest {
    pub text: String,
}

#[derive(Debug, serde::Serialize)]
pub struct SentimentResponse {
    pub provider: String,
    /// Sentiment score in [-1, 1].
    pub sentiment_score: f32,
    /// Derived probability in [0, 1].
    pub probability: f32,
}

pub async fn sentiment(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SentimentRequest>,
) -> Result<Json<SentimentResponse>> {
    if req.text.len() > MAX_TEXT_LEN {
        return Err(crate::error::AppError::Validation(format!(
            "Text length exceeds max {} chars",
            MAX_TEXT_LEN
        )));
    }
    let text = req.text.trim();
    if text.is_empty() {
        return Err(crate::error::AppError::Validation("Text cannot be empty".into()));
    }
    let (score, prob) = state.ai_service.sentiment(text).await?;
    Ok(Json(SentimentResponse {
        provider: state.ai_service.provider_name().to_string(),
        sentiment_score: score,
        probability: prob,
    }))
}

/// Runs AI sentiment and stores it as a prediction entry for the market.
pub async fn market_ai_predict(
    State(state): State<Arc<AppState>>,
    Path(market_id): Path<i64>,
    Json(req): Json<SentimentRequest>,
) -> Result<Json<serde_json::Value>> {
    if req.text.len() > MAX_TEXT_LEN {
        return Err(crate::error::AppError::Validation(format!(
            "Text length exceeds max {} chars",
            MAX_TEXT_LEN
        )));
    }
    let text = req.text.trim();
    if text.is_empty() {
        return Err(crate::error::AppError::Validation("Text cannot be empty".into()));
    }
    let (score, prob) = state.ai_service.sentiment(text).await?;

    let _ = state
        .market_service
        .set_prediction(
            market_id,
            prob,
            Some((1.0 - prob).abs().min(1.0)),
            Some(format!("ai:sentiment:{}", state.ai_service.provider_name())),
            None,
        )
        .await?;

    Ok(Json(serde_json::json!({
        "market_id": market_id,
        "provider": state.ai_service.provider_name(),
        "sentiment_score": score,
        "probability": prob
    })))
}
