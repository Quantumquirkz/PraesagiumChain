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
