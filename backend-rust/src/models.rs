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
    pub timestamp: i64,
}

impl From<Prediction> for PredictionView {
    fn from(p: Prediction) -> Self {
        Self {
            probability: p.probability,
            uncertainty: p.uncertainty,
            model_version: p.model_version,
            timestamp: p.timestamp,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMarketRequest {
    pub question: String,
    pub close_time: i64,
    pub resolve_time: i64,
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
    pub time_series: praesagium_phpe::TimeSeriesSample,
    pub market_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunPredictResponse {
    pub prediction: praesagium_phpe::PredictionResult,
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
