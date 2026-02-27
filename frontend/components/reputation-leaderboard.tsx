"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Trophy, TrendingUp, Users } from "lucide-react";
import { getLeaderboard } from "@/lib/api";
import type { CreatorReputation } from "@/types/api";
import { cn } from "@/lib/utils";

function getLevelBadge(score: number): { label: string; className: string } {
  if (score >= 0.8) {
    return {
      label: "Oráculo",
      className: "border-cyan/40 bg-cyan-dim text-cyan",
    };
  }
  if (score >= 0.5) {
    return {
      label: "Experto",
      className: "border-violet/40 bg-violet-dim text-violet",
    };
  }
  return {
    label: "Novato",
    className: "border-border bg-elevated text-text-muted",
  };
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ReputationRow({
  entry,
  rank,
}: {
  entry: CreatorReputation;
  rank: number;
}) {
  const badge = getLevelBadge(entry.reputation_score);
  const accuracy =
    entry.markets_resolved > 0
      ? Math.round((entry.correct_predictions / entry.markets_resolved) * 100)
      : null;

  return (
    <Link
      href={`/reputation/${entry.creator_address}`}
      className="group flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-elevated"
    >
      <span
        className={cn(
          "w-6 shrink-0 text-center font-mono text-sm font-bold",
          rank === 1
            ? "text-amber-400"
            : rank === 2
            ? "text-slate-300"
            : rank === 3
            ? "text-amber-600"
            : "text-text-muted"
        )}
      >
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground group-hover:text-cyan transition-colors">
            {shortAddress(entry.creator_address)}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
              badge.className
            )}
          >
            {badge.label}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 font-mono text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {entry.markets_created} creados
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {entry.markets_resolved} resueltos
          </span>
          {accuracy != null && (
            <span className="text-green-400">{accuracy}% precisión</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-bold text-foreground">
          {Math.round(entry.reputation_score * 100)}
        </div>
        <div className="font-mono text-[10px] text-text-muted">score</div>
      </div>
    </Link>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 animate-pulse"
        >
          <div className="h-4 w-6 rounded bg-elevated" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 rounded bg-elevated" />
            <div className="h-3 w-28 rounded bg-elevated" />
          </div>
          <div className="h-8 w-10 rounded bg-elevated" />
        </div>
      ))}
    </div>
  );
}

export function ReputationLeaderboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard(20),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Trophy className="h-4 w-4 text-amber-400" />
        <h2 className="font-display font-bold text-[13px] tracking-widest text-text-muted uppercase">
          Leaderboard de Creadores
        </h2>
      </div>

      <div className="p-2">
        {isLoading && <LeaderboardSkeleton />}

        {isError && (
          <p className="py-6 text-center font-mono text-xs text-text-muted">
            No se pudo cargar el leaderboard
          </p>
        )}

        {data && data.length === 0 && (
          <p className="py-6 text-center font-mono text-xs text-text-muted">
            Aún no hay creadores registrados
          </p>
        )}

        {data && data.length > 0 && (
          <div className="space-y-0.5">
            {data.map((entry, i) => (
              <ReputationRow key={entry.creator_address} entry={entry} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
