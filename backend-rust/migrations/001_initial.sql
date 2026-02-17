CREATE TABLE IF NOT EXISTS markets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    close_time INTEGER NOT NULL,
    resolve_time INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    outcome TEXT,
    total_yes_stake INTEGER NOT NULL DEFAULT 0,
    total_no_stake INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id INTEGER NOT NULL,
    probability REAL NOT NULL,
    uncertainty REAL,
    model_version TEXT,
    model_hash TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (market_id) REFERENCES markets(id)
);

CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_predictions_market_id ON predictions(market_id);
