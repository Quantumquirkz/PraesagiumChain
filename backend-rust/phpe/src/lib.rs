//! Prediction engine: time series → probability + uncertainty.

mod data;
mod causal;
mod temporal;
mod bayesian;
mod calibration;
mod integration;

pub use data::{normalize, EventFeatures, NormalizationParams, TimeSeriesSample};
pub use causal::{infer_latents, CausalGraph, CausalState};
pub use temporal::{encode, EncodingStrategy, TemporalParams};
pub use bayesian::{predict as bayesian_predict, predict_with_dropout, BayesianParams};
pub use calibration::{apply as calibrate, isotonic_calibration, CalibrationParams};
pub use integration::{model_hash, ModelMetadata, PredictionResult};

use serde::{Deserialize, Serialize};

/// Prediction context: loaded model parameters.
#[derive(Clone, Debug)]
pub struct PredictionContext {
    pub normalization_params: data::NormalizationParams,
    pub causal_graph: CausalGraph,
    pub temporal_params: TemporalParams,
    pub bayesian_params: BayesianParams,
    pub calibration_params: CalibrationParams,
    pub model_metadata: ModelMetadata,
}

/// Executes the full pipeline: normalize -> causal -> encoder -> bayesian -> calibration.
pub fn predict(series: &TimeSeriesSample, ctx: &PredictionContext) -> PredictionResult {
    let normalized = data::normalize(series, &ctx.normalization_params);
    let causal_state = causal::infer_latents(&normalized, &ctx.causal_graph);
    let embedding = temporal::encode(&normalized, &causal_state, &ctx.temporal_params);
    let (p, uncertainty) = bayesian::predict(&embedding, &ctx.bayesian_params);
    let p_calibrated = calibration::calibrate(p, &ctx.calibration_params);
    let model_hash = integration::model_hash(&ctx.model_metadata);

    PredictionResult {
        probability: p_calibrated.clamp(0.0, 1.0),
        uncertainty: uncertainty.clamp(0.0_f32, 1.0),
        model_version: ctx.model_metadata.version.clone(),
        model_hash,
    }
}

/// Creates a default prediction context (for testing or MVP).
pub fn default_context(series: &TimeSeriesSample) -> PredictionContext {
    let normalization_params = data::NormalizationParams::from_sample(series);
    let causal_graph = CausalGraph::empty("0.1.0");
    
    let temporal_params = TemporalParams {
        strategy: if series.len() > 10 {
            EncodingStrategy::SlidingWindow(10)
        } else {
            EncodingStrategy::Mean
        },
    };
    
    let dim = if series.is_empty() {
        0
    } else {
        let base_dim = series.features[0].dim();
        base_dim * 2 + base_dim * 3
    };
    
    let bayesian_params = BayesianParams::from_embedding_dim(dim.max(1), 5);
    let calibration_params = CalibrationParams::default_t1();
    let model_metadata = ModelMetadata {
        version: "0.1.0".to_string(),
        trained_on: "mock".to_string(),
        dag_version: "0.1.0".to_string(),
        weights_checksum: [0u8; 32],
    };

    PredictionContext {
        normalization_params,
        causal_graph,
        temporal_params,
        bayesian_params,
        calibration_params,
        model_metadata,
    }
}

/// Loads a context from JSON (for trained models).
#[derive(Serialize, Deserialize)]
pub struct SavedContext {
    pub normalization_params: data::NormalizationParams,
    pub causal_graph: CausalGraph,
    pub temporal_params: TemporalParams,
    pub bayesian_params: BayesianParams,
    pub calibration_params: CalibrationParams,
    pub model_metadata: ModelMetadata,
}

impl TryFrom<&str> for PredictionContext {
    type Error = serde_json::Error;

    fn try_from(json: &str) -> Result<Self, Self::Error> {
        let saved: SavedContext = serde_json::from_str(json)?;
        Ok(PredictionContext {
            normalization_params: saved.normalization_params,
            causal_graph: saved.causal_graph,
            temporal_params: saved.temporal_params,
            bayesian_params: saved.bayesian_params,
            calibration_params: saved.calibration_params,
            model_metadata: saved.model_metadata,
        })
    }
}

impl From<PredictionContext> for SavedContext {
    fn from(ctx: PredictionContext) -> Self {
        Self {
            normalization_params: ctx.normalization_params,
            causal_graph: ctx.causal_graph,
            temporal_params: ctx.temporal_params,
            bayesian_params: ctx.bayesian_params,
            calibration_params: ctx.calibration_params,
            model_metadata: ctx.model_metadata,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn predict_returns_valid_probability() {
        let ts = TimeSeriesSample::new(
            vec![1, 2, 3],
            vec![
                EventFeatures::new(vec![0.1, 0.2]),
                EventFeatures::new(vec![0.2, 0.3]),
                EventFeatures::new(vec![0.15, 0.25]),
            ],
        );
        let ctx = default_context(&ts);
        let result = predict(&ts, &ctx);
        assert!(result.probability >= 0.0 && result.probability <= 1.0);
        assert!(result.uncertainty >= 0.0 && result.uncertainty <= 1.0);
        assert_eq!(result.model_hash.len(), 32);
    }

    #[test]
    fn sliding_window_encoding() {
        let ts = TimeSeriesSample::new(
            (0..20).collect(),
            (0..20)
                .map(|i| EventFeatures::new(vec![i as f32]))
                .collect(),
        );
        let ctx = default_context(&ts);
        assert!(matches!(
            ctx.temporal_params.strategy,
            EncodingStrategy::SlidingWindow(10)
        ));
    }
}
