use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Market {
    pub id: i64,
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
    pub status: String,
    pub outcome: Option<String>,
    pub total_yes_stake: i64,
    pub total_no_stake: i64,
    pub created_at: i64,
    pub creator: Option<String>,
    pub market_type: String,
    pub metadata: Option<String>,
    pub details_hash: Option<String>,
    pub encrypted_uri: Option<String>,
    /// Set by indexer when syncing from chain; NULL for API-created markets.
    pub on_chain_market_id: Option<i64>,
}

/// Row type for SELECTs: sqlx "any" driver does not decode NULL to Option<String> / Option<i64>
/// reliably, so we use COALESCE for TEXT and COALESCE(..., -1) for on_chain_market_id.
#[derive(Debug, Clone, FromRow)]
pub struct MarketRow {
    pub id: i64,
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
    pub status: String,
    pub outcome: String,
    pub total_yes_stake: i64,
    pub total_no_stake: i64,
    pub created_at: i64,
    pub creator: String,
    pub market_type: String,
    pub metadata: String,
    pub details_hash: String,
    pub encrypted_uri: String,
    /// From SQL: COALESCE(on_chain_market_id, -1); -1 means NULL.
    pub on_chain_market_id: i64,
}

fn opt_str(s: String) -> Option<String> {
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

impl From<MarketRow> for Market {
    fn from(r: MarketRow) -> Self {
        Self {
            id: r.id,
            question: r.question,
            close_time: r.close_time,
            resolve_time: r.resolve_time,
            status: r.status,
            outcome: opt_str(r.outcome),
            total_yes_stake: r.total_yes_stake,
            total_no_stake: r.total_no_stake,
            created_at: r.created_at,
            creator: opt_str(r.creator),
            market_type: r.market_type,
            metadata: opt_str(r.metadata),
            details_hash: opt_str(r.details_hash),
            encrypted_uri: opt_str(r.encrypted_uri),
            on_chain_market_id: if r.on_chain_market_id == -1 {
                None
            } else {
                Some(r.on_chain_market_id)
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketView {
    pub id: i64,
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
    pub status: String,
    pub outcome: Option<String>,
    pub total_yes_stake: i64,
    pub total_no_stake: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub creator: Option<String>,
    pub market_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted_uri: Option<String>,
    /// On-chain market ID set by the indexer. Required for frontend to call contract functions.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_chain_market_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_prediction: Option<PredictionView>,
}

impl From<Market> for MarketView {
    fn from(m: Market) -> Self {
        Self {
            id: m.id,
            question: m.question,
            close_time: m.close_time,
            resolve_time: m.resolve_time,
            status: m.status,
            outcome: m.outcome,
            total_yes_stake: m.total_yes_stake,
            total_no_stake: m.total_no_stake,
            creator: m.creator,
            market_type: m.market_type,
            metadata: m.metadata,
            details_hash: m.details_hash,
            encrypted_uri: m.encrypted_uri,
            on_chain_market_id: m.on_chain_market_id,
            latest_prediction: None,
        }
    }
}


#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Prediction {
    pub id: i64,
    pub market_id: i64,
    pub probability: f32,
    pub uncertainty: Option<f32>,
    pub model_version: Option<String>,
    pub model_hash: Option<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionView {
    pub probability: f32,
    pub uncertainty: Option<f32>,
    pub model_version: Option<String>,
    /// SHA-256 hex of the model weights at prediction time. Useful for on-chain integrity checks.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_hash: Option<String>,
    pub timestamp: i64,
}

impl From<Prediction> for PredictionView {
    fn from(p: Prediction) -> Self {
        Self {
            probability: p.probability,
            uncertainty: p.uncertainty,
            model_version: p.model_version,
            model_hash: p.model_hash,
            timestamp: p.timestamp,
        }
    }
}

/// A single condition attached to a conditional market.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ConditionalConditionView {
    pub id: i64,
    pub condition_contract: String,
    pub condition_market_id: i64,
    pub expected_outcome: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMarketRequest {
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
    /// Optional creator address (if the API caller is authenticated and provides it).
    pub creator: Option<String>,
    /// Market type: base | conditional | private | tokenized | ai
    pub market_type: Option<String>,
    /// Optional free-form metadata JSON string.
    pub metadata: Option<String>,
    /// For private markets.
    pub details_hash: Option<String>,
    pub encrypted_uri: Option<String>,
    /// On-chain market ID (assigned by the smart contract). When provided,
    /// the backend record is linked to this on-chain ID so the frontend can
    /// detect it as "On-chain".
    pub on_chain_market_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionalConditionInput {
    pub condition_contract: String,
    pub condition_market_id: i64,
    pub expected_outcome: String, // Yes | No
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConditionalMarketRequest {
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
    pub creator: Option<String>,
    pub conditions: Vec<ConditionalConditionInput>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
    pub outcome: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetPredictionRequest {
    pub probability: f32,
    pub uncertainty: Option<f32>,
    pub model_version: Option<String>,
    pub model_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunPredictRequest {
    pub time_series: predictor::TimeSeriesSample,
    pub market_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunPredictResponse {
    pub prediction: predictor::PredictionResult,
    pub market_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridPredictRequest {
    pub time_series: Option<predictor::TimeSeriesSample>,
    /// Single text (e.g. from X, Reddit, news).
    pub sentiment_text: Option<String>,
    /// Multiple texts from X, Reddit, etc. Sentiments are averaged.
    pub social_texts: Option<Vec<String>>,
    pub binance_symbol: Option<String>,
    /// Usar precio Chainlink proxy (ETH/USD).
    pub use_chainlink_price: Option<bool>,
    pub market_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridPredictResponse {
    pub probability: f32,
    /// Calibrated uncertainty from PHPE (0..1). Only set when prediction used PHPE/time-series.
    pub uncertainty: Option<f32>,
    pub market_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketStats {
    pub total_markets: i64,
    pub open_markets: i64,
    pub resolved_markets: i64,
    pub total_predictions: i64,
}

// ─── Resolution models ───────────────────────────────────────────────────────

/// Request body for the universal resolution endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolveRequest {
    pub market_id: i64,
    /// One of: price_above | weather_rained | sports_winner | ai_sentiment | hybrid
    pub resolution_type: String,
    /// Type-specific parameters (threshold, symbol, city, team, text, …).
    pub params: serde_json::Value,
}

/// Response from the universal resolution endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolveResponse {
    pub market_id: i64,
    pub resolution_type: String,
    /// 1 = Yes / condition met, 0 = No / condition not met.
    pub outcome: u8,
    /// Normalised confidence in [0, 1]: how decisively the condition was met/missed.
    pub confidence: f32,
    /// Which data source provided the raw value.
    pub source: String,
    /// The actual measured value (price, mm of rain, probability, …).
    pub raw_value: Option<f64>,
    /// Unix timestamp (seconds) when the resolution was computed.
    pub resolved_at: i64,
}

// ─── Private market access keys ────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivateMarketRegisterRequest {
    pub on_chain_market_id: i64,
    pub creator_address: String,
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivateMarketRegisterResponse {
    pub access_key: String,
    pub market_id: i64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivateMarketAccessResponse {
    pub market_id: i64,
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
    pub creator: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
#[allow(dead_code)]
pub struct PrivateMarketAccessKeyRow {
    pub id: i64,
    pub on_chain_market_id: i64,
    pub access_key: String,
    pub creator_address: String,
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
    pub created_at: i64,
}

/// A persisted resolution record (read from `market_resolutions`).
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MarketResolution {
    pub id: i64,
    pub market_id: i64,
    pub resolution_type: String,
    pub outcome: i64,
    pub confidence: Option<f64>,
    pub source: Option<String>,
    pub raw_value: Option<f64>,
    pub resolved_at: i64,
}
