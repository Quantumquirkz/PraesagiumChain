/**
 * OHLCV mock data and indicator calculations for prediction market odds (0.3–0.7).
 */

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "15m" | "1h" | "4h" | "24h" | "1W" | "1M";

const MS_PER: Record<Timeframe, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
};

/** Seed for deterministic trend from timeframe */
function seedFromTf(tf: Timeframe): number {
  const s: Record<Timeframe, number> = { "15m": 1, "1h": 2, "4h": 3, "24h": 4, "1W": 5, "1M": 6 };
  return s[tf] ?? 1;
}

export function generateMockOHLCV(timeframe: Timeframe, count = 200): OHLCV[] {
  const ms = MS_PER[timeframe];
  const baseTime = Date.now() - count * ms;
  const data: OHLCV[] = [];
  const minP = 0.3;
  const maxP = 0.85;
  const seed = seedFromTf(timeframe);
  let price = 0.4 + (seed * 0.07) % 0.25;

  for (let i = 0; i < count; i++) {
    const open = price;
    // Trend: gentle drift + mean reversion every ~50 candles
    const trend = Math.sin((i / 50) * Math.PI) * 0.015 + (Math.sin(i / 20) * 0.008);
    const noise = (Math.random() - 0.5) * 0.025;
    price = Math.min(maxP, Math.max(minP, price + trend + noise));
    const high = Math.max(open, price) + Math.random() * 0.012;
    const low = Math.min(open, price) - Math.random() * 0.012;
    const close = price;
    const volume = Math.floor(8000 + Math.random() * 45000 + (Math.random() > 0.7 ? 20000 : 0));
    data.push({
      time: Math.floor((baseTime + i * ms) / 1000),
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume,
    });
  }
  return data;
}

function sma(arr: number[], period: number, index: number): number {
  if (index < period - 1) return NaN;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) sum += arr[i];
  return sum / period;
}

function ema(arr: number[], period: number): number[] {
  const alpha = 2 / (period + 1);
  const out: number[] = [];
  let prev = arr[0];
  out[0] = prev;
  for (let i = 1; i < arr.length; i++) {
    prev = alpha * arr[i] + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

function stdDev(arr: number[], period: number, index: number): number {
  if (index < period - 1) return NaN;
  const m = sma(arr, period, index);
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) sum += (arr[i] - m) ** 2;
  return Math.sqrt(sum / period);
}

export function computeMA(data: OHLCV[], period: number): number[] {
  const closes = data.map((d) => d.close);
  return closes.map((_, i) => sma(closes, period, i));
}

export function computeBollinger(data: OHLCV[], period = 20, mult = 2): { mid: number[]; upper: number[]; lower: number[] } {
  const closes = data.map((d) => d.close);
  const mid = closes.map((_, i) => sma(closes, period, i));
  const upper = mid.map((m, i) => (Number.isNaN(m) ? NaN : m + mult * stdDev(closes, period, i)));
  const lower = mid.map((m, i) => (Number.isNaN(m) ? NaN : m - mult * stdDev(closes, period, i)));
  return { mid, upper, lower };
}

export function computeMACD(data: OHLCV[], fast = 12, slow = 26, signal = 9): { macd: number[]; signal: number[]; hist: number[] } {
  const closes = data.map((d) => d.close);
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macd = emaFast.map((f, i) => emaSlow[i] != null ? f - emaSlow[i]! : NaN);
  const signalLine: number[] = [];
  let prev = macd[slow - 1] ?? 0;
  for (let i = 0; i < macd.length; i++) {
    if (i < slow - 1) signalLine.push(NaN);
    else {
      const slice = macd.slice(Math.max(0, i - signal + 1), i + 1).filter((x) => !Number.isNaN(x));
      if (slice.length < signal) signalLine.push(NaN);
      else {
        const alpha = 2 / (signal + 1);
        prev = alpha * macd[i]! + (1 - alpha) * prev;
        signalLine.push(prev);
      }
    }
  }
  const hist = macd.map((m, i) => (Number.isNaN(m) || Number.isNaN(signalLine[i]) ? NaN : m - signalLine[i]!));
  return { macd, signal: signalLine, hist };
}

export function computeRSI(data: OHLCV[], period = 14): number[] {
  const closes = data.map((d) => d.close);
  const out: number[] = [NaN];
  for (let i = 1; i < closes.length; i++) {
    let gain = 0, loss = 0;
    for (let j = Math.max(0, i - period); j < i; j++) {
      const d = closes[j + 1]! - closes[j]!;
      if (d > 0) gain += d; else loss -= d;
    }
    const avgGain = gain / period;
    const avgLoss = loss / period;
    if (avgLoss === 0) out.push(100);
    else out.push(100 - 100 / (1 + avgGain / avgLoss));
  }
  return out;
}

export function computeStochastic(data: OHLCV[], kPeriod = 14, dPeriod = 3): { k: number[]; d: number[] } {
  const closes = data.map((d) => d.close);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const k: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) { k.push(NaN); continue; }
    const high = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const low = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    if (high === low) k.push(50);
    else k.push(100 * (closes[i]! - low) / (high - low));
  }
  const d = k.map((_, i) => sma(k, dPeriod, i));
  return { k, d };
}

