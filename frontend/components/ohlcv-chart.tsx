// @ts-nocheck — recharts/React types; componentes válidos en runtime
"use client";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Customized,
} from "recharts";
import {
  generateMockOHLCV,
  computeMA,
  computeBollinger,
  computeMACD,
  computeRSI,
  computeStochastic,
  computeStochasticRSI,
  computeIchimoku,
  computeATR,
  computeOBV,
  computeBOP,
  formatTimeLabel,
  type OHLCV,
  type Timeframe,
} from "@/lib/ohlcv-utils";
import { useOHLCVHistory } from "@/hooks/use-ohlcv-data";
import { cn } from "@/lib/utils";

const CANDLE_GREEN = "var(--green, #00E87A)";
const CANDLE_RED = "var(--red, #FF3D5A)";
const GRID_COLOR = "var(--border, #1a2030)";
const BG_CHART = "var(--bg-base, #050810)";
const MAIN_H = 0.65;
const TOTAL_H = 500;

export type IndicatorId =
  | "ma7"
  | "ma25"
  | "ma99"
  | "bb"
  | "macd"
  | "rsi"
  | "stochRsi"
  | "stoch"
  | "ichimoku"
  | "atr"
  | "volume"
  | "obv"
  | "bop";

const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "24h", "1W", "1M"];

const INDICATORS: { id: IndicatorId; label: string; activeClass: string }[] = [
  { id: "ma7", label: "MA7", activeClass: "border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]" },
  { id: "ma25", label: "MA25", activeClass: "border-cyan bg-cyan-dim text-cyan" },
  { id: "ma99", label: "MA99", activeClass: "border-violet bg-violet-dim text-violet" },
  { id: "bb", label: "BB", activeClass: "border-violet bg-violet-dim text-violet" },
  { id: "macd", label: "MACD", activeClass: "border-cyan bg-cyan-dim text-cyan" },
  { id: "rsi", label: "RSI", activeClass: "border-cyan bg-cyan-dim text-cyan" },
  { id: "stochRsi", label: "Stoch RSI", activeClass: "border-violet bg-violet-dim text-violet" },
  { id: "stoch", label: "Stochastic", activeClass: "border-gold bg-gold/10 text-gold" },
  { id: "ichimoku", label: "Ichimoku", activeClass: "border-cyan bg-cyan-dim text-cyan" },
  { id: "atr", label: "ATR", activeClass: "border-violet bg-violet-dim text-violet" },
  { id: "volume", label: "Volume", activeClass: "border-green bg-green-dim text-green" },
  { id: "obv", label: "OBV", activeClass: "border-cyan bg-cyan-dim text-cyan" },
  { id: "bop", label: "BOP", activeClass: "border-violet bg-violet-dim text-violet" },
];

/** Draw candlesticks in chart coordinates */
function CandleLayer(props: { data: Array<OHLCV & { index: number }>; yAxisId?: string; xAxisId?: string }) {
  const { data, yAxisId = "0", xAxisId = "0" } = props;
  const chartProps = props as unknown as { xAxisMap?: Record<string, { scale: (v: number) => number }>; yAxisMap?: Record<string, { scale: (v: number) => number }>; offset?: { left: number; top: number }; width: number; height: number };
  const xAxisMap = chartProps.xAxisMap ?? {};
  const yAxisMap = chartProps.yAxisMap ?? {};
  const offset = chartProps.offset ?? { left: 0, top: 0 };
  const width = chartProps.width ?? 400;
  const height = chartProps.height ?? 300;
  const xScale = xAxisMap[xAxisId]?.scale;
  const yScale = yAxisMap[yAxisId]?.scale;
  if (!xScale || !yScale || !data.length) return null;

  const barW = Math.max(2, (width / data.length) * 0.6);
  const half = barW / 2;

  return (
    <g>
      {data.map((d, i) => {
        const x = xScale(d.index) ?? 0;
        const yO = yScale(d.open);
        const yC = yScale(d.close);
        const yH = yScale(d.high);
        const yL = yScale(d.low);
        const isGreen = d.close >= d.open;
        const color = isGreen ? CANDLE_GREEN : CANDLE_RED;
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.abs(yC - yO) || 1;
        return (
          <g key={i}>
            <line x1={x} y1={yH} x2={x} y2={yL} stroke={color} strokeWidth={1} />
            <rect x={x - half} y={bodyTop} width={barW} height={bodyH} fill={color} stroke={color} />
          </g>
        );
      })}
    </g>
  );
}

