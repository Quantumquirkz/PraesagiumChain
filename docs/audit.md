# Audit reference

Detailed flow tables are **source-of-truth in code**. Use:

- [`frontend/lib/api.ts`](../frontend/lib/api.ts) — API client and types
- [`backend/src/api/`](../backend/src/api/) — HTTP handlers
- [`backend/src/models.rs`](../backend/src/models.rs) — response shapes

**Tests:** `cd backend && cargo test` (PostgreSQL via `DATABASE_URL` for integration tests).

**Limits:** Global body max 2 MB (`startup.rs`). Per-route string limits live in `backend/src/services/market.rs`, `api/private_markets.rs`, `api/sources.rs`.

**Manual smoke:** start backend + frontend; dashboard, market detail, create market, positions; verify `/health` and `/api/markets` (use Next proxy unless `NEXT_PUBLIC_API_BASE_URL` is set).

For contract and UI architecture, see [architecture.md](architecture.md).
