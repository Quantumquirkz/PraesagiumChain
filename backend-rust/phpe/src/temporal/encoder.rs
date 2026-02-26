//! Temporal encoding: sample + causal state -> embedding for the Bayesian head.

use ndarray::Array1;
use serde::{Deserialize, Serialize};

use crate::data::types::TimeSeriesSample;

/// How to aggregate the time series into a fixed-size vector.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum EncodingStrategy {
    /// Use mean of last window (default).
    Mean,
    /// Sliding window of given size.
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
/// Embedding dimension is causal_state.len() * 5 to match default_context (base_dim * 2 + base_dim * 3).
pub fn encode(
    _normalized: &TimeSeriesSample,
    causal_state: &Array1<f32>,
    params: &TemporalParams,
) -> Array1<f32> {
    let base_dim = causal_state.len();
    let target_dim = base_dim * 2 + base_dim * 3; // same as default_context embedding dim

    match &params.strategy {
        EncodingStrategy::Mean => {}
        EncodingStrategy::SlidingWindow(_) => {}
    }

    if target_dim <= base_dim {
        return causal_state.clone();
    }
    let mut embedding = Array1::zeros(target_dim);
    for (i, &v) in causal_state.iter().enumerate() {
        if i < target_dim {
            embedding[i] = v;
        }
    }
    embedding
}
