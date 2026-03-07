-- private_market_access_keys: access keys for private markets (off-chain discovery)
-- Creator registers market after on-chain creation; others use key to join and view
CREATE TABLE IF NOT EXISTS private_market_access_keys (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    on_chain_market_id  INTEGER NOT NULL UNIQUE,
    access_key          TEXT    NOT NULL UNIQUE,
    creator_address     TEXT    NOT NULL,
    question            TEXT    NOT NULL,
    close_time          INTEGER NOT NULL,
    resolve_time        INTEGER NOT NULL,
    created_at          INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_private_access_key ON private_market_access_keys(access_key);
CREATE INDEX IF NOT EXISTS idx_private_access_on_chain ON private_market_access_keys(on_chain_market_id);
