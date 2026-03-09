"use client";

import { cn } from "@/lib/utils";

interface UncertaintyBarProps {
  probability: number;
  uncertainty?: number | null;
  label?: string;
  className?: string;
}

export function UncertaintyBar({
  probability,
  uncertainty,
  label,
  className,
}: UncertaintyBarProps) {
  const pct = Math.round(probability * 100);
  const unc = uncertainty != null ? Math.round(uncertainty * 100) : null;
  const lowerPct = unc != null ? Math.max(0, pct - unc) : null;
  const upperPct = unc != null ? Math.min(100, pct + unc) : null;
  const highUncertainty = unc != null && unc > 30;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-text-muted">{label ?? "Probabilidad"}</span>
        <div className="flex items-center gap-2">
          {unc != null && (
            <span className="text-violet text-[11px]">
              ±{unc}%
            </span>
          )}
          <span className="text-foreground font-bold">{pct}%</span>
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-elevated">
        {/* Banda de incertidumbre (zona difuminada) */}
        {lowerPct != null && upperPct != null && (
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: `${lowerPct}%`,
              width: `${upperPct - lowerPct}%`,
              background:
                "linear-gradient(90deg, transparent 0%, var(--violet) 30%, var(--violet) 70%, transparent 100%)",
              opacity: 0.25,
            }}
          />
        )}
        {/* Barra sólida de probabilidad */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "var(--cyan)",
          }}
        />
      </div>

      {lowerPct != null && upperPct != null && (
        <div className="flex justify-between font-mono text-[10px] text-text-muted">
          <span>{lowerPct}%</span>
          <span>{upperPct}%</span>
        </div>
      )}

      {highUncertainty && (
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
          <span className="text-amber-400 text-[10px]">⚠</span>
          <span className="font-mono text-[11px] text-amber-400">
            High uncertainty — insufficient data
          </span>
        </div>
      )}
    </div>
  );
}
