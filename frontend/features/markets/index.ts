/**
 * Markets domain — public exports for pages and widgets.
 */
export { MarketCard } from "@/components/market-card";
export { MarketDetail } from "@/components/market-detail";
export { BetForm } from "@/components/bet-form";
export { useMarkets } from "@/hooks/use-markets";
export { usePlaceBet } from "@/hooks/use-place-bet";
export {
  getMarkets,
  getMarket,
  getStats,
  getMarketPredictions,
  createMarketBackend,
} from "@/lib/api";
export type { MarketView, PaginatedResponse, PredictionView, MarketStats } from "@/types/api";
