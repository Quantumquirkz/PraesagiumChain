//! API for fetching from multiple real-time data sources.

use axum::{extract::{Query, State}, Json};
use std::sync::Arc;

use crate::error::Result;
use crate::state::AppState;

pub async fn list_sources() -> Json<Vec<SourceInfo>> {
    Json(vec![
        SourceInfo {
            id: "binance".to_string(),
            name: "Binance".to_string(),
            desc: "Crypto prices, 24h change. No key.".to_string(),
            params: vec!["symbol (e.g. BTCUSDT)".to_string()],
        },
        SourceInfo {
            id: "chainlink".to_string(),
            name: "Chainlink (ETH/USD proxy)".to_string(),
            desc: "ETH/USD via Binance. No key.".to_string(),
            params: vec![],
        },
        SourceInfo {
            id: "cryptocompare".to_string(),
            name: "Cryptocompare".to_string(),
            desc: "Crypto prices, 24h change. No key.".to_string(),
            params: vec!["fsym (e.g. BTC)".to_string(), "tsym (e.g. USD)".to_string()],
        },
        SourceInfo {
            id: "kraken".to_string(),
            name: "Kraken".to_string(),
            desc: "Crypto prices. Public API, no key.".to_string(),
            params: vec!["pair (e.g. XBTUSD)".to_string()],
        },
        SourceInfo {
            id: "exchangerate".to_string(),
            name: "Exchange Rate API".to_string(),
            desc: "Forex EUR/USD. Free, no key.".to_string(),
            params: vec![],
        },
        SourceInfo {
            id: "finnhub".to_string(),
            name: "Finnhub".to_string(),
            desc: "Stocks/crypto. Requires FINNHUB_API_KEY.".to_string(),
            params: vec!["symbol (e.g. AAPL, BTC)".to_string()],
        },
    ])
}

#[derive(serde::Serialize)]
pub struct SourceInfo {
    id: String,
    name: String,
    desc: String,
    params: Vec<String>,
}

#[derive(serde::Deserialize)]
pub struct FetchQuery {
    source: String,
    symbol: Option<String>,
    fsym: Option<String>,
    tsym: Option<String>,
    pair: Option<String>,
}

#[derive(serde::Serialize)]
pub struct FetchResponse {
    source: String,
    price: Option<f64>,
    price_change_24h: Option<f32>,
    volume_24h: Option<f64>,
    sentiment: Option<f32>,
}

pub async fn fetch(
    State(state): State<Arc<AppState>>,
    Query(q): Query<FetchQuery>,
) -> Result<Json<FetchResponse>> {
    const MAX_PARAM_LEN: usize = 64;
    if q.symbol.as_ref().map(|s| s.len()).unwrap_or(0) > MAX_PARAM_LEN {
        return Err(crate::error::AppError::Validation("symbol too long (max 64 chars)".into()));
    }
    if q.fsym.as_ref().map(|s| s.len()).unwrap_or(0) > MAX_PARAM_LEN {
        return Err(crate::error::AppError::Validation("fsym too long (max 64 chars)".into()));
    }
    if q.tsym.as_ref().map(|s| s.len()).unwrap_or(0) > MAX_PARAM_LEN {
        return Err(crate::error::AppError::Validation("tsym too long (max 64 chars)".into()));
    }
    if q.pair.as_ref().map(|s| s.len()).unwrap_or(0) > MAX_PARAM_LEN {
        return Err(crate::error::AppError::Validation("pair too long (max 64 chars)".into()));
    }

    let source = q.source.to_lowercase();
    let resp = match source.as_str() {
        "binance" => {
            let sym = q.symbol.as_deref().unwrap_or("BTCUSDT");
            let sig = state.sources_registry.binance.fetch_ticker(sym).await?;
            FetchResponse {
                source: sig.source,
                price: sig.price,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "chainlink" => {
            // Prefer Chainlink Data Feeds (on-chain) when configured; fallback to Binance proxy
            let (source_name, price, price_change) = if let Some(ref feeds) = state.chainlink_feeds {
                match feeds.get_price("ETH_USD").await {
                    Ok(resp) => (
                        "chainlink_data_feed".to_string(),
                        Some(resp.price as f64 / 1e8),
                        None,
                    ),
                    Err(_) => {
                        let sig = state.sources_registry.chainlink.fetch_eth_usd().await?;
                        (sig.source, sig.price, sig.price_change_24h)
                    }
                }
            } else {
                let sig = state.sources_registry.chainlink.fetch_eth_usd().await?;
                (sig.source, sig.price, sig.price_change_24h)
            };
            FetchResponse {
                source: source_name,
                price: price,
                price_change_24h: price_change,
                volume_24h: None,
                sentiment: None,
            }
        }
        "cryptocompare" => {
            let fsym = q.fsym.as_deref().unwrap_or("BTC");
            let tsym = q.tsym.as_deref().unwrap_or("USD");
            let sig = state.sources_registry.cryptocompare.fetch_ticker(fsym, tsym).await?;
            FetchResponse {
                source: sig.source,
                price: sig.price,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "kraken" => {
            let pair = q.pair.as_deref().unwrap_or("XBTUSD");
            let sig = state.sources_registry.kraken.fetch_ticker(pair).await?;
            FetchResponse {
                source: sig.source,
                price: sig.price,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "exchangerate" => {
            let sig = state.sources_registry.exchangerate.fetch_eur_usd().await?;
            FetchResponse {
                source: sig.source,
                price: sig.price,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "finnhub" => {
            let sym = q.symbol.as_deref().unwrap_or("AAPL");
            let sig = state.sources_registry.finnhub.fetch_quote(sym).await?;
            FetchResponse {
                source: sig.source,
                price: sig.price,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        _ => return Err(crate::error::AppError::Validation(format!("Unknown source: {}", q.source))),
    };
    Ok(Json(resp))
}
