"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

function HeroIllustration() {
  return (
    <svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Background glow */}
      <ellipse cx="100" cy="120" rx="70" ry="18" fill="var(--cyan)" fillOpacity="0.06" />

      {/* Chart bars */}
      <rect x="28" y="88" width="22" height="32" rx="3" fill="var(--violet)" fillOpacity="0.25" stroke="var(--violet)" strokeOpacity="0.5" strokeWidth="1" />
      <rect x="58" y="68" width="22" height="52" rx="3" fill="var(--cyan)" fillOpacity="0.2" stroke="var(--cyan)" strokeOpacity="0.5" strokeWidth="1" />
      <rect x="88" y="52" width="22" height="68" rx="3" fill="var(--cyan)" fillOpacity="0.3" stroke="var(--cyan)" strokeOpacity="0.7" strokeWidth="1" />
      <rect x="118" y="72" width="22" height="48" rx="3" fill="var(--violet)" fillOpacity="0.2" stroke="var(--violet)" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="148" y="84" width="22" height="36" rx="3" fill="var(--violet)" fillOpacity="0.15" stroke="var(--violet)" strokeOpacity="0.35" strokeWidth="1" />

      {/* Trend line */}
      <path
        d="M39 84 L69 62 L99 46 L129 68 L159 80"
        stroke="var(--cyan)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 3"
        opacity="0.7"
      />

      {/* Points on the line */}
      <circle cx="39" cy="84" r="3.5" fill="var(--cyan)" opacity="0.9" />
      <circle cx="99" cy="46" r="4.5" fill="var(--cyan)" opacity="1" />
      <circle cx="159" cy="80" r="3.5" fill="var(--cyan)" opacity="0.9" />

      {/* Central circle with question mark */}
      <circle cx="99" cy="46" r="14" fill="var(--bg-elevated)" stroke="var(--cyan)" strokeWidth="1.5" strokeOpacity="0.8" />
      <text
        x="99"
        y="51"
        textAnchor="middle"
        fill="var(--cyan)"
        fontSize="14"
        fontWeight="700"
        fontFamily="var(--font-mono), monospace"
      >
        ?
      </text>

      {/* Base line */}
      <line x1="20" y1="120" x2="180" y2="120" stroke="var(--border-bright)" strokeWidth="1" />

      {/* Decorative highlights */}
      <circle cx="172" cy="36" r="2" fill="var(--cyan)" opacity="0.5" />
      <circle cx="24" cy="52" r="1.5" fill="var(--violet)" opacity="0.6" />
      <circle cx="185" cy="70" r="1.5" fill="var(--green)" opacity="0.5" />
    </svg>
  );
}

const STEPS = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    label: "Create a market",
    desc: "Pose a yes/no question with a deadline",
    color: "text-cyan",
    bg: "bg-cyan-dim",
    border: "border-cyan/20",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    label: "Place your bet",
    desc: "Stake ETH on YES or NO",
    color: "text-violet",
    bg: "bg-violet-dim",
    border: "border-violet/20",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Claim your winnings",
    desc: "Get paid when the market resolves",
    color: "text-green",
    bg: "bg-green-dim",
    border: "border-green/20",
  },
];

export function NoMarkets({
  className,
  description,
}: {
  className?: string;
  description?: string;
}) {
  const isFiltered = !!description;

  if (isFiltered) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-elevated border border-border-bright" aria-hidden>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">No results</h2>
        <p className="font-body text-sm text-text-secondary max-w-xs">{description}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-14 px-6 text-center", className)}>
      {/* Illustration */}
      <div className="mb-8 fade-up">
        <HeroIllustration />
      </div>

      {/* Title and subtitle */}
      <div className="mb-10 fade-up fade-up-delay-1">
        <h2 className="font-display font-extrabold text-3xl sm:text-[32px] text-foreground mb-3 tracking-wide">
          NO MARKETS YET
        </h2>
        <p className="font-body text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
          Be the first to create a prediction market on PraesagiumChain.
          <br />
          Stake ETH, predict outcomes, earn rewards.
        </p>
      </div>

      {/* Steps — wider grid and cards that fill the space */}
      <div className="mb-10 w-full max-w-3xl fade-up fade-up-delay-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border p-5 sm:p-6",
                "bg-surface",
                step.border
              )}
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", step.bg, step.color)}>
                {step.icon}
              </span>
              <span className={cn("font-mono text-xs font-medium", step.color)}>
                {step.label}
              </span>
              <span className="font-body text-xs text-text-muted leading-snug">
                {step.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA — friendlier buttons: rounded, same size, secondary with soft background */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 fade-up fade-up-delay-3">
        <Link
          href="/markets/create"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-body font-semibold text-[15px]",
            "bg-gradient-to-r from-cyan to-violet text-white",
            "hover:opacity-95 hover:shadow-[0_4px_20px_rgba(0,212,255,0.25)] active:scale-[0.98] transition-all duration-200"
          )}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Create first market
        </Link>
        <Link
          href="/signals"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-body font-semibold text-sm",
            "bg-elevated border border-border-bright text-foreground",
            "hover:border-violet/40 hover:bg-violet-dim/50 transition-colors duration-200 active:scale-[0.98]"
          )}
        >
          View Signals
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
