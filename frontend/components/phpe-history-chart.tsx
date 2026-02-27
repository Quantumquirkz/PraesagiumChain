// @ts-nocheck — recharts/React types; componentes válidos en runtime
"use client";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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
  return (
    <div
      className="rounded border border-border-bright bg-elevated font-mono text-[11px] shadow-lg"
      style={{ padding: "8px 12px" }}
    >
      <p className="text-text-muted mb-1">{label}</p>
      <p style={{ color: "var(--cyan)" }}>
        Probability: {payload[0]?.value}%
      </p>
      {point?.upper != null && point?.lower != null && (
        <p style={{ color: "var(--violet)" }}>
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

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <h2 className="mb-3 font-display font-bold text-[13px] text-text-muted tracking-widest">
        PHPE PROBABILITY TREND
      </h2>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="phpe-prob-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* @ts-expect-error recharts */}
          <XAxis
            dataKey="time"
            tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          {/* @ts-expect-error recharts */}
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: number) => `${v}%`}
            width={34}
            axisLine={false}
            tickLine={false}
          />
          {/* @ts-expect-error recharts */}
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--cyan)", strokeWidth: 1, strokeDasharray: "4 2", strokeOpacity: 0.5 }} />

          {/* Línea de referencia 50% */}
          {/* @ts-expect-error recharts */}
          <ReferenceLine y={50} stroke="var(--border-bright)" strokeDasharray="4 4" strokeWidth={1} />

          {/* Banda de incertidumbre superior */}
          {hasUncertainty && (
            <>
              {/* @ts-expect-error recharts */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="var(--violet)"
                fillOpacity={0.08}
                connectNulls
                isAnimationActive={false}
              />
              {/* Capa inferior que "borra" el relleno por debajo de lower */}
              {/* @ts-expect-error recharts */}
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="var(--bg-base)"
                fillOpacity={1}
                connectNulls
                isAnimationActive={false}
              />
            </>
          )}

          {/* Área de relleno de la línea principal */}
          {/* @ts-expect-error recharts */}
          <Area
            type="monotone"
            dataKey="probability"
            stroke="var(--cyan)"
            strokeWidth={2}
            fill="url(#phpe-prob-fill)"
            dot={{ fill: "var(--cyan)", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--cyan)", strokeWidth: 0 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
