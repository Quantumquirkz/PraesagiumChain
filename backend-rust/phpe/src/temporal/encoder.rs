//! Temporal encoding: sample + causal state -> embedding for the Bayesian head.

use ndarray::Array1;
use serde::{Deserialize, Serialize};

use crate::data::types::TimeSeriesSample;

/// How to aggregate the time series into a fixed-size vector.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum EncodingStrategy {
    /// Compute the mean of all feature vectors.
    Mean,
    /// Use the mean of the last `w` feature vectors.
    SlidingWindow(usize),
}

/// Parameters for temporal encoding.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TemporalParams {
    pub strategy: EncodingStrategy,
}

impl Default for TemporalParams {
    fn default() -> Self {
        Self {
            strategy: EncodingStrategy::Mean,
        }
    }
}

/// Encode normalized sample + causal state into a fixed-size embedding.
///
/// The embedding is constructed as:
/// - First `base_dim` slots: causal state values.
/// - Next `feature_dim` slots: aggregated feature mean (from the time series).
/// - Remaining slots: zero-padded to match `target_dim`.
pub fn encode(
    normalized: &TimeSeriesSample,
    causal_state: &Array1<f32>,
    params: &TemporalParams,
) -> Array1<f32> {
    let base_dim = causal_state.len();
    let target_dim = base_dim * 2 + base_dim * 3;

    let feature_mean = compute_feature_mean(normalized, &params.strategy);

    let mut embedding = Array1::zeros(target_dim);

    // Slot 1: causal state
    for (i, &v) in causal_state.iter().enumerate() {
        if i < target_dim {
            embedding[i] = v;
        }
    }

    // Slot 2: aggregated feature mean (offset by base_dim)
    if let Some(mean_vec) = feature_mean {
        for (j, &v) in mean_vec.iter().enumerate() {
            let idx = base_dim + j;
            if idx < target_dim {
                embedding[idx] = v;
            }
        }
    }

    embedding
}

/// Computes the mean feature vector from the time series according to the strategy.
fn compute_feature_mean(
    sample: &TimeSeriesSample,
    strategy: &EncodingStrategy,
) -> Option<Vec<f32>> {
    if sample.is_empty() {
        return None;
    }

    let features_to_use: &[crate::data::types::EventFeatures] = match strategy {
        EncodingStrategy::Mean => &sample.features,
        EncodingStrategy::SlidingWindow(w) => {
            let start = sample.features.len().saturating_sub(*w);
            &sample.features[start..]
        }
    };

    if features_to_use.is_empty() {
        return None;
    }

    let dim = features_to_use[0].dim();
    if dim == 0 {
        return None;
    }

    let mut sum = vec![0.0f32; dim];
    let mut count = 0usize;

    for feat in features_to_use {
        if feat.dim() == dim {
            for (s, &v) in sum.iter_mut().zip(feat.values.iter()) {
                *s += v;
            }
            count += 1;
        }
    }

    if count == 0 {
        return None;
    }

    Some(sum.into_iter().map(|s| s / count as f32).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::types::EventFeatures;

    fn make_sample(rows: &[&[f32]]) -> TimeSeriesSample {
        let features: Vec<EventFeatures> = rows
            .iter()
            .map(|r| EventFeatures::new(r.to_vec()))
            .collect();
        let timestamps = (0..features.len() as u64).collect();
        TimeSeriesSample::new(timestamps, features)
    }

    #[test]
    fn mean_strategy_computes_average() {
        let sample = make_sample(&[&[1.0, 2.0], &[3.0, 4.0]]);
        let mean = compute_feature_mean(&sample, &EncodingStrategy::Mean).unwrap();
        assert!((mean[0] - 2.0).abs() < 1e-6);
        assert!((mean[1] - 3.0).abs() < 1e-6);
    }

    #[test]
    fn sliding_window_uses_last_n() {
        let sample = make_sample(&[&[0.0], &[0.0], &[10.0]]);
        let mean_all = compute_feature_mean(&sample, &EncodingStrategy::Mean).unwrap();
        let mean_w1 = compute_feature_mean(&sample, &EncodingStrategy::SlidingWindow(1)).unwrap();
        // Mean of all 3 = 10/3 ≈ 3.33; window of 1 = 10.0
        assert!((mean_w1[0] - 10.0).abs() < 1e-6);
        assert!(mean_all[0] < mean_w1[0]);
    }

    #[test]
    fn encode_fills_causal_state_and_features() {
        let sample = make_sample(&[&[1.0, 2.0]]);
        let causal = Array1::from(vec![0.5f32, 0.5]);
        let params = TemporalParams::default();
        let emb = encode(&sample, &causal, &params);
        // First 2 slots = causal state
        assert!((emb[0] - 0.5).abs() < 1e-6);
        // Slots 2-3 = feature mean [1.0, 2.0]
        assert!((emb[2] - 1.0).abs() < 1e-6);
        assert!((emb[3] - 2.0).abs() < 1e-6);
    }
}
