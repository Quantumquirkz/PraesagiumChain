# Environment variables — minimal setup for Sepolia

This document lists the **minimum** variables required to run PraesagiumChain with **create market** and **place bet** on **Sepolia testnet**. For full options see [config/env.example](../config/env.example).

**Single `.env` at repo root** — Backend, Hardhat, and Next.js (via `loadEnvConfig`) all read from the same file.

---

## Root `.env` (backend + frontend + scripts)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL URL. Example: `postgresql://praesagium:praesagium@localhost:5432/praesagium` |
| `RPC_URL` or `SEPOLIA_RPC_URL` | Yes (for indexer) | Sepolia RPC. Prefer `https://ethereum-sepolia-rpc.publicnode.com` to avoid Cloudflare 522 from rpc.sepolia.org. |
| `PREDICTION_MARKET_ADDRESS` | Yes (for indexer) | Deployed PredictionMarket on Sepolia. Same as `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`. |
| `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` | Yes | Same as `PREDICTION_MARKET_ADDRESS` (frontend). |
| `NEXT_PUBLIC_RPC_URL` | Yes | Sepolia RPC for wallet (e.g. publicnode). |
| `NEXT_PUBLIC_CHAIN_ID` | No | Default Sepolia `11155111`. |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | No | Default `https://sepolia.etherscan.io`. |
| `PORT` | No | Backend HTTP port (default `4000`). |
| `REDIS_URL` | No | When backend runs on host and Docker maps Redis to 6380: `redis://localhost:6380`. |
| `CLICKHOUSE_URL` | No | Optional analytics (e.g. `http://localhost:8123`). |

**Docker:** [docker-compose.yml](../docker-compose.yml) maps Redis to **6380** on the host. Use `REDIS_URL=redis://localhost:6380`.

---

## Quick checklist (create market + bet on Sepolia)

1. **Docker:** `docker compose up -d` (Postgres 5432, Redis 6380 on host, ClickHouse optional).
2. **Single `.env`:** `DATABASE_URL`, `RPC_URL`, `PREDICTION_MARKET_ADDRESS`, `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`, `NEXT_PUBLIC_RPC_URL`; `REDIS_URL=redis://localhost:6380` if using Redis.
3. **Backend:** `npm run backend`.
4. **Frontend:** `cd frontend && npm run dev`.
5. Wallet on Sepolia with testnet ETH; connect and create/bet.
