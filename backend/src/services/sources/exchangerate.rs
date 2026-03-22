//! Exchange Rate API - Forex rates. Free, no key.
//! Computes real 24h change by fetching today's rate and comparing against yesterday's.

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
        Self {
            client: reqwest::Client::new(),
        }
    }

    pub fn with_client(client: reqwest::Client) -> Self {
        Self { client }
    }

    /// Fetches EUR/USD rate and computes real 24h change.
    /// Uses today's USD→EUR rate vs yesterday's via the historical endpoint.
    pub async fn fetch_eur_usd(&self) -> Result<Signal> {
        let today_url = format!("{}/USD", BASE_URL);
        let today_resp = self
            .client
            .get(&today_url)
            .send()
            .await
            .map_err(|e| AppError::Validation(format!("ExchangeRate request failed: {e}")))?;
        if !today_resp.status().is_success() {
            let status = today_resp.status();
            return Err(AppError::Validation(format!("ExchangeRate error ({})", status)));
        }
        let today_data: ApiResponse = today_resp
            .json()
            .await
            .map_err(|e| AppError::Validation(format!("ExchangeRate parse failed: {e}")))?;
        let eur_today = today_data.rates.get("EUR").copied().unwrap_or(0.0);

        // Fetch yesterday's rate using the historical endpoint (YYYY-MM-DD).
        let yesterday = (chrono::Utc::now() - chrono::Duration::days(1))
            .format("%Y-%m-%d")
            .to_string();
        let hist_url = format!(
            "https://api.exchangerate-api.com/v4/history/USD/{}/{}",
            &yesterday[..4],
            &yesterday[5..7]
        );
        // Fallback: if historical fetch fails, report 0% change rather than error.
        let change_pct = if let Ok(hist_resp) = self.client.get(&hist_url).send().await {
            if let Ok(hist_data) = hist_resp.json::<serde_json::Value>().await {
                let day = &yesterday[8..10];
                let eur_yesterday = hist_data
                    .get("rates")
                    .and_then(|r| r.get(day))
                    .and_then(|d| d.get("EUR"))
                    .and_then(|v| v.as_f64())
                    .unwrap_or(eur_today);
                if eur_yesterday > 0.0 {
                    ((eur_today - eur_yesterday) / eur_yesterday * 100.0) as f32
                } else {
                    0.0
                }
            } else {
                0.0
            }
        } else {
            0.0
        };

        Ok(Signal {
            source: "exchangerate".to_string(),
            price: if eur_today > 0.0 { Some(eur_today) } else { None },
            price_change_24h: Some(change_pct),
            volume_24h: None,
            sentiment: None,
        })
    }
}

impl Default for ExchangeRateSource {
    fn default() -> Self {
        Self::new()
    }
}
