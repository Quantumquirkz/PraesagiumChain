-- resolution_config: tracks price-based market resolution params for Chainlink Automation
-- Used to sync with AutomationResolver.addPriceMarket (on-chain) and for UI/API
CREATE TABLE IF NOT EXISTS resolution_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id       INTEGER NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    resolution_type TEXT    NOT NULL,
    feed_address    TEXT,
    threshold       REAL,
    created_at      INTEGER NOT NULL,
    UNIQUE(market_id)
);
CREATE INDEX IF NOT EXISTS idx_resolution_config_market ON resolution_config(market_id);
