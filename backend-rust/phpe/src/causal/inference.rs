//! Inferencia de variables latentes a partir del DAG y datos normalizados.
//! Por ahora devuelve un vector de estado causal (placeholder).

use crate::causal::dag::CausalGraph;
use crate::data::types::TimeSeriesSample;
use ndarray::Array1;

/// Latent causal state at the last time step (vector per latent variable).
pub type CausalState = Array1<f32>;

/// Infiere el estado causal a partir de la serie normalizada y el DAG.
/// MVP: returns the mean of the last feature window as proxy.
pub fn infer_latents(
    normalized: &TimeSeriesSample,
    _graph: &CausalGraph,
) -> CausalState {
    if normalized.is_empty() {
        return Array1::zeros(0);
    }
    let dim = normalized.features[0].dim();
    let mut sum = Array1::zeros(dim);
    let n = normalized.len() as f32;
    for f in &normalized.features {
        for (i, &v) in f.values.iter().enumerate() {
            if i < dim {
                sum[i] += v;
            }
        }
    }
    sum.mapv_inplace(|x| x / n);
    sum
}
