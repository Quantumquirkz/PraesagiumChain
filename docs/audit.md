# Frontend/Backend Audit — Flow and Endpoint Inventory

**Date:** 2025-03-07  
**Goal:** List of flows/endpoints with status OK / Fragile / Broken and API contract verified.

---

## 1. Frontend flows and status

| Flow | File(s) | API / Contract | Status | Notes |
|------|---------|----------------|--------|-------|
| Dashboard | `app/page.tsx` | `getStats`, `getMarkets` | OK | Pagination and `status` filter; `getMarkets` normalizes `items` and `data.items`. |
| Market detail | `market-page-client.tsx` | `getMarket`, `getMarketPredictions`, on-chain `getMarket`, `getUserStake` | OK | `chainIdForContract = market.on_chain_market_id ?? id`; predictions use `market.id`. |
| Create market | `markets/create/page.tsx` | `createMarketBackend`, `registerPrivateMarket` | OK | Body aligned with backend; private register with `PrivateMarketRegisterRequest`. |
| Positions | `positions/page.tsx` | `getMarkets`, on-chain `getUserStake` | OK | Preferred outcome on-chain; claim uses `on_chain_market_id ?? market.id`; error guard with Retry. |
| Signals | `signals-dashboard.tsx` | `fetchSource` | OK | Finnhub requires `FINNHUB_API_KEY`; UI shows message when not configured. |
| Join private | `join-private-market-card.tsx` | `validatePrivateMarketKey` → GET `/api/markets/private/access?key=` | OK | Friendly 404 message: "Invalid or expired access key...". Backend validates key length (≤64). |
| Footer health | `footer.tsx` | `checkHealth` → `fetch("/health")` | OK | Proxy in next.config.js; does not use `getBaseUrl()`. |
| Conditional tree | `conditional-tree.tsx` | `getMarketConditions`, `getMarket` | OK | Endpoints and types aligned. |
| Market stream | `use-market-stream.ts` | GET `/api/markets/:id/stream` (SSE) | OK | Router and handler present. |

---

## 2. API contract (frontend lib/api.ts vs backend router + models)

| FE function | Method | Path | Body/Query | Status |
|-------------|--------|------|------------|--------|
| `getStats` | GET | `/api/markets/stats` | — | OK |
| `getMarkets` | GET | `/api/markets` | page, limit, status | OK; normalizes `items` and `data`. |
| `getMarket` | GET | `/api/markets/:id` | — | OK; backend returns MarketView with `on_chain_market_id`. |
| `getMarketPredictions` | GET | `/api/markets/:id/predictions` | — | OK; backend returns `Vec<PredictionView>`. |
| `createMarketBackend` | POST | `/api/markets` | question, close_time, resolve_time, market_type?, metadata?, on_chain_market_id? | OK |
| `getHybridPrediction` | POST | `/api/predict/hybrid` | body | OK |
| `getMarketAIAnalysis` | POST | `/api/markets/:id/ai/analysis` | sentiment_text?, binance_symbol? | OK |
| `getReputation` | GET | `/api/reputation/:address` | — | OK |
| `getMarketConditions` | GET | `/api/markets/:id/conditions` | — | OK |
| `fetchSource` | GET | `/api/sources/fetch` | source + params | OK |
| `checkHealth` | GET | `/health` | — | OK (proxy) |
| `getFeedPrice` | GET | `/api/feeds/price` | feed | OK |
| `registerPrivateMarket` | POST | `/api/markets/private/register` | PrivateMarketRegisterRequest | OK |
| `validatePrivateMarketKey` | GET | `/api/markets/private/access` | key (query) | OK |

---

## 3. Frontend types vs backend (models.rs)

| Type | Match | Note |
|------|-------|------|
| MarketView | OK | Backend includes optional `on_chain_market_id`. |
| PaginatedResponse | OK | items, total, page, limit; backend i64 serializes as number. |
| PredictionView | OK | probability (f32→number), uncertainty, model_version, model_hash?, timestamp. |
| ConditionalConditionView | OK | id, condition_contract, condition_market_id, expected_outcome. |
| FetchResponse | OK | source, price?, price_change_24h?, volume_24h?, sentiment?; backend Option<> → null. |
| FeedPriceResponse | OK | feed, price (i64 raw), price_formatted, decimals, updated_at. |
| PrivateMarketRegisterResponse | OK | access_key, market_id, message. |
| PrivateMarketAccessResponse | OK | market_id, question, close_time, resolve_time, creator. |
| HybridPredictResponse | OK | probability, uncertainty?, market_id?. |
| AIAnalysisResponse | OK | analysis, description (verify ai.rs handler). |

---

## 4. Known errors and mitigations

