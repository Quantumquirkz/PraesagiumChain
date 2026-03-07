# Environment variables — minimal setup for Sepolia

This document lists the **minimum** variables required to run PraesagiumChain with **create market** and **place bet** on **Sepolia testnet**. For full options see [config/env.example](../config/env.example) and [config/frontend.env.example](../config/frontend.env.example).

---

## Root `.env` (backend + indexer + scripts)

Backend loads from repo root via [backend-rust/src/main.rs](../backend-rust/src/main.rs) and [scripts/run-backend.js](../scripts/run-backend.js).

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL URL. Example: `postgresql://praesagium:praesagium@localhost:5432/praesagium` |
| `RPC_URL` or `SEPOLIA_RPC_URL` | Yes (for indexer) | Sepolia RPC. Prefer `https://ethereum-sepolia-rpc.publicnode.com` to avoid Cloudflare 522 from rpc.sepolia.org. |
| `PREDICTION_MARKET_ADDRESS` | Yes (for indexer) | Deployed PredictionMarket on Sepolia. Must match frontend `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`. |
| `PORT` | No | Backend HTTP port (default `4000`). |
| `REDIS_URL` | No | If using Redis: when **backend runs on host** and Docker exposes Redis on port **6380**, use `redis://localhost:6380`. When backend runs inside Docker, use `redis://redis:6379`. |
| `CLICKHOUSE_URL` | No | Optional analytics (e.g. `http://localhost:8123`). |

**Docker note:** [docker-compose.yml](../docker-compose.yml) maps Redis to **6380** on the host. If the backend runs on the host, set `REDIS_URL=redis://localhost:6380`.

---

## Frontend `frontend/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` | Yes | Same contract address as backend `PREDICTION_MARKET_ADDRESS` (e.g. Sepolia deployment). |
| `NEXT_PUBLIC_RPC_URL` | Yes | Sepolia RPC. Prefer publicnode; avoid rpc.sepolia.org if you see 522 errors. |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | No | Default `https://sepolia.etherscan.io`. |
| `NEXT_PUBLIC_API_BASE_URL` | No | Leave **unset** in local dev so Next.js proxy forwards `/api/*` to the backend. Set only if the browser must call the backend URL directly. |
| `NEXT_PUBLIC_CHAIN_ID` or `NEXT_PUBLIC_CHAIN_IDS` | No | Default Sepolia `11155111`. |

---

## Quick checklist (create market + bet on Sepolia)

1. **Docker:** `docker compose up -d` (Postgres 5432, Redis 6380 on host, ClickHouse optional).
2. **Root `.env`:** `DATABASE_URL`, `RPC_URL` (or `SEPOLIA_RPC_URL`), `PREDICTION_MARKET_ADDRESS`; `REDIS_URL=redis://localhost:6380` if using Redis on host.
3. **Frontend `.env.local`:** `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` (same as backend), `NEXT_PUBLIC_RPC_URL` (e.g. publicnode).
4. **Backend:** `npm run backend`.
5. **Frontend:** `cd frontend && npm run dev`.
6. Wallet on Sepolia with testnet ETH; connect and create/bet.
