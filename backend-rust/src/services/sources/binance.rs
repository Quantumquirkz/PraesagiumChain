use crate::error::{AppError, Result};
use crate::services::sources::types::{PriceSignal, Signal};

const BINANCE_TICKER_URL: &str = "https://api.binance.com/api/v3/ticker/24hr";

pub struct BinanceSource {
    client: reqwest::Client,
}

impl BinanceSource {
    pub fn new() -> Self {
        Self { client: reqwest::Client::new() }
    }

    pub async fn fetch_ticker(&self, symbol: &str) -> Result<Signal> {
        let url = format!("{}?symbol={}", BINANCE_TICKER_URL, symbol.to_uppercase());
        let resp = self.client.get(&url).send().await
            .map_err(|e| AppError::Validation(format!("Binance request failed: {e}")))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Validation(format!("Binance error ({status}): {body}")));
        }
        let ticker: PriceSignal = resp.json().await
            .map_err(|e| AppError::Validation(format!("Binance parse failed: {e}")))?;
        let price_change = ticker.price_change_percent.parse::<f32>().unwrap_or(0.0);
        let volume = ticker.volume.parse::<f64>().unwrap_or(0.0);
        Ok(Signal {
            source: "binance".to_string(),
            price_change_24h: Some(price_change),
            volume_24h: Some(volume),
            sentiment: None,
        })
    }
}

impl Default for BinanceSource {
    fn default() -> Self { Self::new() }
}
