import type {
  MarketStats,
  MarketView,
  PaginatedResponse,
  PredictionView,
  CreatorReputation,
  SentimentResponse,
  HybridPredictResponse,
} from "@/types/api";

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_BASE_URL no está definida");
  return url.replace(/\/$/, "");
};

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const base = getBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      message = (json.message ?? json.error ?? text) || `Error ${res.status}`;
    } catch {
      message = text || `Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getStats(): Promise<MarketStats> {
  return fetchApi<MarketStats>("/api/markets/stats");
}

export async function getMarkets(
  page: number,
  limit: number,
  status?: string
): Promise<PaginatedResponse<MarketView>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return fetchApi<PaginatedResponse<MarketView>>(`/api/markets?${params}`);
}

export async function getMarket(id: number): Promise<MarketView> {
  return fetchApi<MarketView>(`/api/markets/${id}`);
}

export async function getMarketPredictions(id: number): Promise<PredictionView[]> {
  return fetchApi<PredictionView[]>(`/api/markets/${id}/predictions`);
}

export async function createMarketBackend(body: {
  question: string;
  close_time: number;
  resolve_time: number;
  market_type?: string;
  metadata?: string;
}): Promise<MarketView> {
  return fetchApi<MarketView>("/api/markets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getSentiment(text: string): Promise<SentimentResponse> {
  return fetchApi<SentimentResponse>("/api/ai/sentiment", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function getHybridPrediction(body: {
  market_id?: number;
  question?: string;
  [key: string]: unknown;
}): Promise<HybridPredictResponse> {
  return fetchApi<HybridPredictResponse>("/api/predict/hybrid", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getReputation(address: string): Promise<CreatorReputation> {
  return fetchApi<CreatorReputation>(`/api/reputation/${address}`);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
