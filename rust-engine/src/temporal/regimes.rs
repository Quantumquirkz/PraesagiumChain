//! Detección de regímenes (HMM / regime-switching). Placeholder.

/// Régimen actual: Normal, Alta volatilidad, etc.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Regime {
    Normal,
    HighVolatility,
    Extreme,
}

/// Devuelve el régimen actual (MVP: siempre Normal).
pub fn current_regime(_embedding: &[f32]) -> Regime {
    Regime::Normal
}
