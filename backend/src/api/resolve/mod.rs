//! Universal resolution endpoint for CRE workflows.
//!
//! POST /api/resolve/evaluate
//!   Accepts a market_id, resolution_type, and type-specific params.
//!   Calls the appropriate oracle (price feed, weather, sports, AI sentiment, or hybrid PHPE).
//!   Persists the result to `market_resolutions` for a full audit trail.
//!   Returns outcome (0/1), confidence, source, and raw_value.
//!
//! GET /api/markets/:id/resolutions
//!   Returns the full resolution history for a market.

mod evaluate;
mod list;

pub use evaluate::evaluate;
pub use list::list_resolutions;
