//! Cryptocompare API - Real-time crypto 24h price change.

use crate::error::{AppError, Result};
use crate::services::sources::types::Signal;
use serde::Deserialize;

const BASE: &str = "https://min-api.cryptocompare.com/data/pricemultifull";

#[derive(Debug, Deserialize)]
struct Raw {
    RAW: Option<std::collections::HashMap<String, std::collections::HashMap<String, Quote>>>,
}

#[derive(Debug, Deserialize)]
struct Quote {
    #[serde(rename = "CHANGEPCT24HOUR")]
    pct: Option<f64>,
    #[serde(rename = "VOLUME24HOURTO")]
    vol: Option<f64>,
}

pub struct CryptocompareSource {
    client: reqwest::Client,
}

impl CryptocompareSource {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    pub fn with_client(client: reqwest::Client) -> Self {
        Self { client }
    }

    pub async fn fetch_ticker(&self, fsym: &str, tsym: &str) -> Result<Signal> {
        let url = format!("{}?fsyms={}&tsyms={}", BASE, fsym.to_uppercase(), tsym.to_uppercase());
        let resp = self.client.get(&url).send().await
            .map_err(|e| AppError::Validation(format!("Cryptocompare: {e}")))?;
        let data: Raw = resp.json().await
            .map_err(|e| AppError::Validation(format!("Cryptocompare parse: {e}")))?;
        let raw = data.RAW.ok_or_else(|| AppError::Validation("no RAW".into()))?;
        let coin = raw.get(&fsym.to_uppercase()).ok_or_else(|| AppError::Validation("unknown symbol".into()))?;
        let q = coin.get(&tsym.to_uppercase()).ok_or_else(|| AppError::Validation("unknown quote".into()))?;
        Ok(Signal {
            source: "cryptocompare".to_string(),
            price_change_24h: Some(q.pct.unwrap_or(0.0) as f32),
            volume_24h: q.vol,
            sentiment: None,
        })
    }
}

impl Default for CryptocompareSource {
    fn default() -> Self {
        Self::new()
    }
}