export function computeStochasticRSI(rsi: number[], kPeriod = 14, dPeriod = 3): { k: number[]; d: number[] } {
  const k: number[] = [];
  for (let i = 0; i < rsi.length; i++) {
    if (i < kPeriod - 1) { k.push(NaN); continue; }
    const slice = rsi.slice(i - kPeriod + 1, i + 1).filter((x) => !Number.isNaN(x));
    if (slice.length < kPeriod) { k.push(NaN); continue; }
    const min = Math.min(...slice);
    const max = Math.max(...slice);
    const r = rsi[i]!;
    if (max === min) k.push(50);
    else k.push(100 * (r - min) / (max - min));
  }
  const d = k.map((_, i) => sma(k, dPeriod, i));
  return { k, d };
}

export function computeIchimoku(data: OHLCV[]): { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[] } {
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const tenkan = highs.map((_, i) => {
    if (i < 8) return NaN;
    const h = Math.max(...highs.slice(i - 9, i + 1));
    const l = Math.min(...lows.slice(i - 9, i + 1));
    return (h + l) / 2;
  });
  const kijun = highs.map((_, i) => {
    if (i < 25) return NaN;
    const h = Math.max(...highs.slice(i - 26, i + 1));
    const l = Math.min(...lows.slice(i - 26, i + 1));
    return (h + l) / 2;
  });
  const senkouA: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < 26) senkouA.push(NaN);
    else {
      const t = tenkan[i - 26];
      const k = kijun[i - 26];
      senkouA.push((Number.isNaN(t) || Number.isNaN(k)) ? NaN : (t + k) / 2);
    }
  }
  const senkouB: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < 51) senkouB.push(NaN);
    else {
      const h = Math.max(...highs.slice(i - 52, i - 25));
      const l = Math.min(...lows.slice(i - 52, i - 25));
      senkouB.push((h + l) / 2);
    }
  }
  return { tenkan, kijun, senkouA, senkouB };
}

export function computeATR(data: OHLCV[], period = 14): number[] {
  const tr: number[] = [data[0]!.high - data[0]!.low];
  for (let i = 1; i < data.length; i++) {
    const prevClose = data[i - 1]!.close;
    tr.push(Math.max(
      data[i]!.high - data[i]!.low,
      Math.abs(data[i]!.high - prevClose),
      Math.abs(data[i]!.low - prevClose)
    ));
  }
  return tr.map((_, i) => sma(tr, period, i));
}

export function computeOBV(data: OHLCV[]): number[] {
  const out: number[] = [data[0]!.volume * (data[0]!.close >= data[0]!.open ? 1 : -1)];
  for (let i = 1; i < data.length; i++) {
    out.push(out[i - 1]! + data[i]!.volume * (data[i]!.close >= data[i]!.open ? 1 : -1));
  }
  return out;
}

export function computeBOP(data: OHLCV[]): number[] {
  return data.map((d) => {
    const range = d.high - d.low;
    if (range === 0) return 0;
    return (d.close - d.open) / range;
  });
}

export function formatTimeLabel(time: number, timeframe: Timeframe): string {
  const d = new Date(time * 1000);
  if (timeframe === "1M" || timeframe === "1W") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
