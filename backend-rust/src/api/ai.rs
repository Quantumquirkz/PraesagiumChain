use axum::{extract::Extension, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::error::Result;
use crate::services::{AiService, MarketService};

#[derive(Debug, Deserialize)]
pub struct SentimentRequest {
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct SentimentResponse {
    pub provider: String,
    /// Sentiment score in [-1, 1].
    pub sentiment_score: f32,
    /// Derived probability in [0, 1].
    pub probability: f32,
}

pub async fn sentiment(
    Extension(ai): Extension<Arc<AiService>>,
    Json(req): Json<SentimentRequest>,
) -> Result<Json<SentimentResponse>> {
    let (score, prob) = ai.sentiment(&req.text).await?;
    Ok(Json(SentimentResponse {
        provider: ai.provider_name().to_string(),
        sentiment_score: score,
        probability: prob,
    }))
}

/// Runs AI sentiment and stores it as a prediction entry for the market.
pub async fn market_ai_predict(
    Extension(ai): Extension<Arc<AiService>>,
    Extension(markets): Extension<Arc<MarketService>>,
    axum::extract::Path(market_id): axum::extract::Path<i64>,
    Json(req): Json<SentimentRequest>,
) -> Result<Json<serde_json::Value>> {
    let (score, prob) = ai.sentiment(&req.text).await?;

    // Store as a prediction record.
    let _ = markets
        .set_prediction(
            market_id,
            prob,
            Some((1.0 - prob).abs().min(1.0)), // simple uncertainty proxy
            Some(format!("ai:sentiment:{}", ai.provider_name())),
            None,
        )
        .await?;

    Ok(Json(serde_json::json!({
        "market_id": market_id,
        "provider": ai.provider_name(),
        "sentiment_score": score,
        "probability": prob
    })))
}

