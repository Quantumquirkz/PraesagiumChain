//! Kraken API - Real-time crypto prices. Public, no auth.

use crate::error::{AppError, Result};
use crate::services::sources::types::Signal;
use serde::Deserialize;

const BASE: &str = "https://api.kraken.com/0/public/Ticker";

#[derive(Debug, Deserialize)]
struct Resp {
    error: Vec<String>,
    result: Option<std::collections::HashMap<String, Ticker>>,
}

#[derive(Debug, Deserialize)]
struct Ticker {
    c: Vec<String>,
    o: String,
    v: Vec<String>,
}

pub struct KrakenSource {
    client: reqwest::Client,
}

impl KrakenSource {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    pub fn with_client(client: reqwest::Client) -> Self {
        Self { client }
    }

    pub async fn fetch_ticker(&self, pair: &str) -> Result<Signal> {
        let url = format!("{}?pair={}", BASE, pair);
        let resp = self.client.get(&url).send().await
            .map_err(|e| AppError::Validation(format!("Kraken: {e}")))?;
        let data: Resp = resp.json().await
            .map_err(|e| AppError::Validation(format!("Kraken parse: {e}")))?;
        if !data.error.is_empty() {
            return Err(AppError::Validation(format!("Kraken: {:?}", data.error)));
        }
        let r = data.result.ok_or_else(|| AppError::Validation("no result".into()))?;
        let t = r.values().next().ok_or_else(|| AppError::Validation("empty".into()))?;
        let last: f64 = t.c.first().and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let open: f64 = t.o.parse().unwrap_or(0.0);
        let pct = if open > 0.0 { ((last - open) / open * 100.0) as f32 } else { 0.0 };
        let vol: f64 = t.v.get(1).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        Ok(Signal {
            source: "kraken".to_string(),
            price: if last > 0.0 { Some(last) } else { None },
            price_change_24h: Some(pct),
            volume_24h: Some(vol),
            sentiment: None,
        })
    }
}

impl Default for KrakenSource {
    fn default() -> Self {
        Self::new()
    }
}
