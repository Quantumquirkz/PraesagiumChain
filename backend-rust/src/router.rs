//! Centralised route definitions. All handlers receive State<Arc<AppState>>.

use axum::{
    routing::{get, patch, post},
    Router,
};
use std::sync::Arc;

use crate::api;
use crate::state::AppState;

pub fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(api::health::health))
        // Markets
        .route("/api/markets", get(api::markets::list).post(api::markets::create))
        .route("/api/markets/conditional", post(api::markets::create_conditional))
        .route("/api/markets/stats", get(api::markets::stats))
        .route("/api/markets/chain/:on_chain_id", get(api::markets::get_by_chain_id))
        .route("/api/markets/:id", get(api::markets::get_by_id))
        .route("/api/markets/:id/status", patch(api::markets::update_status))
        .route("/api/markets/:id/prediction", post(api::markets::set_prediction))
        .route("/api/markets/:id/predictions", get(api::markets::get_predictions))
        .route("/api/markets/:id/conditions", get(api::markets::get_conditions))
        .route("/api/markets/:id/ai/predict", post(api::ai::market_ai_predict))
        // Predictions
        .route("/api/predict", post(api::predictions::run_predict))
        .route("/api/predict/hybrid", post(api::hybrid::hybrid_predict))
        // AI
        .route("/api/ai/sentiment", post(api::ai::sentiment))
        // Report / Oracle
        .route("/api/weather/rained", get(api::report::weather_rained))
        .route("/api/price/above", get(api::report::price_above))
        .route("/api/sports/winner", get(api::report::sports_winner))
        // Reputation
        .route("/api/reputation", get(api::reputation::list_reputation))
        .route("/api/reputation/:address", get(api::reputation::get_reputation))
        // Observability
        .route("/api/metrics", get(api::metrics::get_metrics))
        // Data sources
        .route("/api/sources", get(api::sources::list_sources))
        .route("/api/sources/fetch", get(api::sources::fetch))
        .with_state(state)
}
