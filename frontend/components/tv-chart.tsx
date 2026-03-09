"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  type MouseEventParams,
} from "lightweight-charts";
import { useOHLCVHistory } from "@/hooks/use-ohlcv-data";
import {
  generateMockOHLCV,
  computeMA,
  computeBollinger,
  computeMACD,
  computeRSI,
  type Timeframe,
  type OHLCV,
} from "@/lib/ohlcv-utils";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type IndicatorId =
  | "ma7" | "ma25" | "ma99"
  | "bb"
  | "volume"
  | "macd"
  | "rsi";

interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Colores ──────────────────────────────────────────────────────────────────

const C = {
  bg:     "#050810",
  border: "#1a2030",
  text:   "#8892a4",
  green:  "#00E87A",
  red:    "#FF3D5A",
  cyan:   "#00D4FF",
  violet: "#8B5CF6",
  gold:   "#F5A623",
  ma7:    "#FFD700",
  ma25:   "#00D4FF",
  ma99:   "#8B5CF6",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTV(bar: OHLCVBar): CandlestickData<Time> {
  return { time: bar.time as Time, open: bar.open, high: bar.high, low: bar.low, close: bar.close };
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (p >= 1)    return p.toFixed(4);
  return p.toFixed(6);
}

function fmtPct(p: number): string {
  return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export interface TVChartProps {
  symbol?: string;
  timeframe?: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
  indicators?: Set<IndicatorId>;
  onIndicatorsChange?: (i: Set<IndicatorId>) => void;
  height?: number;
  className?: string;
  embedded?: boolean;
}

export function TVChart({
  symbol,
  timeframe: controlledTf,
  onTimeframeChange,
  indicators: controlledInd,
  onIndicatorsChange,
  height = 460,
  className,
}: TVChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);

  // true después del primer fit; false al cambiar timeframe
  const fittedRef       = useRef(false);
  // true cuando el usuario hizo scroll/pan manualmente → no auto-seguir
  const userScrolledRef = useRef(false);
  // true mientras hacemos scroll programático (evita que el listener lo detecte como manual)
  const progScrollRef   = useRef(false);
  // último timestamp de la vela más reciente que ya se cargó
  const lastBarTimeRef  = useRef<number>(0);

  // Series refs — pane 0 (main)
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef    = useRef<ISeriesApi<"Histogram">   | null>(null);
  const ma7Ref    = useRef<ISeriesApi<"Line">        | null>(null);
  const ma25Ref   = useRef<ISeriesApi<"Line">        | null>(null);
  const ma99Ref   = useRef<ISeriesApi<"Line">        | null>(null);
  const bbUpRef   = useRef<ISeriesApi<"Line">        | null>(null);
  const bbMidRef  = useRef<ISeriesApi<"Line">        | null>(null);
  const bbLoRef   = useRef<ISeriesApi<"Line">        | null>(null);

  // Series refs — pane 1 (RSI)
  const rsiRef    = useRef<ISeriesApi<"Line">        | null>(null);
  const rsiOBRef  = useRef<ISeriesApi<"Line">        | null>(null);
  const rsiOSRef  = useRef<ISeriesApi<"Line">        | null>(null);

  // Series refs — pane 2 (MACD)
  const macdRef   = useRef<ISeriesApi<"Line">        | null>(null);
  const macdSigRef= useRef<ISeriesApi<"Line">        | null>(null);
  const macdHistRef=useRef<ISeriesApi<"Histogram">   | null>(null);

  // Internal state (when not controlled)
  const [internalTf,  setInternalTf]  = useState<Timeframe>("1h");
  const [internalInd, setInternalInd] = useState<Set<IndicatorId>>(new Set<IndicatorId>(["ma7", "volume"]));

  const timeframe  = controlledTf  ?? internalTf;
  const indicators = controlledInd ?? internalInd;

  const handleTf = (tf: Timeframe) => {
    // On timeframe change: reset everything to fit the new range
    fittedRef.current       = false;
    userScrolledRef.current = false;
    lastBarTimeRef.current  = 0;
    onTimeframeChange ? onTimeframeChange(tf) : setInternalTf(tf);
  };

  const toggleIndicator = (id: IndicatorId) => {
    const next = new Set<IndicatorId>(indicators);
    next.has(id) ? next.delete(id) : next.add(id);
    onIndicatorsChange ? onIndicatorsChange(next) : setInternalInd(next);
  };

  // true cuando el usuario hizo scroll → mostrar botón "Follow"
  const [showFollow, setShowFollow] = useState(false);

  // ── Hover state ──────────────────────────────────────────────────────────────
  const [hovered, setHovered] = useState<{
    open: number; high: number; low: number; close: number; volume: number; time: string;
  } | null>(null);

  // ── Live data ─────────────────────────────────────────────────────────────────
  const { data: liveData, isLoading, isError } = useOHLCVHistory(symbol, timeframe, 300);
  const usingLive = !!symbol && !isError && !!liveData;

  // useMemo: rawBars only changes when real data or timeframe changes,
  // NOT when hover state changes (avoids "crazy chart" bug).
  // Stable bar derivation; liveData refs intentionally omitted.
  const rawBars = useMemo<OHLCVBar[]>(() => {
    const source = usingLive ? liveData! : generateMockOHLCV(timeframe, 300);
    return source
      .map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume }))
      .sort((a, b) => a.time - b.time);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingLive, liveData, timeframe]);

  // ── Create chart once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: C.bg },
        textColor: C.text,
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: C.border, style: 1 },
        horzLines: { color: C.border, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#4a5568", width: 1, style: 2, labelBackgroundColor: "#1a2030" },
        horzLine: { color: "#4a5568", width: 1, style: 2, labelBackgroundColor: "#1a2030" },
      },
      rightPriceScale: {
        borderColor: C.border,
        scaleMargins: { top: 0.06, bottom: 0.25 },
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: C.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 1,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
      width: containerRef.current.clientWidth,
      height,
    });

    // ── Pane 0: Candlesticks ──────────────────────────────────────────────────
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: C.green, downColor: C.red,
      borderUpColor: C.green, borderDownColor: C.red,
      wickUpColor: C.green, wickDownColor: C.red,
    });

    // Volume (overlay en pane 0, escala separada)
    const vol = chart.addSeries(HistogramSeries, {
      color: C.green,
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });

    // MA lines (pane 0)
    const ma7  = chart.addSeries(LineSeries, { color: C.ma7,  lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const ma25 = chart.addSeries(LineSeries, { color: C.ma25, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const ma99 = chart.addSeries(LineSeries, { color: C.ma99, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

    // BB (pane 0)
    const bbUp  = chart.addSeries(LineSeries, { color: C.violet, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const bbMid = chart.addSeries(LineSeries, { color: C.violet, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const bbLo  = chart.addSeries(LineSeries, { color: C.violet, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

    // ── Pane 1: RSI ───────────────────────────────────────────────────────────
    const rsi    = chart.addSeries(LineSeries, { color: C.cyan, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true }, 1);
    const rsiOB  = chart.addSeries(LineSeries, { color: "#ff3d5a44", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, 1);
    const rsiOS  = chart.addSeries(LineSeries, { color: "#00e87a44", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, 1);
    chart.panes()[1]?.setHeight(80);

    // ── Pane 2: MACD ──────────────────────────────────────────────────────────
    const macdLine = chart.addSeries(LineSeries,      { color: C.cyan,  lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, 2);
    const macdSig  = chart.addSeries(LineSeries,      { color: C.gold,  lineWidth: 1,   priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, 2);
    const macdHist = chart.addSeries(HistogramSeries, { color: C.green, priceLineVisible: false, lastValueVisible: false }, 2);
    chart.panes()[2]?.setHeight(80);

    // Store refs
    chartRef.current    = chart;
    candleRef.current   = candles;
    volRef.current      = vol;
    ma7Ref.current      = ma7;
    ma25Ref.current     = ma25;
    ma99Ref.current     = ma99;
    bbUpRef.current     = bbUp;
    bbMidRef.current    = bbMid;
    bbLoRef.current     = bbLo;
    rsiRef.current      = rsi;
    rsiOBRef.current    = rsiOB;
    rsiOSRef.current    = rsiOS;
    macdRef.current     = macdLine;
    macdSigRef.current  = macdSig;
    macdHistRef.current = macdHist;

    // Detecta scroll/pan manual del usuario (ignora scrolls programáticos)
    const handleRangeChange = () => {
      if (fittedRef.current && !progScrollRef.current) {
        userScrolledRef.current = true;
        setShowFollow(true);
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      ro.disconnect();
      chart.remove();
      chartRef.current = candleRef.current = volRef.current = null;
      ma7Ref.current = ma25Ref.current = ma99Ref.current = null;
      bbUpRef.current = bbMidRef.current = bbLoRef.current = null;
      rsiRef.current = rsiOBRef.current = rsiOSRef.current = null;
      macdRef.current = macdSigRef.current = macdHistRef.current = null;
    };
  // Chart init/teardown keyed by height only; refs/symbol/timeframe intentionally omitted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // Effect 1: new data (rawBars) — update series + auto-scroll
  useEffect(() => {
    if (!candleRef.current || !rawBars.length) return;

    const lastBar = rawBars[rawBars.length - 1];
    if (!lastBar) return;
    const newLastTime = lastBar.time;
    const isNewData   = newLastTime !== lastBarTimeRef.current;
    lastBarTimeRef.current = newLastTime;

    // Candlesticks
    candleRef.current.setData(rawBars.map(toTV));

    // Volume
    volRef.current?.setData(rawBars.map((d) => ({
      time:  d.time as Time,
      value: d.volume,
      color: d.close >= d.open ? `${C.green}88` : `${C.red}88`,
    } as HistogramData<Time>)));

    // MA7
    const ma7vals = computeMA(rawBars as OHLCV[], 7);
    ma7Ref.current?.setData(
      rawBars.map((d, i) => ({ time: d.time as Time, value: ma7vals[i] ?? NaN }))
             .filter((x) => !isNaN(x.value)) as LineData<Time>[]
    );

    // MA25
    const ma25vals = computeMA(rawBars as OHLCV[], 25);
    ma25Ref.current?.setData(
      rawBars.map((d, i) => ({ time: d.time as Time, value: ma25vals[i] ?? NaN }))
             .filter((x) => !isNaN(x.value)) as LineData<Time>[]
    );

    // MA99
    const ma99vals = computeMA(rawBars as OHLCV[], 99);
    ma99Ref.current?.setData(
      rawBars.map((d, i) => ({ time: d.time as Time, value: ma99vals[i] ?? NaN }))
             .filter((x) => !isNaN(x.value)) as LineData<Time>[]
    );

    // BB
    const bb = computeBollinger(rawBars as OHLCV[]);
    const toLine = (vals: (number | undefined)[]) =>
      rawBars.map((d, i) => ({ time: d.time as Time, value: vals[i] ?? NaN }))
             .filter((x) => !isNaN(x.value)) as LineData<Time>[];
    bbUpRef.current?.setData(toLine(bb.upper));
    bbMidRef.current?.setData(toLine(bb.mid));
    bbLoRef.current?.setData(toLine(bb.lower));

    // RSI
    const rsiVals = computeRSI(rawBars as OHLCV[]);
    rsiRef.current?.setData(
      rawBars.map((d, i) => ({ time: d.time as Time, value: rsiVals[i] ?? NaN }))
             .filter((x) => !isNaN(x.value)) as LineData<Time>[]
    );
    const refOB = rawBars.map((d) => ({ time: d.time as Time, value: 70 } as LineData<Time>));
    const refOS = rawBars.map((d) => ({ time: d.time as Time, value: 30 } as LineData<Time>));
    rsiOBRef.current?.setData(refOB);
    rsiOSRef.current?.setData(refOS);

    // MACD
    const macdData = computeMACD(rawBars as OHLCV[]);
    macdRef.current?.setData(
      rawBars.map((d, i) => ({ time: d.time as Time, value: macdData.macd[i] ?? NaN }))
             .filter((x) => !isNaN(x.value)) as LineData<Time>[]
    );
    macdSigRef.current?.setData(
      rawBars.map((d, i) => ({ time: d.time as Time, value: macdData.signal[i] ?? NaN }))
             .filter((x) => !isNaN(x.value)) as LineData<Time>[]
    );
    macdHistRef.current?.setData(
      rawBars.map((d, i) => ({
        time:  d.time as Time,
        value: macdData.hist[i] ?? NaN,
        color: (macdData.hist[i] ?? 0) >= 0 ? `${C.green}99` : `${C.red}99`,
      })).filter((x) => !isNaN(x.value)) as HistogramData<Time>[]
    );

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    const ts = chartRef.current?.timeScale();
    if (!ts) return;

    if (!fittedRef.current) {
      // First load: full fit and position at end
      ts.fitContent();
      fittedRef.current     = true;
      userScrolledRef.current = false;
    } else if (isNewData && !userScrolledRef.current) {
      // New data and user has not scrolled: follow the latest candle
      progScrollRef.current = true;
      ts.scrollToRealTime();
      // Short timeout so the listener does not treat this scroll as manual
      setTimeout(() => { progScrollRef.current = false; }, 100);
    }
    // If the user scrolled, we don't touch the view
  }, [rawBars]);

  // Effect 2: indicator visibility (does not touch the view)
  useEffect(() => {
    volRef.current?.applyOptions({ visible: indicators.has("volume") });
    ma7Ref.current?.applyOptions({ visible: indicators.has("ma7") });
    ma25Ref.current?.applyOptions({ visible: indicators.has("ma25") });
    ma99Ref.current?.applyOptions({ visible: indicators.has("ma99") });
    const bbVis = indicators.has("bb");
    bbUpRef.current?.applyOptions({ visible: bbVis });
    bbMidRef.current?.applyOptions({ visible: bbVis });
    bbLoRef.current?.applyOptions({ visible: bbVis });
    const rsiVis = indicators.has("rsi");
    rsiRef.current?.applyOptions({ visible: rsiVis });
    rsiOBRef.current?.applyOptions({ visible: rsiVis });
    rsiOSRef.current?.applyOptions({ visible: rsiVis });
    const macdVis = indicators.has("macd");
    macdRef.current?.applyOptions({ visible: macdVis });
    macdSigRef.current?.applyOptions({ visible: macdVis });
    macdHistRef.current?.applyOptions({ visible: macdVis });
  }, [indicators]);

  // ── Crosshair hover ───────────────────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const handler = (param: MouseEventParams<Time>) => {
      if (!param.time || !candleRef.current) { setHovered(null); return; }
      const bar = param.seriesData.get(candleRef.current) as CandlestickData<Time> | undefined;
      const volBar = volRef.current ? param.seriesData.get(volRef.current) as HistogramData<Time> | undefined : undefined;
      if (!bar) { setHovered(null); return; }
      const t = typeof param.time === "number"
        ? new Date(param.time * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : String(param.time);
      setHovered({ open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: (volBar as { value?: number } | undefined)?.value ?? 0, time: t });
    };
    chart.subscribeCrosshairMove(handler);
    return () => chart.unsubscribeCrosshairMove(handler);
  }, []);

  const resetZoom = useCallback(() => {
    userScrolledRef.current = false;
    fittedRef.current       = false;
    chartRef.current?.timeScale().fitContent();
    fittedRef.current       = true;
  }, []);

  const followLatest = useCallback(() => {
    userScrolledRef.current = false;
    progScrollRef.current   = true;
    setShowFollow(false);
    chartRef.current?.timeScale().scrollToRealTime();
    setTimeout(() => { progScrollRef.current = false; }, 100);
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const lastBar  = rawBars[rawBars.length - 1];
  const firstBar = rawBars[0];
  const displayBar = hovered ?? (lastBar ? { open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close, volume: lastBar.volume, time: "" } : null);
  const priceChange    = lastBar && firstBar ? lastBar.close - firstBar.open : 0;
  const priceChangePct = lastBar && firstBar && firstBar.open !== 0 ? (priceChange / firstBar.open) * 100 : 0;
  const isUp = displayBar ? displayBar.close >= displayBar.open : priceChange >= 0;

  // ── Skeleton ──────────────────────────────────────────────────────────────────
  if (symbol && isLoading) {
    return (
      <div className={cn("rounded-xl overflow-hidden", className)} style={{ height: height + 60, background: C.bg }}>
        <div className="flex items-center gap-3 p-3">
          <div className="h-7 w-28 rounded animate-pulse bg-[#0d1117]" />
          <div className="h-4 w-20 rounded animate-pulse bg-[#0d1117]" />
        </div>
        <div className="animate-pulse mx-3 rounded bg-[#0d1117]" style={{ height }} />
      </div>
    );
  }

  return (
    <div className={cn("relative select-none", className)}>
      {/* ── Info bar: precio OHLCV + controles ── */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        {/* Precio + OHLCV */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {displayBar && (
            <>
              <span className={cn("font-mono font-bold text-2xl tabular-nums leading-none", isUp ? "text-green" : "text-red")}>
                {fmtPrice(displayBar.close)}
              </span>
              {!hovered && (
                <span className={cn("font-mono text-sm font-medium", isUp ? "text-green" : "text-red")}>
                  {isUp ? "▲" : "▼"} {fmtPrice(Math.abs(priceChange))} ({fmtPct(priceChangePct)})
                </span>
              )}
              <span className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-text-muted">
                <span>O <span className="text-foreground">{fmtPrice(displayBar.open)}</span></span>
                <span>H <span className="text-green">{fmtPrice(displayBar.high)}</span></span>
                <span>L <span className="text-red">{fmtPrice(displayBar.low)}</span></span>
                <span>C <span className={isUp ? "text-green" : "text-red"}>{fmtPrice(displayBar.close)}</span></span>
                {displayBar.volume > 0 && (
                  <span>Vol <span className="text-foreground">{displayBar.volume.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
                )}
              </span>
            </>
          )}
        </div>

        {/* Badges + reset */}
        <div className="flex items-center gap-2 shrink-0">
          {usingLive && (
            <div className="flex items-center gap-1.5 rounded-full border border-green/30 bg-elevated px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
              </span>
              <span className="font-mono text-[10px] text-green font-medium">LIVE</span>
            </div>
          )}
          {!usingLive && symbol && (
            <div className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-elevated px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              <span className="font-mono text-[10px] text-gold">Demo data</span>
            </div>
          )}
          {showFollow && (
            <button
              type="button"
              onClick={followLatest}
              className="rounded-lg border border-cyan/50 bg-cyan-dim px-2.5 py-1 font-mono text-[10px] text-cyan hover:brightness-110 transition-all animate-pulse"
              title="Follow latest candle"
            >
              ▶ Follow
            </button>
          )}
          <button
            type="button"
            onClick={resetZoom}
            className="rounded-md border border-border bg-elevated px-2.5 py-1 font-mono text-[10px] text-text-muted hover:text-foreground hover:border-border-bright transition-colors"
            title="Fit all data"
          >
            ⊡ Fit
          </button>
        </div>
      </div>

      {/* ── Chart ── */}
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden cursor-crosshair"
        style={{ background: C.bg }}
      />

      {/* ── Hint ── */}
      <p className="mt-1.5 font-mono text-[10px] text-text-muted opacity-40 text-right">
        Scroll / pinch to zoom · Drag to pan · Double-click axis to reset
      </p>
    </div>
  );
}
