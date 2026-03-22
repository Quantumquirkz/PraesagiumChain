//! In-memory TTL caches used by [`super::market::MarketService`] for list/detail/stats responses.

pub(crate) const LIST_CACHE_TTL_SECS: u64 = 25;
pub(crate) const MARKET_CACHE_TTL_SECS: u64 = 20;
pub(crate) const STATS_CACHE_TTL_SECS: u64 = 45;

#[derive(Clone)]
pub(crate) struct TimedEntry<T: Clone> {
    pub(crate) value: T,
    expires_at: u64,
}

impl<T: Clone> TimedEntry<T> {
    pub(crate) fn new(value: T, ttl: u64) -> Self {
        let now = chrono::Utc::now().timestamp() as u64;
        Self { value, expires_at: now + ttl }
    }

    pub(crate) fn is_valid(&self) -> bool {
        (chrono::Utc::now().timestamp() as u64) < self.expires_at
    }
}
