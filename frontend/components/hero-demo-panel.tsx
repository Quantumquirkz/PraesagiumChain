"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

const CHART_HEIGHT = 302;

function generateWalk(n: number, start: number, min: number, max: number): number[] {
  const arr = [start];
  for (let i = 1; i < n; i++) {
    const next = arr[i - 1] + (Math.random() - 0.49) * (max - min) * 0.08;
    arr.push(Math.min(max, Math.max(min, next)));
  }
  return arr;
}

// ─── Zona A compartida (explicación) ────────────────────────────────────────
function DemoZoneA({
  title,
  description,
  badge,
  badgeColor,
  tags,
}: {
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  tags: string[];
}) {
  return (
    <div
      className="flex shrink-0 justify-between items-center border-b border-white/[0.06] px-[18px] py-3.5"
      style={{ background: "rgba(8,11,18,0.5)", height: 110 }}
    >
      <div className="min-w-0 flex-1 pr-4">
        <h3 className="text-white font-bold text-[15px] leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {title}
        </h3>
        <p
          className="text-[11px] leading-[1.5] mt-1 max-w-[65%]"
          style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.45)" }}
        >
          {description}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase"
          style={{ background: `${badgeColor}20`, border: `1px solid ${badgeColor}50`, color: badgeColor }}
        >
          {badge}
        </span>
        <div className="flex flex-wrap gap-1 justify-end">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded px-1.5 py-0.5 font-mono text-[9px]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function CandlestickChartHD({ containerRef, isPaused }: { containerRef: React.RefObject<HTMLDivElement | null>; isPaused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const candlesRef = useRef<Candle[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 2 });
  const [lastPrice, setLastPrice] = useState(3418);
  const numCandles = 55;
  const basePrice = 3500;

  const initCandles = useCallback(() => {
    const arr: Candle[] = [];
    let close = basePrice;
    for (let i = 0; i < numCandles; i++) {
      const change = (Math.random() - 0.48) * 45;
      const open = close;
      close = open + change;
      arr.push({
        open,
        high: Math.max(open, close) + Math.random() * 20,
        low: Math.min(open, close) - Math.random() * 20,
        close,
        volume: 100 + Math.random() * 900,
      });
    }
    candlesRef.current = arr;
    setLastPrice(close);
  }, []);

  useEffect(() => initCandles(), [initCandles]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      const arr = candlesRef.current;
      if (arr.length === 0) return;
      const prev = arr[arr.length - 1];
      const change = (Math.random() - 0.48) * 45;
      const open = prev.close;
      const close = open + change;
      candlesRef.current = [...arr.slice(1), {
        open,
        high: Math.max(open, close) + Math.random() * 20,
        low: Math.min(open, close) - Math.random() * 20,
        close,
        volume: 100 + Math.random() * 900,
      }];
      setLastPrice(close);
    }, 1200);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    const container = containerRef?.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? Math.max(2, window.devicePixelRatio || 2) : 2;
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      (canvas as HTMLCanvasElement).style.width = `${rect.width}px`;
      (canvas as HTMLCanvasElement).style.height = `${rect.height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    if (w <= 0 || h <= 0) return;
    ctx.imageSmoothingEnabled = true;
    (ctx as CanvasRenderingContext2D & { imageSmoothingQuality?: string }).imageSmoothingQuality = "high";

    const chartH = h * 0.75;
    const volH = h * 0.25;
    const pad = { top: 28, right: 52, bottom: volH + 4, left: 10 };
    const chartW = w - pad.left - pad.right;
    const chartBottom = h * 0.75;
    const arr = candlesRef.current;
    if (arr.length === 0) return;
    const minP = Math.min(...arr.map((c) => c.low));
    const maxP = Math.max(...arr.map((c) => c.high));
    const range = maxP - minP || 1;
    const maxVol = Math.max(...arr.map((c) => c.volume));
    const toY = (price: number) => chartBottom - ((price - minP) / range) * (chartH - pad.top);
    const toX = (i: number) => pad.left + (i / (arr.length - 1)) * chartW;
    const candleW = (chartW / arr.length) * 0.65;

    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 5; i++) {
      const y = chartBottom - (i / 4) * (chartH - pad.top);
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.font = "10px JetBrains Mono";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "right";
      ctx.fillText((minP + (i / 4) * range).toFixed(0), w - 8, y + 3);
    }
    for (let i = 0; i < 8; i++) {
      const x = pad.left + (i / 7) * chartW;
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, chartBottom);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, chartBottom);
    ctx.lineTo(w, chartBottom);
    ctx.stroke();

    arr.forEach((c, i) => {
      const x = toX(i);
      const cx = x - candleW / 2;
      const isBull = c.close >= c.open;
      const fillC = isBull ? "#00C96B" : "#FF3558";
      const openY = toY(c.open);
      const closeY = toY(c.close);
      const lowY = toY(c.low);
      const highY = toY(c.high);
      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(Math.abs(closeY - openY), 1);
      const isLast = i === arr.length - 1;
      if (isLast) ctx.globalAlpha = Math.sin(Date.now() / 400) * 0.25 + 0.75;
      ctx.strokeStyle = fillC;
      ctx.fillStyle = fillC;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, lowY);
      ctx.lineTo(x, highY);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(cx, bodyTop, candleW, bodyH, 1.5);
      ctx.fill();
      ctx.stroke();
      if (isLast) ctx.globalAlpha = 1;
    });

    const lastC = arr[arr.length - 1];
    const lastCloseY = toY(lastC.close);
    const fillC = lastC.close >= lastC.open ? "#00C96B" : "#FF3558";
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = lastC.close >= lastC.open ? "rgba(0,201,107,0.6)" : "rgba(255,53,88,0.6)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.left + chartW, lastCloseY);
    ctx.lineTo(w - 70, lastCloseY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = fillC;
    ctx.beginPath();
    ctx.roundRect(w - 66, lastCloseY - 9, 58, 18, 3);
    ctx.fill();
    ctx.font = "10px JetBrains Mono";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("$" + lastC.close.toFixed(2), w - 37, lastCloseY + 4);

    const volTop = chartBottom + 4;
    arr.forEach((c, i) => {
      const vx = toX(i);
      const vh = (c.volume / maxVol) * volH * 0.9;
      ctx.fillStyle = c.close >= c.open ? "rgba(0,201,107,0.4)" : "rgba(255,53,88,0.4)";
      if (i === arr.length - 1) ctx.globalAlpha = Math.sin(Date.now() / 400) * 0.25 + 0.75;
      ctx.fillRect(vx - candleW / 2, volTop + volH - vh, candleW, vh);
      if (i === arr.length - 1) ctx.globalAlpha = 1;
    });
  }, []);

  useEffect(() => {
    draw();
    const raf = requestAnimationFrame(function loop() {
      draw();
      requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ display: "block" }} />
    </>
  );
}

function CandlestickDemo({ isPaused }: { isPaused?: boolean }) {
  const zoneBRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex h-full flex-col min-h-0">
      <DemoZoneA
        title="See the market before you stake"
        description="Real-time price data lets you stake with confidence. Track OHLCV live — no lag, no guesswork. Know exactly where the market is heading before placing your prediction."
        badge="📈 FINANCIAL DATA"
        badgeColor="#00D4FF"
        tags={["LIVE", "1.2s UPDATE", "OHLCV", "VOLUME"]}
      />
      <div className="relative h-[302px] shrink-0 overflow-hidden bg-[#050810]">
        <CandlestickChartHD containerRef={zoneBRef} isPaused={isPaused} />
        <div
          className="absolute left-3 top-3 z-10 rounded-md border border-white/[0.06] px-3 py-2"
          style={{ background: "rgba(5,8,16,0.7)", backdropFilter: "blur(8px)" }}
        >
          <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="text-[11px] font-medium text-white/50">
            ETH/USD
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-[26px] font-extrabold text-white leading-none">
            ${3418}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="text-xs font-semibold text-[#00C96B]">
            +2.34% ▲
          </div>
        </div>
      </div>
    </div>
  );
}

function MultiLineChart({ height = CHART_HEIGHT, isPaused }: { height?: number; isPaused?: boolean }) {
  const W = 560;
  const H = height;
  const PAD = { top: 20, right: 60, bottom: 28, left: 48 };
  const PLOT_W = W - PAD.left - PAD.right;
  const PLOT_H = H - PAD.top - PAD.bottom;
  const ethMin = 0;
  const ethMax = 3.2;
  const scaleEth = (v: number) => PAD.top + PLOT_H * (1 - (v - ethMin) / (ethMax - ethMin));
  const pctMin = 0;
  const pctMax = 100;
  const scalePct = (v: number) => PAD.top + PLOT_H * (1 - (v - pctMin) / (pctMax - pctMin));
  const scaleX = (i: number) => PAD.left + (i / 49) * PLOT_W;

  function buildPath(data: number[], scaleY: (v: number) => number) {
    if (data.length < 2) return "";
    const pts = data.map((v, i) => ({ x: scaleX(i), y: scaleY(v) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.5;
      const cp1y = pts[i - 1].y;
      const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.5;
      const cp2y = pts[i].y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  }

  function buildArea(data: number[], scaleY: (v: number) => number) {
    const linePath = buildPath(data, scaleY);
    const lastX = scaleX(data.length - 1);
    const firstX = scaleX(0);
    const baseline = PAD.top + PLOT_H;
    return `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
  }

  const [yesPool, setYesPool] = useState<number[]>(() => generateWalk(50, 1.5, 0.4, 2.8));
  const [noPool, setNoPool] = useState<number[]>(() => generateWalk(50, 0.9, 0.2, 1.8));
  const [phpeProb, setPhpeProb] = useState<number[]>(() => generateWalk(50, 58, 35, 80));

  useEffect(() => {
    if (isPaused) return;
    const t = setInterval(() => {
      setYesPool((prev) => {
        const next = prev[prev.length - 1] + (Math.random() - 0.49) * 2.4 * 0.08;
        return [...prev.slice(1), Math.min(2.8, Math.max(0.4, next))];
      });
      setNoPool((prev) => {
        const next = prev[prev.length - 1] + (Math.random() - 0.49) * 1.6 * 0.08;
        return [...prev.slice(1), Math.min(1.8, Math.max(0.2, next))];
      });
      setPhpeProb((prev) => {
        const next = prev[prev.length - 1] + (Math.random() - 0.49) * 45 * 0.08;
        return [...prev.slice(1), Math.min(80, Math.max(35, next))];
      });
    }, 2000);
    return () => clearInterval(t);
  }, [isPaused]);

  const bandTop = phpeProb.map((v, i) => `${scaleX(i)},${scalePct(Math.min(100, v + 8))}`);
  const bandBottom = phpeProb.map((v, i) => `${scaleX(i)},${scalePct(Math.max(0, v - 8))}`).reverse();
  const bandPath = `M ${bandTop.join(" L ")} L ${bandBottom.join(" L ")} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="grad-yes" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="grad-no" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF3558" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FF3558" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="grad-phpe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
        <clipPath id="plot-clip-ml">
          <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill="#050810" />
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={PAD.left} y1={PAD.top + t * PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + t * PLOT_H} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="4,4" />
      ))}
      <line x1={PAD.left} y1={scalePct(50)} x2={PAD.left + PLOT_W} y2={scalePct(50)} stroke="rgba(139,92,246,0.2)" strokeWidth="0.5" strokeDasharray="6,3" />
      <g clipPath="url(#plot-clip-ml)">
        <path d={bandPath} fill="#8B5CF620" />
        <path d={buildArea(yesPool, scaleEth)} fill="url(#grad-yes)" />
        <path d={buildArea(noPool, scaleEth)} fill="url(#grad-no)" />
        <path d={buildArea(phpeProb, scalePct)} fill="url(#grad-phpe)" />
        <path d={buildPath(noPool, scaleEth)} fill="none" stroke="#FF3558" strokeWidth="1.8" strokeLinejoin="round" />
        <path d={buildPath(phpeProb, scalePct)} fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeDasharray="7,3" strokeLinejoin="round" />
        <path d={buildPath(yesPool, scaleEth)} fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinejoin="round" />
        {[
          { data: yesPool, scaleY: scaleEth, color: "#00D4FF" },
          { data: noPool, scaleY: scaleEth, color: "#FF3558" },
          { data: phpeProb, scaleY: scalePct, color: "#8B5CF6" },
        ].map(({ data, scaleY, color }, i) => {
          const cx = scaleX(data.length - 1);
          const cy = scaleY(data[data.length - 1]);
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="6" fill={color} opacity="0.15">
                <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r="3" fill={color} />
            </g>
          );
        })}
      </g>
      {[0, 0.8, 1.6, 2.4, 3.2].map((v, i) => (
        <text key={i} x={PAD.left - 6} y={scaleEth(v) + 4} textAnchor="end" fontSize="9" fontFamily="JetBrains Mono" fill="rgba(0,212,255,0.4)">
          {v.toFixed(1)}
        </text>
      ))}
      {[0, 25, 50, 75, 100].map((v, i) => (
        <text key={i} x={PAD.left + PLOT_W + 6} y={scalePct(v) + 4} textAnchor="start" fontSize="9" fontFamily="JetBrains Mono" fill="rgba(139,92,246,0.5)">
          {v}%
        </text>
      ))}
      {["−60s", "−45s", "−30s", "−15s", "NOW"].map((label, i) => {
        const x = scaleX(Math.round(i * 49 / 4));
        return (
          <text key={i} x={x} y={PAD.top + PLOT_H + 16} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono" fill="rgba(255,255,255,0.2)">
            {label}
          </text>
        );
      })}
      {[
        { label: "YES Pool", value: yesPool[yesPool.length - 1].toFixed(2) + " ETH", color: "#00D4FF" },
        { label: "NO Pool", value: noPool[noPool.length - 1].toFixed(2) + " ETH", color: "#FF3558" },
        { label: "PHPE", value: phpeProb[phpeProb.length - 1].toFixed(1) + "%", color: "#8B5CF6" },
      ].map(({ label, value, color }, i) => (
        <g key={i} transform={`translate(${PAD.left + PLOT_W - 110}, ${PAD.top + 8 + i * 18})`}>
          <rect x="0" y="-7" width="30" height="1.5" rx="1" fill={color} />
          <text x="36" y="0" fontSize="9" fontFamily="JetBrains Mono" fill={color}>{label}</text>
          <text x="36" y="11" fontSize="8" fontFamily="JetBrains Mono" fill="rgba(255,255,255,0.4)">{value}</text>
        </g>
      ))}
    </svg>
  );
}

function MultiLineDemo({ isPaused }: { isPaused?: boolean }) {
  return (
    <div className="flex h-full flex-col min-h-0">
      <DemoZoneA
        title="What we offer — AI-calibrated odds, stake smarter"
        description="The PHPE engine calibrates YES/NO pools and surfaces uncertainty. No guessing — transparent probabilities so you know your edge. Make informed predictions with calibrated confidence."
        badge="◈ AI METRICS"
        badgeColor="#8B5CF6"
        tags={["REAL-TIME", "3 SERIES", "PHPE AI", "UNCERTAINTY"]}
      />
      <div className="relative h-[302px] shrink-0 overflow-hidden bg-[#050810]">
        <MultiLineChart height={CHART_HEIGHT} isPaused={isPaused} />
      </div>
    </div>
  );
}

const GRID_PAGES: { market: string; pool: string; status: "Open" | "Locked" | "Resolved" | "Stopped"; trend: "up" | "flat" | "down"; activity: number[]; disk: number }[][] = [
  [
    { market: "ETH > $4,000", pool: "Ξ 1.24 ETH", status: "Open", trend: "up", activity: [40, 55, 70, 85, 90, 78, 82, 88, 75, 80, 90], disk: 78 },
    { market: "BTC > $80K", pool: "Ξ 0.82 ETH", status: "Open", trend: "flat", activity: [50, 48, 52, 50, 55, 48, 52], disk: 45 },
    { market: "SOL > $200", pool: "Ξ 0.31 ETH", status: "Locked", trend: "down", activity: [80, 70, 60, 50, 45, 40], disk: 67 },
    { market: "FED Rate Cut", pool: "Ξ 2.10 ETH", status: "Open", trend: "up", activity: [20, 35, 50, 65, 80, 95, 90], disk: 34 },
    { market: "ETH Merge 2.0", pool: "Ξ 0.00 ETH", status: "Resolved", trend: "flat", activity: [60, 60, 60], disk: 91 },
    { market: "BNB > $600", pool: "Ξ 0.55 ETH", status: "Open", trend: "up", activity: [45, 58, 72, 65, 70], disk: 55 },
  ],
  [
    { market: "XRP > $2", pool: "Ξ 0.44 ETH", status: "Open", trend: "down", activity: [90, 75, 60], disk: 22 },
    { market: "DOGE > $0.5", pool: "Ξ 1.02 ETH", status: "Locked", trend: "up", activity: [30, 50, 70], disk: 88 },
    { market: "AVAX > $50", pool: "Ξ 0.21 ETH", status: "Open", trend: "flat", activity: [55, 55, 58], disk: 41 },
    { market: "LINK > $20", pool: "Ξ 0.67 ETH", status: "Open", trend: "up", activity: [40, 60, 80], disk: 63 },
    { market: "UNI > $15", pool: "Ξ 0.33 ETH", status: "Resolved", trend: "flat", activity: [70, 70], disk: 100 },
    { market: "MATIC > $1", pool: "Ξ 0.18 ETH", status: "Stopped", trend: "down", activity: [80, 50, 20], disk: 12 },
  ],
  [
    { market: "ARB > $2", pool: "Ξ 0.91 ETH", status: "Open", trend: "up", activity: [25, 45, 65, 85], disk: 56 },
    { market: "OP > $3", pool: "Ξ 0.42 ETH", status: "Open", trend: "down", activity: [85, 60, 40], disk: 33 },
    { market: "APT > $15", pool: "Ξ 0.77 ETH", status: "Locked", trend: "up", activity: [50, 70, 90], disk: 71 },
    { market: "NEAR > $8", pool: "Ξ 0.29 ETH", status: "Open", trend: "flat", activity: [60, 62, 58], disk: 44 },
    { market: "FIL > $10", pool: "Ξ 0.15 ETH", status: "Resolved", trend: "up", activity: [30, 50, 70, 90], disk: 89 },
    { market: "ATOM > $12", pool: "Ξ 0.38 ETH", status: "Open", trend: "down", activity: [70, 50, 30], disk: 27 },
  ],
];

function TrendSparkline({ trend, data }: { trend: "up" | "flat" | "down"; data: number[] }) {
  const w = 80;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${(1 - (v - min) / (max - min)) * h}`).join(" ");
  const color = trend === "up" ? "#00D4FF" : trend === "down" ? "#FF3558" : "#F5A623";
  return (
    <svg width={80} height={28} viewBox={`0 0 ${w} ${h}`}>
      <polygon points={`${pts} ${w},${h} 0,${h}`} fill={color} opacity="0.06" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ActivityBars({ values }: { values: number[] }) {
  const w = 70;
  const h = 28;
  const max = Math.max(...values, 1);
  const barW = 4;
  const gap = 2;
  const totalW = values.length * barW + (values.length - 1) * gap;
  const startX = (w - totalW) / 2 + barW / 2 + gap / 2;
  return (
    <svg width={70} height={28} viewBox={`0 0 ${w} ${h}`}>
      {values.map((v, i) => {
        const barH = (v / max) * h * 0.85;
        const x = startX + i * (barW + gap) - barW / 2;
        const color = v < 40 ? "#00E87A" : v < 70 ? "#F5A623" : "#FF3558";
        return (
          <rect key={i} x={x} y={h - barH} width={barW} height={barH} fill={color} rx={1} />
        );
      })}
    </svg>
  );
}

function DiskDonut({ value }: { value: number }) {
  const r = 12;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = value > 80 ? "#FF3558" : value > 60 ? "#F5A623" : "#00E87A";
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" className="-rotate-90">
      <circle cx={16} cy={16} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <circle
        cx={16}
        cy={16}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={-circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 600ms ease" }}
      />
      <g transform="rotate(90 16 16)">
        <text x={16} y={16} textAnchor="middle" dominantBaseline="middle" fill={color} style={{ font: "bold 7px JetBrains Mono" }}>{value}%</text>
      </g>
    </svg>
  );
}

function DataGridDemoBlock({ isPaused }: { isPaused?: boolean }) {
  return (
    <div className="flex h-full flex-col min-h-0">
      <DemoZoneA
        title="Why on-chain — Find opportunities in seconds"
        description="Browse active markets at a glance. Status, trends, activity — all on-chain. No APIs, no middlemen. Live data you can trust to find the right market and stake in time."
        badge="⬡ MARKET DATA"
        badgeColor="#00E87A"
        tags={["SPARKLINES", "STATUS", "LIVE", "PAGINATION"]}
      />
      <div className="relative h-[302px] shrink-0 overflow-hidden bg-[#050810]">
        <DataGridDemo isPaused={isPaused} />
      </div>
    </div>
  );
}

function DataGridDemo({ isPaused }: { isPaused?: boolean }) {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(GRID_PAGES[0]);
  const [trendData, setTrendData] = useState<Record<number, number[]>>({});
  useEffect(() => {
    setRows(GRID_PAGES[page]);
  }, [page]);
  useEffect(() => {
    if (isPaused) return;
    const t = setInterval(() => {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          activity: [...r.activity.slice(1), Math.max(0, Math.min(100, r.activity[r.activity.length - 1] + (Math.random() - 0.5) * 20))],
          disk: Math.max(0, Math.min(100, r.disk + (Math.random() - 0.5) * 6)),
        }))
      );
      setTrendData((prev) => {
        const next = { ...prev };
        for (let i = 0; i < 6; i++) {
          const arr = next[i] ?? Array.from({ length: 20 }, () => 50 + Math.random() * 20);
          next[i] = [...arr.slice(1), arr[arr.length - 1] + (Math.random() - 0.5) * 15];
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [page, isPaused]);
  const statusStyle = (s: string) => {
    if (s === "Open") return { bg: "#00E87A1A", border: "#00E87A4D", color: "#00E87A", label: "● OPEN" };
    if (s === "Locked") return { bg: "#F5A6231A", border: "#F5A6234D", color: "#F5A623", label: "◈ LOCKED" };
    if (s === "Resolved") return { bg: "#00D4FF1A", border: "#00D4FF4D", color: "#00D4FF", label: "✓ DONE" };
    return { bg: "#FF35581A", border: "#FF35584D", color: "#FF3558", label: "✕ STOPPED" };
  };
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 bg-[rgba(8,11,18,0.8)] border-b border-white/[0.08] px-3.5 py-2">
        <div className="grid grid-cols-[35%_12%_20%_20%_13%] gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white/30">
          <span>MARKET</span><span>STATUS</span><span>TREND</span><span>ACTIVITY</span><span>DISK</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {rows.map((r, i) => {
          const st = statusStyle(r.status);
          const trendArr = trendData[i] ?? Array.from({ length: 20 }, (_, j) => (r.trend === "up" ? 30 + j * 3 + Math.random() * 5 : r.trend === "down" ? 90 - j * 3 - Math.random() * 5 : 50 + Math.random() * 4));
          return (
            <div
              key={`${page}-${i}`}
              className="grid grid-cols-[35%_12%_20%_20%_13%] gap-2 items-center px-3.5 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors"
            >
              <div>
                <div className="font-medium text-[11px] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.market}</div>
                <div className="font-mono text-[9px] text-[#00D4FF]/60">{r.pool}</div>
              </div>
              <span
                className="inline-flex w-fit rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase"
                style={{ background: st.bg, borderColor: st.border, color: st.color }}
              >
                {st.label}
              </span>
              <TrendSparkline trend={r.trend} data={trendArr} />
              <ActivityBars values={r.activity} />
              <div className="flex items-center justify-center">
                <DiskDonut value={Math.round(r.disk)} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="shrink-0 h-8 flex items-center justify-center gap-4 border-t border-white/[0.06] bg-[rgba(8,11,18,0.6)] font-mono text-[9px] text-white/30">
        <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} className="text-white/20 hover:text-white">‹‹</button>
        <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} className="text-white/20 hover:text-white">‹</button>
        <span>Page {page + 1} of 3</span>
        <button type="button" onClick={() => setPage((p) => Math.min(2, p + 1))} className="text-white/20 hover:text-white">›</button>
        <button type="button" onClick={() => setPage((p) => Math.min(2, p + 1))} className="text-white/20 hover:text-white">››</button>
      </div>
    </div>
  );
}

function Donut({ value, size = 24 }: { value: number; size?: number }) {
  const r = size / 2 - 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = value > 80 ? "#FF3D5A" : value > 60 ? "#F5A623" : "#00E87A";
  return (
    <div className="inline-flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <span className="font-mono text-[8px] text-white/60 mt-0.5">{value}%</span>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 60;
  const h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${(1 - (v - min) / (max - min)) * h}`).join(" ");
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={isUp ? "#00E87A" : "#FF3D5A"} strokeWidth={1.5} />
    </svg>
  );
}

const DEMO_TABS = [
  { id: 0, label: "01 Candlestick" },
  { id: 1, label: "02 Multi-Line" },
  { id: 2, label: "03 Data Grid" },
];

const DEMO_INFO = [
  { title: "Why PraesagiumChain", subtitle: "Real-time price data — see the market before you stake" },
  { title: "What we offer", subtitle: "AI-calibrated odds, transparent probabilities — stake smarter" },
  { title: "Why on-chain", subtitle: "Browse markets at a glance — live data you can trust" },
];

export function DemoPanel() {
  const [activeTab, setActiveTab] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

const INTERVAL_MS = 12000;

  const goToTab = useCallback((idx: number) => {
    setActiveTab(idx);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveTab((t) => (t + 1) % 3);
    }, INTERVAL_MS);
  }, []);

  useEffect(() => {
    if (hovered || paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      setActiveTab((t) => (t + 1) % 3);
    }, INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hovered, paused]);

  const info = DEMO_INFO[activeTab];

  return (
    <div
      className="relative w-full max-w-[680px] h-[540px] overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(15,19,32,0.8)] shadow-[0_0_0_1px_rgba(0,212,255,0.05),0_32px_64px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[20px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex h-10 items-center justify-between border-b border-white/10 bg-[rgba(8,11,18,0.6)] px-3.5">
        <div className="flex gap-1.5">
          {["#FF5F57", "#FFBD2E", "#28CA41"].map((c, i) => (
            <span key={i} className="h-3 w-3 rounded-full" style={{ background: c }} aria-hidden />
          ))}
        </div>
        <div className="rounded border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-white/30">
          praesagiumchain.io/markets/live
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#00E87A]">
          <span className="h-2 w-2 rounded-full bg-[#00E87A] animate-[navbar-pulse_2s_ease-in-out_infinite]" />
          LIVE
        </div>
      </div>
      <div className="flex h-9 border-b border-white/10 bg-[rgba(8,11,18,0.4)]">
        {DEMO_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="w-1/3 font-mono text-[10px] uppercase transition-all duration-200 hover:text-white/60"
            style={{
              color: activeTab === tab.id ? "#00D4FF" : "rgba(255,255,255,0.3)",
              background: activeTab === tab.id ? "rgba(0,212,255,0.06)" : "transparent",
              borderBottom: activeTab === tab.id ? "2px solid #00D4FF" : "none",
            }}
            onClick={() => goToTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div key={activeTab} className="demo-tab-enter flex flex-1 flex-col min-h-0 overflow-hidden">
          {activeTab === 0 && <CandlestickDemo isPaused={hovered || paused} />}
          {activeTab === 1 && <MultiLineDemo isPaused={hovered || paused} />}
          {activeTab === 2 && <DataGridDemoBlock isPaused={hovered || paused} />}
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 flex h-[52px] items-center gap-4 border-t border-white/[0.06] px-4"
        style={{ background: "rgba(8,11,18,0.7)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex-1 min-w-0">
          <p
            key={activeTab}
            className="font-semibold text-white text-xs truncate"
            style={{ fontFamily: "'DM Sans', sans-serif", animation: "fade-in 300ms ease" }}
          >
            {info.title}
          </p>
          <p
            key={`sub-${activeTab}`}
            className="font-normal text-[10px] truncate mt-0.5"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)", animation: "fade-in 300ms ease" }}
          >
            {info.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex items-center gap-[10px]">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToTab(i)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: activeTab === i ? 28 : 8,
                  height: 8,
                  background: activeTab === i ? "linear-gradient(90deg, #00D4FF, #8B5CF6)" : "rgba(255,255,255,0.2)",
                  boxShadow: activeTab === i ? "0 0 8px rgba(0,212,255,0.4)" : "none",
                }}
                aria-label={`Go to demo ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="font-mono text-[10px] text-white/40 transition-colors hover:text-white"
          >
            {paused ? "Play ▶" : "Pause ⏸"}
          </button>
        </div>
      </div>
    </div>
  );
}
