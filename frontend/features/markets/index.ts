/**
 * Markets domain — public exports for pages and widgets.
 */
export { MarketCard } from "@/features/markets/components/market-card";
export { MarketDetail } from "@/features/markets/components/market-detail";
export { BetForm } from "@/features/markets/components/bet-form";
export { useMarkets } from "@/features/markets/hooks/use-markets";
export { usePlaceBet } from "@/features/markets/hooks/use-place-bet";
export {
  getMarkets,
  getMarket,
  getStats,
  getMarketPredictions,
  createMarketBackend,
} from "@/lib/api";
export type { MarketView, PaginatedResponse, PredictionView, MarketStats } from "@/types/api";
