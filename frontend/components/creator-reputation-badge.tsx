"use client";

import { useQuery } from "@tanstack/react-query";
import { getReputation } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const TIER_CONFIG = {
  gold: {
    color: "#F5A623",
    label: "🥇 Gold",
    glow: "0 0 12px rgba(245,166,35,0.4)",
    border: "rgba(245,166,35,0.35)",
  },
  silver: {
    color: "#9CA3AF",
    label: "🥈 Silver",
    glow: "0 0 12px rgba(156,163,175,0.3)",
    border: "rgba(156,163,175,0.3)",
  },
  bronze: {
    color: "#CD7F32",
    label: "🥉 Bronze",
    glow: "0 0 12px rgba(205,127,50,0.3)",
    border: "rgba(205,127,50,0.3)",
  },
} as const;

type Tier = keyof typeof TIER_CONFIG;

function getTier(score: number): Tier {
  if (score >= 80) return "gold";
  if (score >= 50) return "silver";
  return "bronze";
}

export function CreatorReputationBadge({ address }: { address: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reputation", address],
    queryFn: () => getReputation(address),
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) return <Skeleton className="h-16 w-full rounded-md" />;
  if (!data) return null;

  const tier = getTier(data.reputation_score);
  const cfg = TIER_CONFIG[tier];
  const initials = address.slice(2, 4).toUpperCase();

  return (
    <a
      href={`/reputation/${address}`}
      className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-elevated"
      aria-label={`View reputation for ${address.slice(0, 6)}...${address.slice(-4)}`}
    >
      {/* Avatar hexagonal con glow de tier */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-display font-bold text-sm"
        style={{
          background: "var(--elevated)",
          border: `1px solid ${cfg.border}`,
          boxShadow: cfg.glow,
          color: cfg.color,
        }}
        aria-hidden
      >
        {initials}
      </div>

      <div className="min-w-0 flex flex-col gap-0.5">
        {/* Dirección truncada */}
        <span className="font-mono text-xs text-foreground">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>

        {/* Tier + score */}
        <span className="font-mono text-[11px]" style={{ color: cfg.color }}>
          {cfg.label} · Score: {data.reputation_score}
        </span>

        {/* Mini stats */}
        <span className="font-mono text-[10px] text-text-muted">
          {data.markets_created} created · {data.correct_predictions} correct
        </span>
      </div>
    </a>
  );
}
