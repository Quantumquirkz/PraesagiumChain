//! Crypto news sentiment shortcut for CRE.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::state::AppState;

use super::types::OutcomeResponse;

#[derive(Debug, Deserialize)]
pub struct CryptoNewsSentimentQuery {
    /// Crypto symbol (e.g. BTC, ETH) for news/sentiment context.
    pub symbol: String,
    /// Probability threshold above which outcome = 1 (default 0.5).
    pub threshold: Option<f64>,
}

/// GET /api/crypto/news-sentiment?symbol=BTC&threshold=0.6
/// Uses AI sentiment on context derived from the symbol (MVP: synthetic text; later: real news API).
/// outcome = 1 if probability >= threshold, else 0.
pub async fn crypto_news_sentiment(
    State(state): State<Arc<AppState>>,
    Query(q): Query<CryptoNewsSentimentQuery>,
) -> Result<impl IntoResponse> {
    let symbol = q.symbol.trim();
    if symbol.is_empty() {
        return Err(AppError::Validation("symbol is required".into()));
    }
    let threshold = q.threshold.unwrap_or(0.5).clamp(0.0, 1.0);
    let text = format!(
        "Latest news and sentiment for {}: market context and real-time data.",
        symbol.to_uppercase()
    );
    let (_score, prob) = state
        .ai_service
        .sentiment(&text)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("AI sentiment: {}", e)))?;
    let prob = prob.clamp(0.0, 1.0);
    let outcome = if prob >= threshold as f32 { 1 } else { 0 };
    Ok((StatusCode::OK, Json(OutcomeResponse { outcome })))
}
