import { useQuery } from "@tanstack/react-query";

const getBase = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

// ─── Tipos mínimos de respuesta ───────────────────────────────────────────────

export interface BinanceTickerData {
  /** Precio actual */
  price?: number;
  /** Variación porcentual 24h */
  change_24h?: number;
  /** Precio de cierre del día anterior */
  prev_close?: number;
}

export interface ExchangeRateData {
  /** Tasa EUR/USD */
  rate?: number;
  change_24h?: number;
}

export interface TickerPrices {
  btc: BinanceTickerData | null;
  eth: BinanceTickerData | null;
  eur: ExchangeRateData | null;
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export function useTickerPrices() {
  return useQuery<TickerPrices>({
    queryKey: ["ticker-prices"],
    queryFn: async () => {
      const base = getBase();
      const [btc, eth, eur] = await Promise.all([
        safeFetch<BinanceTickerData>(
          `${base}/api/sources/fetch?source=binance&symbol=BTCUSDT`
        ),
        safeFetch<BinanceTickerData>(
          `${base}/api/sources/fetch?source=binance&symbol=ETHUSDT`
        ),
        safeFetch<ExchangeRateData>(
          `${base}/api/sources/fetch?source=exchangerate`
        ),
      ]);
      return { btc, eth, eur };
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    refetchIntervalInBackground: false,
  });
}
