# PraesagiumChain — Backend (Rust / Axum)

REST API with PHPE prediction engine, AI (Gemini / Hugging Face), reputation service, and optional on-chain event indexer. Database: **PostgreSQL**.

---

## 1. Requirements

- **Rust** (1.70+). If not installed:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
  Then open a new terminal or run: `source "$HOME/.cargo/env"`.

- **PostgreSQL** (any standard Postgres instance).

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

2. Edit `.env` and set at least:
   - **`DATABASE_URL`**: PostgreSQL connection string, e.g. `postgresql://postgres:PASSWORD@localhost:5432/praesagium`.

3. Optional variables:
   - `PORT` (default `4000`)
   - `AI_PROVIDER`, `GEMINI_API_KEY` / `HF_API_KEY` for sentiment
   - `RPC_URL`, `PREDICTION_MARKET_ADDRESS`, `START_BLOCK` for the **event indexer** (see below)
   - `CORS_ORIGINS` (comma-separated origins in production)

### Event indexer (optional)

The backend can run an **event indexer** that syncs on-chain market events to the database. It starts only if **both** `RPC_URL` and `PREDICTION_MARKET_ADDRESS` are set and **non-empty**. Leave them unset or empty to run without the indexer. If they are set to empty strings, the app would try to parse an empty address and fail; the code skips the indexer when either value is empty.

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
- **Markets list:** runs only if `DATABASE_URL` is set to a Postgres URI; otherwise the test is skipped.

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

- **“Invalid input length”**  
  This usually means the backend tried to parse `PREDICTION_MARKET_ADDRESS` as an Ethereum address but it was empty or invalid. Ensure `RPC_URL` and `PREDICTION_MARKET_ADDRESS` are either **unset** or **valid** (non-empty; address = 0x + 40 hex chars). Empty strings are now ignored (indexer is skipped).

- **Other DB errors**  
  To see where the error occurs (connection vs migrations) and a full backtrace:
  ```bash
  cd backend-rust
  RUST_BACKTRACE=1 cargo run 2>&1
  ```

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

- **API and environment variables:** [docs/development-and-deployment.md](../docs/development-and-deployment.md)
- **Architecture:** [docs/architecture-and-design.md](../docs/architecture-and-design.md)
