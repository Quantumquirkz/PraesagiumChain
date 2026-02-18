pub mod encoder;
pub mod regimes;

pub use encoder::{encode, EncodingStrategy, TemporalParams};
pub use regimes::{current_regime, Regime};
