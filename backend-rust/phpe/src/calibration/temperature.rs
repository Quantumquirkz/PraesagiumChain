//! Temperature scaling: p_calibrated = sigmoid(logit(p) / T).

use serde::{Deserialize, Serialize};

/// Calibration parameters (temperature only for now).
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CalibrationParams {
    pub temperature: f32,
}

impl CalibrationParams {
    pub fn default_t1() -> Self {
        Self { temperature: 1.0 }
    }
}

/// Aplica temperature scaling a una probabilidad.
pub fn apply(p: f32, params: &CalibrationParams) -> f32 {
    let p = p.clamp(1e-7, 1.0 - 1e-7);
    let logit = (p / (1.0 - p)).ln();
    let t = params.temperature.max(1e-3);
    let scaled = logit / t;
    1.0 / (1.0 + (-scaled).exp())
}

/// Isotonic calibration placeholder (uses temperature scaling for now).
pub fn isotonic_calibration(p: f32, params: &CalibrationParams) -> f32 {
    apply(p, params)
}
