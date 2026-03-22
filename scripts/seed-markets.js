/**
 * seed-markets.js — Crea ~100 mercados de prueba en el backend local.
 *
 * Uso:
 *   node scripts/seed-markets.js
 *
 * Requiere que el backend esté corriendo. Por defecto usa API_BASE_URL o localhost:4000.
 */

require("dotenv").config();
const BASE_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://localhost:4000";

// ─── Helpers de tiempo ────────────────────────────────────────────────────────

const now   = () => Math.floor(Date.now() / 1000);
const days  = (n) => n * 24 * 60 * 60;
const hours = (n) => n * 60 * 60;

// close en X días, resolve en X+Y días desde ahora
function timeline(closeDays, resolveExtraDays = 3) {
  return {
    close_time:   now() + days(closeDays),
    resolve_time: now() + days(closeDays + resolveExtraDays),
  };
}

// ─── Metadatos de resolución ──────────────────────────────────────────────────

const meta = {
  priceAbove: (symbol, threshold, source = "binance") =>
    JSON.stringify({ resolution: { type: "price_above", symbol, threshold: String(threshold), priceSource: source } }),

  weather: (lat, lon, date) =>
    JSON.stringify({ resolution: { type: "weather_rained", lat: String(lat), lon: String(lon), date } }),

  sports: (fixtureId, winnerTeam) =>
    JSON.stringify({ resolution: { type: "sports_winner", fixtureId: String(fixtureId), winnerTeam } }),

  sentiment: (text, threshold = "0.6") =>
    JSON.stringify({ resolution: { type: "ai_sentiment", sentimentText: text, sentimentThreshold: String(threshold) } }),

  cryptoNewsSentiment: (symbol, threshold = "0.6") =>
    JSON.stringify({ resolution: { type: "crypto_news_sentiment", newsSymbol: symbol, newsSentimentThreshold: String(threshold) } }),

  hybrid: (symbol, threshold) =>
    JSON.stringify({ resolution: { type: "price_above", symbol, threshold: String(threshold), priceSource: "chainlink" } }),
};

// ─── Definición de los 100 mercados ──────────────────────────────────────────

