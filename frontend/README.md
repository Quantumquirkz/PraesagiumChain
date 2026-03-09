## Frontend — PraesagiumChain

The frontend is a **Next.js 14 (App Router)** application that talks to the Rust backend and the `PredictionMarket` smart contracts. It lives entirely in this `frontend/` directory.

---

### 1. Structure

- **`app/`**: Top-level routes (App Router):
  - `/` → `app/page.tsx` — markets dashboard (list, filters, stats).
  - `/markets/[id]` → `app/markets/[id]/page.tsx` + `market-page-client.tsx` — market detail (chart + bet form).
  - `/markets/create` → `app/markets/create/page.tsx` — create-market wizard (public + private).
  - `/markets/private` → `app/markets/private/page.tsx` — commit–reveal private markets.
  - `/positions` → `app/positions/page.tsx` — user positions and claimable payouts.
  - `/signals` → `app/signals/page.tsx` — PHPE / hybrid data sources dashboard.
  - `/about` → `app/about/page.tsx` — “how it works” overview.

- **`components/`**:
  - Domain components: `market-detail.tsx`, `bet-form.tsx`, `hero-section.tsx`, `tx-status.tsx`, etc.
  - Layout: `header.tsx`, `footer.tsx`, `providers.tsx`.
  - UI primitives: `components/ui/*` (shadcn/ui).

- **`hooks/`**:
  - `use-markets.ts` — React Query hooks for markets list + stats + infinite scroll.
  - `use-market-on-chain.ts`, `use-private-markets.ts` — on-chain reads via wagmi.
  - `use-network-guard.ts` — enforces allowed chains (local / Sepolia) and drives network banners.
  - `use-place-bet.ts` — wraps `writeContract` for `placeBet`.

- **`lib/`**:
  - `api.ts` — HTTP client functions to the Rust backend (`/api/markets`, `/api/ai/sentiment`, etc.).
  - `constants.ts` — contract addresses, OUTCOME enum, bet tokens, config.
  - `wagmi.ts` — wagmi config (chains and connectors).
  - `utils.ts` — shared helpers (`cn`, `formatEth`, `formatRelativeTime`, address helpers).
  - `abis/` — PredictionMarket and related contract ABIs.

- **`types/api.ts`**: TypeScript types for backend responses (markets, predictions, private markets, reputation).

---

### 2. Environment and configuration

The frontend reads all environment variables from the **root** `.env` file via `next.config.js` (`loadEnvConfig`):

- `NEXT_PUBLIC_CHAIN_ID` — `31337` (local Hardhat) or `11155111` (Sepolia).
- `NEXT_PUBLIC_RPC_URL` — RPC endpoint for the wallet.
- `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` — deployed `PredictionMarket` address.
- `NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS` — optional, for commit–reveal markets.
- `NEXT_PUBLIC_BLOCK_EXPLORER_URL` — Etherscan / block explorer base URL.

For local development, leave `NEXT_PUBLIC_API_BASE_URL` **unset** so `/api/*` requests are proxied to the Rust backend (`localhost:4000`) through `next.config.js`.

---

### 3. Running the frontend

From the repository root:

```bash
cd frontend
npm install        # first run
npm run dev        # http://localhost:3000
```

Make sure the backend is running on `http://localhost:4000` (for example via `npm run backend` from the repo root), and that contracts are deployed with addresses written into `.env` as described in `docs/setup.md`.

---

### 4. Key flows

- **Dashboard**: `app/page.tsx` uses React Query hooks from `use-markets.ts` plus `MarketCard` components to show open/resolved markets and stats.
- **Market detail**: `market-page-client.tsx` composes:
  - `useMarket` (REST) + `useMarketOnChain` (contracts) + `useUserStakeOnChain`.
  - `MarketDetail` which renders the TradingView-style `TVChart`, bet form, countdowns and PHPE blocks.
- **Betting**: `BetForm` uses `usePlaceBet`, `useNetworkGuard` and `TxStatus` for:
  - Wallet/chain checks.
  - Transaction submission and confirmation.
  - UI feedback via `sonner` toasts.
- **Create market**: `app/markets/create/page.tsx` implements a stepper wizard that:
  - Writes on-chain via wagmi.
  - Registers the market in the backend (when possible).
  - Stores resolution metadata (price, weather, sentiment, or crypto news) for CRE.

For a full end-to-end view (contracts ↔ backend ↔ frontend), see the diagrams and descriptions in `../docs/architecture.md` and the root `README.md`.

