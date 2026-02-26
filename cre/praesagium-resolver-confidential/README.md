# CRE Workflow — Confidential (Private Prediction Markets)

Workflow for resolving **Private Prediction Markets** via Chainlink CRE, designed for **Confidential Compute** (TEE-based execution).

## Purpose

- Same resolution logic as `praesagium-resolver` (HTTP → sentiment API → outcome 0/1).
- Structured for **Chainlink Confidential Compute**: when run in a TEE, resolution inputs (e.g. `text_to_analyze`) remain private; only the outcome is emitted.
- Config flag `is_private_market: true` indicates resolution targets a `PrivatePredictionMarket` contract.

## Simulate

```bash
cd cre
cre workflow simulate praesagium-resolver-confidential --target staging-settings
```

Ensure the backend is running (`npm run backend`). At the prompt, choose **cron-trigger**.

## Files

| File | Purpose |
|------|---------|
| `main.ts` | CRE workflow (CRON → HTTP → outcome) |
| `config.staging.json` | Staging config |
