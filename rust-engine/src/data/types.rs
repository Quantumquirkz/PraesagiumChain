//! Tipos de datos para la capa de ingesta.

use serde::{Deserialize, Serialize};

/// Features observadas en un instante de tiempo (numéricas).
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct EventFeatures {
    pub values: Vec<f32>,
}

impl EventFeatures {
    pub fn new(values: Vec<f32>) -> Self {
        Self { values }
    }

    pub fn dim(&self) -> usize {
        self.values.len()
    }
}

/// Secuencia temporal de features (ordenada por tiempo).
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct TimeSeriesSample {
    pub timestamps: Vec<u64>,
    pub features: Vec<EventFeatures>,
}

impl TimeSeriesSample {
    pub fn new(timestamps: Vec<u64>, features: Vec<EventFeatures>) -> Self {
        assert_eq!(timestamps.len(), features.len());
        Self {
            timestamps,
            features,
        }
    }

    pub fn len(&self) -> usize {
        self.features.len()
    }

    pub fn is_empty(&self) -> bool {
        self.features.is_empty()
    }
}
