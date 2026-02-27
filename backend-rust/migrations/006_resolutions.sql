-- Resolution audit trail: every call to POST /api/resolve/evaluate is persisted here.
-- This creates a verifiable history of all oracle resolution attempts for each market.

CREATE TABLE IF NOT EXISTS market_resolutions (
    id              BIGSERIAL PRIMARY KEY,
    market_id       BIGINT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    resolution_type TEXT NOT NULL,        -- price_above | weather_rained | sports_winner | ai_sentiment | hybrid
    outcome         SMALLINT NOT NULL,    -- 0 = No / uncertain, 1 = Yes
    confidence      DOUBLE PRECISION,     -- how far the raw value is from the threshold (0..1)
    source          TEXT,                 -- which data source was used (binance, openmeteo, etc.)
    raw_value       DOUBLE PRECISION,     -- the actual measured value (price, mm of rain, etc.)
    resolved_at     BIGINT NOT NULL       -- Unix timestamp (seconds)
);

CREATE INDEX IF NOT EXISTS idx_resolutions_market_id  ON market_resolutions(market_id);
CREATE INDEX IF NOT EXISTS idx_resolutions_resolved_at ON market_resolutions(resolved_at DESC);
