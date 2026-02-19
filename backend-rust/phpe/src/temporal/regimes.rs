//! Regime detection (HMM / regime-switching). Placeholder.

/// Current regime: Normal, High volatility, etc.
#[allow(dead_code)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Regime {
    Normal,
    HighVolatility,
    Extreme,
}

/// Returns the current regime (MVP: always Normal).
#[allow(dead_code)]
pub fn current_regime(_embedding: &[f32]) -> Regime {
    Regime::Normal
}
