//! Centralised route definitions. All handlers receive State<Arc<AppState>>.
//!
//! Callers: Frontend = Next.js app; CRE = Chainlink CRE workflow; Scripts = resolveFromBackend, demoE2E, simulateCRE; Admin/API = external or future use.

use axum::{
    routing::{delete, get, patch, post},
    Router,
};
use std::sync::Arc;

use crate::api;
use crate::state::AppState;

pub fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(api::health::health))
        // Markets (Frontend, indexer internal)
        .route("/api/markets", get(api::markets::list).post(api::markets::create))
        .route("/api/markets/conditional", post(api::markets::create_conditional))
        .route("/api/markets/stats", get(api::markets::stats))
        .route("/api/markets/chain/:on_chain_id", get(api::markets::get_by_chain_id)) // Admin/API
        .route("/api/markets/:id", get(api::markets::get_by_id).patch(api::markets::update))
        .route("/api/markets/:id/status", patch(api::markets::update_status)) // Admin/API
        .route("/api/markets/:id/prediction", post(api::markets::set_prediction)) // Admin/API
        .route("/api/markets/:id/predictions", get(api::markets::get_predictions))
        .route("/api/markets/:id/conditions", get(api::markets::get_conditions))
        .route("/api/markets/:id/resolutions", get(api::resolve::list_resolutions)) // Admin/API
        // Admin (dev only: clear markets, delete one market)
        .route("/api/admin/clear-markets", delete(api::admin::clear_markets))
        .route("/api/admin/markets/:id", delete(api::admin::delete_market))
        // Private markets (access keys)
        .route("/api/markets/private/register", post(api::private_markets::register))
        .route("/api/markets/private/access", get(api::private_markets::access))
        .route("/api/markets/private/by-creator", get(api::private_markets::by_creator))
        .route("/api/markets/:id/stream", get(api::stream::market_stream))
        .route("/api/markets/:id/ai/predict", post(api::ai::market_ai_predict)) // Admin/API
        .route("/api/markets/:id/ai/analysis", post(api::ai::market_ai_analysis)) // Frontend: AI analysis + description
        // Predictions (Frontend uses /hybrid; /api/predict for direct PHPE)
        .route("/api/predict", post(api::predictions::run_predict)) // Admin/API
        .route("/api/predict/hybrid", post(api::hybrid::hybrid_predict))
        // AI (Frontend, CRE, Scripts)
        .route("/api/ai/sentiment", post(api::ai::sentiment))
        // Resolution (CRE, Scripts)
        .route("/api/resolve/evaluate", post(api::resolve::evaluate))
        // Report / Oracle (Scripts: resolveFromBackend; CRE multi-source)
        .route("/api/weather/rained", get(api::report::weather_rained))
        .route("/api/weather/current", get(api::report::weather_current))
        .route("/api/weather/resolve-location", get(api::report::weather_resolve_location))
        .route("/api/weather/history-forecast", get(api::report::weather_history_forecast))
        .route("/api/price/above", get(api::report::price_above))
        .route("/api/sports/winner", get(api::report::sports_winner))
        .route("/api/crypto/news-sentiment", get(api::report::crypto_news_sentiment))
        // Reputation (Frontend)
        .route("/api/reputation", get(api::reputation::list_reputation))
        .route("/api/reputation/:address", get(api::reputation::get_reputation))
        // Observability (Admin/API)
        .route("/api/metrics", get(api::metrics::get_metrics))
        // Authentication (SIWE — Frontend when wired)
        .route("/api/auth/challenge", post(api::auth::challenge))
        .route("/api/auth/verify", post(api::auth::verify))
        // Chainlink Data Feeds (Frontend)
        .route("/api/feeds/price", get(api::feeds::get_feed_price))
        // Data sources (Frontend)
        .route("/api/sources", get(api::sources::list_sources))
        .route("/api/sources/fetch", get(api::sources::fetch))
        .with_state(state)
}
