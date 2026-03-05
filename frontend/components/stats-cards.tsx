"use client";

import { useEffect, useState, useRef } from "react";
import type { MarketStats } from "@/types/api";
import { cn } from "@/lib/utils";

const DURATION_MS = 1500;

function useCountUp(end: number, enabled: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setValue(end);
      return;
    }
    setValue(0);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      const easeOut = 1 - (1 - progress) ** 2;
      setValue(Math.round(end * easeOut));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(end);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, enabled]);

  return value;
}

function IconGridDots({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className={className} aria-hidden>
      <circle cx="3" cy="3" r="1.2" />
      <circle cx="11" cy="3" r="1.2" />
      <circle cx="3" cy="11" r="1.2" />
      <circle cx="11" cy="11" r="1.2" />
    </svg>
  );
}

function IconPulsingCircle({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={className} aria-hidden>
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-pulse" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M2 7l3 3 7-7" />
    </svg>
  );
}

function IconBrain({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 2c-1.5 0-2.5 1-2.5 2.5 0 1 .5 1.8 1.2 2.3-.4.2-.7.6-.7 1 0 .6.5 1 1 1 .3 0 .5-.1.7-.3.2.5.6.8 1.1.8.6 0 1-.4 1-1 0-.4-.3-.8-.7-1 .7-.5 1.2-1.3 1.2-2.3C9.5 3 8.5 2 7 2z" />
      <path d="M4.5 6v2M9.5 6v2M6 4.5v1M8 4.5v1" />
    </svg>
  );
}

const CARDS: {
  key: keyof MarketStats;
  label: string;
  subtext: (stats: MarketStats | null) => string;
  icon: React.ReactNode;
  accentClass: string;
  iconBgClass: string;
  numberClass?: string;
  staggerClass: string;
  highlight?: boolean;
}[] = [
  {
    key: "total_markets",
    label: "Total Markets",
    subtext: () => "Across all statuses",
    icon: <IconGridDots className="w-[18px] h-[18px]" />,
    accentClass: "text-foreground",
    iconBgClass: "bg-elevated",
    staggerClass: "fade-up fade-up-delay-1",
  },
  {
    key: "open_markets",
    label: "Open Markets",
    subtext: () => "Accepting bets",
    icon: <IconPulsingCircle className="w-[18px] h-[18px]" />,
    accentClass: "text-green",
    iconBgClass: "bg-green-dim",
    numberClass: "text-green",
    staggerClass: "fade-up fade-up-delay-2",
    highlight: true,
  },
  {
    key: "resolved_markets",
    label: "Resolved",
    subtext: (stats) => (stats ? `${stats.total_markets ? Math.round((stats.resolved_markets / stats.total_markets) * 100) : 0}% of total` : "Outcome decided"),
    icon: <IconCheck className="w-[18px] h-[18px]" />,
    accentClass: "text-cyan",
    iconBgClass: "bg-cyan-dim",
    staggerClass: "fade-up fade-up-delay-3",
  },
  {
    key: "total_predictions",
    label: "Total Predictions",
    subtext: () => "AI + user predictions",
    icon: <IconBrain className="w-[18px] h-[18px]" />,
    accentClass: "text-violet",
    iconBgClass: "bg-violet-dim",
    staggerClass: "fade-up fade-up-delay-4",
  },
];

interface StatCardProps {
  label: string;
  value: number;
  subtext: string;
  icon: React.ReactNode;
  accentClass: string;
  iconBgClass: string;
  numberClass?: string;
  enabled: boolean;
  staggerClass: string;
  highlight?: boolean;
}

function StatCard({ label, value, subtext, icon, accentClass, iconBgClass, numberClass, enabled, staggerClass, highlight }: StatCardProps) {
  const displayValue = useCountUp(value, enabled);
  return (
    <div
      className={cn(
        "card-glow rounded-md",
        highlight && "card-gradient-border",
        staggerClass
      )}
      style={{ padding: "20px 24px" }}
      role="article"
      aria-label={`${label}: ${displayValue}`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className={cn("shrink-0 rounded-full p-2", iconBgClass, accentClass)}>{icon}</span>
        <span className="font-body font-medium text-[11px] uppercase tracking-[0.1em] text-text-muted">
          {label}
        </span>
      </div>
      <p className={cn("font-display font-extrabold text-[36px] num-mono tabular-nums", numberClass ?? "text-foreground")}>
        {displayValue.toLocaleString()}
      </p>
      <p className="mt-1 font-body text-xs text-text-secondary">
        {subtext}
      </p>
    </div>
  );
}

interface StatsCardsProps {
  stats: MarketStats | undefined;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const enabled = !isLoading && stats != null;
  return (
    <section
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      aria-label="Market statistics"
    >
      {CARDS.map((card) => (
        <StatCard
          key={card.key}
          label={card.label}
          value={stats?.[card.key] ?? 0}
          subtext={card.subtext(stats ?? null)}
          icon={card.icon}
          accentClass={card.accentClass}
          iconBgClass={card.iconBgClass}
          numberClass={card.numberClass}
          enabled={enabled}
          staggerClass={card.staggerClass}
          highlight={card.highlight}
        />
      ))}
    </section>
  );
}
