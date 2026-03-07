import { useMutation } from "@tanstack/react-query";
import { getMarketAIAnalysis } from "@/lib/api";

export interface AIAnalysisParams {
  sentimentText?: string;
  binanceSymbol?: string;
}

export function useAIAnalysis(marketId: number) {
  return useMutation({
    mutationFn: (params?: AIAnalysisParams) =>
      getMarketAIAnalysis(marketId, params),
  });
}
