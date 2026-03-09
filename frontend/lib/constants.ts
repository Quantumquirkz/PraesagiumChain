import { predictionMarketAbi } from "@/lib/abis/prediction-market";

/** Chain IDs que la app acepta (red correcta). Por defecto Sepolia; para desarrollo local usar NEXT_PUBLIC_CHAIN_IDS=11155111,31337 */
function getAllowedChainIds(): number[] {
  const idsEnv = process.env.NEXT_PUBLIC_CHAIN_IDS;
  if (idsEnv && idsEnv.trim()) {
    const ids = idsEnv.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0);
    if (ids.length > 0) return ids;
  }
  const single = process.env.NEXT_PUBLIC_CHAIN_ID;
  const n = single ? Number(single) : NaN;
  return [Number.isFinite(n) ? n : 11155111]; // default Sepolia
}

export const ALLOWED_CHAIN_IDS: number[] = getAllowedChainIds();

/** Chain ID por defecto para "Switch network" (primera de la lista). */
export const DEFAULT_CHAIN_ID = ALLOWED_CHAIN_IDS[0] ?? 11155111;

export function isAllowedChain(chainId: number | undefined): boolean {
  if (chainId === undefined) return false;
  return ALLOWED_CHAIN_IDS.includes(chainId);
}

export const PREDICTION_MARKET_ADDRESS = (process.env
  .NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS ?? "0xf2397b5827860b361427240d1D1F6F89e9bF197f") as `0x${string}`;

export const predictionMarketContract = {
  address: PREDICTION_MARKET_ADDRESS,
  abi: predictionMarketAbi,
} as const;

/** Contract outcome enum: 0 = None, 1 = Yes, 2 = No */
export const OUTCOME = { NONE: 0, YES: 1, NO: 2 } as const;

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.etherscan.io";

export interface BetToken {
  symbol: string;
  label: string;
  icon: string;
  color: string;
  coingeckoId?: string;
}

export const BET_TOKENS: BetToken[] = [
  { symbol: "ETH",   label: "Ethereum",  icon: "Ξ",  color: "#627EEA" },
  { symbol: "BTC",   label: "Bitcoin",   icon: "₿",  color: "#F7931A" },
  { symbol: "LINK",  label: "Chainlink", icon: "⬡",  color: "#2A5ADA" },
  { symbol: "SOL",   label: "Solana",   icon: "◎",  color: "#9945FF" },
  { symbol: "MATIC", label: "Polygon",   icon: "⬟",  color: "#8247E5" },
  { symbol: "ARB",   label: "Arbitrum",  icon: "⬡",  color: "#12AAFF" },
  { symbol: "OP",    label: "Optimism",  icon: "⬡",  color: "#FF0420" },
  { symbol: "AVAX",  label: "Avalanche", icon: "▲",  color: "#E84142" },
];

/** Cryptos with price chart (Binance). Used in create (chart to display), resolution picker and market detail. */
export interface ChartCryptoOption {
  symbol: string;
  binance: string;
  label: string;
}

export const CHART_CRYPTO_SYMBOLS: ChartCryptoOption[] = [
  { symbol: "BTC",  binance: "BTCUSDT",  label: "Bitcoin" },
  { symbol: "ETH",  binance: "ETHUSDT",  label: "Ethereum" },
  { symbol: "SOL",  binance: "SOLUSDT",  label: "Solana" },
  { symbol: "BNB",  binance: "BNBUSDT",  label: "BNB" },
  { symbol: "XRP",  binance: "XRPUSDT",  label: "XRP" },
  { symbol: "ADA",  binance: "ADAUSDT",  label: "Cardano" },
  { symbol: "DOGE", binance: "DOGEUSDT", label: "Dogecoin" },
  { symbol: "AVAX", binance: "AVAXUSDT", label: "Avalanche" },
  { symbol: "DOT",  binance: "DOTUSDT",  label: "Polkadot" },
  { symbol: "MATIC", binance: "MATICUSDT", label: "Polygon" },
  { symbol: "LINK", binance: "LINKUSDT", label: "Chainlink" },
  { symbol: "UNI",  binance: "UNIUSDT",  label: "Uniswap" },
  { symbol: "ATOM", binance: "ATOMUSDT", label: "Cosmos" },
  { symbol: "LTC",  binance: "LTCUSDT",  label: "Litecoin" },
  { symbol: "ARB",  binance: "ARBUSDT",  label: "Arbitrum" },
  { symbol: "OP",   binance: "OPUSDT",   label: "Optimism" },
  { symbol: "SUI",  binance: "SUIUSDT",  label: "Sui" },
  { symbol: "SEI",  binance: "SEIUSDT",  label: "Sei" },
  { symbol: "PEPE", binance: "PEPEUSDT", label: "Pepe" },
  { symbol: "INJ",  binance: "INJUSDT",  label: "Injective" },
  { symbol: "FIL",  binance: "FILUSDT",  label: "Filecoin" },
  { symbol: "AAVE", binance: "AAVEUSDT", label: "Aave" },
  { symbol: "APT",  binance: "APTUSDT",  label: "Aptos" },
  { symbol: "NEAR", binance: "NEARUSDT", label: "NEAR" },
  { symbol: "FET",  binance: "FETUSDT",  label: "Fetch.ai" },
];

