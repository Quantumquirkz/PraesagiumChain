//! Shared application state injected via axum State extractor.
//! Using State<Arc<AppState>> instead of Extension<Arc<T>> ensures missing
//! dependencies fail at compile time rather than panicking at runtime.

use std::sync::Arc;

use crate::services::siwe::NonceStore;
use crate::config::Config;
use crate::db::Database;
use crate::services::{
    AiService, Cache, ChainlinkFeedsService, EventBus, HybridPredictor, IndexerState, MarketService,
    PredictionService, ReputationService, SourcesRegistry,
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
    /// In-process event bus for SSE streams.
    pub event_bus: EventBus,
    /// Shared indexer metrics (None if indexer is not configured).
    pub indexer_state: Option<Arc<IndexerState>>,
    /// Application start time (Unix seconds) for uptime calculation.
    pub started_at: i64,
    /// In-memory nonce store for SIWE challenges.
    pub nonce_store: NonceStore,
    /// Chainlink Data Feeds service (None if RPC/feeds not configured).
    pub chainlink_feeds: Option<Arc<ChainlinkFeedsService>>,
}
