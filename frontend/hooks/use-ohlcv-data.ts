import { useQuery } from '@tanstack/react-query'
import type { OHLCV, Timeframe } from '@/lib/ohlcv-utils'

// ─── Mapeo timeframe → intervalo Binance ─────────────────────────────────────

export const TIMEFRAME_TO_BINANCE_INTERVAL: Record<Timeframe, string> = {
  '15m': '15m',
  '1h':  '1h',
  '4h':  '4h',
  '24h': '1d',
  '1W':  '1w',
  '1M':  '1M',
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OHLCVCandle extends OHLCV {
  /** Unix seconds */
  time: number
}

// ─── Hook principal: datos históricos desde Binance pública ──────────────────

export function useOHLCVHistory(
  symbol: string | undefined,
  timeframe: Timeframe,
  limit = 200
) {
  const interval = TIMEFRAME_TO_BINANCE_INTERVAL[timeframe]

  return useQuery<OHLCVCandle[], Error>({
    queryKey: ['ohlcv-history', symbol, interval],
    enabled: !!symbol,
    queryFn: async () => {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Binance ${res.status}: ${res.statusText}`)
      const raw: number[][] = await res.json()
      return raw.map(([openTime, open, high, low, close, volume]) => ({
        time:   Math.floor(openTime / 1000),
        open:   Number(open),
        high:   Number(high),
        low:    Number(low),
        close:  Number(close),
        volume: Number(volume),
      }))
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    retry: 2,
  })
}