const OSCILLATOR_ORDER: IndicatorId[] = ["macd", "rsi", "stochRsi", "stoch", "atr", "obv", "bop"];

/** Cuenta regresiva hasta el próximo refetch (30 → 0 segundos) */
function useLiveCountdown(refetchIntervalMs: number) {
  const [seconds, setSeconds] = useState(refetchIntervalMs / 1000);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setSeconds(refetchIntervalMs / 1000);
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, refetchIntervalMs / 1000 - elapsed);
      setSeconds(Math.ceil(remaining));
    }, 1000);
    return () => clearInterval(id);
  }, [refetchIntervalMs]);

  return seconds;
}

export interface OHLCVChartProps {
  className?: string;
  height?: number;
  embedded?: boolean;
  timeframe?: Timeframe;
  onTimeframeChange?: (t: Timeframe) => void;
  indicators?: Set<IndicatorId>;
  onIndicatorsChange?: (i: Set<IndicatorId>) => void;
  /** Símbolo Binance, p.ej. 'ETHUSDT'. Si no se provee usa mock data. */
  symbol?: string;
}

export function OHLCVChart({
  className,
  height = TOTAL_H,
  embedded = false,
  timeframe: controlledTf,
  onTimeframeChange,
  indicators: controlledInd,
  onIndicatorsChange,
  symbol,
}: OHLCVChartProps) {
  const [internalTf, setInternalTf] = useState<Timeframe>("1h");
  const [internalInd, setInternalInd] = useState<Set<IndicatorId>>(new Set(["ma7", "volume"]));
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const timeframe = controlledTf ?? internalTf;
  const handleTimeframe = useCallback(
    (t: Timeframe) => {
      if (onTimeframeChange) onTimeframeChange(t);
      else setInternalTf(t);
    },
    [onTimeframeChange]
  );
  const indicators = controlledInd ?? internalInd;

  const toggleIndicator = (id: IndicatorId) => {
    const next = new Set<IndicatorId>(indicators);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (onIndicatorsChange) onIndicatorsChange(next);
    else setInternalInd(next);
  };

  // ─── Datos reales vs mock ─────────────────────────────────────────────────
  const {
    data: liveData,
    isLoading: isLiveLoading,
    isError: isLiveError,
  } = useOHLCVHistory(symbol, timeframe, 200);

  const usingLive = !!symbol && !isLiveError && !!liveData;
  const usingFallback = !!symbol && isLiveError;

  const liveSecondsLeft = useLiveCountdown(30_000);

  const { chartData, yDomain } = useMemo(() => {
    const raw = usingLive ? liveData : generateMockOHLCV(timeframe, 200);
    const ma7 = computeMA(raw, 7);
    const ma25 = computeMA(raw, 25);
    const ma99 = computeMA(raw, 99);
    const bb = computeBollinger(raw);
    const macd = computeMACD(raw);
    const rsi = computeRSI(raw);
    const stoch = computeStochastic(raw);
    const stochRsi = computeStochasticRSI(rsi);
    const ichi = computeIchimoku(raw);
    const atr = computeATR(raw);
    const obv = computeOBV(raw);
    const bop = computeBOP(raw);
    const volumeMa = computeMA(raw.map((d) => ({ ...d, close: d.volume })), 7);

    const chartData = raw.map((d, i) => ({
      ...d,
      index: i,
      timeLabel: formatTimeLabel(d.time, timeframe),
      ma7: ma7[i],
      ma25: ma25[i],
      ma99: ma99[i],
      bbMid: bb.mid[i],
      bbUpper: bb.upper[i],
      bbLower: bb.lower[i],
      macd: macd.macd[i],
      macdSignal: macd.signal[i],
      macdHist: macd.hist[i],
      rsi: rsi[i],
      stochK: stoch.k[i],
      stochD: stoch.d[i],
      stochRsiK: stochRsi.k[i],
      stochRsiD: stochRsi.d[i],
      tenkan: ichi.tenkan[i],
      kijun: ichi.kijun[i],
      senkouA: ichi.senkouA[i],
      senkouB: ichi.senkouB[i],
      chikou: i >= 26 ? raw[i - 26]!.close : NaN,
      atr: atr[i],
      obv: obv[i],
      bop: bop[i],
      volumeMa: volumeMa[i],
    }));

    const lows = raw.map((d) => d.low);
    const highs = raw.map((d) => d.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const pad = (max - min) * 0.05 || 0.01;
    const yDomain = [min - pad, max + pad] as [number, number];

    return { chartData, yDomain };
  }, [timeframe, usingLive, liveData]);

  const mainHeight = Math.floor(height * MAIN_H);
  const secondaryCount = OSCILLATOR_ORDER.filter((id) => indicators.has(id)).slice(-3);
  const secondaryHeight = secondaryCount.length > 0 ? Math.floor((height * (1 - MAIN_H)) / secondaryCount.length) : 80;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const TooltipContent = useCallback(
    ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) => {
      if (!active || label == null) return null;
      const p = chartData[Number(label)];
      if (!p) return null;
      return (
        <div className="rounded border border-border-bright bg-elevated font-mono text-[11px] shadow-lg" style={{ borderRadius: 4, padding: "8px 12px" }}>
          <p className="text-text-muted mb-1">{p.timeLabel}</p>
          <p>O {p.open.toFixed(4)} · H {p.high.toFixed(4)} · L {p.low.toFixed(4)} · C {p.close.toFixed(4)}</p>
          <p className="text-text-muted mt-1">Vol {p.volume.toLocaleString()}</p>
          {indicators.has("ma7") && p.ma7 != null && !Number.isNaN(p.ma7) && <p>MA7 {p.ma7.toFixed(4)}</p>}
          {indicators.has("rsi") && p.rsi != null && !Number.isNaN(p.rsi) && <p>RSI {p.rsi.toFixed(1)}</p>}
          {indicators.has("macd") && p.macd != null && !Number.isNaN(p.macd) && <p>MACD {p.macd.toFixed(4)}</p>}
        </div>
      );
    },
    [chartData, indicators]
  );

  // ─── Skeleton mientras carga ──────────────────────────────────────────────
  if (symbol && isLiveLoading) {
    return (
      <div
        className={cn("overflow-hidden rounded-md", className)}
        style={{
          background: BG_CHART,
          border: "1px solid var(--border-bright)",
          borderRadius: 6,
          padding: 12,
          height,
        }}
      >
        <div className="flex gap-2 mb-3">
          {TIMEFRAMES.map((tf) => (
            <div key={tf} className="h-7 w-10 rounded animate-pulse bg-elevated" />
          ))}
        </div>
        <div className="animate-pulse rounded bg-elevated" style={{ height: mainHeight }} />
        <div className="mt-2 animate-pulse rounded bg-elevated" style={{ height: 60 }} />
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-hidden rounded-md relative", className)}
      style={{
        background: BG_CHART,
        border: "1px solid var(--border-bright)",
        borderRadius: 6,
        padding: 12,
        height: height,
      }}
    >
      {/* ── Indicador LIVE ─────────────────────────────────────────────────── */}
      {usingLive && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-green/30 bg-elevated px-2 py-0.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
          </span>
          <span className="font-mono text-[10px] text-green">LIVE</span>
          <span className="font-mono text-[10px] text-text-muted">
            {liveSecondsLeft}s
          </span>
        </div>
      )}

      {/* ── Badge offline / fallback ────────────────────────────────────────── */}
      {usingFallback && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-gold/40 bg-elevated px-2 py-0.5">
          <span className="h-2 w-2 rounded-full bg-gold" />
          <span className="font-mono text-[10px] text-gold">Offline — showing demo data</span>
        </div>
      )}

      {!embedded && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframe(tf)}
                className={cn(
                  "rounded px-2.5 py-1.5 font-mono text-[11px] transition-colors",
                  timeframe === tf ? "bg-cyan-dim border border-cyan text-cyan" : "bg-elevated border border-border text-text-muted hover:text-foreground"
                )}
                aria-pressed={timeframe === tf}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {INDICATORS.map(({ id, label, activeClass }) => (
              <label
                key={id}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
                  indicators.has(id) ? activeClass : "border-border bg-transparent text-text-muted hover:text-foreground"
                )}
              >
                <input
                  type="checkbox"
                  checked={indicators.has(id)}
                  onChange={() => toggleIndicator(id)}
                  className="sr-only"
                  aria-label={label}
                />
                {label}
              </label>
            ))}
          </div>
        </>
      )}

      {/* Main panel — candles + overlays */}
      <ResponsiveContainer width="100%" height={mainHeight}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 40, left: 8, bottom: 24 }}
          onMouseMove={(e: { activeTooltipIndex?: number }) => {
            const idx = e?.activeTooltipIndex;
            setHoverIndex(typeof idx === "number" ? idx : null);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="bb-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8B5CF6" stopOpacity={0.1} />
              <stop offset="1" stopColor="#8B5CF6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="2 2" vertical={true} horizontal={true} />
          {/* @ts-expect-error recharts component types */}
          <XAxis dataKey="index" tickFormatter={(i: number) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} tick={{ fill: "var(--text-muted)", fontFamily: "var(--font-mono), JetBrains Mono, monospace" }} axisLine={{ stroke: "var(--border)" }} />
          {/* @ts-expect-error recharts component types */}
          <YAxis domain={yDomain} orientation="right" stroke="var(--text-muted)" fontSize={10} tick={{ fill: "var(--text-muted)", fontFamily: "var(--font-mono), JetBrains Mono, monospace" }} width={40} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
          {/* @ts-expect-error recharts component types */}
          <Tooltip content={<TooltipContent />} cursor={false} />
          {hoverIndex != null && (
            <ReferenceLine x={hoverIndex} stroke="var(--cyan)" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.5} />
          )}

          <Customized component={<CandleLayer data={chartData} />} />

          {indicators.has("ma7") && (
            <>
              {/* @ts-expect-error recharts */}
              <Line type="monotone" dataKey="ma7" stroke="#FFD700" strokeWidth={1.5} dot={false} connectNulls />
            </>
          )}
          {indicators.has("ma25") && (
            <>
              {/* @ts-expect-error recharts */}
              <Line type="monotone" dataKey="ma25" stroke="#00D4FF" strokeWidth={1.5} dot={false} connectNulls />
            </>
          )}
          {indicators.has("ma99") && (
            <>
              {/* @ts-expect-error recharts */}
              <Line type="monotone" dataKey="ma99" stroke="#8B5CF6" strokeWidth={1.5} dot={false} connectNulls />
            </>
          )}

          {indicators.has("bb") && (
            <>
              {/* @ts-expect-error recharts */}
              <Area type="monotone" dataKey="bbUpper" fill="url(#bb-fill)" stroke="none" />
              {/* @ts-ignore recharts */}
              <Area type="monotone" dataKey="bbLower" fill="url(#bb-fill)" stroke="none" />
              {/* @ts-ignore recharts */}
              <Line type="monotone" dataKey="bbUpper" stroke="#8B5CF6" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
              {/* @ts-ignore recharts */}
              <Line type="monotone" dataKey="bbLower" stroke="#8B5CF6" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
              {/* @ts-ignore recharts */}
              <Line type="monotone" dataKey="bbMid" stroke="#8B5CF6" strokeWidth={1} dot={false} connectNulls />
            </>
          )}

          {indicators.has("ichimoku") && (
            <>
              <Area type="monotone" dataKey="senkouA" fill="#00E87A10" stroke="none" connectNulls />
              <Area type="monotone" dataKey="senkouB" fill="#FF3D5A10" stroke="none" connectNulls />
              <Line type="monotone" dataKey="tenkan" stroke="#FF6B9D" strokeWidth={1} dot={false} connectNulls />
              <Line type="monotone" dataKey="kijun" stroke="#00D4FF" strokeWidth={1} dot={false} connectNulls />
              <Line type="monotone" dataKey="chikou" stroke="#8B5CF6" strokeWidth={1} dot={false} connectNulls />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Secondary panels — last 3 oscillators */}
      {secondaryCount.map((id) => {
        if (id === "macd")
          return (
            <ResponsiveContainer key={id} width="100%" height={secondaryHeight}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="index" tickFormatter={(i) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} hide />
                <YAxis stroke="var(--text-muted)" fontSize={10} width={36} tick={{ fill: "var(--text-muted)" }} />
                <ReferenceLine y={0} stroke="var(--border-bright)" strokeOpacity={0.5} />
                <Bar dataKey="macdHist" radius={[2, 2, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={(chartData[i]?.macdHist ?? 0) >= 0 ? CANDLE_GREEN : CANDLE_RED} fillOpacity={0.8} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="macd" stroke="#00D4FF" strokeWidth={1} dot={false} connectNulls />
                <Line type="monotone" dataKey="macdSignal" stroke="#F5A623" strokeWidth={1} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          );
        if (id === "rsi")
          return (
            <ResponsiveContainer key={id} width="100%" height={secondaryHeight}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="index" tickFormatter={(i) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} hide />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} width={36} tick={{ fill: "var(--text-muted)" }} />
                <ReferenceArea y1={70} y2={100} fill="var(--red-dim)" fillOpacity={0.3} />
                <ReferenceArea y1={0} y2={30} fill="var(--green-dim)" fillOpacity={0.3} />
                <ReferenceLine y={70} stroke="#666" strokeDasharray="2 2" strokeOpacity={0.6} />
                <ReferenceLine y={30} stroke="#666" strokeDasharray="2 2" strokeOpacity={0.6} />
                <Line type="monotone" dataKey="rsi" stroke="#00D4FF" strokeWidth={1} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          );
        if (id === "stochRsi")
          return (
            <ResponsiveContainer key={id} width="100%" height={secondaryHeight}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="index" tickFormatter={(i) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} hide />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} width={36} tick={{ fill: "var(--text-muted)" }} />
                <Line type="monotone" dataKey="stochRsiK" stroke="#8B5CF6" strokeWidth={1} dot={false} connectNulls />
                <Line type="monotone" dataKey="stochRsiD" stroke="#F5A623" strokeWidth={1} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          );
        if (id === "stoch")
          return (
            <ResponsiveContainer key={id} width="100%" height={secondaryHeight}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="index" tickFormatter={(i) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} hide />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} width={36} tick={{ fill: "var(--text-muted)" }} />
                <Line type="monotone" dataKey="stochK" stroke="#00E87A" strokeWidth={1} dot={false} connectNulls />
                <Line type="monotone" dataKey="stochD" stroke="#FF3D5A" strokeWidth={1} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          );
        if (id === "atr")
          return (
            <ResponsiveContainer key={id} width="100%" height={secondaryHeight}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="index" tickFormatter={(i) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} hide />
                <YAxis stroke="var(--text-muted)" fontSize={10} width={36} tick={{ fill: "var(--text-muted)" }} />
                <Area type="monotone" dataKey="atr" fill="#8B5CF620" stroke="#8B5CF6" strokeWidth={1} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          );
        if (id === "obv")
          return (
            <ResponsiveContainer key={id} width="100%" height={secondaryHeight}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="index" tickFormatter={(i) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} hide />
                <YAxis stroke="var(--text-muted)" fontSize={10} width={36} tick={{ fill: "var(--text-muted)" }} tickFormatter={(v) => (v / 1e6).toFixed(1) + "M"} />
                <Line type="monotone" dataKey="obv" stroke="#00D4FF" strokeWidth={1} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          );
        if (id === "bop")
          return (
            <ResponsiveContainer key={id} width="100%" height={secondaryHeight}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="index" tickFormatter={(i) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} hide />
                <YAxis domain={[-1, 1]} stroke="var(--text-muted)" fontSize={10} width={36} tick={{ fill: "var(--text-muted)" }} />
                <ReferenceLine y={0} stroke="var(--border-bright)" strokeOpacity={0.5} />
                <Bar dataKey="bop" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          );
        return null;
      })}

      {indicators.has("volume") && (
        <ResponsiveContainer width="100%" height={secondaryHeight}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis dataKey="index" tickFormatter={(i) => chartData[i]?.timeLabel ?? ""} stroke="var(--text-muted)" fontSize={10} hide />
            <YAxis stroke="var(--text-muted)" fontSize={10} width={36} tick={{ fill: "var(--text-muted)" }} />
            <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.close >= entry.open ? CANDLE_GREEN : CANDLE_RED} fillOpacity={0.7} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="volumeMa" stroke="#F5A623" strokeWidth={1} dot={false} connectNulls name="Vol MA" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
