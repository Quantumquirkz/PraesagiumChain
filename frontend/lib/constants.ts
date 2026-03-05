import { predictionMarketAbi } from "@/lib/abis/prediction-market";

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
