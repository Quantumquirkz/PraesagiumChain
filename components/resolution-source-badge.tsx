"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export type ResolutionSourceType = "binance" | "weather" | "sports";

export interface ResolutionSourceBadgeProps {
  type: ResolutionSourceType;
  /** e.g. "BTC ≥ $50,000" for binance, or full label override */
  label: string;
  /** Tooltip body: how resolution works */
  tooltip?: string;
  className?: string;
}

const CONFIG: Record<
  ResolutionSourceType,
  { bgClass: string; icon: React.ReactNode; defaultTooltip: string }
> = {
  binance: {
    bgClass: "bg-cyan-dim border-cyan/40 text-cyan",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
        <path d="M3 18v-6h18v6M3 12l4-6 5 4 5-6 5 4" />
      </svg>
    ),
    defaultTooltip: "The market resolves automatically when the Binance price feed meets the condition (e.g. BTC ≥ $50,000) at the resolution time.",
  },
  weather: {
    bgClass: "bg-violet-dim border-violet/40 text-violet",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        <path d="M12 6v6l4 2" />
        <path d="M16 14c-.5 2-2.5 3-4.5 3s-4-1-4.5-3" />
      </svg>
    ),
    defaultTooltip: "The outcome is determined by an external Weather API at the resolution time (e.g. rain in city X on date Y).",
  },
  sports: {
    bgClass: "bg-green-dim border-green/40 text-green",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v4l3 3" />
      </svg>
    ),
    defaultTooltip: "The market resolves based on the official result from a Sports API (e.g. winner of match X).",
  },
};

function getDisplayLabel(type: ResolutionSourceType, label: string): string {
  const prefix =
    type === "binance" ? "Resolves via Binance: " :
    type === "weather" ? "Resolves via Weather API" :
    "Resolves via Sports API";
  if (type === "binance" && label) return `${prefix}${label}`;
  if (type === "weather" || type === "sports") return label || prefix;
  return label || prefix;
}

export function ResolutionSourceBadge({ type, label, tooltip, className }: ResolutionSourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const config = CONFIG[type];
  const displayLabel = getDisplayLabel(type, label);
  const tooltipText = tooltip ?? config.defaultTooltip;

  return (
    <span
      ref={ref}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px]",
        config.bgClass,
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="img"
      aria-label={displayLabel}
    >
      {config.icon}
      <span>{displayLabel}</span>
      {tooltipText && (
        <>
          <span className="sr-only">{tooltipText}</span>
          {showTooltip && (
            <span
              className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 max-w-[280px] rounded-md border border-border-bright bg-elevated px-3 py-2 text-[12px] font-body text-foreground shadow-lg whitespace-normal"
              role="tooltip"
            >
              {tooltipText}
            </span>
          )}
        </>
      )}
    </span>
  );
}
