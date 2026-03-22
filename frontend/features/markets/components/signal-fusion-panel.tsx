"use client";

import { useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignalFusion, type SignalFusionParams } from "@/features/markets/hooks/use-signal-fusion";
import { cn } from "@/lib/utils";

interface SignalFusionPanelProps {
  defaultParams?: SignalFusionParams;
  className?: string;
}

function SignalRow({
  label,
  weight,
  probability,
  isLast,
}: {
  label: string;
  weight: number;
  probability: number | null;
  isLast?: boolean;
}) {
  const pct = probability != null ? Math.round(probability * 100) : null;
  const weightPct = Math.round(weight * 100);

  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center">
        <div className="h-3 w-px bg-border" />
        <span className="font-mono text-[11px] text-text-muted">{isLast ? "└──" : "├──"}</span>
        {!isLast && <div className="flex-1 w-px bg-border" />}
      </div>
      <div className="flex flex-1 items-center justify-between gap-2 pb-1 font-mono text-xs">
        <span className="text-text-secondary min-w-0 truncate">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-text-muted">{weightPct}%</span>
          <span className="text-text-muted">→</span>
          {pct != null ? (
            <span
              className={cn(
                "font-bold",
                pct >= 60 ? "text-green-400" : pct <= 40 ? "text-red-400" : "text-amber-400"
              )}
            >
              {pct}%
            </span>
          ) : (
            <span className="text-text-muted italic">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function SignalFusionPanel({ defaultParams, className }: SignalFusionPanelProps) {
  const [params] = useState<SignalFusionParams>(
    defaultParams ?? { binanceSymbol: "BTCUSDT" }
  );
  const { state, isPending, recalculate } = useSignalFusion();

  const hybridPct =
    state?.hybrid.probability != null
      ? Math.round(state.hybrid.probability * 100)
      : null;

  return (
    <div className={cn("rounded-xl border border-border bg-surface", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet" />
          <span className="font-display font-bold text-[13px] tracking-widest text-text-muted uppercase">
            Signal Fusion
          </span>
        </div>
        {hybridPct != null && (
          <span className="font-mono text-sm font-bold text-foreground">
            Hybrid prediction:{" "}
            <span
              className={cn(
                hybridPct >= 60 ? "text-green-400" : hybridPct <= 40 ? "text-red-400" : "text-amber-400"
              )}
            >
              {hybridPct}%
            </span>
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {!state && !isPending && (
          <p className="font-mono text-xs text-text-muted text-center py-2">
            Press Recalculate to see the signal breakdown
          </p>
        )}

        {isPending && (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="h-3 w-8 rounded bg-elevated" />
                <div className="h-3 flex-1 rounded bg-elevated" />
                <div className="h-3 w-10 rounded bg-elevated" />
              </div>
            ))}
          </div>
        )}

        {state && !isPending && (
          <div className="font-mono text-xs">
            <div className="flex items-center gap-2 pb-1">
              <span className="text-text-muted">Hybrid prediction:</span>
              <span className="font-bold text-foreground">
                {hybridPct}%
              </span>
              {state.hybrid.uncertainty != null && (
                <span className="text-violet text-[11px]">
                  ±{Math.round(state.hybrid.uncertainty * 100)}%
                </span>
              )}
            </div>
            <SignalRow
              label={`${state.phpe.label}`}
              weight={state.weights.phpe}
              probability={state.phpe.probability}
            />
            <SignalRow
              label={state.sentiment.label}
              weight={state.weights.sentiment}
              probability={state.sentiment.probability}
            />
            <SignalRow
              label={state.price.label}
              weight={state.weights.price}
              probability={state.price.probability}
              isLast
            />
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 border-border font-mono text-xs hover:border-violet hover:text-violet"
          onClick={() => recalculate(params)}
          disabled={isPending}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
          {isPending ? "Calculating…" : "Recalculate"}
        </Button>

        <p className="font-mono text-[10px] text-text-muted text-center">
          Weights: PHPE {Math.round(state?.weights.phpe ?? 0.35 * 100)}% · Sentiment {Math.round(state?.weights.sentiment ?? 0.40 * 100)}% · Price {Math.round(state?.weights.price ?? 0.25 * 100)}%
        </p>
      </div>
    </div>
  );
}