const MARKETS = [
  // ── BTC ──────────────────────────────────────────────────────────────────
  { question: "Will BTC exceed $70,000 before April 2026?",                       ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("BTCUSDT", 70000) },
  { question: "Will BTC exceed $80,000 before June 2026?",                        ...timeline(90),  market_type: "base",  metadata: meta.priceAbove("BTCUSDT", 80000) },
  { question: "Will BTC exceed $100,000 before end of 2026?",                     ...timeline(180), market_type: "base",  metadata: meta.priceAbove("BTCUSDT", 100000) },
  { question: "Will BTC drop below $50,000 before March 2026?",                   ...timeline(14),  market_type: "base",  metadata: meta.priceAbove("BTCUSDT", 50000) },
  { question: "Will BTC close above $65,000 on March 15, 2026?",                  ...timeline(16),  market_type: "base",  metadata: meta.priceAbove("BTCUSDT", 65000) },
  { question: "Will BTC reach a new ATH above $108,000 in Q1 2026?",              ...timeline(32),  market_type: "base",  metadata: meta.priceAbove("BTCUSDT", 108000) },
  { question: "Will BTC dominance stay above 50% through March 2026?",            ...timeline(28),  market_type: "ai",    metadata: meta.sentiment("Bitcoin dominance market share crypto 2026", "0.6") },
  { question: "Will BTC ETF inflows exceed $5B in March 2026?",                   ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("Bitcoin ETF institutional inflows March 2026", "0.65") },
  { question: "Will Bitcoin sentiment from news and real-time data stay bullish in Q2 2026?", ...timeline(60),  market_type: "ai",    metadata: meta.cryptoNewsSentiment("BTC", "0.55") },
  { question: "Will ETH news and market context favour a price rally by April 2026?",            ...timeline(45),  market_type: "ai",    metadata: meta.cryptoNewsSentiment("ETH", "0.6") },

  // ── ETH ──────────────────────────────────────────────────────────────────
  { question: "Will ETH exceed $4,000 before May 2026?",                          ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("ETHUSDT", 4000) },
  { question: "Will ETH exceed $5,000 before end of 2026?",                       ...timeline(180), market_type: "base",  metadata: meta.priceAbove("ETHUSDT", 5000) },
  { question: "Will ETH drop below $2,000 in March 2026?",                        ...timeline(14),  market_type: "base",  metadata: meta.priceAbove("ETHUSDT", 2000) },
  { question: "Will ETH gas fees average below 5 gwei in April 2026?",            ...timeline(45),  market_type: "ai",    metadata: meta.sentiment("Ethereum gas fees gwei low April 2026", "0.55") },
  { question: "Will the ETH/BTC ratio exceed 0.065 before June 2026?",            ...timeline(90),  market_type: "base",  metadata: meta.priceAbove("ETHBTC", 0.065, "binance") },
  { question: "Will ETH staking APY stay above 3.5% through Q2 2026?",            ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Ethereum staking yield APY 2026", "0.6") },
  { question: "Will Ethereum complete a major protocol upgrade in H1 2026?",       ...timeline(120), market_type: "ai",    metadata: meta.sentiment("Ethereum protocol upgrade Pectra 2026", "0.7") },

  // ── Sepolia / Testnet ─────────────────────────────────────────────────────
  { question: "Will Sepolia testnet process over 1M transactions in March 2026?",  ...timeline(28),  market_type: "ai",    metadata: meta.sentiment("Sepolia testnet transaction volume March 2026", "0.6") },
  { question: "Will Sepolia block time stay under 12 seconds in Q1 2026?",         ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("Sepolia Ethereum testnet block time performance", "0.65") },
  { question: "Will Sepolia see a major DApp deployment in March 2026?",           ...timeline(28),  market_type: "ai",    metadata: meta.sentiment("Sepolia testnet DApp deployment activity 2026", "0.5") },

  // ── LINK (Chainlink) ──────────────────────────────────────────────────────
  { question: "Will LINK exceed $25 before April 2026?",                           ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("LINKUSDT", 25) },
  { question: "Will LINK exceed $40 before end of 2026?",                          ...timeline(180), market_type: "base",  metadata: meta.priceAbove("LINKUSDT", 40) },
  { question: "Will LINK drop below $12 in March 2026?",                           ...timeline(14),  market_type: "base",  metadata: meta.priceAbove("LINKUSDT", 12) },
  { question: "Will Chainlink CCIP reach 10 supported chains by June 2026?",       ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Chainlink CCIP cross-chain interoperability expansion 2026", "0.65") },
  { question: "Will Chainlink launch a new oracle network in Q2 2026?",            ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Chainlink new oracle network product launch 2026", "0.6") },

  // ── SOL ──────────────────────────────────────────────────────────────────
  { question: "Will SOL exceed $250 before April 2026?",                           ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("SOLUSDT", 250) },
  { question: "Will SOL exceed $400 before end of 2026?",                          ...timeline(180), market_type: "base",  metadata: meta.priceAbove("SOLUSDT", 400) },
  { question: "Will Solana suffer a network outage in Q1 2026?",                   ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("Solana network outage downtime 2026", "0.4") },
  { question: "Will Solana TVL exceed $20B in April 2026?",                        ...timeline(45),  market_type: "ai",    metadata: meta.sentiment("Solana DeFi TVL total value locked 2026", "0.65") },

  // ── BNB ──────────────────────────────────────────────────────────────────
  { question: "Will BNB exceed $800 before June 2026?",                            ...timeline(90),  market_type: "base",  metadata: meta.priceAbove("BNBUSDT", 800) },
  { question: "Will BNB Chain daily transactions exceed 10M in March 2026?",       ...timeline(28),  market_type: "ai",    metadata: meta.sentiment("BNB Chain daily transactions volume March 2026", "0.6") },

  // ── MATIC / POL ───────────────────────────────────────────────────────────
  { question: "Will POL (ex-MATIC) exceed $1.50 before May 2026?",                 ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("POLUSDT", 1.5) },
  { question: "Will Polygon zkEVM process 1M transactions/day by Q2 2026?",        ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Polygon zkEVM transactions per day 2026", "0.6") },

  // ── AVAX ─────────────────────────────────────────────────────────────────
  { question: "Will AVAX exceed $50 before April 2026?",                           ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("AVAXUSDT", 50) },
  { question: "Will Avalanche launch a major subnet in Q2 2026?",                  ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Avalanche subnet launch 2026", "0.6") },

  // ── DOT ──────────────────────────────────────────────────────────────────
  { question: "Will DOT exceed $12 before May 2026?",                              ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("DOTUSDT", 12) },
  { question: "Will Polkadot 2.0 coretime sales exceed $10M in Q2 2026?",          ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Polkadot coretime parachain sales revenue 2026", "0.55") },

  // ── ADA ──────────────────────────────────────────────────────────────────
  { question: "Will ADA exceed $1.20 before April 2026?",                          ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("ADAUSDT", 1.2) },
  { question: "Will Cardano Chang hard fork complete successfully in Q1 2026?",     ...timeline(28),  market_type: "ai",    metadata: meta.sentiment("Cardano Chang hard fork governance 2026", "0.7") },

  // ── DOGE ─────────────────────────────────────────────────────────────────
  { question: "Will DOGE exceed $0.50 before March 2026?",                         ...timeline(14),  market_type: "base",  metadata: meta.priceAbove("DOGEUSDT", 0.5) },
  { question: "Will DOGE exceed $1.00 before end of 2026?",                        ...timeline(180), market_type: "base",  metadata: meta.priceAbove("DOGEUSDT", 1.0) },

  // ── XRP ──────────────────────────────────────────────────────────────────
  { question: "Will XRP exceed $3.50 before April 2026?",                          ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("XRPUSDT", 3.5) },
  { question: "Will the SEC vs Ripple case fully resolve in 2026?",                 ...timeline(180), market_type: "ai",    metadata: meta.sentiment("SEC Ripple XRP lawsuit resolution 2026", "0.6") },

  // ── UNI ──────────────────────────────────────────────────────────────────
  { question: "Will UNI exceed $15 before May 2026?",                              ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("UNIUSDT", 15) },
  { question: "Will Uniswap v4 TVL exceed $5B in Q2 2026?",                        ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Uniswap v4 TVL liquidity 2026", "0.65") },

  // ── AAVE ─────────────────────────────────────────────────────────────────
  { question: "Will AAVE exceed $300 before April 2026?",                          ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("AAVEUSDT", 300) },
  { question: "Will Aave GHO stablecoin reach $500M supply in Q2 2026?",           ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Aave GHO stablecoin supply growth 2026", "0.6") },

  // ── ARB ──────────────────────────────────────────────────────────────────
  { question: "Will ARB exceed $1.50 before May 2026?",                            ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("ARBUSDT", 1.5) },
  { question: "Will Arbitrum TVL exceed $25B in Q2 2026?",                         ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Arbitrum TVL DeFi growth 2026", "0.65") },

  // ── OP ───────────────────────────────────────────────────────────────────
  { question: "Will OP exceed $2.50 before April 2026?",                           ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("OPUSDT", 2.5) },
  { question: "Will the Optimism Superchain reach 20 OP chains by June 2026?",     ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Optimism Superchain OP Stack chains 2026", "0.65") },

  // ── Macro / DeFi ─────────────────────────────────────────────────────────
  { question: "Will total DeFi TVL exceed $200B before June 2026?",                ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("DeFi total value locked TVL 200 billion 2026", "0.6") },
  { question: "Will a stablecoin depeg event occur in Q1 2026?",                   ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("stablecoin depeg USDC USDT DAI 2026", "0.35") },
  { question: "Will the global crypto market cap exceed $5T in 2026?",             ...timeline(180), market_type: "ai",    metadata: meta.sentiment("global crypto market cap 5 trillion 2026", "0.65") },
  { question: "Will a major CEX collapse in Q1 2026?",                             ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("crypto exchange collapse bankruptcy 2026", "0.3") },
  { question: "Will the US approve a spot ETH ETF options product in Q1 2026?",    ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("Ethereum ETF options SEC approval 2026", "0.6") },
  { question: "Will Bitcoin halving impact drive BTC above ATH in 2026?",          ...timeline(120), market_type: "ai",    metadata: meta.sentiment("Bitcoin halving price impact all time high 2026", "0.7") },

  // ── Weather ───────────────────────────────────────────────────────────────
  { question: "Will it rain in Miami on March 20, 2026?",                          ...timeline(21),  market_type: "base",  metadata: meta.weather(25.77, -80.19, "2026-03-20") },
  { question: "Will it rain in London on April 1, 2026?",                          ...timeline(33),  market_type: "base",  metadata: meta.weather(51.51, -0.12,  "2026-04-01") },
  { question: "Will it rain in Tokyo on March 25, 2026?",                          ...timeline(26),  market_type: "base",  metadata: meta.weather(35.68, 139.69, "2026-03-25") },
  { question: "Will it rain in New York on April 5, 2026?",                        ...timeline(37),  market_type: "base",  metadata: meta.weather(40.71, -74.00, "2026-04-05") },
  { question: "Will it rain in São Paulo on March 30, 2026?",                      ...timeline(31),  market_type: "base",  metadata: meta.weather(-23.55, -46.63, "2026-03-30") },
  { question: "Will it rain in Dubai on April 10, 2026?",                          ...timeline(42),  market_type: "base",  metadata: meta.weather(25.20, 55.27, "2026-04-10") },
  { question: "Will it rain in Sydney on March 28, 2026?",                         ...timeline(29),  market_type: "base",  metadata: meta.weather(-33.86, 151.20, "2026-03-28") },

  // ── Sports ────────────────────────────────────────────────────────────────
  { question: "Will Manchester City win the Champions League 2025/26?",            ...timeline(90),  market_type: "base",  metadata: meta.sports(1001, "Manchester City") },
  { question: "Will Real Madrid win La Liga 2025/26?",                             ...timeline(90),  market_type: "base",  metadata: meta.sports(1002, "Real Madrid") },
  { question: "Will the Golden State Warriors make the NBA playoffs 2026?",        ...timeline(45),  market_type: "base",  metadata: meta.sports(2001, "Golden State Warriors") },
  { question: "Will Max Verstappen win the F1 2026 season championship?",          ...timeline(180), market_type: "base",  metadata: meta.sports(3001, "Max Verstappen") },
  { question: "Will Argentina win the 2026 FIFA World Cup?",                       ...timeline(180), market_type: "base",  metadata: meta.sports(4001, "Argentina") },
  { question: "Will Brazil qualify for the 2026 World Cup knockout stage?",        ...timeline(120), market_type: "base",  metadata: meta.sports(4002, "Brazil") },

  // ── AI Sentiment ──────────────────────────────────────────────────────────
  { question: "Will AI regulation pass in the EU before June 2026?",               ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("EU AI Act regulation enforcement 2026", "0.7") },
  { question: "Will OpenAI release GPT-5 before April 2026?",                      ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("OpenAI GPT-5 release date 2026", "0.55") },
  { question: "Will a major AI company IPO in Q1 2026?",                           ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("AI company IPO stock market 2026", "0.5") },
  { question: "Will crypto sentiment index stay above 60 in March 2026?",          ...timeline(28),  market_type: "ai",    metadata: meta.sentiment("crypto fear greed index bullish March 2026", "0.6") },
  { question: "Will Elon Musk tweet about DOGE more than 5 times in March 2026?",  ...timeline(28),  market_type: "ai",    metadata: meta.sentiment("Elon Musk Dogecoin tweet March 2026", "0.5") },

  // ── Private (commit-reveal) ───────────────────────────────────────────────
  { question: "Will BTC close above $68,000 on March 31, 2026? [Private]",        ...timeline(32),  market_type: "private", metadata: meta.priceAbove("BTCUSDT", 68000) },
  { question: "Will ETH close above $3,500 on April 15, 2026? [Private]",         ...timeline(47),  market_type: "private", metadata: meta.priceAbove("ETHUSDT", 3500) },
  { question: "Will LINK exceed $20 before April 2026? [Private]",                ...timeline(30),  market_type: "private", metadata: meta.priceAbove("LINKUSDT", 20) },
  { question: "Will SOL exceed $200 before April 2026? [Private]",                ...timeline(30),  market_type: "private", metadata: meta.priceAbove("SOLUSDT", 200) },

  // ── Chainlink oracle (hybrid) ─────────────────────────────────────────────
  { question: "Will BTC/USD Chainlink feed report above $72,000 in April 2026?",   ...timeline(35),  market_type: "base",  metadata: meta.hybrid("BTCUSDT", 72000) },
  { question: "Will ETH/USD Chainlink feed report above $4,200 in May 2026?",      ...timeline(65),  market_type: "base",  metadata: meta.hybrid("ETHUSDT", 4200) },
  { question: "Will LINK/USD Chainlink feed report above $28 in May 2026?",        ...timeline(65),  market_type: "base",  metadata: meta.hybrid("LINKUSDT", 28) },

  // ── Conditional ──────────────────────────────────────────────────────────
  // (se crean por separado después de tener IDs reales)

  // ── Macro económico ───────────────────────────────────────────────────────
  { question: "Will the Fed cut interest rates in March 2026?",                    ...timeline(28),  market_type: "ai",    metadata: meta.sentiment("Federal Reserve interest rate cut March 2026", "0.55") },
  { question: "Will US inflation drop below 2.5% in Q1 2026?",                    ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("US CPI inflation rate Q1 2026", "0.5") },
  { question: "Will gold exceed $3,000/oz before April 2026?",                     ...timeline(30),  market_type: "ai",    metadata: meta.sentiment("gold price 3000 dollars per ounce 2026", "0.65") },
  { question: "Will the S&P 500 reach 6,500 before June 2026?",                   ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("S&P 500 index 6500 points 2026", "0.6") },
  { question: "Will the USD/EUR rate drop below 0.90 in Q2 2026?",                ...timeline(90),  market_type: "base",  metadata: meta.priceAbove("EURUSD", 1.11, "exchangerate") },

  // ── Tech / Adoption ───────────────────────────────────────────────────────
  { question: "Will a G20 country adopt Bitcoin as legal tender in 2026?",         ...timeline(180), market_type: "ai",    metadata: meta.sentiment("Bitcoin legal tender G20 country adoption 2026", "0.3") },
  { question: "Will Ethereum L2 total TVL exceed $50B in Q2 2026?",               ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("Ethereum Layer 2 TVL 50 billion 2026", "0.65") },
  { question: "Will a crypto project raise over $1B in a public sale in 2026?",    ...timeline(180), market_type: "ai",    metadata: meta.sentiment("crypto ICO token sale 1 billion 2026", "0.45") },
  { question: "Will NFT trading volume exceed $5B in Q2 2026?",                   ...timeline(90),  market_type: "ai",    metadata: meta.sentiment("NFT trading volume market 2026", "0.5") },
  { question: "Will a major bank launch a crypto custody service in H1 2026?",     ...timeline(120), market_type: "ai",    metadata: meta.sentiment("bank crypto custody institutional service 2026", "0.65") },

  // ── Más cryptos ───────────────────────────────────────────────────────────
  { question: "Will SUI exceed $5 before April 2026?",                             ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("SUIUSDT", 5) },
  { question: "Will APT exceed $15 before May 2026?",                              ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("APTUSDT", 15) },
  { question: "Will INJ exceed $30 before April 2026?",                            ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("INJUSDT", 30) },
  { question: "Will TIA exceed $8 before May 2026?",                               ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("TIAUSDT", 8) },
  { question: "Will JUP exceed $1.50 before April 2026?",                          ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("JUPUSDT", 1.5) },
  { question: "Will WIF exceed $3 before March 2026?",                             ...timeline(14),  market_type: "base",  metadata: meta.priceAbove("WIFUSDT", 3) },
  { question: "Will BONK exceed $0.00005 before April 2026?",                      ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("BONKUSDT", 0.00005) },
  { question: "Will PEPE exceed $0.000025 before April 2026?",                     ...timeline(30),  market_type: "base",  metadata: meta.priceAbove("PEPEUSDT", 0.000025) },
  { question: "Will FET exceed $2 before May 2026?",                               ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("FETUSDT", 2) },
  { question: "Will RENDER exceed $10 before May 2026?",                           ...timeline(60),  market_type: "base",  metadata: meta.priceAbove("RENDERUSDT", 10) },
];

// ─── Script principal ─────────────────────────────────────────────────────────

async function createMarket(market, index) {
  try {
    const res = await fetch(`${BASE_URL}/api/markets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(market),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`  ✗ [${index + 1}] FAILED: ${market.question.slice(0, 60)}...`);
      console.error(`    → ${res.status}: ${text.slice(0, 120)}`);
      return null;
    }

    const data = await res.json();
    console.log(`  ✓ [${index + 1}] #${data.id} ${market.market_type.toUpperCase().padEnd(10)} ${market.question.slice(0, 65)}`);
    return data;
  } catch (err) {
    console.error(`  ✗ [${index + 1}] ERROR: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         PraesagiumChain — Market Seed Script                ║");
  console.log(`║         ${MARKETS.length} markets · ${new Date().toISOString()}         ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Health check
  try {
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) throw new Error("unhealthy");
    console.log("✓ Backend healthy\n");
  } catch {
    console.error("✗ Backend not reachable at", BASE_URL);
    console.error("  Make sure to run: cd backend && cargo run\n");
    process.exit(1);
  }

  const results = { ok: 0, fail: 0, ids: [] };

  // Create markets with a small delay between each to avoid rate limiting
  for (let i = 0; i < MARKETS.length; i++) {
    const market = MARKETS[i];
    const created = await createMarket(market, i);
    if (created) {
      results.ok++;
      results.ids.push(created.id);
    } else {
      results.fail++;
    }
    // 120ms between requests — well within rate limit
    if (i < MARKETS.length - 1) await new Promise((r) => setTimeout(r, 120));
  }

  // ── Conditional markets (need real IDs from above) ────────────────────────
  if (results.ids.length >= 2) {
    console.log("\n── Creating conditional markets ──────────────────────────────");
    const conditionals = [
      {
        question: "Will ETH exceed $4,000 IF BTC first exceeds $70,000?",
        ...timeline(60),
        creator: null,
        conditions: [{ condition_contract: "0x0000000000000000000000000000000000000000", condition_market_id: results.ids[0], expected_outcome: "Yes" }],
        metadata: meta.priceAbove("ETHUSDT", 4000),
      },
      {
        question: "Will LINK exceed $25 IF ETH first exceeds $4,000?",
        ...timeline(75),
        creator: null,
        conditions: [{ condition_contract: "0x0000000000000000000000000000000000000000", condition_market_id: results.ids[8], expected_outcome: "Yes" }],
        metadata: meta.priceAbove("LINKUSDT", 25),
      },
      {
        question: "Will SOL exceed $300 IF BTC exceeds $80,000?",
        ...timeline(90),
        creator: null,
        conditions: [{ condition_contract: "0x0000000000000000000000000000000000000000", condition_market_id: results.ids[1], expected_outcome: "Yes" }],
        metadata: meta.priceAbove("SOLUSDT", 300),
      },
    ];

    for (let i = 0; i < conditionals.length; i++) {
      try {
        const res = await fetch(`${BASE_URL}/api/markets/conditional`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(conditionals[i]),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error(`  ✗ Conditional [${i + 1}] FAILED: ${res.status} ${text.slice(0, 100)}`);
        } else {
          const data = await res.json();
          console.log(`  ✓ Conditional [${i + 1}] #${data.id} ${conditionals[i].question.slice(0, 60)}`);
          results.ok++;
        }
      } catch (err) {
        console.error(`  ✗ Conditional [${i + 1}] ERROR: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  ✓ Created: ${String(results.ok).padEnd(4)}  ✗ Failed: ${String(results.fail).padEnd(4)}  Total: ${results.ok + results.fail}`.padEnd(63) + "║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (results.fail > 0) {
    console.log("\nTip: If you see rate limit errors, wait 60s and run again.");
  }
}

main().catch(console.error);
