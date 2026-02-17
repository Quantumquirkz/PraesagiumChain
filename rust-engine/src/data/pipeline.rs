//! Normalización y preparación de series temporales.

use crate::data::types::{EventFeatures, TimeSeriesSample};

/// Parámetros de normalización (media y desv. por feature; o min/max).
#[derive(Clone, Debug, Default)]
pub struct NormalizationParams {
    pub mean: Vec<f32>,
    pub std: Vec<f32>,
}

impl NormalizationParams {
    pub fn from_sample(sample: &TimeSeriesSample) -> Self {
        if sample.is_empty() {
            return Self {
                mean: vec![],
                std: vec![],
            };
        }
        let n = sample.features[0].dim();
        let mut mean = vec![0.0_f32; n];
        let mut std = vec![0.0_f32; n];
        let count = sample.len() as f32;

        for f in &sample.features {
            for (i, &v) in f.values.iter().enumerate() {
                if i < mean.len() {
                    mean[i] += v;
                }
            }
        }
        for m in &mut mean {
            *m /= count;
        }

        for f in &sample.features {
            for (i, &v) in f.values.iter().enumerate() {
                if i < std.len() {
                    let d = v - mean[i];
                    std[i] += d * d;
                }
            }
        }
        for s in &mut std {
            *s = (s / count).max(1e-8).sqrt();
        }

        Self { mean, std }
    }
}

/// Normaliza la serie: (x - mean) / std por feature.
pub fn normalize(
    sample: &TimeSeriesSample,
    params: &NormalizationParams,
) -> TimeSeriesSample {
    if params.mean.is_empty() || sample.is_empty() {
        return sample.clone();
    }
    let features = sample
        .features
        .iter()
        .map(|f| {
            let values = f
                .values
                .iter()
                .enumerate()
                .map(|(i, &v)| {
                    let m = params.mean.get(i).copied().unwrap_or(0.0);
                    let s = params.std.get(i).copied().unwrap_or(1.0);
                    if s.abs() < 1e-8 {
                        v - m
                    } else {
                        (v - m) / s
                    }
                })
                .collect();
            EventFeatures::new(values)
        })
        .collect();
    TimeSeriesSample::new(sample.timestamps.clone(), features)
}
