-- Performance indexes for heavy queries
CREATE INDEX IF NOT EXISTS idx_markets_close_time ON markets(close_time);
CREATE INDEX IF NOT EXISTS idx_predictions_market_timestamp ON predictions(market_id, "timestamp" DESC);
