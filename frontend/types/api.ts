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
  latest_prediction?: PredictionView;
}

export interface PredictionView {
  probability: number;
  uncertainty?: number;
  model_version?: string;
  timestamp: number;
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

export type OutcomeEnum = 0 | 1 | 2;
export type MarketStatusEnum = 0 | 1 | 2 | 3;
