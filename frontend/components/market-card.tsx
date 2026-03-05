"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MarketView } from "@/types/api";
import { useCountdown, formatCountdownDisplay } from "@/components/countdown";
import { truncateAddress, formatEth } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { BET_TOKENS } from "@/lib/constants";

function getTokenFromMetadata(metadata?: string): { icon: string; symbol: string; color: string } | null {
  try {
    const m = metadata ? JSON.parse(metadata) : {};
    const sym: string = (m.betToken ?? "").toUpperCase();
    if (!sym) return null;
    const token = BET_TOKENS.find((t) => t.symbol === sym);
    return token ?? null;
  } catch {
    return null;
  }
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-open",
  Locked: "badge-locked",
  Resolved: "badge-resolved",
  Cancelled: "badge-cancelled",
};

const URGENT_THRESHOLD_SEC = 3600;

function addressToGradient(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  const h2 = (h + 120) % 360;
  return `linear-gradient(135deg, hsl(${h}, 70%, 55%), hsl(${h2}, 70%, 45%))`;
}

export interface MarketCardProps {
  market: MarketView;
  /** If > 70, show gold star before creator */
  creatorReputation?: number;
  /** Highlight matching text in the question */
  searchQuery?: string;
}

/** Splits `text` around `query` and wraps matches in a cyan <mark> */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-transparent text-cyan font-semibold not-italic"
            style={{ textDecoration: "underline", textDecorationColor: "var(--cyan)" }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function MarketCard({ market, creatorReputation, searchQuery = "" }: MarketCardProps) {
  const countdown = useCountdown(market.close_time);
  const [barMounted, setBarMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setBarMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const totalStake = Number(market.total_yes_stake) + Number(market.total_no_stake);
  const yesPct = totalStake > 0 ? (Number(market.total_yes_stake) / totalStake) * 100 : 50;
  const noPct = 100 - yesPct;

  const isUrgent = !countdown.expired && countdown.totalSeconds < URGENT_THRESHOLD_SEC;
  const yesWei = BigInt(Math.floor(Number(market.total_yes_stake)));
  const noWei = BigInt(Math.floor(Number(market.total_no_stake)));

  const statusClass = STATUS_BADGE_CLASS[market.status] ?? "badge-cancelled";
  const showStar = creatorReputation != null && creatorReputation > 70;
  const betToken = getTokenFromMetadata(market.metadata);

  return (
    <Link
      href={`/markets/${market.id}`}
      className={cn(
        "group block w-full min-h-[200px] rounded-md border border-border bg-surface p-5",
        "transition-all duration-200 ease-out",
        "hover:border-border-bright hover:shadow-[0_0_0_1px_var(--border-bright),0_0_24px_var(--cyan-dim),0_8px_32px_var(--shadow-card)] hover:-translate-y-0.5"
      )}
      aria-label={`View market: ${market.question}`}
    >
      {/* ROW 1 — Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 font-mono text-[11px] uppercase shrink-0",
              statusClass
            )}
            aria-label={`Status: ${market.status}`}
          >
            {market.status}
          </span>
          {betToken && (
            <span
              className="flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold shrink-0"
              style={{ borderColor: `${betToken.color}60`, color: betToken.color, background: `${betToken.color}14` }}
              title={`Bet with ${betToken.symbol}`}
            >
              <span className="text-xs leading-none">{betToken.icon}</span>
              {betToken.symbol}
            </span>
          )}
        </div>
        {market.creator && (
          <div className="flex items-center gap-1.5 shrink-0 min-w-0">
            {showStar && (
              <span className="text-gold text-sm leading-none" aria-hidden>★</span>
            )}
            <div
              className="h-6 w-6 shrink-0 rounded"
              style={{ background: addressToGradient(market.creator) }}
              aria-hidden
            />
            <span className="font-mono text-xs text-text-muted truncate">
              {truncateAddress(market.creator)}
            </span>
          </div>
        )}
      </div>

      {/* ROW 2 — Question */}
      <h3 className="mt-3 font-body font-medium text-[15px] text-foreground line-clamp-2 leading-snug">
        <HighlightedText text={market.question} query={searchQuery} />
      </h3>

      {/* ROW 3 — Stakes */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-green shrink-0">
            YES {formatEth(yesWei)}
          </span>
          <div className="flex-1 h-2.5 min-w-0 rounded-full bg-elevated overflow-hidden flex">
            <div
              className="h-full shrink-0 bg-green transition-[width] duration-[800ms] ease-out rounded-l-full"
              style={{ width: barMounted ? `${yesPct}%` : "0%" }}
            />
            <div
              className="h-full shrink-0 bg-red transition-[width] duration-[800ms] ease-out rounded-r-full"
              style={{ width: barMounted ? `${noPct}%` : "0%" }}
            />
          </div>
          <span className="font-mono text-xs text-red shrink-0">
            NO {formatEth(noWei)}
          </span>
        </div>
      </div>

      {/* ROW 4 — Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-text-secondary shrink-0" role="status">
          {countdown.expired ? (
            <span className="text-text-muted">Closed</span>
          ) : isUrgent ? (
            <span className="urgent-pulse">
              ⚡ {countdown.totalSeconds < 60 ? "<1m" : `${Math.ceil(countdown.totalSeconds / 60)}m`} left
            </span>
          ) : (
            <>⏱ {formatCountdownDisplay(countdown)}</>
          )}
        </span>
        {market.latest_prediction != null ? (
          <span className="font-mono text-xs text-violet shrink-0">
            ◈ AI {Math.round(market.latest_prediction.probability * 100)}%
          </span>
        ) : (
          <span className="flex-1" />
        )}
        {/* On-chain indicator */}
        {market.creator ? (
          <span className="flex items-center gap-1 font-mono text-[10px] text-green shrink-0" title="Deployed on-chain">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            On-chain
          </span>
        ) : (
          <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400 shrink-0" title="Backend only — not deployed on-chain">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Off-chain
          </span>
        )}
        <span className="shrink-0 font-mono text-xs text-text-secondary group-hover:text-cyan transition-colors">
          View <span className="inline-block group-hover:translate-x-0.5 transition-transform">→</span>
        </span>
      </div>
    </Link>
  );
}
