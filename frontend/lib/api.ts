import type {
  MarketStats,
  MarketView,
  PaginatedResponse,
  PredictionView,
  CreatorReputation,
  SentimentResponse,
  HybridPredictResponse,
  ConditionalConditionView,
  SourceInfo,
  FetchResponse,
} from "@/types/api";

// En el navegador usamos rutas relativas (/api/...) para que pasen por el proxy
// de Next.js (next.config.js rewrites → backend). Esto evita problemas de CORS,
// rate limiting directo y exponer la URL del backend en el cliente.
// En SSR (servidor de Next.js) usamos la URL absoluta del backend.
const getBaseUrl = (): string => {
  if (typeof window === "undefined") {
    // Contexto servidor (SSR/RSC): necesita URL absoluta
    const url = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    return url.replace(/\/$/, "");
  }
  // Contexto cliente: rutas relativas → proxy de Next.js
  return "";
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

export async function getLeaderboard(
  limit = 20,
  offset = 0
): Promise<CreatorReputation[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return fetchApi<CreatorReputation[]>(`/api/reputation?${params}`);
}

export async function getMarketConditions(
  id: number
): Promise<ConditionalConditionView[]> {
  return fetchApi<ConditionalConditionView[]>(`/api/markets/${id}/conditions`);
}

export async function getSources(): Promise<SourceInfo[]> {
  return fetchApi<SourceInfo[]>("/api/sources");
}

export async function fetchSource(
  source: string,
  params: Record<string, string>
): Promise<FetchResponse> {
  const searchParams = new URLSearchParams({ source, ...params });
  return fetchApi<FetchResponse>(`/api/sources/fetch?${searchParams}`);
}

export async function checkHealth(): Promise<boolean> {
  try {
    // Usa ruta relativa → proxy de Next.js → backend
    const res = await fetch("/health");
    return res.ok;
  } catch {
    return false;
  }
}
