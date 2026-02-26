# Frontend specification — PraesagiumChain

**Audience:** Frontend developer building the PraesagiumChain dApp. This document is the single source of truth for requirements, APIs, contracts, UI/UX, and creative enhancements.

---

## Quick start for the frontend developer

1. **Read this document end-to-end** — every API, contract call, type, and page is specified here.
2. **Copy** `config/frontend.env.example` to `frontend/.env.local` and fill with backend URL, chain ID, RPC, and contract address.
3. **Copy** the PredictionMarket ABI from `contracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json`.
4. **Start backend** — `npm run backend` (port 4000) and **Hardhat node** — `npm run node` (port 8545) if using local chain.
5. **Follow the implementation checklist** (§ 12) in order.
6. **Prioritize:** Layout → Dashboard → Market detail → Create → Bet/Claim → Reputation → My positions → Creative features.

---

## 1. Objective and scope

### 1.1 Goal

Build a production-ready, visually polished frontend that lets users:

- Connect an EVM wallet, switch networks, and see their balance
- Browse a **dashboard** with global stats and a **paginated, filterable list of prediction markets**
- View **market detail** with question, status, stakes, countdowns, predictions (including PHPE uncertainty), and their position
- **Create** new prediction markets on-chain and optionally sync them to the backend
- **Place bets** (Yes/No) with a chosen amount in ETH
- See **resolution** status and **claim payouts** for resolved markets where they won
- Use **advanced features:** reputation profiles, AI sentiment/hybrid preview, "My positions," live data sources, theme toggle, and full accessibility

### 1.2 Out of scope for v1

- Private markets participant management (commit-reveal UI)
- Conditional market creation UI
- Tokenized (NFT) market trading
- Mobile native apps

These can be added later using the same patterns described here.

---

## 2. Tech stack (recommended)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14+ (App Router) | SSR/SSG optional, API routes for proxy if needed, env for `NEXT_PUBLIC_*` |
| **Language** | TypeScript (strict mode) | Types below must be used for API and contract data |
| **Web3** | wagmi v2 + viem | Wallet connection, chain switch, contract read/write |
| **Styling** | Tailwind CSS | Utility-first; design tokens for colors, spacing, typography |
| **Components** | shadcn/ui or Radix + Tailwind | Accessible primitives (Dialog, Select, Toast, Tabs) |
| **State** | React Query (TanStack Query) | Server state (API + chain reads), cache, refetch, optimistic updates |
| **Forms** | React Hook Form + Zod | Create market form, bet form, validation with clear error messages |
| **Notifications** | sonner or react-hot-toast | Success/error for tx and API; persistent for tx confirmation |
| **Charts** | Recharts or lightweight-charts | Stakes visualization, prediction history, price context |
| **Animations** | Framer Motion (optional) | Smooth transitions, page load, list animations |

