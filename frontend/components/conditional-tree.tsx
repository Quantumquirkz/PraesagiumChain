"use client";

import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { GitBranch, Loader2 } from "lucide-react";
import { getMarketConditions, getMarket } from "@/lib/api";
import type { ConditionalConditionView, MarketView } from "@/types/api";
import { cn } from "@/lib/utils";

interface ConditionalTreeProps {
  marketId: number;
  className?: string;
}

function ConditionNode({
  condition,
  market,
  isLoading,
  isLast,
}: {
  condition: ConditionalConditionView;
  market: MarketView | undefined;
  isLoading: boolean;
  isLast: boolean;
}) {
  const isResolved = market?.status === "Resolved";
  const outcome = market?.outcome;
  const expectedMet =
    isResolved &&
    outcome?.toLowerCase() === condition.expected_outcome.toLowerCase();
  const expectedFailed =
    isResolved &&
    outcome?.toLowerCase() !== condition.expected_outcome.toLowerCase();

  let statusIcon = "⏳";
  let statusColor = "text-amber-400";
  let statusText = "Pendiente";

  if (isLoading) {
    statusIcon = "…";
    statusColor = "text-text-muted";
    statusText = "Cargando";
  } else if (expectedMet) {
    statusIcon = "✅";
    statusColor = "text-green-400";
    statusText = "Resuelto: SÍ";
  } else if (expectedFailed) {
    statusIcon = "❌";
    statusColor = "text-red-400";
    statusText = `Resuelto: ${outcome}`;
  } else if (market?.status === "Locked") {
    statusIcon = "🔒";
    statusColor = "text-violet";
    statusText = "Cerrado";
  }

  return (
    <div className="flex items-start gap-1.5 font-mono text-xs">
      <span className="text-text-muted shrink-0 pt-0.5">{isLast ? "└──" : "├──"}</span>
      <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className={statusColor}>{statusIcon}</span>
        <Link
          href={`/markets/${condition.condition_market_id}`}
          className="text-cyan hover:underline underline-offset-2"
        >
          Mercado #{condition.condition_market_id}
        </Link>
        {market && (
          <span className="text-text-muted truncate max-w-[200px]" title={market.question}>
            {market.question.length > 40
              ? market.question.slice(0, 40) + "…"
              : market.question}
          </span>
        )}
        <span className="text-text-muted">
          Esperado:{" "}
          <span
            className={cn(
              "font-bold",
              condition.expected_outcome === "Yes" ? "text-green-400" : "text-red-400"
            )}
          >
            {condition.expected_outcome}
          </span>
        </span>
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
        ) : (
          <span className={cn("font-bold", statusColor)}>→ {statusText}</span>
        )}
      </div>
    </div>
  );
}

export function ConditionalTree({ marketId, className }: ConditionalTreeProps) {
  const conditionsQuery = useQueries({
    queries: [
      {
        queryKey: ["market-conditions", marketId],
        queryFn: () => getMarketConditions(marketId),
        staleTime: 30_000,
        refetchInterval: 20_000,
      },
    ],
  });

  const conditionsResult = conditionsQuery[0];
  const conditions: ConditionalConditionView[] = conditionsResult.data ?? [];

  const marketQueries = useQueries({
    queries: conditions.map((c) => ({
      queryKey: ["market", c.condition_market_id],
      queryFn: () => getMarket(c.condition_market_id),
      staleTime: 30_000,
      refetchInterval: 20_000,
      enabled: conditions.length > 0,
    })),
  });

  if (conditionsResult.isLoading) {
    return (
      <div className={cn("flex items-center gap-2 py-3 font-mono text-xs text-text-muted", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando condiciones…
      </div>
    );
  }

  if (conditionsResult.isError || conditions.length === 0) {
    return null;
  }

  const allMet = marketQueries.every((q, i) => {
    const market = q.data;
    const condition = conditions[i];
    return (
      market?.status === "Resolved" &&
      market.outcome?.toLowerCase() === condition?.expected_outcome.toLowerCase()
    );
  });

  const anyFailed = marketQueries.some((q, i) => {
    const market = q.data;
    const condition = conditions[i];
    return (
      market?.status === "Resolved" &&
      market.outcome?.toLowerCase() !== condition?.expected_outcome.toLowerCase()
    );
  });

  return (
    <div className={cn("rounded-md border border-border bg-surface p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-violet" />
        <span className="font-display font-bold text-[13px] tracking-widest text-text-muted uppercase">
          Árbol de Condiciones
        </span>
        {allMet && (
          <span className="rounded-full border border-green-400/30 bg-green-400/10 px-2 py-0.5 font-mono text-[10px] text-green-400">
            Todas cumplidas
          </span>
        )}
        {anyFailed && (
          <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-mono text-[10px] text-red-400">
            Condición fallida
          </span>
        )}
      </div>

      <div className="space-y-1 pl-2">
        {conditions.map((condition, i) => (
          <ConditionNode
            key={condition.id}
            condition={condition}
            market={marketQueries[i]?.data}
            isLoading={marketQueries[i]?.isLoading ?? false}
            isLast={i === conditions.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
