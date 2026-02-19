# PraesagiumChain — Security and Operations

Unified document for security (contracts and backend), production optimization, monitoring, CI/CD, and vulnerability reporting.

---

## 1. Security

### 1.1 Smart Contracts

| Contract | Measures |
|----------|----------|
| **PredictionMarket.sol** | Checks-Effects-Interactions; reentrancy mitigated by updating state before external calls. |
| **OracleConsumer.sol** | `oracleCallback` restricted via `authorizedCallback`. In production: Chainlink Functions Router or CRE executor. |
| **CREWorkflow.sol** | `resolveFromOracle` restricted to `onlyOracle` (OracleConsumer address). |
| **ReputationSystem.sol** | `onlyAuthorized` for callbacks; creator check on resolution. |

**Recommendations:**
- Run Slither: `slither . --exclude-dependencies` (`pip install slither-analyzer`).
- Consider MythX or similar analysis tools.
- Before mainnet: set `authorizedCallback` to Chainlink Functions Router, not an EOA.
- Consider OpenZeppelin `ReentrancyGuard` on `claimPayout` for defense in depth.

### 1.2 Backend (Rust)

- Input validation on endpoints (e.g. max text length for sentiment).
- DB access via parameterized queries (SQLx) to prevent injection.
- No secrets in logs; structured error handling.
- Check dependencies: `cargo install cargo-audit && cargo audit`.

**Next steps:**
- Rate limiting on public endpoints (e.g. `tower_governor`).
- JWT authentication on sensitive routes if exposing to untrusted clients.
- Run `cargo clippy` and fix warnings.

### 1.3 Chainlink and CRE

- Deterministic resolution: same inputs → same outcome.
- CRE workflow with consensus aggregation where applicable.
- Ensure `api_base_url` points to a trusted backend.

### 1.4 Vulnerability Reporting

Do not open public issues for security vulnerabilities.

**Contact:** Create a private security advisory in the repository (Security → Advisories → New draft).

---

## 2. Production Optimization

### 2.1 Implemented

| Area | Changes |
|------|---------|
| Contract security | OracleConsumer: `authorizedCallback`. Deploy scripts configure it. |
| Backend validation | `/api/ai/sentiment`, `/api/predict/hybrid`: text limits, array limits, empty checks. |
| CI/CD | `npm audit`, `cargo audit` in GitHub Actions. |
| Documentation | CONTRIBUTING.md, issue templates. |
| IP protection | PHPE documentation, terms in CONTRIBUTING. |

### 2.2 Recommended Next Steps

1. **Rate limiting** — e.g. `tower_governor` on `/api/ai/sentiment`.
2. **JWT** — Sensitive routes if exposing to untrusted clients.
3. **Slither** — Run on contracts and fix findings.
4. **Layer 2** — Evaluate Arbitrum/Optimism for lower gas.
5. **DB indexes** — On `markets.close_time`, `predictions.market_id` for heavy queries.
6. **Compliance** — Document MiCA/SEC considerations if offering services in regulated jurisdictions.

---

## 3. Monitoring and Operations

### 3.1 Logging

The backend uses **tracing**. Filter with:

```bash
RUST_LOG=praesagium_backend=debug,tower_http=debug npm run backend
```

Levels: `error`, `warn`, `info`, `debug`, `trace`.

### 3.2 Production

| Component | Recommendation |
|-----------|----------------|
| **Prometheus/Grafana** | Export metrics (request count, latency, errors). Endpoint `/api/metrics`. |
| **Alerts** | Repeated errors, DB connection failures, oracle timeouts. |
| **Health check** | `/health` returns `{"ok": true}`; use for load balancer. |
| **Chainlink** | Monitor CRE workflow runs and callback success/failure. |

### 3.3 CORS and Rate Limiting

- **CORS:** Set `CORS_ORIGINS` with allowed origins in production. If empty, all are allowed (development only).
- **Rate limiting:** If not implemented in backend, use reverse proxy (nginx, Cloudflare) or gateway with limits.

### 3.4 Bug Reporting

Use the [Bug report](.github/ISSUE_TEMPLATE/bug_report.md) template: include environment, steps to reproduce, and logs.

---

## 4. CI/CD

The `.github/workflows/deploy.yml` workflow includes:

- Contract tests (Hardhat).
- `npm audit --audit-level=high`.
- Backend tests (Rust).
- `cargo audit` for dependencies.

Local command for audits:
```bash
npm run audit
```
