"use client";

import dynamic from "next/dynamic";
import { BarChart2, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const TVChart = dynamic(
  () => import("@/components/tv-chart").then((m) => ({ default: m.TVChart })),
  { ssr: false }
);

export interface LiveContextPreviewProps {
  category: "crypto" | "general" | "sports" | "weather";
  /** For crypto: symbol to show in the price chart (e.g. BTCUSDT). When not set, defaults to BTCUSDT. */
  chartSymbol?: string;
  /** Optional question text for future news/sentiment query. */
  question?: string;
  className?: string;
}

/**
 * Real-time contextual preview when choosing market category.
 * - Crypto: mini price chart for the chosen (or default) symbol.
 * - Sports / Weather / General: placeholder for live news/sentiment feed (API coming later).
 */
export function LiveContextPreview({
  category,
  chartSymbol,
  question,
  className,
}: LiveContextPreviewProps) {
  const symbol = category === "crypto" ? (chartSymbol ?? "BTCUSDT") : undefined;

  if (category === "crypto" && symbol) {
    return (
      <section
        className={cn("rounded-xl border border-border bg-elevated/30 overflow-hidden", className)}
        aria-label="Live price context"
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <BarChart2 className="h-4 w-4 text-cyan" aria-hidden />
          <span className="font-mono text-xs font-semibold text-foreground">
            Live price: {symbol.replace("USDT", "/USDT")}
          </span>
        </div>
        <div className="p-2">
          <TVChart
            symbol={symbol}
            timeframe="1h"
            height={220}
            className="rounded-lg"
          />
        </div>
        <p className="px-4 pb-3 font-mono text-[10px] text-text-muted">
          This chart will be shown on the market page. News and social sentiment can be added in the resolution step.
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-elevated/30 p-4",
        className
      )}
      aria-label="Live context placeholder"
    >
      <div className="flex items-center gap-2 mb-2">
        <Newspaper className="h-4 w-4 text-violet" aria-hidden />
        <span className="font-mono text-xs font-semibold text-foreground">
          Live news and sentiment
        </span>
      </div>
      <p className="font-body text-sm text-text-secondary mb-3">
        Live news and sentiment for this topic will appear here once connected to X, Reddit, or news sources. You can paste context from social or news in the resolution step.
      </p>
      {question && question.length >= 10 && (
        <p className="font-mono text-[10px] text-text-muted">
          Topic: &quot;{question.slice(0, 60)}{question.length > 60 ? "…" : ""}&quot;
        </p>
      )}
    </section>
  );
}
