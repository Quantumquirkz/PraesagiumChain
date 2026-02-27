-- SQLite — Schema inicial
CREATE TABLE IF NOT EXISTS markets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question        TEXT    NOT NULL,
    close_time      INTEGER NOT NULL,
    resolve_time    INTEGER NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'Open',
    outcome         TEXT,
    total_yes_stake INTEGER NOT NULL DEFAULT 0,
    total_no_stake  INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    creator         TEXT,
    market_type     TEXT    NOT NULL DEFAULT 'base',
    metadata        TEXT,
    details_hash    TEXT,
    encrypted_uri   TEXT,
    on_chain_market_id INTEGER UNIQUE
);

CREATE TABLE IF NOT EXISTS predictions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id     INTEGER NOT NULL REFERENCES markets(id),
    probability   REAL    NOT NULL,
    uncertainty   REAL,
    model_version TEXT,
    model_hash    TEXT,
    timestamp     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conditional_conditions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id           INTEGER NOT NULL REFERENCES markets(id),
    condition_contract  TEXT    NOT NULL,
    condition_market_id INTEGER NOT NULL,
    expected_outcome    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS creator_reputation (
    creator_address     TEXT    PRIMARY KEY,
    markets_created     INTEGER NOT NULL DEFAULT 0,
    markets_resolved    INTEGER NOT NULL DEFAULT 0,
    correct_predictions INTEGER NOT NULL DEFAULT 0,
    reputation_score    REAL    NOT NULL DEFAULT 0,
    updated_at          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS market_resolutions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id       INTEGER NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    resolution_type TEXT    NOT NULL,
    outcome         INTEGER NOT NULL,
    confidence      REAL,
    source          TEXT,
    raw_value       REAL,
    resolved_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_markets_status           ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_close_time       ON markets(close_time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_on_chain  ON markets(on_chain_market_id) WHERE on_chain_market_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_predictions_market_id    ON predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_predictions_market_ts    ON predictions(market_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conditions_market_id     ON conditional_conditions(market_id);
CREATE INDEX IF NOT EXISTS idx_reputation_score         ON creator_reputation(reputation_score);
CREATE INDEX IF NOT EXISTS idx_resolutions_market_id    ON market_resolutions(market_id);
CREATE INDEX IF NOT EXISTS idx_resolutions_resolved_at  ON market_resolutions(resolved_at DESC);
