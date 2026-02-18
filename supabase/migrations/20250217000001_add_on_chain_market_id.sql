-- Add on_chain_market_id for backend indexer (run if you already had the initial schema)
ALTER TABLE markets ADD COLUMN IF NOT EXISTS on_chain_market_id BIGINT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_on_chain_market_id ON markets(on_chain_market_id) WHERE on_chain_market_id IS NOT NULL;
