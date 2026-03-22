//! Shared SQL fragments for [`super::market::MarketService`].

/// SELECT with COALESCE on optional TEXT and on_chain_market_id so NULL decodes correctly (sqlx any).
pub const MARKET_SELECT: &str = "SELECT id, question, close_time, resolve_time, status, \
    COALESCE(outcome,'') AS outcome, total_yes_stake, total_no_stake, created_at, \
    COALESCE(creator,'') AS creator, market_type, COALESCE(metadata,'') AS metadata, \
    COALESCE(details_hash,'') AS details_hash, COALESCE(encrypted_uri,'') AS encrypted_uri, \
    COALESCE(on_chain_market_id, -1) AS on_chain_market_id";
