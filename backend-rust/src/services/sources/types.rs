use serde::Deserialize;

/// Unified signal returned by every data source.
#[derive(Clone, Debug, Default)]
pub struct Signal {
    pub source: String,
    /// Current spot price in USD (or the relevant quote currency).
    pub price: Option<f64>,
    pub price_change_24h: Option<f32>,
    pub volume_24h: Option<f64>,
    pub sentiment: Option<f32>,
}

/// Raw Binance 24h ticker response fields used internally.
#[derive(Debug, Deserialize)]
pub struct BinanceTicker {
    #[serde(rename = "symbol")]
    pub _symbol: String,
    #[serde(rename = "lastPrice")]
    pub last_price: String,
    #[serde(rename = "priceChangePercent")]
    pub price_change_percent: String,
    #[serde(rename = "volume")]
    pub volume: String,
}
