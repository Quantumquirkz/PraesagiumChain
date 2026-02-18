//! Improved Bayesian head: ensemble with simulated dropout and better uncertainty estimation.

use ndarray::Array1;
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;

/// Parameters for the improved Bayesian head.
#[derive(Clone, Debug)]
pub struct BayesianParams {
    pub weights: Vec<f32>,
    pub bias: f32,
    pub ensemble_size: usize,
    /// Seed para reproducibilidad.
    pub seed: Option<u64>,
}

impl Default for BayesianParams {
    fn default() -> Self {
        Self {
            weights: vec![],
            bias: 0.0,
            ensemble_size: 5,
            seed: None,
        }
    }
}

impl BayesianParams {
    /// Creates parameters from embedding dimension.
    pub fn from_embedding_dim(dim: usize, ensemble_size: usize) -> Self {
        Self::from_embedding_dim_with_seed(dim, ensemble_size, None)
    }

    /// Creates parameters with seed for reproducibility.
    pub fn from_embedding_dim_with_seed(
        dim: usize,
        ensemble_size: usize,
        seed: Option<u64>,
    ) -> Self {
        let mut rng: Box<dyn Rng> = if let Some(s) = seed {
            Box::new(StdRng::seed_from_u64(s))
        } else {
            Box::new(rand::thread_rng())
        };

        let weights: Vec<f32> = (0..dim * ensemble_size)
            .map(|_| (rng.gen::<f32>() - 0.5) * 0.1)
            .collect();

        Self {
            weights,
            bias: 0.0,
            ensemble_size,
            seed,
        }
    }

    /// Loads parameters from a vector (for trained models).
    pub fn from_weights(weights: Vec<f32>, bias: f32, ensemble_size: usize) -> Self {
        Self {
            weights,
            bias,
            ensemble_size,
            seed: None,
        }
    }
}

/// Devuelve (probabilidad media, varianza/incertidumbre mejorada).
pub fn predict(embedding: &Array1<f32>, params: &BayesianParams) -> (f32, f32) {
    let dim = embedding.len();
    if dim == 0 || params.weights.is_empty() {
        return (0.5, 0.25);
    }

    let k = params.ensemble_size.max(1);
    let chunk = params.weights.len() / k;
    let mut probs = Vec::with_capacity(k);
    let mut logits = Vec::with_capacity(k);

    for i in 0..k {
        let start = i * chunk;
        let end = (start + dim).min(params.weights.len());
        let w = &params.weights[start..end];
        
        let dot: f32 = embedding
            .iter()
            .zip(w.iter())
            .map(|(a, b)| a * b)
            .sum();
        
        let logit = dot + params.bias;
        logits.push(logit);
        let p = 1.0 / (1.0 + (-logit).exp());
        probs.push(p.clamp(0.0, 1.0));
    }

    let mean = probs.iter().sum::<f32>() / probs.len() as f32;
    
    // Incertidumbre mejorada: combina varianza de probabilidades y varianza de logits
    let prob_var = probs
        .iter()
        .map(|p| (p - mean) * (p - mean))
        .sum::<f32>()
        / probs.len() as f32;
    
    let logit_mean = logits.iter().sum::<f32>() / logits.len() as f32;
    let logit_var = logits
        .iter()
        .map(|l| (l - logit_mean) * (l - logit_mean))
        .sum::<f32>()
        / logits.len() as f32;
    
    // Combinar ambas fuentes de incertidumbre
    let uncertainty = (prob_var + logit_var * 0.1).sqrt().clamp(0.0, 1.0);

    (mean, uncertainty)
}

/// Prediction with simulated dropout (for robustness).
pub fn predict_with_dropout(
    embedding: &Array1<f32>,
    params: &BayesianParams,
    dropout_rate: f32,
) -> (f32, f32) {
    let mut rng = if let Some(seed) = params.seed {
        StdRng::seed_from_u64(seed)
    } else {
        StdRng::from_entropy()
    };

    let dim = embedding.len();
    let mut masked_embedding = Array1::zeros(dim);
    
    for (i, &v) in embedding.iter().enumerate() {
        if rng.gen::<f32>() > dropout_rate {
            masked_embedding[i] = v;
        }
    }

    predict(&masked_embedding, params)
}
