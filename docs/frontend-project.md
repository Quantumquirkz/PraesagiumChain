# Frontend specification — PraesagiumChain

Extremely detailed specification for the PraesagiumChain dApp frontend. It aligns with the existing backend API, smart contracts, and data models, and adds new features for a complete product.

---

## 1. Objective and scope

**Goal:** A production-ready frontend that allows users to:

- Connect a wallet (EVM), switch networks, and see balance.
- View a **dashboard** with global stats and a **paginated list of markets** (with filters).
- Open **market detail** with question, status, stakes, countdowns, predictions (including PHPE uncertainty), and user position.
- **Create** a new prediction market (on-chain) and optionally sync it to the backend.
- **Place bets** (Yes/No) with a chosen amount (ETH).
- See **resolution** status and **claim payouts** for resolved markets where the user won.
- Use **extra features:** reputation profile, sentiment/hybrid preview, “My positions”, theme toggle, and accessibility.

**Out of scope for v1:** Private markets participant management, conditional market creation UI, tokenized (NFT) market trading. These can be added later following the same patterns.

---

## 2. Tech stack (recommended)

| Layer | Technology | Purpose |
|-------|------------|--------|
| **Framework** | Next.js 14+ (App Router) | SSR/SSG optional, API routes for proxy if needed, env for `NEXT_PUBLIC_*`. |
| **Language** | TypeScript (strict) | Types below must be used for API and contract data. |
| **Web3** | wagmi v2 + viem | Wallet connection, chain switch, read/write contracts. |
| **Styling** | Tailwind CSS | Utility-first; design tokens for colors/spacing. |
| **Components** | shadcn/ui or Radix + Tailwind | Accessible primitives (Dialog, Select, Toast). |
| **State** | React Query (TanStack Query) | Server state (API + chain reads), cache, refetch. |
| **Forms** | React Hook Form + Zod | Create market form, bet form, validation. |
| **Notifications** | sonner or react-hot-toast | Success/error for tx and API. |

