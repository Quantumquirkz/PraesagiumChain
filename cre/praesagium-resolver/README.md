# CRE workflow: standard prediction market resolution

TypeScript workflow using `@chainlink/cre-sdk`. It does **not** send transactions; it computes an outcome from the backend AI sentiment API.

## Inputs / outputs

| Item | Description |
|------|-------------|
| **Trigger** | Cron schedule (see `config.staging.json` / `config.production.json`) |
| **HTTP** | `POST {api_base_url}/api/ai/sentiment` with JSON `{ "text": "<text_to_analyze>" }` |
| **Response** | Uses `probability` from the backend; maps to binary outcome `1` (Yes) / `0` (No) |
| **On-chain** | Production must call `OracleConsumer.oracleCallback` via executor, Automation, or [`scripts/resolveFromBackend.js`](../../scripts/resolveFromBackend.js) |

## Environment

- **Simulation / local:** set `CRE_ETH_PRIVATE_KEY` in `cre/.env` (see [`cre/.env.example`](../.env.example)).
- **Backend:** root `.env` with `API_BASE_URL` or run `npm run backend` so `api_base_url` in workflow config points at `http://localhost:4000` (or your host).

## Local verification

1. Start backend: `npm run backend` from repo root.
2. Run walkthrough: `node scripts/simulateCRE.js` (from repo root).
3. After `npm run compile`, sync ABI if needed: `npm run sync:cre-abi`.

## Config files

- `config.staging.json` — schedule, `api_base_url`, `text_to_analyze`, `market_id`, `chain_name`, optional `oracle_consumer_address`.
