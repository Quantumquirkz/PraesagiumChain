//! Encoder temporal: serie + estado causal -> embedding.
//! MVP: media de la secuencia concatenada con estado causal.

use crate::causal::CausalState;
use crate::data::types::TimeSeriesSample;
use ndarray::Array1;

/// Parámetros del encoder (placeholder para futuras capas).
#[derive(Clone, Debug, Default)]
pub struct TemporalParams {}

/// Codifica la serie normalizada y el estado causal en un único vector.
pub fn encode(
    normalized: &TimeSeriesSample,
    causal_state: &CausalState,
    _params: &TemporalParams,
) -> Array1<f32> {
    if normalized.is_empty() {
        return causal_state.clone();
    }
    let dim = normalized.features[0].dim();
    let mut mean = Array1::zeros(dim);
    let n = normalized.len() as f32;
    for f in &normalized.features {
        for (i, &v) in f.values.iter().enumerate() {
            if i < dim {
                mean[i] += v;
            }
        }
    }
    mean.mapv_inplace(|x| x / n);
    // Concatenar media temporal + estado causal
    let mut out = Array1::zeros(mean.len() + causal_state.len());
    for (i, &v) in mean.iter().enumerate() {
        out[i] = v;
    }
    for (i, &v) in causal_state.iter().enumerate() {
        out[mean.len() + i] = v;
    }
    out
}
