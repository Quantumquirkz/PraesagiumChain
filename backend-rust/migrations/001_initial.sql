-- PostgreSQL (Supabase) - Initial schema
CREATE TABLE IF NOT EXISTS markets (
    id BIGSERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    close_time BIGINT NOT NULL,
    resolve_time BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    outcome TEXT,
    total_yes_stake BIGINT NOT NULL DEFAULT 0,
    total_no_stake BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    market_id BIGINT NOT NULL REFERENCES markets(id),
    probability REAL NOT NULL,
    uncertainty REAL,
    model_version TEXT,
    model_hash TEXT,
    "timestamp" BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_predictions_market_id ON predictions(market_id);
