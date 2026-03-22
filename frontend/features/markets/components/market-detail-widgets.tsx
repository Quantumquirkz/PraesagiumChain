"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { PredictionView } from "@/types/api";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePHPEPrediction } from "@/features/markets/hooks/use-phpe-prediction";
import { useAIAnalysis } from "@/features/markets/hooks/use-ai-analysis";
import { UncertaintyBar } from "@/components/uncertainty-bar";
import { ModelVerifier } from "@/components/model-verifier";

export function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: "cyan" | "green" | "red" | "violet";
}) {
  const accentClasses = {
    cyan: "text-cyan border-cyan/20 bg-cyan/5",
    green: "text-green border-green/20 bg-green/5",
    red: "text-red border-red/20 bg-red/5",
    violet: "text-violet border-violet/20 bg-violet/5",
  };
  return (
    <div className={cn("rounded-xl border p-3 space-y-1", accentClasses[accent])}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider opacity-70">
        {icon}
        {label}
      </div>
      <p className="font-display font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[11px] text-text-muted">{label}</span>
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}

export function TimelineBar({ closeUnix, resolveUnix }: { closeUnix: number; resolveUnix: number }) {
  const now = Math.floor(Date.now() / 1000);
  const total = resolveUnix - closeUnix;
  const elapsed = now - closeUnix;
  const pct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;
  const isBeforeClose = now < closeUnix;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between font-mono text-[10px] text-text-muted">
        <span>Close</span>
        <span>Resolve</span>
      </div>
      <div className="relative h-1 w-full rounded-full bg-elevated overflow-hidden">
        {!isBeforeClose && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan to-violet transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-text-muted">
        <span>{new Date(closeUnix * 1000).toLocaleDateString()}</span>
        <span>{new Date(resolveUnix * 1000).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export function AIAnalysisBlock({
  marketId,
  binanceSymbol,
}: {
  marketId: number;
  binanceSymbol: string;
}) {
  const [sentimentText, setSentimentText] = useState("");
  const { mutate: generate, data, isPending, error } = useAIAnalysis(marketId);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Textarea
          placeholder="Optional: paste news, tweets or social context to enrich the analysis..."
          value={sentimentText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSentimentText(e.target.value)}
          className="font-mono text-xs min-h-[60px] bg-elevated border-border resize-none flex-1"
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            generate({
              sentimentText: sentimentText.trim() || undefined,
              binanceSymbol,
            })
          }
          disabled={isPending}
          className="border-violet text-violet hover:bg-violet-dim font-display font-bold tracking-widest h-9 shrink-0"
          aria-label="Generate AI analysis"
          title="Generate AI analysis"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" aria-hidden />
              Generating…
            </>
          ) : (
            "Generate AI analysis"
          )}
        </Button>
      </div>
      {error && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3" role="alert">
          <p className="font-mono text-xs text-amber-200">
            {error instanceof Error ? error.message : "Error generating analysis"}
          </p>
          {error instanceof Error && /429|quota|RESOURCE_EXHAUSTED|límite/i.test(error.message) && (
            <p className="mt-2 font-mono text-[11px] text-amber-200/80">
              Wait 1–2 minutes and click «Generate AI analysis» again.
            </p>
          )}
        </div>
      )}
      {data && !isPending && (
        <div className="rounded-lg border border-violet/20 bg-violet-dim/30 p-4 space-y-4">
          <div>
            <p className="font-mono text-[10px] text-violet uppercase tracking-widest mb-1.5">AI analysis</p>
            <p className="font-body text-sm text-foreground leading-relaxed">{data.analysis}</p>
          </div>
          <div className="border-t border-border/50 pt-3">
            <p className="font-mono text-[10px] text-violet uppercase tracking-widest mb-1.5">Information sources</p>
            <p className="font-body text-sm text-text-secondary leading-relaxed">{data.description}</p>
          </div>
          <p className="font-mono text-[9px] text-text-muted italic">
            Generated from market data, price data (Binance, Chainlink) and news/social context.
          </p>
        </div>
      )}
    </div>
  );
}

const BINANCE_SYMBOLS_PHPE = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;

