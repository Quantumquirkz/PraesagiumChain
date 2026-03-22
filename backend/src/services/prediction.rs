use crate::db::Database;
use crate::services::Cache;
use predictor::{default_context, predict, TimeSeriesSample};
use std::sync::Arc;
use tracing::{debug, warn};

pub struct PredictionService {
    _db: Database,
    cache: Arc<Cache>,
    cache_ttl: u64,
}

impl PredictionService {
    pub fn new(db: Database, cache: Arc<Cache>, cache_ttl: u64) -> Self {
        Self {
            _db: db,
            cache,
            cache_ttl,
        }
    }

    /// Runs a prediction with default context.
    pub async fn run_prediction(
        &self,
        time_series: &TimeSeriesSample,
        market_id: Option<i64>,
    ) -> predictor::PredictionResult {
        debug!("Running prediction with {} data points", time_series.len());
        
        if time_series.is_empty() {
            warn!("Empty time series provided, returning default prediction");
            return self.default_prediction();
        }

        if let Some(id) = market_id {
            if let Some(cached) = self.cache.get_prediction(id).await {
                return cached;
            }
        }

        let ctx = default_context(time_series);
        let result = predict(time_series, &ctx);
        
        if let Some(id) = market_id {
            self.cache.set_prediction(id, &result, self.cache_ttl).await;
        }
        
        debug!(
            "Prediction completed: probability={:.3}, uncertainty={:.3}, model_version={}",
            result.probability, result.uncertainty, result.model_version
        );

        result
    }

    /// Default prediction when there's insufficient data.
    fn default_prediction(&self) -> predictor::PredictionResult {
        predictor::PredictionResult {
            probability: 0.5,
            uncertainty: 0.25,
            model_version: "default".to_string(),
            model_hash: [0u8; 32],
        }
    }
}