- **Backend unreachable:** `fetchApi` throws with message; locally do not set `NEXT_PUBLIC_API_BASE_URL` to use proxy.
- **Finnhub:** UI shows message if `FINNHUB_API_KEY` is missing in backend.
- **Market metadata:** `generateMetadata` in `markets/[id]/page.tsx` uses try/catch and fallback if `getMarket` fails.
- **Market ID:** In detail and positions, use `market.on_chain_market_id ?? id` for contract calls; `market.id` for predictions/conditions API.

---

## 5. Backend ID vs on-chain ID

- **URL `/markets/[id]`:** `id` is the backend table ID.
- **Contract (getMarket, getUserStake):** use `market.on_chain_market_id ?? id` so it matches on-chain ID when the market is indexed.
- **Predictions/conditions API:** use `market.id` (always backend ID).

---

## 6. Phase 2 — Backend endpoints verified

| Endpoint | Expected code | Integration tests |
|----------|---------------|-------------------|
| GET /health | 200, ok/status | (implicit on startup) |
| GET /api/markets/stats | 200, MarketStats | — |
| GET /api/markets | 200, PaginatedResponse | list_markets_returns_paginated |
| GET /api/markets/:id | 200 MarketView / 404 | get_by_id_returns_404_for_nonexistent |
| GET /api/markets/:id/predictions | 200, Vec\<PredictionView\> | get_predictions_returns_empty_for_nonexistent_market |
| POST /api/markets | 201 MarketView | create_market_returns_201_with_valid_body |
| GET /api/markets/private/access?key= | 200 / 404 | private_access_returns_404_for_invalid_key |
| GET /api/sources/fetch | 200 FetchResponse / 400 | sources_fetch_returns_400_for_unknown_source |

Integration tests that require `DATABASE_URL` (PostgreSQL) are skipped when it is not set. Run: `cargo test` in `backend-rust/`.

---

## 7. Phase 4 — Subagents summary

**Code reviewer**
- Status: OK after fix. Positions mobile view was updated to use `market.on_chain_market_id ?? market.id` in `ActionCell` (previously used only `market.id`).
- Optional suggestions: note that the predictions test for non-existent id defines behaviour 200+[]; predictions queryKey uses `market?.id ?? id` (correct for API).

**Security auditor**
- Original findings: 0 critical, 0 high, 2 medium, 3 low.
- **Applied (post-audit improvements):**
  - Create market limits: `metadata` ≤ 10_000 chars, `creator` ≤ 100 (`backend-rust/src/services/market.rs`).
  - Register private limits: `question` ≤ 500, `creator_address` ≤ 100 (`backend-rust/src/api/private_markets.rs`).
  - Length limits on `/api/sources/fetch` params: `symbol`, `fsym`, `tsym`, `pair` ≤ 64 chars (`backend-rust/src/api/sources.rs`).
  - Generic message for `ExternalApi` in production: client gets "External service error"; detail only in logs (`backend-rust/src/error.rs`).
  - Global body limit: 2 MB via `DefaultBodyLimit::max(2 * 1024 * 1024)` in `backend-rust/src/startup.rs`; larger bodies may return 413.
  - `key` length validation on GET `/api/markets/private/access` (≤ 64 chars) was already in place.
- Pending: none of the above; security-auditor recommendations covered.

**Code reviewer (post-audit):** Status OK. Optional: apply same limits in `create_conditional()` (question, metadata, creator) and validate `source` length in sources/fetch (≤ 64).

**Security auditor (post-audit):** Status OK. Optional: same limits in create_conditional; length limit for `source` param in fetch.

---

## 8. Phase 5 — E2E checklist and documentation

**E2E checklist (manual or automated)**

1. Start backend (`npm run backend` or equivalent) and frontend (`npm run dev`).
2. Without `NEXT_PUBLIC_API_BASE_URL`: verify proxy serves `/health` and `/api/markets`.
3. Dashboard: list, status filter, pagination.
4. Market detail: load, predictions, on-chain stake, bet (if wallet connected and market Open).
5. Create market: full flow (on-chain + optional backend + optional private register).
6. Positions: list markets with stake and claim when applicable (use `on_chain_market_id` for claim).
7. Signals: at least one source (e.g. Binance) returns data; Finnhub shows message if no API key.
8. Join private: valid and invalid key show appropriate message (invalid key → "Invalid or expired access key...").

**Documentation updated**

- `docs/architecture.md`: Frontend section documents backend proxy, `FINNHUB_API_KEY` for Signals.
- This document (`docs/audit.md`): flow inventory, API contract, verified endpoints, subagents summary, E2E checklist.
- Backend integration tests: documented in § 6; run `cargo test` in `backend-rust/` (tests requiring `DATABASE_URL` are skipped when not set for PostgreSQL).
