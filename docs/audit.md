# Audit reference

Detailed flow tables are **source-of-truth in code**. Use:

- [`frontend/lib/api.ts`](../frontend/lib/api.ts) — API client and types
- [`backend/src/api/`](../backend/src/api/) — HTTP handlers
- [`backend/src/models.rs`](../backend/src/models.rs) — response shapes

**Tests:** `cd backend && cargo test` (PostgreSQL via `DATABASE_URL` for integration tests).

**Limits:** Global body max 2 MB (`startup.rs`). Per-route string limits live in `backend/src/services/market.rs`, `api/private_markets.rs`, `api/sources.rs`. Paginated market lists clamp `limit` to 1–100 (`api/markets.rs`).

**Admin:** Non-production `DELETE /api/admin/*` requires `ADMIN_API_KEY` and matching `X-Admin-Token` header ([`backend/src/api/admin.rs`](../backend/src/api/admin.rs)); production always forbids these routes.

**Manual smoke:** start backend + frontend; dashboard, market detail, create market, positions; verify `/health` and `/api/markets` (use Next proxy unless `NEXT_PUBLIC_API_BASE_URL` is set).

For contract and UI architecture, see [architecture.md](architecture.md).
