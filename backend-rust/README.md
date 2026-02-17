# PraesagiumChain Backend (Rust)

Production-oriented Rust backend built with **Axum** and **SQLite**, with direct integration of the **PHPE** prediction engine.

## Key capabilities

- REST API for markets and predictions
- SQLite persistence with migrations
- Optional on-chain indexing (config-driven)
- AI sentiment endpoint (mock or Hugging Face Inference API)
- In-memory prediction cache + basic metrics endpoint

## Build & run

```bash
cd backend-rust
cargo build --release
cargo run --release
```

## Environment variables

```bash
PORT=4000
DATABASE_URL=sqlite:./data/markets.db

# Optional: on-chain indexer
RPC_URL=http://127.0.0.1:8545
PREDICTION_MARKET_ADDRESS=0x...
START_BLOCK=0

# Optional: AI provider
AI_PROVIDER=mock            # or: huggingface
HF_API_KEY=...
HF_MODEL=distilbert-base-uncased-finetuned-sst-2-english
```

## API overview

- `GET /health`
- `GET /api/markets` (query: `page`, `limit`, `status`)
- `POST /api/markets`
- `POST /api/markets/conditional`
- `GET /api/markets/stats`
- `GET /api/markets/:id`
- `PATCH /api/markets/:id/status`
- `POST /api/markets/:id/prediction`
- `GET /api/markets/:id/predictions` (query: `limit`)
- `POST /api/predict` (PHPE)
- `POST /api/ai/sentiment`
- `POST /api/markets/:id/ai/predict`
- `GET /api/metrics`

