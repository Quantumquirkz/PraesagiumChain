import type {
  MarketStats,
  MarketView,
  PaginatedResponse,
  PredictionView,
  CreatorReputation,
  HybridPredictResponse,
  AIAnalysisResponse,
  FeedPriceResponse,
  SentimentResponse,
  PrivateMarketRegisterRequest,
  PrivateMarketRegisterResponse,
  PrivateMarketAccessResponse,
  ConditionalConditionView,
  FetchResponse,
} from "@/types/api";

// In the browser: if NEXT_PUBLIC_API_BASE_URL is set, use it (direct requests to backend);
// otherwise use "" so requests go to same origin and Next's proxy (rewrites) forwards them to the backend.
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

/** Backend may return either a direct paginated payload or { data: paginated }. */
type MarketsListResponse =
  | PaginatedResponse<MarketView>
  | { data: PaginatedResponse<MarketView> };

function isPaginatedResponse(
  raw: MarketsListResponse
): raw is PaginatedResponse<MarketView> {
  return (
    raw != null &&
    typeof raw === "object" &&
    "items" in raw &&
    Array.isArray((raw as PaginatedResponse<MarketView>).items)
  );
}

export async function getMarkets(
  page: number,
  limit: number,
  status?: string
): Promise<PaginatedResponse<MarketView>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  const raw = await fetchApi<MarketsListResponse>(`/api/markets?${params}`);
  if (isPaginatedResponse(raw)) {
    return raw;
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

/** DELETE /api/admin/markets/:id — dev only (backend returns 403 in production). */
export async function deleteMarket(id: number): Promise<{ deleted: number }> {
  const base = getBaseUrl();
  const url = `${base}/api/admin/markets/${id}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const json = JSON.parse(text) as { error?: string };
      message = json.error ?? text;
    } catch {
      message = text || `Error ${res.status}`;
    }
    throw new Error(message);
  }
  return res.json() as Promise<{ deleted: number }>;
}

export async function getMarketPredictions(id: number): Promise<PredictionView[]> {
  return fetchApi<PredictionView[]>(`/api/markets/${id}/predictions`);
}

export async function createMarketBackend(body: {
  question: string;
  close_time: number;
  resolve_time: number;
  creator?: string;
  market_type?: string;
  metadata?: string;
  on_chain_market_id?: number;
}): Promise<MarketView> {
  return fetchApi<MarketView>("/api/markets", {
    method: "POST",
    body: JSON.stringify(body),
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

export async function getMarketAIAnalysis(
  marketId: number,
  params?: { sentimentText?: string; binanceSymbol?: string }
): Promise<AIAnalysisResponse> {
  return fetchApi<AIAnalysisResponse>(
    `/api/markets/${marketId}/ai/analysis`,
    {
      method: "POST",
      body: JSON.stringify({
        sentiment_text: params?.sentimentText,
        binance_symbol: params?.binanceSymbol,
      }),
    }
  );
}

export async function getReputation(address: string): Promise<CreatorReputation> {
  return fetchApi<CreatorReputation>(`/api/reputation/${address}`);
}

export async function getMarketConditions(
  id: number
): Promise<ConditionalConditionView[]> {
  return fetchApi<ConditionalConditionView[]>(`/api/markets/${id}/conditions`);
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

export interface WeatherCurrentResponse {
  temp: number;
  precipitation: number;
  humidity: number;
  cloud_cover: number;
  timestamp: string;
}

export async function getWeatherCurrent(lat: number, lon: number): Promise<WeatherCurrentResponse> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  return fetchApi<WeatherCurrentResponse>(`/api/weather/current?${params}`);
}

/** Resolves short Google Maps links (maps.app.goo.gl, goo.gl/maps) and returns lat/lon. */
export async function resolveMapsLocation(url: string): Promise<{ lat: number; lon: number }> {
  const params = new URLSearchParams({ url: url.trim() });
  return fetchApi<{ lat: number; lon: number }>(`/api/weather/resolve-location?${params}`);
}

export interface WeatherHistoryForecastResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    relative_humidity_2m_max: number[];
    wind_speed_10m_max: number[];
  };
}

export async function getWeatherHistoryForecast(
  lat: number,
  lon: number,
  resolutionDate?: string
): Promise<WeatherHistoryForecastResponse> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (resolutionDate) params.set("resolution_date", resolutionDate);
  return fetchApi<WeatherHistoryForecastResponse>(`/api/weather/history-forecast?${params}`);
}

export async function getAISentimentPreview(text: string): Promise<SentimentResponse> {
  return fetchApi<SentimentResponse>("/api/ai/sentiment", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function registerPrivateMarket(
  body: PrivateMarketRegisterRequest
): Promise<PrivateMarketRegisterResponse> {
  return fetchApi<PrivateMarketRegisterResponse>("/api/markets/private/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function validatePrivateMarketKey(
  key: string
): Promise<PrivateMarketAccessResponse> {
  const params = new URLSearchParams({ key: key.trim() });
  return fetchApi<PrivateMarketAccessResponse>(`/api/markets/private/access?${params}`);
}
