export interface MarketView {
  id: number;
  question: string;
  close_time: number;
  resolve_time: number;
  status: string; // "Open" | "Locked" | "Resolved" | "Cancelled"
  outcome?: string; // "Yes" | "No"
  total_yes_stake: number;
  total_no_stake: number;
  creator?: string;
  market_type: string;
  metadata?: string;
  on_chain_market_id?: number;
  latest_prediction?: PredictionView;
}

export interface PredictionView {
  probability: number;
  uncertainty?: number;
  model_version?: string;
  model_hash?: string;
  timestamp: number;
}

export interface ConditionalConditionView {
  id: number;
  condition_contract: string;
  condition_market_id: number;
  expected_outcome: string;
}

export interface SourceInfo {
  id: string;
  name: string;
  desc: string;
  params: string[];
}

export interface FetchResponse {
  source: string;
  price: number | null;
  price_change_24h: number | null;
  volume_24h: number | null;
  sentiment: number | null;
}

export interface MarketStats {
  total_markets: number;
  open_markets: number;
  resolved_markets: number;
  total_predictions: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatorReputation {
  creator_address: string;
  markets_created: number;
  markets_resolved: number;
  correct_predictions: number;
  reputation_score: number;
  updated_at: number;
}

export interface SentimentResponse {
  provider?: string;
  sentiment_score?: number;
  probability: number;
}

export interface HybridPredictResponse {
  probability: number;
  uncertainty?: number;
  market_id?: number;
}

export interface AIAnalysisResponse {
  analysis: string;
  description: string;
}

export interface FeedPriceResponse {
  feed: string;
  price: number;
  price_formatted: string;
  decimals: number;
  updated_at: number;
}

export interface PrivateMarketRegisterRequest {
  on_chain_market_id: number;
  creator_address: string;
  question: string;
  close_time: number;
  resolve_time: number;
}

export interface PrivateMarketRegisterResponse {
  access_key: string;
  market_id: number;
  message: string;
}

export interface PrivateMarketAccessResponse {
  market_id: number;
  question: string;
  close_time: number;
  resolve_time: number;
  creator: string;
}

export type OutcomeEnum = 0 | 1 | 2;
export type MarketStatusEnum = 0 | 1 | 2 | 3;
