//! Server-Sent Events (SSE) endpoint for real-time market updates.
//!
//! GET /api/markets/:id/stream
//!
//! Clients connect and receive a stream of JSON-encoded `MarketEvent` objects
//! whenever the market changes state, a new prediction is computed, or the
//! on-chain indexer detects a resolution event.
//!
//! The stream filters events by `market_id` so each client only receives
//! events relevant to the market they are watching.
//!
//! Implementation uses `axum::response::Sse` backed by a `tokio::sync::broadcast`
//! receiver from the shared `EventBus` in `AppState`.

use axum::{
    extract::{Path, State},
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse,
    },
};
use futures_util::stream::{self, StreamExt};
use std::sync::Arc;
use std::time::Duration;
use tokio_stream::wrappers::BroadcastStream;
use tracing::debug;

use crate::services::event_bus::MarketEvent;
use crate::state::AppState;

/// GET /api/markets/:id/stream
///
/// Returns an SSE stream that emits events for the specified market.
/// The connection is kept alive with a 30-second heartbeat.
pub async fn market_stream(
    State(state): State<Arc<AppState>>,
    Path(market_id): Path<i64>,
) -> impl IntoResponse {
    let receiver = state.event_bus.subscribe();

    debug!(market_id, "SSE client connected");

    let broadcast_stream = BroadcastStream::new(receiver)
        .filter_map(move |result| {
            let event = match result {
                Ok(event) => event,
                Err(_) => return std::future::ready(None),
            };

            // Filter: only forward events that belong to this market
            let relevant = match &event {
                MarketEvent::StatusChanged { market_id: mid, .. } => *mid == market_id,
                MarketEvent::PredictionUpdated { market_id: mid, .. } => *mid == market_id,
                MarketEvent::OnChainResolved { market_id: mid, .. } => *mid == market_id,
                MarketEvent::ResolutionEvaluated { market_id: mid, .. } => *mid == market_id,
            };

            if !relevant {
                return std::future::ready(None);
            }

            let data = match serde_json::to_string(&event) {
                Ok(json) => json,
                Err(e) => {
                    tracing::warn!("SSE serialize error: {}", e);
                    return std::future::ready(None);
                }
            };

            std::future::ready(Some(Ok::<Event, std::convert::Infallible>(
                Event::default().data(data),
            )))
        });

    // Merge with a heartbeat stream so the connection stays alive
    let heartbeat = stream::repeat(())
        .then(|_| async {
            tokio::time::sleep(Duration::from_secs(30)).await;
            Ok::<Event, std::convert::Infallible>(Event::default().comment("heartbeat"))
        });

    let merged = stream::select(broadcast_stream, heartbeat);

    Sse::new(merged).keep_alive(KeepAlive::default())
}
