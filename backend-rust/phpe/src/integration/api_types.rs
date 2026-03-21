//! API types for backend and contract integration.

use serde::{Deserialize, Serialize};

/// Prediction result (PHPE engine output).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PredictionResult {
    pub probability: f32,
    pub uncertainty: f32,
    pub model_version: String,
    pub model_hash: [u8; 32],
}

/// Metadatos del modelo para versionado y hashing.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelMetadata {
    pub version: String,
    pub trained_on: String,
    pub dag_version: String,
    pub weights_checksum: [u8; 32],
}

impl PredictionResult {
    pub fn to_bps(&self) -> (u16, u16) {
        let p_bps = (self.probability * 10_000.0).round().clamp(0.0, 10_000.0) as u16;
        let u_bps = (self.uncertainty * 10_000.0).round().clamp(0.0, 10_000.0) as u16;
        (p_bps, u_bps)
    }
}
