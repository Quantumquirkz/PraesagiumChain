# PraesagiumChain — Pending items (excluding frontend)

Checklist of what was pending and what remains.

---

## 1. Database on Supabase ✅

**Status:** Applied to the project with **`npx supabase db push`** (migrations in `supabase/migrations/`). Tables and the `on_chain_market_id` column are in Supabase.

If you need to apply the schema in another project or environment:

### Option A — Terminal with npx (recommended)

1. Link the project (first time only): `npx supabase link --project-ref <your-project-ref>`.
2. Push migrations:
   ```bash
   npx supabase db push
   ```
   Or from repo root: `npm run db:push`.

### Option B — SQL in the dashboard

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**: run the contents of **`supabase/schema.sql`**.

### Option C — Terminal with psql

With `DATABASE_URL` in `.env` (Supabase Postgres URI):

```bash
set -a && . .env && set +a
psql "$DATABASE_URL" -f supabase/schema.sql
```

---

## 2. Testnet — You need to do it

**Status:** No contracts deployed on testnet. Addresses in README and `docs/submission.md` remain empty.

Deployment cannot be done from this repo without your wallet (`PRIVATE_KEY`) and testnet ETH. Steps:

1. **Testnet ETH:** [Sepolia](https://sepoliafaucet.com) or [Polygon Amoy](https://faucet.polygon.technology).
2. **In `.env`:**
   - `PRIVATE_KEY` — private key of a **testnet-only** wallet.
   - `SEPOLIA_RPC_URL` — e.g. `https://rpc.sepolia.org` (or your network RPC).
   - `ETHERSCAN_API_KEY` — for contract verification on the explorer.
3. **Deploy:**
   ```bash
   npm run deploy:sepolia
   ```
   (or `npm run deploy:polygon` for Polygon Amoy).
4. **Copy the printed addresses** and fill:
   - **README.md** — “Deployed contracts” table.
   - **docs/submission.md** — “Deployed contracts” table (and explorer links).
5. **(Optional)** Verify on the explorer:
   ```bash
   npm run verify:sepolia
   ```

---

## 3. Summary (excluding frontend)

| Item | Status |
|------|--------|
| Backend (Rust, Axum, Postgres, indexer, tests, CORS, health) | ✅ Done |
| Schema and migrations in repo | ✅ Done |
| **Database applied on Supabase** | ✅ Done (`npx supabase db push`) |
| **Deploy contracts to testnet** | ⬜ You: wallet + `npm run deploy:sepolia` + fill addresses |
| Demo video / live link (hackathon) | ⬜ You |
| Frontend | ⬜ Out of scope |

**Next steps that depend on you:** deploy to testnet (with your PRIVATE_KEY and testnet ETH), fill addresses in README and submission.md, and for the hackathon: demo video and live link. Frontend is separate.