**Reference:** [web3-hackathon-starter](https://github.com/envoy1084/web3-hackathon-starter) (Next.js + thirdweb + Tailwind).

---

## 3. Repository and environment

### 3.1 Location

- Create a **`frontend/`** directory at the repo root (sibling to `backend-rust/`, `contracts/`, `scripts/`).
- Frontend runs on its own port (e.g. `3000`). Backend runs on `4000` (see env).

### 3.2 Environment variables

Copy `config/frontend.env.example` to **`frontend/.env.local`**. Define every variable used by the app.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend REST API base URL (no trailing slash). | `http://localhost:4000` |
| `NEXT_PUBLIC_CHAIN_ID` | Yes | Chain ID for the app (EVM). | `11155111` (Sepolia), `31337` (Hardhat) |
| `NEXT_PUBLIC_RPC_URL` | Yes | RPC URL for that chain. | `https://rpc.sepolia.org` or `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` | Yes | PredictionMarket contract address. | `0x...` |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (if using Auth/Realtime). | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | No | Supabase anon key. | From Supabase Dashboard → API |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | No | Base URL for block explorer (tx and address links). | `https://sepolia.etherscan.io` |

**Contract ABIs:** Use the compiled artifacts from this repo:

- **PredictionMarket:** `contracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json` → copy the `abi` array into the frontend (e.g. `frontend/lib/abis/prediction-market.ts` or `frontend/public/abis/PredictionMarket.json`).

**Contract enum mapping (Solidity → frontend):**

- **MarketStatus:** `0` = Open, `1` = Locked, `2` = Resolved, `3` = Cancelled.
- **Outcome:** `0` = Undecided, `1` = Yes, `2` = No. When calling `placeBet(marketId, outcome, { value })` use `1` (Yes) or `2` (No). When displaying outcome from backend use `outcome` string: `"Yes"` | `"No"` | `undefined`.

---

## 4. TypeScript types (exact match with backend and contract)

Define these in the frontend (e.g. `frontend/types/api.ts` and `frontend/types/contracts.ts`). They must match the backend and contract interfaces.

```ts
// ---------- API (backend) ----------

export interface MarketView {
  id: number;
  question: string;
  close_time: number;   // Unix timestamp (seconds)
  resolve_time: number; // Unix timestamp (seconds)
  status: string;      // "Open" | "Locked" | "Resolved" | "Cancelled"
  outcome?: string;    // "Yes" | "No" when resolved
  total_yes_stake: number;
  total_no_stake: number;
  creator?: string;
  market_type: string; // "base" | "conditional" | "private" | etc.
  metadata?: string;
  details_hash?: string;
  encrypted_uri?: string;
  latest_prediction?: PredictionView;
}

export interface PredictionView {
  probability: number;
  uncertainty?: number;
  model_version?: string;
  timestamp: number;
}

export interface CreateMarketRequest {
  question: string;
  close_time: number;
  resolve_time: number;
  creator?: string;
  market_type?: string;
  metadata?: string;
  details_hash?: string;
  encrypted_uri?: string;
}

export interface CreatorReputation {
  creator_address: string;
  markets_created: number;
  markets_resolved: number;
  correct_predictions: number;
  reputation_score: number;
  updated_at: number;
}

export interface MarketStats {
  total_markets: number;
  open_markets: number;
  resolved_markets: number;
  total_predictions: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------- Contract (on-chain) ----------
// Use these for contract read/write. Outcome enum: 0 Undecided, 1 Yes, 2 No.

export type OutcomeEnum = 0 | 1 | 2; // Undecided | Yes | No
export type MarketStatusEnum = 0 | 1 | 2 | 3; // Open | Locked | Resolved | Cancelled

export interface MarketViewOnChain {
  id: bigint;
  question: string;
  closeTime: bigint;
  resolveTime: bigint;
  status: MarketStatusEnum;
  outcome: OutcomeEnum;
  totalYesStake: bigint;
  totalNoStake: bigint;
}
```

---

## 5. API reference (every endpoint used by the frontend)

Base URL: `process.env.NEXT_PUBLIC_API_BASE_URL`. All requests that send a body must use `Content-Type: application/json`.

### 5.1 Health and stats

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/health` | — | `{ "ok": true }` or similar | Footer “API status” or debug. |
| GET | `/api/markets/stats` | — | `MarketStats` | Dashboard stats cards. |

### 5.2 Markets (list and detail)

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/api/markets` | `page` (default 1), `limit` (default 10), `status` (optional: open, locked, resolved, cancelled) | `PaginatedResponse<MarketView>` | Market list page with pagination and status filter. |
| GET | `/api/markets/:id` | — | `MarketView` | Market detail page. |

### 5.3 Predictions (for a market)

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/api/markets/:id/predictions` | `limit` (optional) | `PredictionView[]` or `{ items: PredictionView[] }` | Market detail: “Predictions” section and PHPE uncertainty display. |

### 5.4 Create market (backend mirror, optional)

| Method | Path | Body | Response | Use in UI |
|--------|------|------|----------|-----------|
| POST | `/api/markets` | `CreateMarketRequest` | 201 + `MarketView` | After on-chain create, optionally POST same data so backend list includes the market. |

### 5.5 AI and hybrid (new feature: preview before bet)

| Method | Path | Body | Response | Use in UI |
|--------|------|------|----------|-----------|
| POST | `/api/ai/sentiment` | `{ text: string }` | `{ provider, sentiment_score, probability }` | “Preview sentiment” on market detail or create form: user pastes text, show probability. |
| POST | `/api/predict/hybrid` | `{ sentiment_text?: string, social_texts?: string[], binance_symbol?: string, use_chainlink_price?: boolean, market_id?: number }` | `{ probability, uncertainty?, market_id? }` | “Hybrid prediction” widget: show probability and **uncertainty** (PHPE) when time series or hybrid inputs are used. |

### 5.6 Reputation (new feature: creator profile)

| Method | Path | Response | Use in UI |
|--------|------|----------|-----------|
| GET | `/api/reputation/:address` | `CreatorReputation` | Reputation page or creator badge on market card. |

### 5.7 Report endpoints (optional: for “resolution source” display)

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/api/price/above` | `symbol`, `threshold`, `source?` | `{ outcome: 0 \| 1 }` | Market detail: show “Resolution source: price” and outcome. |
| GET | `/api/weather/rained` | `lat`, `lon`, `date` | `{ outcome: 0 \| 1 }` | Idem for weather markets. |

**Error handling:** All API errors can return 4xx/5xx with optional JSON body `{ message?: string, error?: string }`. Show a toast and optionally set error state; do not crash the app.

---

## 6. Smart contract usage (exact functions and events)

Contract: **PredictionMarket** at `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`. Use viem/wagmi with the ABI from `contracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json`.

### 6.1 Read functions

| Function | Params | Returns | Use in UI |
|----------|--------|---------|-----------|
| `getMarket(marketId)` | `marketId: bigint` | `MarketView` (struct: id, question, closeTime, resolveTime, status, outcome, totalYesStake, totalNoStake) | Market detail: on-chain state (can be primary or fallback if backend is down). |
| `getUserStake(marketId, userAddress)` | `marketId: bigint`, `user: address` | `(yesStake: bigint, noStake: bigint)` | Market detail and “My positions”: show user’s Yes/No stakes and whether they can claim. |

### 6.2 Write functions (user must sign tx)

| Function | Params | Use in UI |
|----------|--------|-----------|
| `createMarket(question, closeTime, resolveTime)` | `question: string`, `closeTime: bigint` (Unix s), `resolveTime: bigint` (Unix s) | Create market form: on submit open wallet, then optionally POST to `/api/markets` with same data. |
| `placeBet(marketId, outcome, { value })` | `marketId: bigint`, `outcome: 1 \| 2` (1=Yes, 2=No), `value` in wei | Market detail: “Bet Yes” / “Bet No” with amount input; send tx with `value`. |
| `claimPayout(marketId)` | `marketId: bigint` | Market detail (and “My positions”): “Claim” button when market is resolved and user has winning stake and has not yet claimed. |

### 6.3 Events (optional: for real-time updates)

- `MarketCreated(marketId, question, closeTime, resolveTime, creator)` — refresh list or stats after new market.
- `BetPlaced(marketId, user, outcome, amount)` — refresh market totals and user stake.
- `MarketResolved(marketId, outcome, totalYesStake, totalNoStake)` — refresh market status and show “Claim” where applicable.
- `PayoutClaimed(marketId, user, amount)` — refresh user stake (e.g. hide claim button).

---

## 7. Pages and routes (detailed)

### 7.1 Layout and global elements

- **Layout:** Persistent header and optional footer.
- **Header:** Logo, nav links (Markets, Create, My positions, Reputation), wallet button (connect / disconnect, address short, chain name, wrong-network warning).
- **Footer:** “API status” (from `/health`), link to block explorer, optional “Powered by Chainlink CRE”.
- **Wrong network:** If `chainId !== NEXT_PUBLIC_CHAIN_ID`, show banner: “Switch to Sepolia” (or current chain name) and a button that triggers chain switch via wagmi.

### 7.2 Home / Dashboard (`/` or `/markets`)

- **Purpose:** Entry point and market list.
- **Data:** `GET /api/markets/stats` and `GET /api/markets?page=1&limit=12` (or 20).
- **UI:**
  - **Stats row:** 4 cards: Total markets, Open markets, Resolved markets, Total predictions (from `MarketStats`).
  - **Filters:** Status dropdown (All, Open, Locked, Resolved, Cancelled); optional search by question text (client-side or backend if you add a query param later).
  - **Pagination:** Page 1, 2, … with `page` and `limit`; show “Total: N”.
  - **Market cards:** Each card shows: question (truncated), status badge, total Yes/No stakes (formatted in ETH), close time and resolve time (relative or countdown), “View” link to `/markets/[id]`. Optional: creator address (short) and “Reputation” link to `/reputation/[address]`.
- **Empty state:** “No markets yet. Create the first one.”
- **Loading:** Skeleton cards or spinner.

### 7.3 Market detail (`/markets/[id]`)

- **Purpose:** Full info for one market, bet form, claim, and predictions (PHPE).
- **Data:** `GET /api/markets/:id`, `GET /api/markets/:id/predictions`, and on-chain `getMarket(id)`, `getUserStake(id, userAddress)` when wallet connected.
- **UI:**
  - **Question:** Full text.
  - **Status and outcome:** Badge (Open / Locked / Resolved / Cancelled). If Resolved: “Result: Yes” or “Result: No”.
  - **Times:** Close time and resolve time (human-readable + countdown if still in future). Countdown: “Closes in X days/hours” or “Resolves in X days/hours”.
  - **Stakes:** Total Yes stake, total No stake (ETH). Optional: simple chart (e.g. two bars).
  - **User position (when connected):** “Your Yes: X ETH”, “Your No: X ETH”, “Claimable: X ETH” (computed from contract and resolution). **Claim** button: only if resolved, user has winning stake, and not yet claimed; on click call `claimPayout(marketId)`.
  - **Bet form (when Open and wallet connected):** Two actions: “Bet Yes” and “Bet No”. Amount input (ETH); validation > 0. On submit: `placeBet(marketId, 1 | 2, { value })`. Toast on success/fail; refetch market and user stake.
  - **Predictions section:** List from `GET /api/markets/:id/predictions`. Each row: probability (e.g. “65%”), **uncertainty** (e.g. “±12%” from PHPE), model_version, timestamp. If no predictions: “No predictions yet.”
  - **New feature — Sentiment / hybrid preview:** Collapsible “Preview probability” or “Predict outcome”: input text (or paste tweet); button “Get sentiment”. Call `POST /api/ai/sentiment` and show probability. Optional: “Hybrid” with extra options (e.g. symbol, Chainlink price) and show `probability` and `uncertainty` from `POST /api/predict/hybrid`. Label clearly as “Preview only (not on-chain)”.
- **Loading and errors:** Skeleton or spinner; 404 if market not found; toast on tx error.

### 7.4 Create market (`/markets/create`)

- **Purpose:** Create a new prediction market on-chain.
- **Data:** No GET; submit to contract then optionally to backend.
- **Form fields:** Question (textarea, required), Close time (datetime-local or Unix timestamp), Resolve time (datetime-local or Unix timestamp). Validation: question non-empty; close time < resolve time; resolve time in the future.
- **Submit:** Connect wallet if not connected; ensure correct chain. Call `createMarket(question, closeTimeUnix, resolveTimeUnix)`. On success: show tx hash (link to explorer), optional “Add to backend” that POSTs to `/api/markets` with same question and times (and creator from wallet address). Redirect to `/markets/[newId]` (id from event or from backend if you stored it).
- **New feature:** Optional “Preview sentiment” for the question text (same as market detail) to show users a rough probability hint.

### 7.5 My positions (`/positions` or `/my-bets`) — new feature

- **Purpose:** List markets where the connected user has a stake (Yes or No) and show claimable payouts.
- **Data:** No dedicated backend endpoint; use list of market IDs from your own state or from a list of “recent” markets, then for each call `getUserStake(marketId, address)`. Filter to those with yesStake > 0 or noStake > 0. For each such market fetch `getMarket(marketId)` to know status and outcome and compute claimable amount.
- **UI:** Table or cards: market question (link to detail), user’s Yes/No stakes, status, “Claim” if resolved and user won and not claimed. Button “Claim” calls `claimPayout(marketId)`.

### 7.6 Reputation (`/reputation` and `/reputation/[address]`) — new feature

- **Purpose:** Show creator stats and reputation score.
- **Data:** `GET /api/reputation/:address` returns `CreatorReputation`.
- **UI:**
  - **`/reputation`:** If user connected, redirect to `/reputation/[connectedAddress]` or show “Enter address” and a link to `/reputation/[address]`.
  - **`/reputation/[address]`:** Page with: address (with explorer link), markets_created, markets_resolved, correct_predictions, reputation_score, updated_at. Optional: list of markets by this creator (if you add a backend endpoint later or filter client-side from market list by creator).

### 7.7 Optional: Demo resolve (admin or demo flow)

- For hackathon demo only: a “Resolve (demo)” button that either (a) opens a modal explaining “Run `node scripts/resolveFromBackend.js --market-id N`” or (b) calls an internal API route that runs the script (if you expose it securely). Do not expose resolver private key in the frontend.

---

## 8. Component and file structure (suggested)

```
frontend/
├── .env.local
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout: header, wallet provider, theme
│   ├── page.tsx            # Dashboard (markets list + stats)
│   ├── markets/
│   │   ├── page.tsx        # Optional redirect to /
│   │   ├── create/page.tsx # Create market form
│   │   └── [id]/page.tsx   # Market detail
│   ├── positions/page.tsx  # My positions
│   └── reputation/
│       └── [address]/page.tsx # Reputation profile
├── components/
│   ├── header.tsx          # Nav + wallet
│   ├── market-card.tsx     # Card for list
│   ├── market-detail.tsx   # Full market view + bet form + claim
│   ├── create-market-form.tsx
│   ├── stats-cards.tsx     # Dashboard stats
│   ├── sentiment-preview.tsx  # AI sentiment / hybrid widget
│   ├── countdown.tsx       # Close/resolve countdown
│   └── ui/                 # shadcn/ui or shared primitives
├── lib/
│   ├── api.ts              # fetch wrappers for backend
│   ├── contracts.ts        # wagmi/viem contract configs and reads
│   ├── abis/
│   │   └── prediction-market.ts
│   └── utils.ts            # formatEth, formatTime, etc.
├── types/
│   ├── api.ts              # MarketView, PaginatedResponse, etc.
│   └── contracts.ts        # OutcomeEnum, MarketViewOnChain
└── hooks/
    ├── use-markets.ts      # React Query: list, detail, stats
    ├── use-market-on-chain.ts
    ├── use-user-stake.ts
    └── use-reputation.ts
```

---

## 9. State management and data flow

- **Server state (API + chain):** Use **React Query** (TanStack Query). Keys: `['markets', page, status]`, `['market', id]`, `['market-predictions', id]`, `['stats']`, `['reputation', address]`, `['user-stake', marketId, address]`. Refetch after mutation (e.g. after placeBet or claimPayout).
- **Wallet and chain:** wagmi hooks: `useAccount`, `useConnect`, `useDisconnect`, `useNetwork`, `useSwitchNetwork`. Store nothing redundant; use wagmi state.
- **UI state:** Local React state for modals, form inputs, and filters. Optional: small context for “selected chain” or “theme” if not using next-themes.

---

## 10. UX and accessibility

- **Responsive:** Mobile-first; breakpoints for tablet and desktop. List: 1 column on mobile, 2–3 on desktop. Tables on “My positions” and “Reputation” should scroll horizontally on small screens or collapse to cards.
- **Loading:** Skeleton loaders for list and detail; disabled buttons with “Processing…” during tx.
- **Errors:** Toast for every tx failure and API error; do not leave the user without feedback. Show “Transaction failed: user rejected” or “API error: 500” as appropriate.
- **Accessibility:** Semantic HTML (headings, sections, buttons, links). Labels for all form inputs. Focus management in modals. Sufficient color contrast (WCAG AA). Prefer `aria-label` on icon-only buttons.

---

## 11. New features summary (beyond minimal MVP)

| Feature | Description | Where |
|---------|-------------|--------|
| **Dashboard stats** | Total/open/resolved markets and total predictions from `/api/markets/stats`. | Home / dashboard. |
| **Reputation profile** | Page and links to creator reputation via `GET /api/reputation/:address`. | `/reputation/[address]`, link from market card/detail. |
| **Predictions + uncertainty** | List predictions and show PHPE **uncertainty** (e.g. “65% ±12%”) on market detail. | Market detail, predictions section. |
| **Sentiment / hybrid preview** | “Preview probability” widget using `/api/ai/sentiment` and `/api/predict/hybrid` (with uncertainty). | Market detail and/or create form. |
| **My positions** | List user’s stakes and claimable payouts using `getUserStake` and `getMarket`. | `/positions`. |
| **Countdown** | Time until close and resolve (human-readable + countdown). | Market card and detail. |
| **Theme toggle** | Dark/light mode (e.g. next-themes). | Header. |
| **Block explorer links** | Link tx hash and address to `NEXT_PUBLIC_BLOCK_EXPLORER_URL`. | After create/bet/claim; wallet address; reputation address. |
| **Filters and pagination** | Status filter and page/limit for market list. | Dashboard. |

---

## 12. Task checklist (implementation order)

- [ ] **Setup:** Next.js, TypeScript, Tailwind, wagmi, React Query, env from `config/frontend.env.example`.
- [ ] **Types:** Add all types from § 4 (api + contracts).
- [ ] **API client:** `lib/api.ts` with base URL from env; functions for every endpoint in § 5.
- [ ] **Contract:** Copy ABI, configure wagmi contract; hooks for getMarket, getUserStake and write (createMarket, placeBet, claimPayout).
- [ ] **Layout:** Header (nav, wallet, wrong-network banner), footer.
- [ ] **Dashboard:** Stats from `/api/markets/stats`, list from `/api/markets` with filters and pagination, market cards with countdown.
- [ ] **Market detail:** Full view, user position, bet form, claim button, predictions list with uncertainty.
- [ ] **Create market:** Form with validation, submit to contract, optional POST to backend, explorer link.
- [ ] **Sentiment/hybrid widget:** Preview probability and uncertainty on detail (and optionally create).
- [ ] **My positions:** Page with user stakes and claimable; claim from here or from detail.
- [ ] **Reputation:** Page `/reputation/[address]` and links from market cards.
- [ ] **Theme, explorer links, toasts, loading and error states, a11y pass.**

---

## 13. References

- **API and data shapes:** [development-and-deployment.md](development-and-deployment.md) §§ 2–3.
- **Contract roles and CRE flow:** [architecture-and-design.md](architecture-and-design.md).
- **Submission and testnet:** [development-and-deployment.md](development-and-deployment.md) § 6.
- **Env example:** `config/frontend.env.example`.
- **ABIs:** `contracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json`.

This document is the single source of truth for the frontend: every page, component, API call, contract call, type, and new feature is specified here so your teammate can implement the app without guessing.
