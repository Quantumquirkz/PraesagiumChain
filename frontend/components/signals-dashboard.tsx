"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQueries } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Zap, RefreshCw, Activity } from "lucide-react";
import { fetchSource } from "@/lib/api";
import type { FetchResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignalFusionPanel } from "@/features/markets/components/signal-fusion-panel";
import { cn } from "@/lib/utils";

// ─── Source config ────────────────────────────────────────────────────────────

interface SourceConfig {
  id: string;
  name: string;
  tag: string;
  params: Record<string, string>;
  isSentiment?: boolean;
  color: string;
}

const DEFAULT_SOURCES: SourceConfig[] = [
  { id: "binance",       name: "Binance",       tag: "CEX",    params: { symbol: "BTCUSDT" },          color: "var(--cyan)"   },
  { id: "cryptocompare", name: "CryptoCompare",  tag: "AGG",    params: { fsym: "BTC", tsym: "USD" },   color: "var(--violet)" },
  { id: "kraken",        name: "Kraken",         tag: "CEX",    params: { pair: "XBTUSD" },             color: "var(--cyan)"   },
  { id: "chainlink",     name: "Chainlink",      tag: "ORACLE", params: {},                             color: "var(--green)"  },
  { id: "finnhub",       name: "Finnhub",        tag: "MARKET", params: { symbol: "BINANCE:BTCUSDT" },  color: "var(--gold)"   },
  { id: "exchangerate",  name: "ExchangeRate",   tag: "FOREX",  params: {},                             color: "var(--violet)" },
];

function buildSourcesForAsset(binanceSymbol: string): SourceConfig[] {
  const base = binanceSymbol.replace(/USDT$/i, "") || "BTC";
  const krakenPair = base === "BTC" ? "XBTUSD" : `${base}USD`;
  return [
    { id: "binance",       name: "Binance",       tag: "CEX",    params: { symbol: binanceSymbol },           color: "var(--cyan)"   },
    { id: "cryptocompare", name: "CryptoCompare",  tag: "AGG",    params: { fsym: base, tsym: "USD" },          color: "var(--violet)" },
    { id: "kraken",        name: "Kraken",         tag: "CEX",    params: { pair: krakenPair },                 color: "var(--cyan)"   },
    { id: "chainlink",     name: "Chainlink",      tag: "ORACLE", params: {},                                   color: "var(--green)"  },
    { id: "finnhub",       name: "Finnhub",        tag: "MARKET", params: { symbol: `BINANCE:${binanceSymbol}` }, color: "var(--gold)"   },
    { id: "exchangerate",  name: "ExchangeRate",   tag: "FOREX",  params: {},                                   color: "var(--violet)" },
  ];
}

// ─── Live prediction chart ────────────────────────────────────────────────────

interface PricePoint {
  t: number;       // timestamp ms
  price: number;   // real price
  pred: number;    // simulated prediction (PHPE-style)
  upper: number;
  lower: number;
}

const MAX_POINTS = 40;

// Simulate a PHPE prediction: mean-reverting walk with uncertainty band
function nextPrediction(prev: number, real: number): { pred: number; upper: number; lower: number } {
  const drift   = (real - prev) * 0.35 + (Math.random() - 0.5) * real * 0.0008;
  const pred    = prev + drift;
  const uncert  = real * 0.0015 + Math.random() * real * 0.001;
  return { pred, upper: pred + uncert, lower: pred - uncert };
}