**Reference:** [web3-hackathon-starter](https://github.com/envoy1084/web3-hackathon-starter) (Next.js + thirdweb + Tailwind).

---

## 3. Repository and environment

### 3.1 Location

- Create a **`frontend/`** directory at the repo root (sibling to `backend-rust/`, `contracts/`, `scripts/`).
- Frontend runs on port **3000**. Backend runs on **4000**. Ensure CORS allows `http://localhost:3000` (backend uses `CORS_ORIGINS`).

### 3.2 Environment variables

Copy **`config/frontend.env.example`** to **`frontend/.env.local`**. Define every variable used by the app.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend REST API base URL (no trailing slash) | `http://localhost:4000` |
| `NEXT_PUBLIC_CHAIN_ID` | Yes | EVM Chain ID for the app | `11155111` (Sepolia), `31337` (Hardhat local) |
| `NEXT_PUBLIC_RPC_URL` | Yes | RPC URL for that chain | `https://rpc.sepolia.org` or `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` | Yes | PredictionMarket contract address | `0xf2397b5827860b361427240d1D1F6F89e9bF197f` (Sepolia) |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (if using Auth/Realtime) | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | No | Supabase anon/publishable key | From Supabase Dashboard → API |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | No | Base URL for block explorer (tx and address links) | `https://sepolia.etherscan.io` |

**Contract ABIs:** Use compiled artifacts from this repo:

- **PredictionMarket:** `contracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json` → copy the `abi` array into the frontend (e.g. `frontend/lib/abis/prediction-market.ts` or `frontend/public/abis/PredictionMarket.json`).

**Contract enum mapping (Solidity → frontend):**

- **MarketStatus:** `0` = Open, `1` = Locked, `2` = Resolved, `3` = Cancelled
- **Outcome:** `0` = Undecided, `1` = Yes, `2` = No. Use `1` (Yes) or `2` (No) when calling `placeBet(marketId, outcome, { value })`. Display outcome from backend as string: `"Yes"` | `"No"` | `undefined`.

---

## 4. TypeScript types (exact match with backend and contracts)

Define these in `frontend/types/api.ts` and `frontend/types/contracts.ts`. They must match the backend and contract interfaces.

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
  market_type: string; // "base" | "conditional" | "private"
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

export interface SentimentResponse {
  provider?: string;
  sentiment_score?: number;
  probability: number;
}

export interface HybridPredictRequest {
  time_series?: Array<{ timestamp: number; value: number }>;
  sentiment_text?: string;
  social_texts?: string[];
  binance_symbol?: string;
  use_chainlink_price?: boolean;
  market_id?: number;
}

export interface HybridPredictResponse {
  probability: number;
  uncertainty?: number;
  market_id?: number;
}

export interface SourceInfo {
  id: string;
  name: string;
  desc: string;
  params: string[];
}

export interface SourceFetchResponse {
  source: string;
  price_change_24h?: number;
  volume_24h?: number;
  sentiment?: number;
}

export interface OutcomeResponse {
  outcome: 0 | 1; // 0 = No, 1 = Yes
}

// ---------- Contract (on-chain) ----------

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

Base URL: `process.env.NEXT_PUBLIC_API_BASE_URL`. All requests with a body must use `Content-Type: application/json`.

### 5.1 Health and stats

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/health` | — | `{ "ok": true }` or similar | Footer "API status," debug panel |
| GET | `/api/metrics` | — | Prometheus-style metrics | Optional: admin/debug |
| GET | `/api/markets/stats` | — | `MarketStats` | Dashboard stats cards |

### 5.2 Markets (list and detail)

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/api/markets` | `page` (default 1), `limit` (default 10), `status` (open, locked, resolved, cancelled) | `PaginatedResponse<MarketView>` | Market list with pagination and status filter |
| GET | `/api/markets/:id` | — | `MarketView` | Market detail page |
| POST | `/api/markets` | — | 201 + `MarketView` | Optional: mirror on-chain market to backend after create |

### 5.3 Predictions

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/api/markets/:id/predictions` | `limit` (optional) | `PredictionView[]` or `{ items: PredictionView[] }` | Predictions section; show probability and uncertainty (PHPE) |

### 5.4 AI and hybrid (preview before bet)

| Method | Path | Body | Response | Use in UI |
|--------|------|------|----------|-----------|
| POST | `/api/ai/sentiment` | `{ "text": string }` | `{ provider?, sentiment_score?, probability }` | "Preview sentiment" widget: user pastes text, show probability |
| POST | `/api/markets/:id/ai/predict` | `{ "text": string }` | Same shape | Market-specific sentiment |
| POST | `/api/predict/hybrid` | See below | `{ probability, uncertainty?, market_id? }` | "Hybrid prediction" widget: combine sentiment, Binance symbol, Chainlink price |

**Hybrid body (all fields optional):**

```json
{
  "time_series": [{ "timestamp": 1234567890, "value": 50000.5 }],
  "sentiment_text": "Bitcoin bullish",
  "social_texts": ["Tweet 1", "Tweet 2"],
  "binance_symbol": "BTCUSDT",
  "use_chainlink_price": true,
  "market_id": 1
}
```

- `time_series`: array of `{ timestamp, value }` for PHPE; max ~10k points
- `sentiment_text`: single text (e.g. news, tweet); max length enforced by backend
- `social_texts`: multiple texts; sentiments averaged; max 20 items
- `binance_symbol`: e.g. BTCUSDT, ETHUSDT
- `use_chainlink_price`: include ETH/USD Chainlink proxy
- `market_id`: if provided, prediction is stored for that market

### 5.5 Reputation

| Method | Path | Response | Use in UI |
|--------|------|----------|-----------|
| GET | `/api/reputation/:address` | `CreatorReputation` | Reputation page, creator badge on market card |

### 5.6 Data sources (live data for hybrid preview)

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/api/sources` | — | `SourceInfo[]` | List available sources for hybrid widget |
| GET | `/api/sources/fetch` | `source`, `symbol?`, `fsym?`, `tsym?`, `pair?`, `query?`, `country?` | `SourceFetchResponse` | Fetch live data (Binance, Chainlink, Cryptocompare, Kraken, ExchangeRate, Finnhub, NewsAPI) |

**Sources and params:**

| source | Params | Example |
|--------|--------|---------|
| binance | symbol | `symbol=BTCUSDT` |
| chainlink | — | — |
| cryptocompare | fsym, tsym | `fsym=BTC&tsym=USD` |
| kraken | pair | `pair=XBTUSD` |
| exchangerate | — | — |
| finnhub | symbol | `symbol=AAPL` or `symbol=BTC` |
| newsapi | query, country | `query=bitcoin&country=us` |

### 5.7 Report endpoints (resolution source display)

| Method | Path | Query | Response | Use in UI |
|--------|------|-------|----------|-----------|
| GET | `/api/price/above` | `symbol`, `threshold`, `source?` (binance, coingecko) | `{ outcome: 0 \| 1 }` | "Resolution source: price" for price markets |
| GET | `/api/weather/rained` | `lat`, `lon`, `date` (YYYY-MM-DD) | `{ outcome: 0 \| 1 }` | "Resolution source: weather" |
| GET | `/api/sports/winner` | `fixture_id`, `winner_team`, `demo_outcome?` | `{ outcome: 0 \| 1 }` | "Resolution source: sports" |

**Error handling:** 4xx/5xx can return JSON `{ message?: string, error?: string }`. Show toast and set error state; do not crash the app.

---

## 6. Smart contract usage (exact functions and events)

Contract: **PredictionMarket** at `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`. Use viem/wagmi with the ABI from `contracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json`.

### 6.1 Read functions

| Function | Params | Returns | Use in UI |
|----------|--------|---------|-----------|
| `getMarket(marketId)` | `marketId: bigint` | `MarketView` struct | Market detail: on-chain state (primary or fallback if backend down) |
| `getUserStake(marketId, userAddress)` | `marketId`, `user` | `(yesStake, noStake): bigint` | User position, claimable amount |

### 6.2 Write functions (user signs tx)

| Function | Params | Use in UI |
|----------|--------|-----------|
| `createMarket(question, closeTime, resolveTime)` | strings and Unix timestamps | Create market form; optionally POST to `/api/markets` |
| `placeBet(marketId, outcome, { value })` | `outcome: 1 \| 2`, `value` in wei | Bet Yes/No with amount input |
| `claimPayout(marketId)` | `marketId` | Claim button when resolved and user has winning stake |

### 6.3 Events (for real-time or post-tx refresh)

- `MarketCreated` — refresh list or stats
- `BetPlaced` — refresh market totals and user stake
- `MarketResolved` — refresh status, show Claim
- `PayoutClaimed` — refresh user stake, hide claim button

---

## 7. Pages and routes (detailed specification)

### 7.1 Layout and global elements

- **Layout:** Persistent header and footer.
- **Header:**
  - Logo and app name ("PraesagiumChain" or similar)
  - Nav links: Markets, Create Market, My Positions, Reputation, (optional) Data Sources
  - Wallet button: Connect / Disconnect; when connected: short address (e.g. `0x1234...5678`), chain name, balance (optional)
  - Wrong-network banner: if `chainId !== NEXT_PUBLIC_CHAIN_ID`, show "Switch to Sepolia" (or current chain) with button to switch via wagmi
- **Footer:**
  - API status indicator (from `/health`): green dot if ok, red if error
  - Link to block explorer
  - "Powered by Chainlink CRE"
  - Optional: version, docs link

### 7.2 Home / Dashboard (`/` or `/markets`)

**Purpose:** Entry point and market list.

**Data:**

- `GET /api/markets/stats`
- `GET /api/markets?page=1&limit=12&status=...`

**UI:**

- **Stats row:** 4 cards: Total markets, Open markets, Resolved markets, Total predictions.
- **Filters:**
  - Status: All, Open, Locked, Resolved, Cancelled
  - Optional: search by question (client-side filter or backend query param if added)
  - Optional: sort by close time, total stake, newest first
- **Pagination:** Page 1, 2, … with "Total: N" and prev/next.
- **Market cards (each):**
  - Question (truncated to ~80 chars with ellipsis)
  - Status badge (color-coded: green Open, yellow Locked, blue Resolved, gray Cancelled)
  - Total Yes / No stakes (formatted in ETH, e.g. "0.5 ETH")
  - Close time and resolve time (relative: "Closes in 2 days" or absolute)
  - Countdown for close/resolve if in future
  - "View" link to `/markets/[id]`
  - Creator address (short) with link to `/reputation/[address]`
  - Optional: latest prediction probability (e.g. "65%")
- **Empty state:** "No markets yet. Create the first one." with CTA to Create.
- **Loading:** Skeleton cards (shimmer effect) or spinner.

### 7.3 Market detail (`/markets/[id]`)

**Purpose:** Full info, bet form, claim, predictions, AI preview.

**Data:**

- `GET /api/markets/:id`
- `GET /api/markets/:id/predictions`
- On-chain: `getMarket(id)`, `getUserStake(id, userAddress)` when wallet connected

**UI sections:**

1. **Question:** Full text, prominent.
2. **Status and outcome:**
   - Badge: Open / Locked / Resolved / Cancelled
   - If Resolved: "Result: Yes" or "Result: No" with visual emphasis
3. **Times:**
   - Close time, Resolve time (human-readable)
   - Countdown: "Closes in X days/hours" or "Resolves in X hours"
4. **Stakes:**
   - Total Yes, Total No (ETH)
   - Visual: two horizontal bars or a simple pie chart
5. **User position (when connected):**
   - "Your Yes: X ETH", "Your No: X ETH"
   - "Claimable: X ETH" when resolved and user won
   - **Claim** button: only if resolved, user has winning stake, not yet claimed
6. **Bet form (when Open and connected):**
   - "Bet Yes" and "Bet No" actions
   - Amount input (ETH); validation: > 0, max balance
   - Submit → `placeBet(marketId, 1|2, { value })`
   - Toast on success/fail; refetch market and user stake
7. **Predictions section:**
   - List from API; each row: probability (e.g. "65%"), **uncertainty** (e.g. "±12%"), model_version, timestamp
   - If none: "No predictions yet."
8. **AI / Hybrid preview (collapsible):**
   - **Tab 1 — Sentiment:** Text input (e.g. paste tweet, news headline). Button "Get sentiment" → `POST /api/ai/sentiment` with `{ text }`. Display: "Probability: 72%".
   - **Tab 2 — Hybrid:** sentiment_text (optional), social_texts multi-line (optional), binance_symbol dropdown (BTCUSDT, ETHUSDT, etc.), checkbox "Include Chainlink ETH/USD". Button "Predict" → `POST /api/predict/hybrid`. Display: "Probability: X%", "Uncertainty: ±Y%" when present.
   - Label: "Preview only — not on-chain. Use AI + data to estimate outcome before betting."
9. **Loading/errors:** Skeleton; 404 if not found; toast on tx error.

### 7.4 Create market (`/markets/create`)

**Purpose:** Create a new prediction market on-chain.

**Form fields:**

- Question (textarea, required, min 10 chars)
- Close time (datetime-local or Unix)
- Resolve time (datetime-local or Unix)
- Validation: close < resolve; resolve in future; question non-empty

**Submit flow:**

1. Connect wallet if not connected
2. Ensure correct chain
3. `createMarket(question, closeTimeUnix, resolveTimeUnix)`
4. On success: show tx hash (link to explorer), optional "Add to backend" (POST `/api/markets`)
5. Redirect to `/markets/[newId]` (id from event or backend)

**Optional:** "Preview sentiment" for question text (same widget as detail).

### 7.5 My positions (`/positions` or `/my-bets`)

**Purpose:** List markets where the user has a stake and show claimable payouts.

**Data:** No dedicated backend endpoint. Options:

- Fetch recent markets from API, then for each call `getUserStake(marketId, address)` and filter where yesStake > 0 or noStake > 0
- Or maintain a local list of market IDs the user has interacted with (localStorage)

**UI:** Table or cards: market question (link to detail), user Yes/No stakes, status, "Claim" when applicable. "Claim" → `claimPayout(marketId)`.

### 7.6 Reputation (`/reputation`, `/reputation/[address]`)

**Purpose:** Creator stats and reputation.

**Data:** `GET /api/reputation/:address`

**UI:**

- `/reputation`: if connected, redirect to `/reputation/[address]`; else "Enter address" input and link
- `/reputation/[address]`: address (explorer link), markets_created, markets_resolved, correct_predictions, reputation_score, updated_at. Optional: list of markets by this creator.

### 7.7 Data sources explorer (optional, creative)

**Purpose:** Let users explore live data before creating/betting.

**Route:** `/sources` or embedded in Create/Hybrid widget.

**UI:** List sources from `GET /api/sources`; for each, form with params and "Fetch" → `GET /api/sources/fetch?source=...&...`; show price_change_24h, volume_24h, sentiment. Helps users understand what data feeds into hybrid predictions.

### 7.8 Demo resolve (admin / hackathon)

For demo only: "Resolve (demo)" button that opens modal: "Run `node scripts/resolveFromBackend.js --market-id N`" or similar. Do not expose resolver private key in frontend.

---

## 8. Component and file structure (suggested)

```
frontend/
├── .env.local
├── app/
│   ├── layout.tsx           # Root: header, wallet provider, theme
│   ├── page.tsx             # Dashboard
│   ├── markets/
│   │   ├── page.tsx         # Redirect to /
│   │   ├── create/page.tsx
│   │   └── [id]/page.tsx
│   ├── positions/page.tsx
│   ├── reputation/
│   │   └── [address]/page.tsx
│   └── sources/page.tsx     # Optional: data sources explorer
├── components/
│   ├── header.tsx
│   ├── footer.tsx
│   ├── wallet-button.tsx
│   ├── wrong-network-banner.tsx
│   ├── market-card.tsx
│   ├── market-detail.tsx
│   ├── create-market-form.tsx
│   ├── stats-cards.tsx
│   ├── sentiment-preview.tsx
│   ├── hybrid-preview.tsx
│   ├── countdown.tsx
│   ├── stakes-chart.tsx     # Yes/No bars or pie
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── api.ts               # fetch wrappers
│   ├── contracts.ts         # wagmi configs, read/write
│   ├── abis/
│   │   └── prediction-market.ts
│   └── utils.ts             # formatEth, formatTime, truncateAddress
├── types/
│   ├── api.ts
│   └── contracts.ts
└── hooks/
    ├── use-markets.ts
    ├── use-market-on-chain.ts
    ├── use-user-stake.ts
    ├── use-reputation.ts
    └── use-sources.ts       # Optional
```

---

## 9. State management and data flow

- **Server state (API + chain):** React Query. Keys: `['markets', page, status]`, `['market', id]`, `['market-predictions', id]`, `['stats']`, `['reputation', address]`, `['user-stake', marketId, address]`. Refetch after mutations (placeBet, claimPayout, createMarket).
- **Wallet:** wagmi hooks (`useAccount`, `useConnect`, `useDisconnect`, `useNetwork`, `useSwitchNetwork`). No redundant local storage.
- **UI state:** Local state for modals, form inputs, filters. Optional: next-themes for theme.

---

## 10. UX and accessibility

- **Responsive:** Mobile-first; 1 column on mobile, 2–3 on desktop for cards. Tables scroll horizontally on small screens or collapse to cards.
- **Loading:** Skeleton loaders; disabled buttons with "Processing…" during tx.
- **Errors:** Toast for every tx failure and API error; clear messages ("Transaction failed: user rejected", "API error: 500").
- **Accessibility:** Semantic HTML (headings, sections, buttons, links). Labels for all inputs. Focus management in modals. WCAG AA contrast. `aria-label` on icon-only buttons. Keyboard navigation.

---

## 11. Creative features and enhancements (recommended)

### 11.1 Core differentiators (must-have for PraesagiumChain)

| Feature | Description | Where |
|---------|-------------|-------|
| **PHPE uncertainty visualization** | Show probability as a range (e.g. "65% ±12%") with a visual band, gauge, or confidence interval bar. Highlight that PraesagiumChain is the only platform showing calibrated uncertainty from the PHPE engine. | Market detail, predictions list |
| **Hybrid prediction builder** | Step-by-step: (1) Paste sentiment text, (2) Add Binance symbol (dropdown: BTCUSDT, ETHUSDT, etc.), (3) Toggle Chainlink price, (4) Add social texts (multi-line). Show live fetch from `/api/sources/fetch` before predict. Explain: "Combines AI + price data + PHPE for calibrated probability." | Market detail, create form |
| **Resolution source badge** | For price/weather/sports markets: "Resolves via: Binance BTCUSDT ≥ $50k" or "Weather API: precipitation at (lat, lon)" or "Sports API: fixture X winner". Use report endpoints to show how resolution will be determined. | Market detail |
| **Creator reputation badge** | On market card: small badge with reputation score (e.g. "Rep: 85"); link to `/reputation/[address]`. Build trust before betting. | Market card |

### 11.2 UX polish

| Feature | Description | Where |
|---------|-------------|-------|
| **Countdown urgency** | Color change or pulse when < 1 hour left; "URGENT" label for markets closing soon | Market card, detail |
| **Portfolio P&amp;L** | In My Positions: total invested vs total claimable; simple P&amp;L percentage; "You're up X ETH" or "Pending resolution" | My positions |
| **Activity feed** | Optional: recent bets, resolutions, claims (from contract events via wagmi or backend if endpoint added). "You bet 0.1 ETH on Yes" — "Market resolved Yes — Claim available" | Dashboard or sidebar |
| **Onboarding tooltip** | First-time: short tour "Connect wallet → Browse markets → Place bet → Claim when resolved" | Modal on first visit (dismissible, localStorage flag) |
| **Share market** | Copy link button; "Share to X" with pre-filled: "Check out this prediction market: [question] — [url]" | Market detail |
| **Favorites / Watchlist** | LocalStorage: star markets; filter "My favorites" on dashboard | Dashboard |
| **Dark/light theme** | next-themes toggle in header; persist preference | Header |
| **Skeleton loaders** | Shimmer effect for cards and detail; avoid jarring layout shifts | All list/detail views |

### 11.3 Advanced creative ideas (nice-to-have)

| Feature | Description | Where |
|---------|-------------|-------|
| **Price context for crypto markets** | When market question mentions "BTC" or "ETH," fetch live price from `/api/sources/fetch?source=binance&symbol=BTCUSDT` and show: "BTC currently: $X" next to stake totals. Helps users decide. | Market detail |
| **Prediction history chart** | If multiple predictions exist for a market, plot probability over time (line chart). Show uncertainty bands if available. | Market detail |
| **Compare sources** | In hybrid widget: fetch Binance + Chainlink + Cryptocompare for same pair; show all prices; "Predict" uses backend to fuse. Demonstrates multi-source CRE. | Hybrid preview |
| **Market templates** | Create form: "ETH > $X by date" template pre-fills question and suggests close/resolve times. "BTC sentiment" template. Reduces friction. | Create market |
| **Gas estimation** | Before placeBet/claimPayout: show estimated gas (viem `estimateGas`). "Est. cost: ~0.002 ETH." | Bet form, Claim button |
| **Tx history** | Link to explorer for every tx (create, bet, claim). "View on Etherscan" with tx hash. | Post-tx toasts, activity |

---

## 12. Implementation checklist (recommended order)

- [ ] **Setup:** Next.js, TypeScript, Tailwind, wagmi, React Query, env from `config/frontend.env.example`
- [ ] **Types:** Add all types (§ 4)
- [ ] **API client:** `lib/api.ts` with functions for every endpoint (§ 5)
- [ ] **Contract:** Copy ABI, configure wagmi; hooks for getMarket, getUserStake, createMarket, placeBet, claimPayout
- [ ] **Layout:** Header (nav, wallet, wrong-network), footer (API status)
- [ ] **Dashboard:** Stats, list with filters/pagination, market cards with countdown
- [ ] **Market detail:** Full view, user position, bet form, claim, predictions with uncertainty
- [ ] **Create market:** Form, validation, submit to contract, optional POST to backend
- [ ] **Sentiment/hybrid widget:** Preview probability and uncertainty on detail (and optionally create)
- [ ] **My positions:** User stakes and claimable; claim from here or detail
- [ ] **Reputation:** `/reputation/[address]` and links from market cards
- [ ] **Data sources explorer:** Optional `/sources` page
- [ ] **Theme, explorer links, toasts, loading states, a11y pass**
- [ ] **Creative features:** PHPE visualization, resolution source badge, favorites, share

---

## 13. References

- **API and data:** [development-and-deployment.md](development-and-deployment.md) §§ 2–3
- **Architecture and CRE flow:** [architecture-and-design.md](architecture-and-design.md)
- **Testnet deployment:** [deploy-testnet.md](deploy-testnet.md)
- **Env:** `config/frontend.env.example`
- **ABIs:** `contracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json`

---

This document is the single source of truth for the frontend: every page, component, API call, contract call, type, and feature is specified so the frontend developer can implement the app without guessing.
