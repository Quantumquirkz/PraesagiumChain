//! ClickHouse client for analytics events (optional).
//! When CLICKHOUSE_URL is set, events from the EventBus are written to ClickHouse.
//! Failures are logged and do not affect the API.

use serde::Serialize;
use std::sync::Arc;

use crate::services::event_bus::MarketEvent;

/// Row for market_events table. Matches migrations/clickhouse/001_events.sql.
#[derive(clickhouse::Row, Serialize)]
pub struct MarketEventRow {
    pub created_at: u32,
    pub event_type: String,
    pub market_id: i64,
    pub on_chain_market_id: Option<i64>,
    pub payload: String,
}

/// Optional ClickHouse client. None when CLICKHOUSE_URL is not set.
#[derive(Clone)]
pub struct ClickHouseClient {
    client: Arc<clickhouse::Client>,
}

impl ClickHouseClient {
    /// Create client from URL. Returns None if url is empty.
    pub fn new(url: &str) -> Option<Self> {
        let url = url.trim();
        if url.is_empty() {
            return None;
        }
        let client = clickhouse::Client::default().with_url(url);
        Some(Self {
            client: Arc::new(client),
        })
    }

    /// Insert a market event (fire-and-forget; errors are logged).
    pub fn insert_market_event(&self, event: &MarketEvent) {
        let (event_type, market_id, on_chain_market_id, payload) = match event {
            MarketEvent::StatusChanged {
                market_id,
                new_status,
                outcome,
            } => (
                "status_changed",
                *market_id,
                None,
                serde_json::json!({ "new_status": new_status, "outcome": outcome }).to_string(),
            ),
            MarketEvent::PredictionUpdated {
                market_id,
                probability,
                uncertainty,
            } => (
                "prediction_updated",
                *market_id,
                None,
                serde_json::json!({ "probability": probability, "uncertainty": uncertainty }).to_string(),
            ),
            MarketEvent::OnChainResolved {
                market_id,
                on_chain_market_id,
                outcome,
            } => (
                "on_chain_resolved",
                *market_id,
                Some(*on_chain_market_id),
                serde_json::json!({ "outcome": outcome }).to_string(),
            ),
            MarketEvent::ResolutionEvaluated {
                market_id,
                resolution_type,
                outcome,
                confidence,
            } => (
                "resolution_evaluated",
                *market_id,
                None,
                serde_json::json!({
                    "resolution_type": resolution_type,
                    "outcome": outcome,
                    "confidence": confidence
                })
                .to_string(),
            ),
        };
        let now = chrono::Utc::now().timestamp() as u32;
        let row = MarketEventRow {
            created_at: now,
            event_type: event_type.to_string(),
            market_id,
            on_chain_market_id,
            payload,
        };
        let client = self.client.clone();
        tokio::spawn(async move {
            let mut insert = match client.insert("market_events") {
                Ok(i) => i,
                Err(e) => {
                    tracing::warn!("ClickHouse insert market_events: {}", e);
                    return;
                }
            };
            if let Err(e) = insert.write(&row).await {
                tracing::warn!("ClickHouse write market_events: {}", e);
                return;
            }
            if let Err(e) = insert.end().await {
                tracing::warn!("ClickHouse end market_events: {}", e);
            }
        });
    }
}