function LivePredictionChart({
  price,
  color,
  symbol,
}: {
  price: number | null | undefined;
  color: string;
  symbol: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<PricePoint[]>([]);
  const predRef   = useRef<number | null>(null);
  const rafRef    = useRef<number>(0);
  const [tick, setTick] = useState(0);
  const [latestPred, setLatestPred] = useState<number | null>(null);
  const [latestChange, setLatestChange] = useState<number>(0);

  // Add points: primer punto al instante, luego cada 2 segundos
  useEffect(() => {
    if (!price) return;
    const addPoint = () => {
      const now  = Date.now();
      const prev = predRef.current ?? price;
      const { pred, upper, lower } = nextPrediction(prev, price);
      predRef.current = pred;

      const pt: PricePoint = { t: now, price, pred, upper, lower };
      pointsRef.current = [...pointsRef.current.slice(-(MAX_POINTS - 1)), pt];

      const pts = pointsRef.current;
      if (pts.length >= 2) {
        const change = ((pts[pts.length - 1].pred - pts[0].pred) / pts[0].pred) * 100;
        setLatestChange(change);
      }
      setLatestPred(pred);
      setTick((t) => t + 1);
    };
    addPoint(); // Primer punto inmediato
    const id = setInterval(addPoint, 500); // actualización cada 0.5 s
    return () => clearInterval(id);
  }, [price]);

  // Draw on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    if (W <= 0 || H <= 0) return;
    const pts = pointsRef.current;
    if (pts.length < 2) {
      ctx.clearRect(0, 0, W, H);
      return;
    }

    ctx.clearRect(0, 0, W, H);

    const allVals = pts.flatMap((p) => [p.price, p.upper, p.lower]);
    const minV = Math.min(...allVals) * 0.9995;
    const maxV = Math.max(...allVals) * 1.0005;
    const range = maxV - minV || 1;

    const toX = (i: number) => (i / (MAX_POINTS - 1)) * W;
    const toY = (v: number) => H - ((v - minV) / range) * H * 0.85 - H * 0.075;

    // Map points to canvas x positions based on index in MAX_POINTS window
    const offset = MAX_POINTS - pts.length;
    const px = (i: number) => toX(i + offset);

    // ── Uncertainty band ──
    ctx.beginPath();
    pts.forEach((p, i) => {
      i === 0 ? ctx.moveTo(px(i), toY(p.upper)) : ctx.lineTo(px(i), toY(p.upper));
    });
    [...pts].reverse().forEach((p, i) => {
      ctx.lineTo(px(pts.length - 1 - i), toY(p.lower));
    });
    ctx.closePath();
    const bandGrad = ctx.createLinearGradient(0, 0, 0, H);
    bandGrad.addColorStop(0, "rgba(139,92,246,0.18)");
    bandGrad.addColorStop(1, "rgba(139,92,246,0.03)");
    ctx.fillStyle = bandGrad;
    ctx.fill();

    // ── Real price line (subtle) ──
    ctx.beginPath();
    pts.forEach((p, i) => {
      i === 0 ? ctx.moveTo(px(i), toY(p.price)) : ctx.lineTo(px(i), toY(p.price));
    });
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Prediction line fill ──
    ctx.beginPath();
    pts.forEach((p, i) => {
      i === 0 ? ctx.moveTo(px(i), toY(p.pred)) : ctx.lineTo(px(i), toY(p.pred));
    });
    ctx.lineTo(px(pts.length - 1), H);
    ctx.lineTo(px(0), H);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
    // Color based on trend
    const isUp = pts[pts.length - 1].pred >= pts[0].pred;
    fillGrad.addColorStop(0, isUp ? "rgba(0,232,122,0.18)" : "rgba(255,61,90,0.18)");
    fillGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // ── Prediction line stroke ──
    ctx.beginPath();
    pts.forEach((p, i) => {
      i === 0 ? ctx.moveTo(px(i), toY(p.pred)) : ctx.lineTo(px(i), toY(p.pred));
    });
    const lineColor = isUp ? "#00E87A" : "#FF3D5A";
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";
    ctx.shadowColor  = lineColor;
    ctx.shadowBlur   = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Last point dot ──
    const last = pts[pts.length - 1];
    const lx   = px(pts.length - 1);
    const ly   = toY(last.pred);
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Outer ring
    ctx.beginPath();
    ctx.arc(lx, ly, 7, 0, Math.PI * 2);
    ctx.strokeStyle = lineColor + "55";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Baseline grid ──
    const midV = (minV + maxV) / 2;
    [minV, midV, maxV].forEach((v) => {
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, tick]);

  // Resize canvas to match container
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const syncSize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
        draw();
      }
    };
    const ro = new ResizeObserver(syncSize);
    ro.observe(el);
    syncSize();
    return () => ro.disconnect();
  }, [draw, tick]);

  const isUp = latestChange >= 0;

  return (
    <div className="flex flex-col h-full min-h-[260px]">
      {/* Chart header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            PHPE Prediction
          </span>
          <span
            className="font-mono text-[9px] text-text-muted border border-border rounded px-1.5 py-0.5"
            title="Simulated from live price; use Predict for backend PHPE."
          >
            Simulated
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)" }}
            aria-hidden
          />
        </div>
        <div className="flex items-center gap-2">
          {latestPred != null && (
            <span
              className="font-mono text-xs font-bold"
              style={{ color: isUp ? "var(--green)" : "var(--red)" }}
            >
              {isUp ? "▲" : "▼"} {Math.abs(latestChange).toFixed(3)}%
            </span>
          )}
          <span className="font-mono text-[9px] text-text-muted border border-border rounded px-1.5 py-0.5">
            0.5s
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[220px] rounded-xl overflow-hidden"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        {!price ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[11px] text-text-muted">Waiting for data…</span>
          </div>
        ) : pointsRef.current.length < 2 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 text-text-muted animate-spin" />
            <span className="font-mono text-[10px] text-text-muted">Collecting data…</span>
          </div>
        ) : null}
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Chart footer */}
      {latestPred != null && (
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded" style={{ background: isUp ? "var(--green)" : "var(--red)" }} />
              <span className="font-mono text-[9px] text-text-muted">Prediction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded opacity-30" style={{ borderTop: "1px dashed white" }} />
              <span className="font-mono text-[9px] text-text-muted">Real price</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-4 rounded opacity-20" style={{ background: "var(--violet)" }} />
              <span className="font-mono text-[9px] text-text-muted">Uncertainty</span>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold" style={{ color: isUp ? "var(--green)" : "var(--red)" }}>
            ${latestPred.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Source card ──────────────────────────────────────────────────────────────

function MiniSparkline({ price, color }: { price: number | null | undefined; color: string }) {
  if (!price) return <div className="w-14 h-5" />;
  const seed = price % 100;
  const bars = Array.from({ length: 7 }, (_, i) => {
    const h = 20 + ((seed * (i + 3) * 17) % 60);
    return Math.max(15, Math.min(100, h));
  });
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-0.5 h-5 w-14" aria-hidden>
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${(h / max) * 100}%`, background: color, opacity: 0.25 + (i / bars.length) * 0.55 }}
        />
      ))}
    </div>
  );
}

function SourceCard({
  source, data, isLoading, isError, error, rank,
}: {
  source: SourceConfig; data: FetchResponse | undefined;
  isLoading: boolean; isError: boolean; error?: Error | null; rank: number;
}) {
  const change         = data?.price_change_24h ?? null;
  const changePositive = change != null && change > 0;
  const changeNegative = change != null && change < 0;
  const changeColor    = changePositive ? "text-green" : changeNegative ? "text-red" : "text-text-muted";
  const changeBg       = changePositive ? "bg-green-dim border-green/20" : changeNegative ? "bg-red-dim border-red/20" : "bg-elevated border-border";
  const finnhubNeedsKey = source.id === "finnhub" && isError && (error?.message?.includes("FINNHUB") ?? false);

  return (
    <div className={cn(
      "group relative rounded-xl border bg-elevated p-3 transition-all duration-200",
      "hover:border-border-bright hover:bg-surface",
      isError ? "border-red/20" : "border-border"
    )}>
      <div className="absolute top-2.5 right-2.5 font-mono text-[9px] text-text-muted border border-border rounded px-1 py-0.5" aria-hidden>
        #{rank}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
          style={{ borderColor: `${source.color}33`, background: `${source.color}11` }}>
          <Activity className="h-3 w-3" style={{ color: source.color }} />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold text-foreground leading-none">{source.name}</p>
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: source.color }}>{source.tag}</span>
        </div>
      </div>

      {isLoading && <div className="h-5 w-24 animate-pulse rounded bg-border" />}
      {isError && (
        <span className="font-mono text-[11px] text-red" title={error?.message}>
          {finnhubNeedsKey ? "Set FINNHUB_API_KEY in backend .env" : "Unavailable"}
        </span>
      )}

      {!isLoading && !isError && data && (
        <div className="flex items-end justify-between gap-1">
          <div>
            {data.price != null ? (
              <>
                <p className="font-mono text-sm font-bold text-foreground leading-none">
                  ${data.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {change != null && (
                  <div className={cn("inline-flex items-center gap-1 mt-1 rounded-full border px-1.5 py-0.5", changeBg)}>
                    {changePositive ? <TrendingUp className="h-2.5 w-2.5 text-green" /> : changeNegative ? <TrendingDown className="h-2.5 w-2.5 text-red" /> : <Minus className="h-2.5 w-2.5 text-text-muted" />}
                    <span className={cn("font-mono text-[10px] font-bold", changeColor)}>
                      {change > 0 ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="font-mono text-sm text-text-muted">—</p>
            )}
          </div>
          <MiniSparkline price={data.price} color={source.color} />
        </div>
      )}

      <div className="absolute bottom-2.5 right-2.5" aria-hidden>
        <span className={cn("h-1.5 w-1.5 rounded-full block",
          isLoading ? "bg-gold animate-pulse" : isError ? "bg-red" : "bg-green animate-pulse")}
          style={{ boxShadow: isError ? "0 0 4px var(--red)" : isLoading ? "0 0 4px var(--gold)" : "0 0 4px var(--green)" }}
        />
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface SignalsDashboardProps {
  symbol?: string;
  /** Binance symbol (e.g. BTCUSDT, ETHUSDT). If not provided, BTC is used. */
  binanceSymbol?: string;
}

export function SignalsDashboard({ symbol = "BTC/USD", binanceSymbol = "BTCUSDT" }: SignalsDashboardProps) {
  const [fusionOpen, setFusionOpen] = useState(false);
  const sources = buildSourcesForAsset(binanceSymbol);

  const results = useQueries({
    queries: sources.map((source) => ({
      queryKey: ["source", source.id, source.params],
      queryFn: (): Promise<FetchResponse> => fetchSource(source.id, source.params),
      staleTime: 10_000,
      gcTime: 120_000,
      refetchInterval: 10_000,
      refetchIntervalInBackground: false,
      retry: 1,
    })),
  });

  const anyLoading  = results.some((r) => r.isLoading);
  const activeCount = results.filter((r) => r.data?.price != null && !r.isError).length;
  // Use first available price for the chart (fallback if Binance fails)
  const chartPrice = results.find((r) => r.data?.price != null)?.data?.price ?? null;
  const binancePrice = results[0]?.data?.price ?? chartPrice;
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, [activeCount]);

  return (
    <div className="card-glow rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/20 bg-cyan-dim">
            <Zap className="h-4 w-4 text-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm tracking-widest text-foreground uppercase">{symbol}</span>
              <span className="font-mono text-[10px] text-text-muted border border-border rounded px-1.5 py-0.5">Live Signals</span>
              {anyLoading && <RefreshCw className="h-3 w-3 animate-spin text-text-muted" />}
            </div>
            <p className="font-mono text-[10px] text-text-muted mt-0.5">
              {activeCount}/{sources.length} sources active{lastUpdated ? ` · ${lastUpdated}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {binancePrice != null && (
            <div className="flex items-center gap-2 rounded-lg border border-cyan/20 bg-cyan-dim px-3 py-1.5">
              <span className="font-mono text-[10px] text-text-muted">REF</span>
              <span className="font-mono text-sm font-bold text-cyan">
                ${binancePrice.toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </span>
            </div>
          )}
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-cyan to-violet text-black hover:brightness-110 border-0 font-mono text-xs font-bold"
            onClick={() => setFusionOpen(true)}
          >
            <Zap className="h-3 w-3" />
            Predict
          </Button>
        </div>
      </div>

      {/* Body: cards + chart side by side */}
      <div className="p-5 flex gap-5">
        {/* Left: source cards grid — fixed width so chart fills the rest */}
        <div className="grid grid-cols-2 gap-2.5 shrink-0 content-start" style={{ width: "min(55%, 420px)" }}>
          {sources.map((source, i) => (
            <SourceCard
              key={source.id}
              source={source}
              data={results[i]?.data}
              isLoading={results[i]?.isLoading ?? false}
              isError={results[i]?.isError ?? false}
              error={results[i]?.error instanceof Error ? results[i].error : null}
              rank={i + 1}
            />
          ))}
        </div>

        {/* Right: live prediction chart — usa el primer precio disponible */}
        <div className="flex-1 min-w-0">
          <LivePredictionChart
            price={chartPrice}
            color="var(--cyan)"
            symbol={symbol}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" style={{ boxShadow: "0 0 4px var(--green)" }} aria-hidden />
            <span className="font-mono text-[10px] text-text-muted">{activeCount} active</span>
          </div>
          <span className="font-mono text-[10px] text-text-muted">Refreshes every 0.5s</span>
          <span className="font-mono text-[9px] text-text-muted" title="Chart is client-side simulation; Predict uses backend PHPE.">
            Simulated prediction from live price
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-muted">PHPE Fusion Engine · Bayesian weighted</span>
      </div>

      {/* Fusion modal */}
      <Dialog open={fusionOpen} onOpenChange={setFusionOpen}>
        <DialogContent className="max-w-md border-border bg-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <Zap className="h-5 w-5 text-cyan" />
              Hybrid Prediction — {symbol}
            </DialogTitle>
          </DialogHeader>
          <SignalFusionPanel defaultParams={{ binanceSymbol }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
