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

#[derive(Debug, serde::Deserialize)]
pub struct AIAnalysisRequest {
    pub sentiment_text: Option<String>,
    pub binance_symbol: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct AIAnalysisResponse {
    pub analysis: String,
    pub description: String,
}

/// Generates an AI analysis and description from market, data, and news context.
pub async fn market_ai_analysis(
    State(state): State<Arc<AppState>>,
    Path(market_id): Path<i64>,
    Json(req): Json<AIAnalysisRequest>,
) -> Result<Json<AIAnalysisResponse>> {
    if let Some(ref t) = req.sentiment_text {
        if t.len() > MAX_TEXT_LEN {
            return Err(crate::error::AppError::Validation(format!(
                "sentiment_text exceeds max {} chars",
                MAX_TEXT_LEN
            )));
        }
    }

    let market = match state.market_service.get_by_id(market_id).await {
        Ok(m) => m,
        Err(crate::error::AppError::NotFound) => {
            state.market_service.get_by_on_chain_market_id(market_id).await?
        }
        Err(e) => return Err(e),
    };

    let symbol = req.binance_symbol.as_deref().unwrap_or("BTCUSDT");
    let sentiment_text = req.sentiment_text.as_deref();

    let (prob, _uncertainty) = state
        .hybrid_predictor
        .predict_hybrid(None, sentiment_text, None, Some(symbol), true)
        .await?;

    let prob_pct = (prob * 100.0).round() as u32;

    let mut price_info = String::new();
    if let Ok(sig) = state.sources_registry.binance.fetch_ticker(symbol).await {
        price_info = format!(
            "Precio {}: ${:.2} (24h: {:.2}%)",
            symbol,
            sig.price.unwrap_or(0.0),
            sig.price_change_24h.unwrap_or(0.0) * 100.0
        );
    }

    let yes_stake = market.total_yes_stake as f64 / 1e18;
    let no_stake = market.total_no_stake as f64 / 1e18;
    let total = yes_stake + no_stake;
    let yes_pct = if total > 0.0 { (yes_stake / total * 100.0).round() } else { 50.0 };

    let news_context = sentiment_text
        .filter(|s| !s.trim().is_empty())
        .map(|s| format!("News/social context: {}", s))
        .unwrap_or_else(|| "No news context provided.".to_string());

    let prompt = format!(
        r#"You are a prediction market analyst. Generate an analysis and a description based on this data.

MARKET: {}
Status: {}
Stakes: YES {:.4} ETH ({:.0}%), NO {:.4} ETH. Total: {:.4} ETH.
{}
PHPE hybrid prediction: {}% (fusion: time series 35%, AI sentiment 40%, price 25%).

{}

Reply EXACTLY in this format, no extra text:

ANALYSIS:
[2-3 sentences synthesizing the market, data, news context and hybrid prediction. Explain whether the market favours YES or NO and why.]

DESCRIPTION:
[1 paragraph describing where the information is gathered from: data sources (Binance, Chainlink), PHPE time series, news/social. Explain how these sources inform the prediction.]"#,
        market.question,
        market.status,
        yes_stake,
        yes_pct,
        no_stake,
        total,
        price_info,
        prob_pct,
        news_context
    );

    let (analysis, description) = state.ai_service.generate_analysis(&prompt).await?;

    Ok(Json(AIAnalysisResponse { analysis, description }))
}
