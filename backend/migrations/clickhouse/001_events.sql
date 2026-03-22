-- ClickHouse: analytics events (market events, prediction events).
-- Run once when setting up ClickHouse (e.g. scripts/docker-up.sh or manually).
-- Engine: MergeTree for ordered time-series inserts and efficient queries.

CREATE TABLE IF NOT EXISTS market_events
(
    created_at         DateTime,
    event_type         LowCardinality(String),
    market_id          Int64,
    on_chain_market_id Nullable(Int64),
    payload            String
) ENGINE = MergeTree()
ORDER BY (created_at, market_id)
TTL created_at + INTERVAL 1 YEAR;

CREATE TABLE IF NOT EXISTS prediction_events
(
    created_at    DateTime,
    market_id     Int64,
    probability   Float32,
    uncertainty   Nullable(Float32),
    model_version Nullable(String)
) ENGINE = MergeTree()
ORDER BY (created_at, market_id)
TTL created_at + INTERVAL 1 YEAR;
