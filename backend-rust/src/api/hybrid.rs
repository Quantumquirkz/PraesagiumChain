use axum::{extract::Extension, Json};
use std::sync::Arc;

use crate::error::Result;
use crate::models::{HybridPredictRequest, HybridPredictResponse};
use crate::services::{HybridPredictor, MarketService};

pub async fn hybrid_predict(
    Extension(hybrid): Extension<Arc<HybridPredictor>>,
    Extension(markets): Extension<Arc<MarketService>>,
    Json(req): Json<HybridPredictRequest>,
) -> Result<Json<HybridPredictResponse>> {
    let series = req.time_series.as_ref();
    let text = req.sentiment_text.as_deref();
    let social = req.social_texts.as_deref();
    let symbol = req.binance_symbol.as_deref();
    let use_chainlink = req.use_chainlink_price.unwrap_or(false);

    let (prob, uncertainty) = hybrid
        .predict_hybrid(series, text, social, symbol, use_chainlink)
        .await?;

    if let Some(market_id) = req.market_id {
        let _ = markets
            .set_prediction(
                market_id,
                prob,
                uncertainty.or(Some(0.2)),
                Some("hybrid".to_string()),
                None,
            )
            .await;
    }

    Ok(Json(HybridPredictResponse {
        probability: prob,
        uncertainty,
        market_id: req.market_id,
    }))
}
