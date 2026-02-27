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
      {/* Glow de fondo */}
      <ellipse cx="100" cy="120" rx="70" ry="18" fill="var(--cyan)" fillOpacity="0.06" />

      {/* Barras del chart */}
      <rect x="28" y="88" width="22" height="32" rx="3" fill="var(--violet)" fillOpacity="0.25" stroke="var(--violet)" strokeOpacity="0.5" strokeWidth="1" />
      <rect x="58" y="68" width="22" height="52" rx="3" fill="var(--cyan)" fillOpacity="0.2" stroke="var(--cyan)" strokeOpacity="0.5" strokeWidth="1" />
      <rect x="88" y="52" width="22" height="68" rx="3" fill="var(--cyan)" fillOpacity="0.3" stroke="var(--cyan)" strokeOpacity="0.7" strokeWidth="1" />
      <rect x="118" y="72" width="22" height="48" rx="3" fill="var(--violet)" fillOpacity="0.2" stroke="var(--violet)" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="148" y="84" width="22" height="36" rx="3" fill="var(--violet)" fillOpacity="0.15" stroke="var(--violet)" strokeOpacity="0.35" strokeWidth="1" />

      {/* Línea de tendencia */}
      <path
        d="M39 84 L69 62 L99 46 L129 68 L159 80"
        stroke="var(--cyan)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 3"
        opacity="0.7"
      />

      {/* Puntos en la línea */}
      <circle cx="39" cy="84" r="3.5" fill="var(--cyan)" opacity="0.9" />
      <circle cx="99" cy="46" r="4.5" fill="var(--cyan)" opacity="1" />
      <circle cx="159" cy="80" r="3.5" fill="var(--cyan)" opacity="0.9" />

      {/* Círculo central con signo de interrogación */}
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

      {/* Línea base */}
      <line x1="20" y1="120" x2="180" y2="120" stroke="var(--border-bright)" strokeWidth="1" />

      {/* Destellos decorativos */}
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
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {/* Ilustración */}
      <div className="mb-6 fade-up">
        <HeroIllustration />
      </div>

      {/* Título y subtítulo */}
      <div className="mb-8 fade-up fade-up-delay-1">
        <h2 className="font-display font-extrabold text-[28px] text-foreground mb-2 tracking-wide">
          NO MARKETS YET
        </h2>
        <p className="font-body text-sm text-text-secondary max-w-sm leading-relaxed">
          Be the first to create a prediction market on PraesagiumChain.
          <br />
          Stake ETH, predict outcomes, earn rewards.
        </p>
      </div>

      {/* Pasos */}
      <div className="mb-8 w-full max-w-md fade-up fade-up-delay-2">
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-2 rounded-md border p-3",
                "bg-surface",
                step.border
              )}
            >
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", step.bg, step.color)}>
                {step.icon}
              </span>
              <span className={cn("font-mono text-[11px] font-medium", step.color)}>
                {step.label}
              </span>
              <span className="font-body text-[11px] text-text-muted leading-tight">
                {step.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-center gap-3 fade-up fade-up-delay-3">
        <Link
          href="/markets/create"
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-6 py-3 font-display font-bold text-[15px] tracking-wide",
            "bg-gradient-to-r from-cyan to-violet text-black",
            "hover:opacity-90 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all duration-200"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          CREATE FIRST MARKET
        </Link>
        <Link
          href="/signals"
          className={cn(
            "inline-flex items-center gap-2 rounded-md border border-border-bright px-5 py-3 font-body text-sm text-text-secondary",
            "hover:border-cyan/40 hover:text-foreground transition-colors duration-200"
          )}
        >
          View Signals →
        </Link>
      </div>
    </div>
  );
}
