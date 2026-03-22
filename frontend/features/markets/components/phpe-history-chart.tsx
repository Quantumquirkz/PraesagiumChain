// @ts-nocheck — recharts/React types; componentes válidos en runtime
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { PredictionView } from "@/types/api";
import { formatRelativeTime } from "@/lib/utils";

interface PHPEHistoryChartProps {
  predictions: PredictionView[];
}

interface ChartPoint {
  time: string;
  probability: number;
  upper: number | null;
  lower: number | null;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const prob  = payload[0]?.value;
  const isAbove50 = prob >= 50;

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-bright)",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        minWidth: 140,
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-muted)",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isAbove50 ? "var(--cyan)" : "var(--red)",
            boxShadow: `0 0 6px ${isAbove50 ? "var(--cyan)" : "var(--red)"}`,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            fontWeight: 700,
            color: isAbove50 ? "var(--cyan)" : "var(--red)",
          }}
        >
          {prob}%
        </span>
      </div>
      {point?.upper != null && point?.lower != null && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--violet)",
          }}
        >
          Range: {point.lower}% – {point.upper}%
        </p>
      )}
    </div>
  );
}

export function PHPEHistoryChart({ predictions }: PHPEHistoryChartProps) {
  if (predictions.length < 2) return null;

  const data: ChartPoint[] = predictions
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((p) => ({
      time: formatRelativeTime(p.timestamp),
      probability: Math.round(p.probability * 100),
      upper:
        p.uncertainty != null
          ? Math.min(100, Math.round((p.probability + p.uncertainty) * 100))
          : null,
      lower:
        p.uncertainty != null
          ? Math.max(0, Math.round((p.probability - p.uncertainty) * 100))
          : null,
    }));

  const hasUncertainty = data.some((d) => d.upper != null);
  const maxProb = Math.max(...data.map((d) => d.probability));
  const minProb = Math.min(...data.map((d) => d.probability));
  const trend   = data[data.length - 1]?.probability > data[0]?.probability;

  return (
    <div
      className="rounded-2xl border border-border overflow-hidden"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full bg-cyan"
            style={{ boxShadow: "0 0 6px var(--cyan)" }}
            aria-hidden
          />
          <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
            PHPE Probability Trend
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[10px] border rounded px-2 py-0.5"
            style={{
              color: trend ? "var(--green)" : "var(--red)",
              borderColor: trend ? "rgba(0,232,122,0.3)" : "rgba(255,61,90,0.3)",
              background: trend ? "var(--green-dim)" : "var(--red-dim)",
            }}
          >
            {trend ? "▲" : "▼"} {Math.abs(maxProb - minProb)}pp range
          </span>
          <span className="font-mono text-[10px] text-text-muted">{data.length} pts</span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              {/* Main area gradient */}
              <linearGradient id="phpe-prob-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--cyan)"   stopOpacity={0.28} />
                <stop offset="50%"  stopColor="var(--cyan)"   stopOpacity={0.08} />
                <stop offset="100%" stopColor="var(--cyan)"   stopOpacity={0.01} />
              </linearGradient>
              {/* Uncertainty band gradient */}
              <linearGradient id="phpe-uncertainty-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--violet)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--violet)" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            {/* Subtle grid */}
            <CartesianGrid
              strokeDasharray="4 8"
              stroke="var(--border)"
              strokeOpacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              dy={4}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v: number) => `${v}%`}
              width={36}
              axisLine={false}
              tickLine={false}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "var(--cyan)",
                strokeWidth: 1,
                strokeDasharray: "4 3",
                strokeOpacity: 0.6,
              }}
            />

            {/* 50% reference line */}
            <ReferenceLine
              y={50}
              stroke="var(--border-bright)"
              strokeDasharray="6 4"
              strokeWidth={1}
              label={{
                value: "50%",
                position: "insideTopRight",
                fill: "var(--text-muted)",
                fontSize: 9,
                fontFamily: "var(--font-mono)",
              }}
            />

            {/* Uncertainty band */}
            {hasUncertainty && (
              <>
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="url(#phpe-uncertainty-fill)"
                  fillOpacity={1}
                  connectNulls
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="var(--bg-surface)"
                  fillOpacity={1}
                  connectNulls
                  isAnimationActive={false}
                />
              </>
            )}

            {/* Main probability area */}
            <Area
              type="monotone"
              dataKey="probability"
              stroke="var(--cyan)"
              strokeWidth={2.5}
              fill="url(#phpe-prob-fill)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--cyan)",
                stroke: "var(--bg-surface)",
                strokeWidth: 2,
                style: { filter: "drop-shadow(0 0 6px var(--cyan))" },
              }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-5 px-5 py-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-6 rounded" style={{ background: "var(--cyan)" }} />
          <span className="font-mono text-[10px] text-text-muted">Probability</span>
        </div>
        {hasUncertainty && (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-6 rounded opacity-30" style={{ background: "var(--violet)" }} />
            <span className="font-mono text-[10px] text-text-muted">Uncertainty band</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="h-0.5 w-4 rounded" style={{ background: "var(--border-bright)", borderTop: "1px dashed" }} />
          <span className="font-mono text-[10px] text-text-muted">50% baseline</span>
        </div>
      </div>
    </div>
  );
}
