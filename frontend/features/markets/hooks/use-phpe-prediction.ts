import { useMutation } from '@tanstack/react-query'
import { getHybridPrediction } from '@/lib/api'

export interface PHPEParams {
  sentimentText?: string
  binanceSymbol?: string
  useChainlink?: boolean
  socialTexts?: string[]
}

export function usePHPEPrediction(marketId: number) {
  return useMutation({
    mutationFn: (params: PHPEParams) =>
      getHybridPrediction({
        market_id: marketId,
        sentiment_text: params.sentimentText,
        binance_symbol: params.binanceSymbol,
        use_chainlink_price: params.useChainlink,
        social_texts: params.socialTexts ?? [],
      }),
  })
}