export const CHART_CRYPTO_BINANCE_LIST: string[] = CHART_CRYPTO_SYMBOLS.map((c) => c.binance);

export function getChartSymbolLabel(binanceSymbol: string): string {
  const opt = CHART_CRYPTO_SYMBOLS.find((c) => c.binance === binanceSymbol);
  return opt?.label ?? (binanceSymbol.replace(/USDT$/i, "").trim() || "Crypto");
}

/** Returns the market's bet token from metadata (for display in position and bet form). */
export function getBetTokenFromMetadata(metadata?: string | null): BetToken {
  try {
    const m = metadata ? (JSON.parse(metadata) as Record<string, unknown>) : {};
    const sym = String(m.betToken ?? "ETH").toUpperCase().trim();
    return BET_TOKENS.find((t) => t.symbol === sym) ?? BET_TOKENS[0]!;
  } catch {
    return BET_TOKENS[0]!;
  }
}

export type MarketCategory = "crypto" | "general" | "sports" | "weather";

export function getMarketCategoryFromMetadata(metadata?: string | null): MarketCategory {
  try {
    const m = metadata ? JSON.parse(metadata) : {} as Record<string, unknown>;
    const cat = (m.category ?? m.marketCategory ?? "").toString().toLowerCase();
    if (cat === "crypto" || cat === "general" || cat === "sports" || cat === "weather") return cat as MarketCategory;
    const res = m.resolution as { type?: string } | undefined;
    const resType = (res?.type ?? "").toString();
    if (resType === "price_above") return "crypto";
    if (resType === "crypto_news_sentiment") return "crypto";
    if (resType === "weather_rained") return "weather";
    if (resType === "sports_winner") return "sports";
    if (resType === "ai_sentiment") return "general";
    return "general";
  } catch {
    return "general";
  }
}

export function getChartSymbolFromMetadata(metadata?: string | null, question?: string): string {
  try {
    const m = metadata ? JSON.parse(metadata) : {};
    const res = m.resolution;
    const raw: string = (m.chartSymbol ?? m.symbol ?? res?.symbol ?? res?.newsSymbol ?? m.asset ?? m.pair ?? m.betToken ?? "").toString().trim();
    if (raw) {
      const upper = raw.toUpperCase().replace(/USDT$/, "").replace(/_USD$/, "").replace(/-USD$/, "").trim();
      if (upper) {
        const binance = upper.length >= 2 ? `${upper}USDT` : "ETHUSDT";
        if (CHART_CRYPTO_BINANCE_LIST.includes(binance)) return binance;
      }
    }
    if (question && question.trim()) {
      const q = question.trim();
      for (const opt of CHART_CRYPTO_SYMBOLS) {
        if (new RegExp(`\\b${opt.symbol}\\b`, "i").test(q)) return opt.binance;
      }
    }
    return CHART_CRYPTO_BINANCE_LIST[0] ?? "ETHUSDT";
  } catch {
    return CHART_CRYPTO_BINANCE_LIST[0] ?? "ETHUSDT";
  }
}
