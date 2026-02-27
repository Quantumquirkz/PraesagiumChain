//! In-process event bus for real-time market updates.
//!
//! Uses `tokio::sync::broadcast` so multiple SSE subscribers can receive the
//! same events without blocking each other. The sender is stored in `AppState`
//! and published to by handlers and the indexer whenever state changes.

use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

/// Events that can be published to the bus.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MarketEvent {
    /// Market status changed (e.g. Open → Locked → Resolved).
    StatusChanged {
        market_id: i64,
        new_status: String,
        outcome: Option<String>,
    },
    /// A new PHPE prediction was computed for a market.
    PredictionUpdated {
        market_id: i64,
        probability: f32,
        uncertainty: Option<f32>,
    },
    /// The on-chain indexer detected a resolution event.
    OnChainResolved {
        market_id: i64,
        on_chain_market_id: i64,
        outcome: String,
    },
    /// A resolution was evaluated via /api/resolve/evaluate.
    ResolutionEvaluated {
        market_id: i64,
        resolution_type: String,
        outcome: u8,
        confidence: f32,
    },
}

/// Capacity of the broadcast channel (number of events buffered per subscriber).
const CHANNEL_CAPACITY: usize = 256;

/// Shared event bus. Clone cheaply — all clones share the same sender.
#[derive(Clone, Debug)]
pub struct EventBus {
    sender: broadcast::Sender<MarketEvent>,
}

impl EventBus {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(CHANNEL_CAPACITY);
        Self { sender }
    }

    /// Publish an event. Returns the number of active subscribers that received it.
    /// Silently ignores `SendError` (no subscribers).
    pub fn publish(&self, event: MarketEvent) -> usize {
        self.sender.send(event).unwrap_or(0)
    }

    /// Subscribe to the event stream. Each subscriber gets its own receiver.
    pub fn subscribe(&self) -> broadcast::Receiver<MarketEvent> {
        self.sender.subscribe()
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}
