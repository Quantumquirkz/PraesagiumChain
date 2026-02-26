//! API for fetching from multiple real-time data sources.

use axum::{extract::Query, Extension, Json};
use std::sync::Arc;

use crate::error::Result;

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
        SourceInfo {
            id: "newsapi".to_string(),
            name: "NewsAPI".to_string(),
            desc: "News headlines. Requires NEWSAPI_KEY.".to_string(),
            params: vec!["query".to_string(), "country (e.g. us)".to_string()],
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
    query: Option<String>,
    country: Option<String>,
}

#[derive(serde::Serialize)]
pub struct FetchResponse {
    source: String,
    price_change_24h: Option<f32>,
    volume_24h: Option<f64>,
    sentiment: Option<f32>,
}

pub async fn fetch(
    Query(q): Query<FetchQuery>,
    Extension(registry): Extension<Arc<crate::services::SourcesRegistry>>,
) -> Result<Json<FetchResponse>> {
    let source = q.source.to_lowercase();
    let resp = match source.as_str() {
        "binance" => {
            let sym = q.symbol.as_deref().unwrap_or("BTCUSDT");
            let sig = registry.binance.fetch_ticker(sym).await?;
            FetchResponse {
                source: sig.source,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "chainlink" => {
            let sig = registry.chainlink.fetch_eth_usd().await?;
            FetchResponse {
                source: sig.source,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "cryptocompare" => {
            let fsym = q.fsym.as_deref().unwrap_or("BTC");
            let tsym = q.tsym.as_deref().unwrap_or("USD");
            let sig = registry.cryptocompare.fetch_ticker(fsym, tsym).await?;
            FetchResponse {
                source: sig.source,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "kraken" => {
            let pair = q.pair.as_deref().unwrap_or("XBTUSD");
            let sig = registry.kraken.fetch_ticker(pair).await?;
            FetchResponse {
                source: sig.source,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "exchangerate" => {
            let sig = registry.exchangerate.fetch_eur_usd().await?;
            FetchResponse {
                source: sig.source,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "finnhub" => {
            let sym = q.symbol.as_deref().unwrap_or("AAPL");
            let sig = registry.finnhub.fetch_quote(sym).await?;
            FetchResponse {
                source: sig.source,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        "newsapi" => {
            let query = q.query.as_deref().unwrap_or("bitcoin");
            let country = q.country.as_deref().unwrap_or("us");
            let sig = registry.newsapi.fetch_headlines(query, country).await?;
            FetchResponse {
                source: sig.source,
                price_change_24h: sig.price_change_24h,
                volume_24h: sig.volume_24h,
                sentiment: sig.sentiment,
            }
        }
        _ => return Err(crate::error::AppError::Validation(format!("Unknown source: {}", q.source))),
    };
    Ok(Json(resp))
}
