# AI Integration for PraesagiumChain

Scripts and utilities for integrating AI (e.g. sentiment analysis) with Chainlink Functions and the backend.

## Contents

- **sentiment-analysis.js** — Sample script for Chainlink Functions: analyzes text and returns 0 (No) or 1 (Yes) for market resolution.
- **huggingface-api.js** — Node.js helper to call Hugging Face Inference API (local testing or off-chain automation).

## Chainlink Functions

1. Deploy a consumer that requests a run with the source from sentiment-analysis.js (or adapted).
2. The script receives inputs (e.g. market id, text) and returns 0 or 1.
3. OracleConsumer or CRE workflow receives the result and calls resolveMarket(marketId, outcome).

## Backend AI

- **POST /api/ai/sentiment** — Body: `{ "text": "..." }`. Returns sentiment score and probability.
- **POST /api/markets/:id/ai/predict** — Same body; stores result as prediction for the market.

Set AI_PROVIDER=huggingface, HF_API_KEY, and HF_MODEL to use Hugging Face. Otherwise the mock provider is used.

## Chainlink Automation

Register an Upkeep that triggers at market resolveTime and calls the backend or a Chainlink Function to run AI analysis and feed the result for resolution.
