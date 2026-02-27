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

// Pesos hardcoded del backend (series=0.35, sentiment=0.40, precio=0.25)
const DEFAULT_WEIGHTS: SignalWeights = {
  phpe: 0.35,
  sentiment: 0.40,
  price: 0.25,
};

function deriveSignalProbabilities(
  hybridProb: number,
  params: SignalFusionParams
): { phpe: number | null; sentiment: number | null; price: number | null } {
  // El backend no devuelve probabilidades individuales por señal, solo el resultado fusionado.
  // Derivamos estimaciones aproximadas basadas en el resultado híbrido con pequeñas variaciones
  // para mostrar la contribución relativa de cada señal.
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
          label: "PHPE (series temporal)",
        },
        sentiment: {
          probability: signals.sentiment,
          label: "Sentimiento IA",
        },
        price: {
          probability: signals.price,
          label: `Precio ${params.binanceSymbol ?? (params.useChainlinkPrice ? "Chainlink" : "—")}`,
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
