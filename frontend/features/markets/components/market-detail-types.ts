import type { MarketView, PredictionView } from "@/types/api";

export interface MarketOnChain {
  id: bigint;
  question: string;
  closeTime: bigint;
  resolveTime: bigint;
  status: number;
  outcome: number;
  totalYesStake: bigint;
  totalNoStake: bigint;
}

export interface UserStakeOnChain {
  yesStake: bigint;
  noStake: bigint;
}

export interface MarketDetailProps {
  marketId: number;
  market: MarketView;
  predictions: PredictionView[];
  marketOnChain: MarketOnChain | null;
  onChainLoading?: boolean;
  onChainError?: boolean;
  userStake: UserStakeOnChain | null;
  /** Called after a successful bet to refresh stake and on-chain totals */
  onBetSuccess?: () => void;
}
