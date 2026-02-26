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
