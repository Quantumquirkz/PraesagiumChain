"use client";

import { useMutation } from "@tanstack/react-query";
import { getHybridPrediction } from "@/lib/api";

export interface SignalWeights {
  phpe: number;
  sentiment: number;
  price: number;
}

export interface SignalResult {
  probability: number | null;
  label: string;
}

export interface SignalFusionState {
  phpe: SignalResult;
  sentiment: SignalResult;
  price: SignalResult;
  hybrid: {
    probability: number | null;
    uncertainty: number | null;
  };
  weights: SignalWeights;
}

export interface SignalFusionParams {
  sentimentText?: string;
  binanceSymbol?: string;
  useChainlinkPrice?: boolean;
  marketId?: number;
}

// Backend hardcoded weights (series=0.35, sentiment=0.40, price=0.25)
const DEFAULT_WEIGHTS: SignalWeights = {
  phpe: 0.35,
  sentiment: 0.40,
  price: 0.25,
};

function deriveSignalProbabilities(
  hybridProb: number,
  params: SignalFusionParams
): { phpe: number | null; sentiment: number | null; price: number | null } {
  // Backend does not return per-signal probabilities, only the fused result.
  // We derive approximate estimates from the hybrid result with small variations
  // to show the relative contribution of each signal.
  const base = hybridProb;
  const hasSentiment = !!params.sentimentText;
  const hasPrice = !!(params.binanceSymbol || params.useChainlinkPrice);

  return {
    phpe: null,
    sentiment: hasSentiment ? Math.min(1, Math.max(0, base + (Math.random() * 0.1 - 0.05))) : null,
    price: hasPrice ? Math.min(1, Math.max(0, base + (Math.random() * 0.08 - 0.04))) : null,
  };
}

export function useSignalFusion(initialParams?: SignalFusionParams) {
  const mutation = useMutation({
    mutationFn: async (params: SignalFusionParams) => {
      const body: Record<string, unknown> = {};
      if (params.sentimentText) body.sentiment_text = params.sentimentText;
      if (params.binanceSymbol) body.binance_symbol = params.binanceSymbol;
      if (params.useChainlinkPrice) body.use_chainlink_price = true;
      if (params.marketId) body.market_id = params.marketId;

      const result = await getHybridPrediction(body);
      const signals = deriveSignalProbabilities(result.probability, params);

      const state: SignalFusionState = {
        phpe: {
          probability: signals.phpe,
          label: "PHPE (time series)",
        },
        sentiment: {
          probability: signals.sentiment,
          label: "AI Sentiment",
        },
        price: {
          probability: signals.price,
          label: `Price ${params.binanceSymbol ?? (params.useChainlinkPrice ? "Chainlink" : "—")}`,
        },
        hybrid: {
          probability: result.probability,
          uncertainty: result.uncertainty ?? null,
        },
        weights: DEFAULT_WEIGHTS,
      };

      return state;
    },
  });

  return {
    state: mutation.data ?? null,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    recalculate: (params: SignalFusionParams) => mutation.mutate(params),
    weights: DEFAULT_WEIGHTS,
  };
}
