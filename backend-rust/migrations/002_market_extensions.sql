ALTER TABLE markets ADD COLUMN creator TEXT;
ALTER TABLE markets ADD COLUMN market_type TEXT NOT NULL DEFAULT 'base';
ALTER TABLE markets ADD COLUMN metadata TEXT;
ALTER TABLE markets ADD COLUMN details_hash TEXT;
ALTER TABLE markets ADD COLUMN encrypted_uri TEXT;

CREATE TABLE IF NOT EXISTS conditional_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id INTEGER NOT NULL,
    condition_contract TEXT NOT NULL,
    condition_market_id INTEGER NOT NULL,
    expected_outcome TEXT NOT NULL,
    FOREIGN KEY (market_id) REFERENCES markets(id)
);

CREATE INDEX IF NOT EXISTS idx_conditions_market_id ON conditional_conditions(market_id);
