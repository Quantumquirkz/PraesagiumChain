# Operations — security, CI, performance

Single reference for audits, GitHub settings, pre-mainnet checks, and scaling notes.

**Audits:** CI runs `npm audit --audit-level=critical` on the main build. A job `dependency-audit-high` runs `npm audit --audit-level=high` (with `continue-on-error: true`) for visibility until transitive issues are resolved. The backend job runs `cargo audit` and **fails** on reported advisories. Local: `npm run audit` (the root script may still use `cargo audit || true` for convenience).

**GitHub:** Enable Dependabot alerts (see [`.github/dependabot.yml`](../.github/dependabot.yml)), secret scanning, and optional dependency review on PRs.

**Pre-mainnet:** Contract audit or documented risk acceptance; verify `authorizedCallback` / resolver roles; use multisig or hardware keys for deploy; TLS + rate limits in prod; no secrets in repo (`env.example` only).

**Solidity static analysis:** CI runs [Slither](https://github.com/crytic/slither) with `--fail-high` on contracts (fails the job on high/critical findings). Triage or suppress with documented exclusions before mainnet; run `slither . --hardhat-ignore-compile --exclude-dependencies --fail-high` locally when changing [`contracts/`](../contracts/).

**Stack:** Stateless Axum API behind a load balancer; Postgres source of truth; optional Redis/ClickHouse ([ADR-001](adr/adr-001-clickhouse-analytics.md)). Size DB pools to server limits; set HTTP timeouts. CI uses npm + Rust caches; parallel jobs in [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

**Later:** OpenTelemetry when SLOs exist; Postgres read replicas if reads dominate; queues for long jobs; [`infrastructure/kubernetes/`](../infrastructure/kubernetes/) optional for replicas.

`NEXT_PUBLIC_*` is browser-visible—only chain ID, public RPC, contract addresses.
