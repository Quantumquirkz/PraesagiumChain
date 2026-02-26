//! Shared application state injected via axum State extractor.
//! Using State<Arc<AppState>> instead of Extension<Arc<T>> ensures missing
//! dependencies fail at compile time rather than panicking at runtime.

use std::sync::Arc;

use crate::config::Config;
use crate::db::Database;
use crate::services::{
    AiService, Cache, HybridPredictor, MarketService, PredictionService, ReputationService,
    SourcesRegistry,
};

/// Central application state shared across all request handlers.
#[derive(Clone)]
pub struct AppState {
    pub market_service: Arc<MarketService>,
    pub prediction_service: Arc<PredictionService>,
    pub reputation_service: Arc<ReputationService>,
    pub ai_service: Arc<AiService>,
    pub hybrid_predictor: Arc<HybridPredictor>,
    pub sources_registry: Arc<SourcesRegistry>,
    pub cache: Arc<Cache>,
    pub http_client: Arc<reqwest::Client>,
    pub config: Arc<Config>,
    pub db: Database,
}
