//! Chainlink Data Feeds API: GET /api/feeds/price

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct FeedPriceQuery {
    pub feed: String,
}

#[derive(Debug, Serialize)]
pub struct FeedPriceApiResponse {
    pub feed: String,
    pub price: i64,
    pub price_formatted: String,
    pub decimals: u8,
    pub updated_at: u64,
}

/// GET /api/feeds/price?feed=ETH_USD|BTC_USD
pub async fn get_feed_price(
    State(state): State<Arc<AppState>>,
    Query(q): Query<FeedPriceQuery>,
) -> Result<impl IntoResponse> {
    let service = state
        .chainlink_feeds
        .as_ref()
        .ok_or_else(|| AppError::Validation("Chainlink Data Feeds not configured (RPC_URL and feed addresses required)".into()))?;

    let feed_name = q.feed.trim();
    if feed_name.is_empty() {
        return Err(AppError::Validation("feed query param required (e.g. ETH_USD, BTC_USD)".into()));
    }

    let resp = service.get_price(feed_name).await?;

    let decimals = 8u8; // Chainlink ETH/USD and BTC/USD use 8 decimals
    let price_formatted = format!("{:.8}", resp.price as f64 / 10f64.powi(decimals as i32));

    Ok((
        StatusCode::OK,
        Json(FeedPriceApiResponse {
            feed: resp.feed,
            price: resp.price,
            price_formatted,
            decimals,
            updated_at: resp.updated_at,
        }),
    ))
}
