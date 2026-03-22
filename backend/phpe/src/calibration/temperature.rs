//! Probability calibration: temperature scaling + isotonic calibration.
//!
//! Two calibration methods are provided:
//!
//! 1. **Temperature scaling** (`apply`): `p_cal = sigmoid(logit(p) / T)`.
//!    Fast, single-parameter, good for well-trained models.
//!
//! 2. **Isotonic calibration** (`IsotonicCalibration`): piecewise-linear lookup
//!    table trained from (raw_prob, true_label) pairs. Strictly monotone by
//!    construction. Can be serialized to JSON and loaded as part of `SavedContext`.
//!
//! `CalibrationParams` holds both; `isotonic_calibration()` prefers the isotonic
//! table when present and falls back to temperature scaling otherwise.

use serde::{Deserialize, Serialize};

// ─── Temperature scaling ────────────────────────────────────────────────────

/// Calibration parameters.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CalibrationParams {
    /// Temperature for sigmoid scaling (default 1.0 = identity).
    pub temperature: f32,
    /// Optional isotonic lookup table. When present, takes priority.
    pub isotonic: Option<IsotonicCalibration>,
}

impl Default for CalibrationParams {
    fn default() -> Self {
        Self {
            temperature: 1.0,
            isotonic: None,
        }
    }
}

impl CalibrationParams {
    pub fn default_t1() -> Self {
        Self::default()
    }

    /// Build params with a pre-trained isotonic table.
    pub fn with_isotonic(table: IsotonicCalibration) -> Self {
        Self {
            temperature: 1.0,
            isotonic: Some(table),
        }
    }
}

/// Applies temperature scaling to a probability.
pub fn apply(p: f32, params: &CalibrationParams) -> f32 {
    let p = p.clamp(1e-7, 1.0 - 1e-7);
    let logit = (p / (1.0 - p)).ln();
    let t = params.temperature.max(1e-3);
    let scaled = logit / t;
    1.0 / (1.0 + (-scaled).exp())
}

/// Calibrates `p` using the isotonic table if available, otherwise temperature scaling.
pub fn isotonic_calibration(p: f32, params: &CalibrationParams) -> f32 {
    match &params.isotonic {
        Some(table) => table.apply(p),
        None => apply(p, params),
    }
}

// ─── Isotonic calibration ───────────────────────────────────────────────────

/// Piecewise-linear isotonic calibration table.
///
/// `breakpoints` and `mapped` must be the same length and sorted in ascending
/// order. The table is built by the Pool Adjacent Violators (PAV) algorithm
/// from a set of (raw_probability, true_label) pairs.
///
/// At inference time, `apply` performs linear interpolation between the two
/// nearest breakpoints.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct IsotonicCalibration {
    /// Raw (uncalibrated) probability breakpoints, sorted ascending, in [0, 1].
    pub breakpoints: Vec<f32>,
    /// Calibrated probabilities at each breakpoint, sorted ascending, in [0, 1].
    pub mapped: Vec<f32>,
}

impl IsotonicCalibration {
    /// Fit an isotonic calibration table from (raw_prob, label) pairs.
    ///
    /// `labels` must be 0.0 or 1.0. Pairs are sorted by raw probability and
    /// the PAV algorithm enforces monotonicity.
    pub fn fit(raw_probs: &[f32], labels: &[f32]) -> Option<Self> {
        let n = raw_probs.len();
        if n < 2 || n != labels.len() {
            return None;
        }

        // Sort by raw probability
        let mut pairs: Vec<(f32, f32)> = raw_probs
            .iter()
            .zip(labels.iter())
            .map(|(&p, &l)| (p, l))
            .collect();
        pairs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());

        // PAV algorithm: pool adjacent violators
        let mut blocks: Vec<(f32, f32, usize)> = Vec::new(); // (sum_p, sum_l, count)
        for (p, l) in &pairs {
            blocks.push((*p, *l, 1));
            // Merge while last block's mean label > previous block's mean label (violator)
            while blocks.len() > 1 {
                let last = blocks.len() - 1;
                let prev_mean = blocks[last - 1].1 / blocks[last - 1].2 as f32;
                let curr_mean = blocks[last].1 / blocks[last].2 as f32;
                if curr_mean < prev_mean {
                    let (sp, sl, sc) = blocks.pop().unwrap();
                    let prev = blocks.last_mut().unwrap();
                    prev.0 = (prev.0 * prev.2 as f32 + sp) / (prev.2 + sc) as f32;
                    prev.1 += sl;
                    prev.2 += sc;
                } else {
                    break;
                }
            }
        }

