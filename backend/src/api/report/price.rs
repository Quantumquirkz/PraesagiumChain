//! Price comparison endpoints for CRE (Binance, CoinGecko, Chainlink feeds).

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

const BINANCE_PRICE: &str = "https://api.binance.com/api/v3/ticker/price";
const COINGECKO_PRICE: &str = "https://api.coingecko.com/api/v3/simple/price";

#[derive(Debug, Deserialize)]
pub struct PriceAboveQuery {
    /// e.g. bitcoin, ethereum (CoinGecko) or BTCUSDT, ETHUSDT (Binance) or ETH_USD, BTC_USD (Chainlink)
    pub symbol: String,
    /// Threshold to compare against (e.g. 50000 for "BTC > 50000")
    pub threshold: f64,
    /// Optional: "binance", "coingecko", or "chainlink" (Chainlink Data Feeds on-chain)
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BinancePriceResponse {
    price: String,
}

/// GET /api/price/above?symbol=BTCUSDT&threshold=50000
/// or ?symbol=bitcoin&threshold=50000&source=coingecko
/// or ?symbol=BTC_USD&threshold=50000&source=chainlink
/// outcome = 1 if price >= threshold, else 0.
pub async fn price_above(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PriceAboveQuery>,
) -> Result<impl IntoResponse> {
    let use_chainlink = q.source.as_deref() == Some("chainlink");
    let use_binance = q.source.as_deref() == Some("binance")
        || (!use_chainlink && q.symbol.len() >= 4 && q.symbol.ends_with("USDT"));

    let price = if use_chainlink {
        let service = state
            .chainlink_feeds
            .as_ref()
            .ok_or_else(|| AppError::Validation("Chainlink Data Feeds not configured (RPC_URL and feed addresses required)".into()))?;
        let feed_name: String = if q.symbol.eq_ignore_ascii_case("eth_usd") || q.symbol.eq_ignore_ascii_case("eth-usd") {
            "ETH_USD".into()
        } else if q.symbol.eq_ignore_ascii_case("btc_usd") || q.symbol.eq_ignore_ascii_case("btc-usd") {
            "BTC_USD".into()
        } else {
            q.symbol.to_uppercase().replace('-', "_")
        };
        let resp = service.get_price(&feed_name).await?;
        // Chainlink feeds use 8 decimals
        resp.price as f64 / 1e8
    } else if use_binance {
        let sym = if q.symbol.contains("USDT") {
            q.symbol.to_uppercase()
        } else {
            format!("{}USDT", q.symbol.to_uppercase())
        };
        let url = format!("{}?symbol={}", BINANCE_PRICE, sym);
        let resp = state.http_client.get(&url).send().await.map_err(|e| {
            AppError::ExternalApi(format!("Binance price request failed: {e}"))
        })?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::ExternalApi(format!(
                "Binance error ({status}): {body}"
            )));
        }
        let data: BinancePriceResponse = resp.json().await.map_err(|e| {
            AppError::ExternalApi(format!("Binance parse failed: {e}"))
        })?;
        data.price.parse::<f64>().map_err(|_| {
            AppError::Validation("Binance: invalid price".into())
        })?
    } else {
        let id = q.symbol.to_lowercase();
        let url = format!("{}?ids={}&vs_currencies=usd", COINGECKO_PRICE, id);
        let resp = state.http_client.get(&url).send().await.map_err(|e| {
            AppError::ExternalApi(format!("CoinGecko request failed: {e}"))
        })?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::ExternalApi(format!(
                "CoinGecko error ({status}): {body}"
            )));
        }
        let data: std::collections::HashMap<String, std::collections::HashMap<String, f64>> =
            resp.json().await.map_err(|e| {
                AppError::ExternalApi(format!("CoinGecko parse failed: {e}"))
            })?;
        let inner = data.get(&id).ok_or_else(|| {
            AppError::Validation(format!("CoinGecko: unknown id '{id}'"))
        })?;
        *inner.get("usd").ok_or_else(|| {
            AppError::Validation("CoinGecko: missing usd".into())
        })?
    };
    let outcome = if price >= q.threshold { 1 } else { 0 };
    Ok((StatusCode::OK, Json(OutcomeResponse { outcome })))
}
