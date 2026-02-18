use serde::Deserialize;

#[derive(Clone, Debug)]
pub struct Signal {
    pub source: String,
    pub price_change_24h: Option<f32>,
    pub volume_24h: Option<f64>,
    pub sentiment: Option<f32>,
}

#[derive(Debug, Deserialize)]
pub struct PriceSignal {
    pub symbol: String,
    #[serde(rename = "priceChangePercent")]
    pub price_change_percent: String,
    #[serde(rename = "volume")]
    pub volume: String,
}
