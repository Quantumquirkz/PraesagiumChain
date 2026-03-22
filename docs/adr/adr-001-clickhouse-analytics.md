# ADR-001: ClickHouse for analytics and event streaming

## Status

Accepted.

## Context

PraesagiumChain needs a place to store high-volume, append-only events (market created, resolved, predictions updated, resolutions evaluated) for analytics, dashboards, and auditing without impacting the transactional PostgreSQL workload. PostgreSQL is used for source-of-truth data; we want to avoid overloading it with event streams and time-series queries.

## Decision

Use **ClickHouse** as the analytics store for event data. When `CLICKHOUSE_URL` is set, the backend subscribes to the in-process `EventBus` and asynchronously writes events to ClickHouse. Failures are logged and do not affect the API (fire-and-forget).

- **Tables:** `market_events` (event_type, market_id, on_chain_market_id, payload JSON string), `prediction_events` (market_id, probability, uncertainty, model_version). DDL in `backend/migrations_clickhouse/001_events.sql`.
- **Consistency:** Eventual. No transactional guarantee between PostgreSQL and ClickHouse.
- **Optional:** If `CLICKHOUSE_URL` is not set, no writes are performed and the backend runs as before.

## Consequences

- Analytics and time-series queries can be run against ClickHouse without affecting PostgreSQL.
- Event schema is versioned in SQL; new event types can be added by extending the payload or adding columns.
- Operators must run ClickHouse (e.g. via Docker or managed service) and apply the DDL once. See `scripts/docker-up.sh` and `docker-compose.yml`.

## Alternatives considered

- **PostgreSQL only:** Would mix transactional and analytical load; more complex indexing and partitioning for time-series.
- **Redis Streams:** Good for real-time consumption but not ideal for long-term analytics and ad-hoc SQL.
- **No analytics DB:** Would require polling PostgreSQL or logging to files; no dedicated analytics layer.
