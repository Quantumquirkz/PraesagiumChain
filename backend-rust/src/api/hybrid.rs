use axum::{extract::Extension, Json};
use std::sync::Arc;

use crate::error::Result;
use crate::models::{HybridPredictRequest, HybridPredictResponse};
use crate::services::{HybridPredictor, MarketService};

use crate::constants::MAX_TEXT_LEN;
const MAX_SOCIAL_TEXTS: usize = 20;
const MAX_SERIES_LEN: usize = 10_000;

pub async fn hybrid_predict(
    Extension(hybrid): Extension<Arc<HybridPredictor>>,
    Extension(markets): Extension<Arc<MarketService>>,
    Json(req): Json<HybridPredictRequest>,
) -> Result<Json<HybridPredictResponse>> {
    if let Some(ref t) = req.sentiment_text {
        if t.len() > MAX_TEXT_LEN {
            return Err(crate::error::AppError::Validation(format!(
                "sentiment_text exceeds max {} chars",
                MAX_TEXT_LEN
            )));
        }
    }
    if let Some(ref texts) = req.social_texts {
        if texts.len() > MAX_SOCIAL_TEXTS {
            return Err(crate::error::AppError::Validation(format!(
                "social_texts exceeds max {} items",
                MAX_SOCIAL_TEXTS
            )));
        }
        for t in texts {
            if t.len() > MAX_TEXT_LEN {
                return Err(crate::error::AppError::Validation(
                    "Each social text exceeds max length".into(),
                ));
            }
        }
    }
    if let Some(ref s) = req.time_series {
        if s.len() > MAX_SERIES_LEN {
            return Err(crate::error::AppError::Validation(format!(
                "time_series exceeds max {} points",
                MAX_SERIES_LEN
            )));
        }
    }
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
