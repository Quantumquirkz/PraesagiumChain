//! Caché en memoria para predicciones y datos frecuentemente accedidos.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::debug;

#[derive(Clone)]
pub struct Cache {
    predictions: Arc<RwLock<HashMap<i64, CachedPrediction>>>,
    markets: Arc<RwLock<HashMap<i64, u64>>>, // market_id -> last_updated timestamp
}

#[derive(Clone, Debug)]
struct CachedPrediction {
    probability: f32,
    uncertainty: f32,
    model_version: String,
    timestamp: u64,
    ttl: u64,
}

impl Cache {
    pub fn new() -> Self {
        Self {
            predictions: Arc::new(RwLock::new(HashMap::new())),
            markets: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Obtiene una predicción del caché si aún es válida.
    pub async fn get_prediction(&self, market_id: i64) -> Option<praesagium_phpe::PredictionResult> {
        let cache = self.predictions.read().await;
        if let Some(cached) = cache.get(&market_id) {
            let now = chrono::Utc::now().timestamp() as u64;
            if now < cached.timestamp + cached.ttl {
                debug!("Cache hit for market {}", market_id);
                return Some(praesagium_phpe::PredictionResult {
                    probability: cached.probability,
                    uncertainty: cached.uncertainty,
                    model_version: cached.model_version.clone(),
                    model_hash: [0u8; 32],
                });
            }
        }
        None
    }

    /// Guarda una predicción en el caché.
    pub async fn set_prediction(
        &self,
        market_id: i64,
        prediction: &praesagium_phpe::PredictionResult,
        ttl_seconds: u64,
    ) {
        let mut cache = self.predictions.write().await;
        let now = chrono::Utc::now().timestamp() as u64;
        cache.insert(
            market_id,
            CachedPrediction {
                probability: prediction.probability,
                uncertainty: prediction.uncertainty,
                model_version: prediction.model_version.clone(),
                timestamp: now,
                ttl: ttl_seconds,
            },
        );
        debug!("Cached prediction for market {} (TTL: {}s)", market_id, ttl_seconds);
    }

    /// Invalida el caché de un mercado.
    pub async fn invalidate_market(&self, market_id: i64) {
        let mut cache = self.predictions.write().await;
        cache.remove(&market_id);
        debug!("Invalidated cache for market {}", market_id);
    }

    /// Limpia predicciones expiradas.
    pub async fn cleanup_expired(&self) {
        let now = chrono::Utc::now().timestamp() as u64;
        let mut cache = self.predictions.write().await;
        cache.retain(|_, v| now < v.timestamp + v.ttl);
    }

    /// Obtiene estadísticas del caché.
    pub async fn stats(&self) -> CacheStats {
        let predictions = self.predictions.read().await;
        CacheStats {
            cached_predictions: predictions.len(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct CacheStats {
    pub cached_predictions: usize,
}

impl Default for Cache {
    fn default() -> Self {
        Self::new()
    }
}
