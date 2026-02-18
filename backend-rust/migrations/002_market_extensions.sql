-- PostgreSQL - Market extensions and conditional conditions
ALTER TABLE markets ADD COLUMN IF NOT EXISTS creator TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS market_type TEXT NOT NULL DEFAULT 'base';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS metadata TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS details_hash TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS encrypted_uri TEXT;

CREATE TABLE IF NOT EXISTS conditional_conditions (
    id BIGSERIAL PRIMARY KEY,
    market_id BIGINT NOT NULL REFERENCES markets(id),
    condition_contract TEXT NOT NULL,
    condition_market_id BIGINT NOT NULL,
    expected_outcome TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conditions_market_id ON conditional_conditions(market_id);
