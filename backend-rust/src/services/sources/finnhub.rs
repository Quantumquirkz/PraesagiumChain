//! Finnhub API - Stocks/crypto. Requires FINNHUB_API_KEY.

use crate::error::{AppError, Result};
use crate::services::sources::types::Signal;
use serde::Deserialize;

const BASE_URL: &str = "https://finnhub.io/api/v1/quote";

#[derive(Debug, Deserialize)]
struct QuoteResponse {
    /// Current price
    #[serde(rename = "c")]
    current: Option<f64>,
    /// Percent change
    #[serde(rename = "dp")]
    change_percent: Option<f64>,
}

pub struct FinnhubSource {
    client: reqwest::Client,
    api_key: Option<String>,
}

impl FinnhubSource {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
        }
    }

    pub fn with_client(client: reqwest::Client, api_key: Option<String>) -> Self {
        Self { client, api_key }
    }

    pub async fn fetch_quote(&self, symbol: &str) -> Result<Signal> {
        let key = self
            .api_key
            .as_deref()
            .ok_or_else(|| AppError::Validation("FINNHUB_API_KEY not set".into()))?;
        let url = format!("{}?symbol={}&token={}", BASE_URL, symbol, key);
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::Validation(format!("Finnhub request failed: {e}")))?;
        if !resp.status().is_success() {
            let status = resp.status();
            return Err(AppError::Validation(format!("Finnhub error ({})", status)));
        }
        let data: QuoteResponse = resp
            .json()
            .await
            .map_err(|e| AppError::Validation(format!("Finnhub parse failed: {e}")))?;
        let price = data.current.filter(|&p| p > 0.0);
        let change = data.change_percent.unwrap_or(0.0) as f32;
        Ok(Signal {
            source: "finnhub".to_string(),
            price,
            price_change_24h: Some(change),
            volume_24h: None,
            sentiment: None,
        })
    }
}
