//! Regime detection (HMM / regime-switching). Placeholder.

/// Current regime: Normal, High volatility, etc.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Regime {
    Normal,
    HighVolatility,
    Extreme,
}

/// Returns the current regime (MVP: always Normal).
pub fn current_regime(_embedding: &[f32]) -> Regime {
    Regime::Normal
}