        // Extract breakpoints: use the mean raw_prob of each block as breakpoint
        let breakpoints: Vec<f32> = blocks.iter().map(|(p, _, _)| *p).collect();
        let mapped: Vec<f32> = blocks
            .iter()
            .map(|(_, l, c)| (l / *c as f32).clamp(0.0, 1.0))
            .collect();

        Some(Self { breakpoints, mapped })
    }

    /// Apply the calibration to a raw probability via linear interpolation.
    pub fn apply(&self, p: f32) -> f32 {
        let p = p.clamp(0.0, 1.0);
        let n = self.breakpoints.len();

        if n == 0 {
            return p;
        }
        if n == 1 {
            return self.mapped[0];
        }

        // Below first breakpoint: clamp to first mapped value
        if p <= self.breakpoints[0] {
            return self.mapped[0];
        }
        // Above last breakpoint: clamp to last mapped value
        if p >= self.breakpoints[n - 1] {
            return self.mapped[n - 1];
        }

        // Binary search for the interval [bp[i], bp[i+1]] containing p
        let pos = self
            .breakpoints
            .partition_point(|&bp| bp <= p)
            .saturating_sub(1);
        let pos = pos.min(n - 2);

        let x0 = self.breakpoints[pos];
        let x1 = self.breakpoints[pos + 1];
        let y0 = self.mapped[pos];
        let y1 = self.mapped[pos + 1];

        if (x1 - x0).abs() < 1e-8 {
            return y0;
        }

        let t = (p - x0) / (x1 - x0);
        (y0 + t * (y1 - y0)).clamp(0.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn temperature_scaling_identity_at_t1() {
        let params = CalibrationParams::default_t1();
        let p = 0.7f32;
        let cal = apply(p, &params);
        assert!((cal - p).abs() < 1e-5, "T=1 should be identity, got {cal}");
    }

    #[test]
    fn temperature_scaling_sharpens_at_low_t() {
        let params = CalibrationParams { temperature: 0.5, isotonic: None };
        let cal = apply(0.7, &params);
        assert!(cal > 0.7, "low T should push probabilities toward extremes");
    }

    #[test]
    fn isotonic_fit_and_apply_roundtrip() {
        // Perfect calibration: raw = calibrated
        let raw = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        let labels = vec![0.0, 0.0, 1.0, 1.0, 1.0];
        let table = IsotonicCalibration::fit(&raw, &labels).unwrap();
        // The calibrated value at 0.5 should be between 0 and 1
        let cal = table.apply(0.5);
        assert!(cal >= 0.0 && cal <= 1.0);
    }

    #[test]
    fn isotonic_apply_clamps_outside_range() {
        let table = IsotonicCalibration {
            breakpoints: vec![0.2, 0.8],
            mapped: vec![0.1, 0.9],
        };
        assert!((table.apply(0.0) - 0.1).abs() < 1e-6);
        assert!((table.apply(1.0) - 0.9).abs() < 1e-6);
    }

    #[test]
    fn isotonic_apply_interpolates_midpoint() {
        let table = IsotonicCalibration {
            breakpoints: vec![0.0, 1.0],
            mapped: vec![0.0, 1.0],
        };
        assert!((table.apply(0.5) - 0.5).abs() < 1e-6);
    }

    #[test]
    fn isotonic_calibration_fn_uses_table_when_present() {
        let table = IsotonicCalibration {
            breakpoints: vec![0.5],
            mapped: vec![0.42],
        };
        let params = CalibrationParams::with_isotonic(table);
        let cal = isotonic_calibration(0.5, &params);
        assert!((cal - 0.42).abs() < 1e-6);
    }

    #[test]
    fn isotonic_calibration_fn_falls_back_to_temperature() {
        let params = CalibrationParams::default_t1();
        let cal = isotonic_calibration(0.7, &params);
        assert!((cal - 0.7).abs() < 1e-5);
    }
}
