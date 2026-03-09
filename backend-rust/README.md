# PraesagiumChain — Backend (Rust / Axum)

REST API with PHPE prediction engine, AI (Groq / Gemini / Hugging Face), reputation service, and optional on-chain event indexer. Database: **PostgreSQL** (required). Redis and ClickHouse are optional for cache/sessions and analytics.

---

## 1. Requirements

- **Rust** (1.70+). If not installed:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
  Then open a new terminal or run: `source "$HOME/.cargo/env"`.

- **PostgreSQL**: required. Use `DATABASE_URL=postgresql://...` in `.env`. For local dev, run PostgreSQL via Docker: `docker compose up -d` (see repo root).

- **OpenSSL** (system) for building. On Ubuntu/Debian/WSL:
  ```bash
  sudo apt update && sudo apt install -y pkg-config libssl-dev
  ```
  On Fedora: `sudo dnf install openssl-devel pkg-config`. On macOS: `brew install openssl pkg-config`.

---

## 2. Configuration (`.env`)

The backend loads `.env` from the **repository root** (parent of `backend-rust`). You can also place a `.env` inside `backend-rust/` for local overrides.

1. Copy the template (from repo root):
   ```bash
   cp config/env.example .env
   ```

2. Edit `.env`; **required**:
   - **`DATABASE_URL`**: PostgreSQL connection string, e.g. `postgresql://praesagium:PASSWORD@localhost:5432/praesagium`.

3. Optional variables:
   - `PORT` (default `4000`)
   - `REDIS_URL` (e.g. `redis://localhost:6380`) for SIWE nonce store when using the Docker stack
   - `CLICKHOUSE_URL` (e.g. `http://localhost:8123`) for analytics events
   - `AI_PROVIDER`, `GROQ_API_KEY` / `GEMINI_API_KEY` / `HF_API_KEY` for sentiment
   - `RPC_URL`, `PREDICTION_MARKET_ADDRESS`, `START_BLOCK` for the **event indexer** (see below)
   - `CORS_ORIGINS` (comma-separated origins in production)

### Event indexer (optional)

The backend can run an **event indexer** that syncs on-chain market events to the database. It starts only if **both** `RPC_URL` and `PREDICTION_MARKET_ADDRESS` are set and **non-empty**. Leave them unset or empty to run without the indexer.

---

## 3. Build

From this directory (`backend-rust`):

```bash
cargo build
```

Release (optimized):

```bash
cargo build --release
```

---

## 4. Tests

```bash
cargo test
```

- **Health:** always runs (no DB required).
- **Markets list, get by id, predictions, private access, sources/fetch, create market:** run only if `DATABASE_URL` is set to a PostgreSQL URL; otherwise those tests are skipped.

**Request body limit:** The API applies a global limit of **2 MB** on request body size (Axum `DefaultBodyLimit`). Requests with a larger body may receive **413 Payload Too Large**. See [docs/audit.md](../docs/audit.md) for validation limits on specific fields.

---

## 5. Run the server

From the repo root (where `.env` lives):

```bash
cd backend-rust
cargo run --release
```

Or in debug mode:

```bash
cargo run
```

The server listens on `http://0.0.0.0:4000` by default. Check:

- `GET http://localhost:4000/health` → `{ "ok": true, "status": "ok", ... }`

**Migrations** run automatically on startup; no separate migration step is needed.

### Troubleshooting

- **"DATABASE_URL is required"**  
  Set `DATABASE_URL=postgresql://user:password@host:5432/database` in `.env`. Start PostgreSQL (e.g. `docker compose up -d`).

- **"password authentication failed"**  
  PostgreSQL is running but credentials in `DATABASE_URL` are wrong. Create the user and database, or use the same credentials as in `docker-compose.yml` (e.g. `praesagium` / `praesagium`).

- **"Invalid input length"**  
  Usually means `PREDICTION_MARKET_ADDRESS` was parsed as an Ethereum address but was empty or invalid. Ensure `RPC_URL` and `PREDICTION_MARKET_ADDRESS` are either **unset** or **valid**. Empty strings are ignored (indexer is skipped).

---

## 6. Command summary

| Action        | Command (from repo root) |
|---------------|---------------------------|
| Create `.env` | `cp config/env.example .env` |
| Build        | `cd backend-rust && cargo build --release` |
| Test         | `cd backend-rust && cargo test` |
| Run API      | `cd backend-rust && cargo run --release` |

---

## 7. Documentation

- **API and environment variables:** [docs/configuration.md](../docs/configuration.md)
- **Architecture:** [docs/architecture.md](../docs/architecture.md)
