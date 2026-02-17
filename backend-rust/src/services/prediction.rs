use crate::db::Database;
use crate::services::Cache;
use praesagium_phpe::{default_context, predict, PredictionContext, TimeSeriesSample};
use std::sync::Arc;
use tracing::{debug, warn};

pub struct PredictionService {
    _db: Database,
    cache: Arc<Cache>,
}

impl PredictionService {
    pub fn new(db: Database, cache: Arc<Cache>) -> Self {
        Self { _db: db, cache }
    }

    /// Runs a prediction with default context.
    pub async fn run_prediction(
        &self,
        time_series: &TimeSeriesSample,
        market_id: Option<i64>,
    ) -> praesagium_phpe::PredictionResult {
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
            self.cache.set_prediction(id, &result, 300).await;
        }
        
        debug!(
            "Prediction completed: probability={:.3}, uncertainty={:.3}, model_version={}",
            result.probability, result.uncertainty, result.model_version
        );

        result
    }

    /// Runs a prediction with a trained context (for production).
    pub async fn run_prediction_with_context(
        &self,
        time_series: &TimeSeriesSample,
        ctx: &PredictionContext,
        market_id: Option<i64>,
    ) -> praesagium_phpe::PredictionResult {
        debug!("Running prediction with trained context: version={}", ctx.model_metadata.version);
        
        if time_series.is_empty() {
            warn!("Empty time series provided, returning default prediction");
            return self.default_prediction();
        }

        if let Some(id) = market_id {
            if let Some(cached) = self.cache.get_prediction(id).await {
                return cached;
            }
        }

        let result = predict(time_series, ctx);
        
        if let Some(id) = market_id {
            self.cache.set_prediction(id, &result, 300).await;
        }
        
        debug!(
            "Prediction completed: probability={:.3}, uncertainty={:.3}, model_version={}",
            result.probability, result.uncertainty, result.model_version
        );

        result
    }

    /// Default prediction when there's insufficient data.
    fn default_prediction(&self) -> praesagium_phpe::PredictionResult {
        praesagium_phpe::PredictionResult {
            probability: 0.5,
            uncertainty: 0.25,
            model_version: "default".to_string(),
            model_hash: [0u8; 32],
        }
    }
}
