# Operations — security, CI, performance

Single reference for audits, GitHub settings, pre-mainnet checks, and scaling notes.

**Audits:** CI runs `npm audit --audit-level=critical` (root + `frontend/`). `cargo audit` runs but does not fail the job while transitive advisories (ethers/sqlx) are tracked; run locally before releases. Local: `npm run audit`.

The root `audit` script ends with `cd backend && cargo audit || true` so a non-zero exit from `cargo audit` does not block the rest of the chain; treat advisories as triage, not necessarily ship-blockers.

**GitHub:** Enable Dependabot alerts, secret scanning, and optional dependency review on PRs.

**Pre-mainnet:** Contract audit or documented risk acceptance; verify `authorizedCallback` / resolver roles; use multisig or hardware keys for deploy; TLS + rate limits in prod; no secrets in repo (`env.example` only).

**Solidity static analysis:** CI runs [Slither](https://github.com/crytic/slither) on contracts with `continue-on-error: true` so informational findings do not block merges. Triage high-severity detector output before mainnet; run `slither . --hardhat-ignore-compile` locally when changing [`contracts/`](../contracts/).

**Stack:** Stateless Axum API behind a load balancer; Postgres source of truth; optional Redis/ClickHouse ([ADR-001](adr/adr-001-clickhouse-analytics.md)). Size DB pools to server limits; set HTTP timeouts. CI uses npm + Rust caches; parallel jobs in [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

**Later:** OpenTelemetry when SLOs exist; Postgres read replicas if reads dominate; queues for long jobs; [`infrastructure/kubernetes/`](../infrastructure/kubernetes/) optional for replicas.

`NEXT_PUBLIC_*` is browser-visible—only chain ID, public RPC, contract addresses.
