//! Volatility regime detection based on the standard deviation of the embedding.
//!
//! Thresholds are calibrated for normalized feature vectors (values typically in [0,1]):
//!   std_dev < 0.05  → Normal       (stable market conditions)
//!   std_dev < 0.15  → HighVolatility (elevated uncertainty)
//!   std_dev ≥ 0.15  → Extreme      (crisis / black-swan conditions)
//!
//! The regime is used by `TemporalEncoder` to adjust the sliding-window size:
//! a smaller window in extreme regimes makes the model focus on recent data.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Regime {
    Normal,
    HighVolatility,
    Extreme,
}

impl Regime {
    /// Recommended sliding-window size for each regime.
    pub fn window_size(self) -> usize {
        match self {
            Regime::Normal => 20,
            Regime::HighVolatility => 10,
            Regime::Extreme => 5,
        }
    }
}

/// Detects the current volatility regime from a temporal embedding vector.
///
/// Uses the population standard deviation of the embedding values as a proxy
/// for market volatility. An empty slice defaults to `Normal`.
pub fn current_regime(embedding: &[f32]) -> Regime {
    let n = embedding.len();
    if n < 2 {
        return Regime::Normal;
    }

    let std_dev = population_std_dev(embedding);

    match std_dev {
        s if s < 0.05 => Regime::Normal,
        s if s < 0.15 => Regime::HighVolatility,
        _ => Regime::Extreme,
    }
}

/// Computes the population standard deviation of a slice.
fn population_std_dev(values: &[f32]) -> f32 {
    let n = values.len() as f32;
    let mean = values.iter().sum::<f32>() / n;
    let variance = values.iter().map(|&v| (v - mean).powi(2)).sum::<f32>() / n;
    variance.sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_slice_is_normal() {
        assert_eq!(current_regime(&[]), Regime::Normal);
    }

    #[test]
    fn single_value_is_normal() {
        assert_eq!(current_regime(&[0.5]), Regime::Normal);
    }

    #[test]
    fn low_variance_is_normal() {
        let v = vec![0.5f32; 20];
        assert_eq!(current_regime(&v), Regime::Normal);
    }

    #[test]
    fn medium_variance_is_high_volatility() {
        // std_dev ≈ 0.10
        let v = vec![0.0f32, 0.2, 0.0, 0.2, 0.0, 0.2];
        let regime = current_regime(&v);
        assert_eq!(regime, Regime::HighVolatility);
    }

    #[test]
    fn high_variance_is_extreme() {
        // std_dev ≈ 0.5
        let v = vec![0.0f32, 1.0, 0.0, 1.0, 0.0, 1.0];
        assert_eq!(current_regime(&v), Regime::Extreme);
    }

    #[test]
    fn window_sizes_are_ordered() {
        assert!(Regime::Normal.window_size() > Regime::HighVolatility.window_size());
        assert!(Regime::HighVolatility.window_size() > Regime::Extreme.window_size());
    }
}
