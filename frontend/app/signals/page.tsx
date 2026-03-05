"use client";

import dynamic from "next/dynamic";
import { PhpeConfidenceGauge } from "@/components/phpe-confidence-gauge";
import { cn } from "@/lib/utils";

const SignalsDashboard = dynamic(
  () => import("@/components/signals-dashboard").then((m) => ({ default: m.SignalsDashboard })),
  { ssr: false, loading: () => <div className="rounded-xl border border-border bg-elevated h-48 animate-pulse" /> }
);

const ASSETS = [
  { symbol: "BTC/USD", binance: "BTCUSDT" },
  { symbol: "ETH/USD", binance: "ETHUSDT" },
];

// ─── Correlation heatmap ──────────────────────────────────────────────────────

const SOURCES = ["Binance", "Kraken", "CryptoCompare", "Chainlink", "Finnhub", "ExchangeRate"];

const CORRELATION_MATRIX: number[][] = [
  [1.00, 0.97, 0.95, 0.92, 0.88, 0.72],
  [0.97, 1.00, 0.96, 0.91, 0.87, 0.71],
  [0.95, 0.96, 1.00, 0.93, 0.89, 0.70],
  [0.92, 0.91, 0.93, 1.00, 0.85, 0.68],
  [0.88, 0.87, 0.89, 0.85, 1.00, 0.65],
  [0.72, 0.71, 0.70, 0.68, 0.65, 1.00],
];

function cellBg(value: number): string {
  if (value === 1.00) return "rgba(0,212,255,0.22)";
  if (value >= 0.90) return `rgba(0,212,255,${((value - 0.88) * 2.5).toFixed(2)})`;
  if (value >= 0.70) return `rgba(139,92,246,${((value - 0.60) * 1.2).toFixed(2)})`;
  return "rgba(107,122,153,0.10)";
}

function cellText(value: number): string {
  if (value >= 0.90) return "var(--cyan)";
  if (value >= 0.70) return "var(--violet)";
  return "var(--text-muted)";
}

function CorrelationHeatmap() {
  return (
    <div className="card-glow rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full bg-cyan"
            style={{ boxShadow: "0 0 8px var(--cyan)" }}
            aria-hidden
          />
          <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
            Source Correlation Matrix
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-muted border border-border rounded px-2 py-0.5">
          6 × 6
        </span>
      </div>

      <div className="p-5 overflow-x-auto">
        <table className="w-full" aria-label="Signal source correlation matrix">
          <thead>
            <tr>
              <th className="w-28" />
              {SOURCES.map((s) => (
                <th
                  key={s}
                  className="font-mono text-[10px] text-text-muted pb-3 px-1 text-center"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 80 }}
                  scope="col"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((rowSrc, ri) => (
              <tr key={rowSrc} className="group">
                <td className="font-mono text-[10px] text-text-muted text-right pr-4 py-1 whitespace-nowrap group-hover:text-foreground transition-colors">
                  {rowSrc}
                </td>
                {CORRELATION_MATRIX[ri].map((val, ci) => (
                  <td key={ci} className="p-1">
                    <div
                      className="rounded-md flex items-center justify-center font-mono text-[11px] font-bold transition-all duration-150 hover:scale-110 cursor-default"
                      style={{
                        width: 42,
                        height: 34,
                        background: cellBg(val),
                        color: cellText(val),
                        margin: "0 auto",
                        boxShadow: val >= 0.90 ? "0 0 8px rgba(0,212,255,0.15)" : "none",
                      }}
                      title={`${rowSrc} ↔ ${SOURCES[ci]}: ${val.toFixed(2)}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <div className="mt-5 flex items-center gap-5 justify-end border-t border-border pt-4">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">Correlation:</span>
          {[
            { label: "Low",    bg: "rgba(107,122,153,0.15)", text: "var(--text-muted)" },
            { label: "Medium", bg: "rgba(139,92,246,0.30)",  text: "var(--violet)"    },
            { label: "High",   bg: "rgba(0,212,255,0.30)",   text: "var(--cyan)"      },
          ].map(({ label, bg, text }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-4 w-8 rounded" style={{ background: bg }} />
              <span className="font-mono text-[10px]" style={{ color: text }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PHPE Overview panel ──────────────────────────────────────────────────────

const STATIC_CONFIDENCE = 0.72;

const ENGINE_STATS = [
  { label: "Active Sources", value: "6",         sub: "data feeds",       color: "var(--cyan)"   },
  { label: "Fusion Method",  value: "Bayesian",  sub: "weighted avg",     color: "var(--violet)" },
  { label: "Update Interval",value: "30s",       sub: "auto-refresh",     color: "var(--green)"  },
  { label: "Model Version",  value: "PHPE v1",   sub: "hybrid ensemble",  color: "var(--violet)" },
] as const;

function PhpeOverviewPanel() {
  return (
    <div className="card-glow rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full bg-violet animate-pulse"
            style={{ boxShadow: "0 0 8px var(--violet)" }}
            aria-hidden
          />
          <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
            PHPE Engine Status
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green-dim px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" aria-hidden />
          <span className="font-mono text-[10px] text-green uppercase tracking-widest">Operational</span>
        </div>
      </div>

      <div className="p-6 flex flex-col lg:flex-row items-center gap-8">
        {/* Gauge — más grande */}
        <div className="shrink-0 flex flex-col items-center gap-3">
          <PhpeConfidenceGauge confidence={STATIC_CONFIDENCE} size={200} />
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" aria-hidden />
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              Live estimate
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          {ENGINE_STATS.map(({ label, value, sub, color }) => (
            <div
              key={label}
              className="relative rounded-xl border border-border bg-elevated p-4 overflow-hidden group hover:border-border-bright transition-colors"
            >
              {/* Subtle glow corner */}
              <div
                className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `radial-gradient(circle, ${color}22 0%, transparent 70%)` }}
                aria-hidden
              />
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">
                {label}
              </p>
              <p
                className="font-display font-extrabold leading-none"
                style={{
                  fontSize: value.length > 6 ? 18 : 28,
                  color,
                }}
              >
                {value}
              </p>
              <p className="font-mono text-[10px] text-text-muted mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignalsPage() {
  return (
    <div className="container py-10 px-4 space-y-8 max-w-6xl">
      {/* Page header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-[40px] text-foreground leading-tight flex items-center gap-3 flex-wrap">
            LIVE SIGNALS
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-green animate-pulse"
                style={{ boxShadow: "0 0 10px var(--green)" }}
                aria-hidden
              />
              <span className="font-mono text-sm text-green font-medium">LIVE</span>
            </span>
          </h1>
          <p className="mt-2 font-body text-sm text-text-secondary max-w-xl">
            Real-time monitoring of 6 PHPE data sources. Use any asset as input for a hybrid prediction.
          </p>
        </div>

        {/* Quick stats bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "Sources",    value: "6",    color: "var(--cyan)"   },
            { label: "Assets",     value: "2",    color: "var(--violet)" },
            { label: "Refresh",    value: "30s",  color: "var(--green)"  },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2"
            >
              <span className="font-display font-extrabold text-lg" style={{ color }}>{value}</span>
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* PHPE Engine overview */}
      <PhpeOverviewPanel />

      {/* Correlation heatmap */}
      <CorrelationHeatmap />

      {/* Per-asset signal dashboards */}
      <div className="space-y-6">
        {ASSETS.map((asset) => (
          <SignalsDashboard key={asset.symbol} symbol={asset.symbol} />
        ))}
      </div>
    </div>
  );
}