function PHPEResult({ probability, uncertainty }: { probability: number; uncertainty?: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const target = probability * 100;
    let current = 0;
    let rafId: number;
    const step = () => {
      current = Math.min(current + 2, target);
      setDisplayed(current);
      if (current < target) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [probability]);

  const low = uncertainty != null ? Math.max(0, probability - uncertainty) * 100 : null;
  const high = uncertainty != null ? Math.min(1, probability + uncertainty) * 100 : null;
  const isPositive = displayed >= 50;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-baseline gap-2">
        <span className={cn("font-mono text-3xl font-bold tabular-nums", isPositive ? "text-green" : "text-red")}>
          {displayed.toFixed(1)}%
        </span>
        {uncertainty != null && <span className="font-mono text-sm text-violet">± {(uncertainty * 100).toFixed(1)}%</span>}
        <span
          className={cn(
            "ml-auto font-display font-bold text-xs rounded-full px-2 py-0.5",
            isPositive ? "bg-green-dim text-green" : "bg-red-dim text-red"
          )}
        >
          {isPositive ? "YES likely" : "NO likely"}
        </span>
      </div>
      <div
        className="relative h-2.5 w-full rounded-full bg-surface overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(displayed)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {low != null && high != null && (
          <div
            className="absolute top-0 h-full rounded-sm"
            style={{
              left: `${low}%`,
              width: `${high - low}%`,
              background: "var(--violet-dim)",
              border: "1px solid var(--violet)",
              transition: "all 0.5s ease",
            }}
            aria-hidden
          />
        )}
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${displayed}%`,
            background: isPositive ? "var(--green)" : "var(--red)",
            transition: "width 0.05s linear",
          }}
          aria-hidden
        />
      </div>
      <p className="font-mono text-[10px] text-text-muted italic">Model: PHPE v2 · Not stored on-chain</p>
    </div>
  );
}

export function PHPEWidget({ marketId }: { marketId: number }) {
  const [sentimentText, setSentimentText] = useState("");
  const [binanceSymbol, setBinanceSymbol] = useState("ETHUSDT");
  const [useChainlink, setUseChainlink] = useState(true);
  const { mutate: predict, data, isPending, error, reset } = usePHPEPrediction(marketId);

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block font-mono text-[11px] text-text-muted uppercase tracking-widest">
          Sentiment context (optional)
        </label>
        <Textarea
          placeholder="Paste news, tweet, or any text context..."
          value={sentimentText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSentimentText(e.target.value)}
          className="font-mono text-sm min-h-[64px] bg-elevated border-border resize-none"
          disabled={isPending}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={binanceSymbol} onValueChange={setBinanceSymbol} disabled={isPending}>
          <SelectTrigger className="font-mono text-xs bg-elevated border-border h-8 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BINANCE_SYMBOLS_PHPE.map((s) => (
              <SelectItem key={s} value={s} className="font-mono text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useChainlink}
            onChange={(e) => setUseChainlink(e.target.checked)}
            disabled={isPending}
            className="h-3.5 w-3.5 accent-cyan"
          />
          <span className="font-mono text-xs text-text-muted">Chainlink</span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            reset();
            predict({ sentimentText: sentimentText.trim() || undefined, binanceSymbol, useChainlink });
          }}
          disabled={isPending}
          className="ml-auto border-violet text-violet hover:bg-violet-dim font-display font-bold tracking-widest h-8 px-3 text-xs"
          aria-label="Get AI prediction"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" aria-hidden />
              Analyzing…
            </>
          ) : (
            "ANALYZE"
          )}
        </Button>
      </div>
      {error && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3" role="alert">
          <p className="font-mono text-xs text-amber-200">{error instanceof Error ? error.message : "Prediction failed"}</p>
          {error instanceof Error && /429|quota|RESOURCE_EXHAUSTED|límite/i.test(error.message) && (
            <p className="mt-2 font-mono text-[11px] text-amber-200/80">Wait 1–2 minutes and click ANALYZE again.</p>
          )}
        </div>
      )}
      {data && !isPending && <PHPEResult probability={data.probability} uncertainty={data.uncertainty} />}
    </div>
  );
}

export function PredictionRow({ p }: { p: PredictionView }) {
  return (
    <div className="rounded-lg border border-border bg-elevated/50 p-3 space-y-2">
      <UncertaintyBar probability={p.probability} uncertainty={p.uncertainty} label="PHPE Probability" />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-text-muted">{formatRelativeTime(p.timestamp)}</p>
        {(p.model_version || p.model_hash) && <ModelVerifier modelVersion={p.model_version} modelHash={p.model_hash} />}
      </div>
    </div>
  );
}
