//! Shared indexer state for observability.
//!
//! `IndexerState` is updated by `EventIndexer` and read by `GET /api/metrics`.
//! It is stored in `AppState` as `Arc<RwLock<IndexerState>>`.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

/// Atomically-updated indexer metrics.
pub struct IndexerState {
    pub last_processed_block: AtomicU64,
    pub events_processed_total: AtomicU64,
    pub is_running: AtomicBool,
}

impl IndexerState {
    pub fn new(start_block: u64) -> Arc<Self> {
        Arc::new(Self {
            last_processed_block: AtomicU64::new(start_block),
            events_processed_total: AtomicU64::new(0),
            is_running: AtomicBool::new(false),
        })
    }

    pub fn set_running(&self, running: bool) {
        self.is_running.store(running, Ordering::Relaxed);
    }

    pub fn update_block(&self, block: u64) {
        self.last_processed_block.store(block, Ordering::Relaxed);
    }

    pub fn add_events(&self, count: u64) {
        self.events_processed_total.fetch_add(count, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> IndexerSnapshot {
        IndexerSnapshot {
            last_processed_block: self.last_processed_block.load(Ordering::Relaxed),
            events_processed_total: self.events_processed_total.load(Ordering::Relaxed),
            is_running: self.is_running.load(Ordering::Relaxed),
        }
    }
}

/// A point-in-time copy of indexer metrics (for serialization).
#[derive(Debug, Clone, serde::Serialize)]
pub struct IndexerSnapshot {
    pub last_processed_block: u64,
    pub events_processed_total: u64,
    pub is_running: bool,
}
