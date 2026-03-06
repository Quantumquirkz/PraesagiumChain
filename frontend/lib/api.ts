import type {
  MarketStats,
  MarketView,
  PaginatedResponse,
  PredictionView,
  CreatorReputation,
  SentimentResponse,
  HybridPredictResponse,
  FeedPriceResponse,
  ConditionalConditionView,
  SourceInfo,
  FetchResponse,
} from "@/types/api";

// En el navegador: si NEXT_PUBLIC_API_BASE_URL está definida, usarla (peticiones directas al backend);
// si no, usar "" para que las peticiones vayan al mismo origen y el proxy de Next (rewrites) las envíe al backend.
// En SSR usamos siempre la URL del backend.
export const getBaseUrl = (): string => {
  if (typeof window === "undefined") {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    return url.replace(/\/$/, "");
  }
  const url = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return url.replace(/\/$/, "");
};

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const base = getBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (e) {
    const msg =
      e instanceof TypeError && (String((e as Error).message).includes("fetch"))
        ? "Backend unreachable. Start the API (e.g. npm run backend). For local dev, leave NEXT_PUBLIC_API_BASE_URL unset so the Next.js proxy is used."
        : e instanceof Error ? (e as Error).message : "Network error";
    throw new Error(msg);
  }
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
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error("Invalid response from API (not JSON). Check that the backend is running and the URL is correct.");
  }
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
  const raw = await fetchApi<PaginatedResponse<MarketView> | { data: PaginatedResponse<MarketView> }>(
    `/api/markets?${params}`
  );
  // Aceptar tanto { items, total, page, limit } como { data: { items, total, page, limit } }
  if (raw && typeof raw === "object" && "items" in raw && Array.isArray((raw as PaginatedResponse<MarketView>).items)) {
    return raw as PaginatedResponse<MarketView>;
  }
  if (raw && typeof raw === "object" && "data" in raw) {
    const data = (raw as { data: PaginatedResponse<MarketView> }).data;
    if (data && Array.isArray(data.items)) {
      return data;
    }
  }
  return { items: [], total: 0, page: 1, limit };
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
  on_chain_market_id?: number;
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

export async function getFeedPrice(feed: string): Promise<FeedPriceResponse> {
  const params = new URLSearchParams({ feed });
  return fetchApi<FeedPriceResponse>(`/api/feeds/price?${params}`);
}
