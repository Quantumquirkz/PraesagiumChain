-- PraesagiumChain - Initial schema for Supabase (PostgreSQL)
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Or: supabase db push (if using Supabase CLI)

CREATE TABLE IF NOT EXISTS markets (
    id BIGSERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    close_time BIGINT NOT NULL,
    resolve_time BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    outcome TEXT,
    total_yes_stake BIGINT NOT NULL DEFAULT 0,
    total_no_stake BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    creator TEXT,
    market_type TEXT NOT NULL DEFAULT 'base',
    metadata TEXT,
    details_hash TEXT,
    encrypted_uri TEXT
);

CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    market_id BIGINT NOT NULL REFERENCES markets(id),
    probability DOUBLE PRECISION NOT NULL,
    uncertainty DOUBLE PRECISION,
    model_version TEXT,
    model_hash TEXT,
    "timestamp" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS conditional_conditions (
    id BIGSERIAL PRIMARY KEY,
    market_id BIGINT NOT NULL REFERENCES markets(id),
    condition_contract TEXT NOT NULL,
    condition_market_id BIGINT NOT NULL,
    expected_outcome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS creator_reputation (
    creator_address TEXT PRIMARY KEY,
    markets_created INTEGER NOT NULL DEFAULT 0,
    markets_resolved INTEGER NOT NULL DEFAULT 0,
    correct_predictions INTEGER NOT NULL DEFAULT 0,
    reputation_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_predictions_market_id ON predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_conditions_market_id ON conditional_conditions(market_id);
CREATE INDEX IF NOT EXISTS idx_creator_reputation_score ON creator_reputation(reputation_score);
