//! Exchange Rate API - Forex rates. Free, no key.

use crate::error::{AppError, Result};
use crate::services::sources::types::Signal;
use serde::Deserialize;

const BASE_URL: &str = "https://api.exchangerate-api.com/v4/latest";

#[derive(Debug, Deserialize)]
struct ApiResponse {
    rates: std::collections::HashMap<String, f64>,
}

pub struct ExchangeRateSource {
    client: reqwest::Client,
}

impl ExchangeRateSource {
    pub fn new() -> Self {
        Self { client: reqwest::Client::new() }
    }

    pub async fn fetch_eur_usd(&self) -> Result<Signal> {
        let url = format!("{}/USD", BASE_URL);
        let resp = self.client.get(&url).send().await
            .map_err(|e| AppError::Validation(format!("ExchangeRate request failed: {e}")))?;
        if !resp.status().is_success() {
            let status = resp.status();
            return Err(AppError::Validation(format!("ExchangeRate error ({})", status)));
        }
        let data: ApiResponse = resp.json().await
            .map_err(|e| AppError::Validation(format!("ExchangeRate parse failed: {e}")))?;
        let eur_rate = data.rates.get("EUR").copied().unwrap_or(0.0) as f32;
        let change_pct = (eur_rate - 0.92) * 50.0;
        Ok(Signal { source: "exchangerate".to_string(), price_change_24h: Some(change_pct), volume_24h: None, sentiment: None })
    }
}

impl Default for ExchangeRateSource { fn default() -> Self { Self::new() } }
