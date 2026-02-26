//! Chainlink Data Feed price source.
//! Simula lectura de precio off-chain (Chainlink Data Streams / Functions).
//! Production: Chainlink Functions fetches the feed; backend uses Binance as public proxy.

use crate::error::Result;
use crate::services::sources::binance::BinanceSource;
use reqwest::Client;
use crate::services::sources::types::Signal;

/// Chainlink-compatible price source (ETH/USD via Binance as public proxy).
pub struct ChainlinkSource {
    binance: BinanceSource,
}

impl ChainlinkSource {
    pub fn new() -> Self {
        Self {
            binance: BinanceSource::new(),
        }
    }

    pub fn with_client(client: Client) -> Self {
        Self {
            binance: BinanceSource::with_client(client),
        }
    }

    /// Fetches ETH/USD signal (proxy: Binance ETHUSDT).
    /// Chainlink Data Feeds would provide this on-chain in production.
    pub async fn fetch_eth_usd(&self) -> Result<Signal> {
        let mut sig = self.binance.fetch_ticker("ETHUSDT").await?;
        sig.source = "chainlink_proxy".to_string();
        Ok(sig)
    }
}

impl Default for ChainlinkSource {
    fn default() -> Self {
        Self::new()
    }
}
