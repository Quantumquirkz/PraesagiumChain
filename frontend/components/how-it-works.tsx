"use client";

import { PlusCircle, Coins, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    number: "01",
    icon: PlusCircle,
    title: "Create a Market",
    description:
      "Deploy a binary prediction question on-chain with a 4-step wizard. Set the resolution source, timeline, and initial stake.",
    accent: "violet" as const,
  },
  {
    number: "02",
    icon: Coins,
    title: "Place Your Bet",
    description:
      "Stake ETH on YES or NO. Use commit-reveal for private bets. Your position is recorded immutably on Ethereum Sepolia.",
    accent: "green" as const,
  },
  {
    number: "03",
    icon: Brain,
    title: "AI Predicts",
    description:
      "The PHPE engine fuses 6 real-time data sources — Binance, Chainlink, Kraken, and more — into a single probability score.",
    accent: "cyan" as const,
  },
  {
    number: "04",
    icon: CheckCircle2,
    title: "Claim Winnings",
    description:
      "When the market resolves on-chain, winners claim their proportional share of the total pool. Transparent and trustless.",
    accent: "gold" as const,
  },
] as const;

const ACCENT_CLASSES = {
  violet: {
    icon: "text-violet bg-violet-dim",
    number: "text-violet",
    border: "border-violet/30",
    connector: "bg-violet/20",
  },
  green: {
    icon: "text-green bg-green-dim",
    number: "text-green",
    border: "border-green/30",
    connector: "bg-green/20",
  },
  cyan: {
    icon: "text-cyan bg-cyan-dim",
    number: "text-cyan",
    border: "border-cyan/30",
    connector: "bg-cyan/20",
  },
  gold: {
    icon: "text-gold bg-[rgba(245,166,35,0.12)]",
    number: "text-gold",
    border: "border-gold/30",
    connector: "bg-gold/20",
  },
} as const;

interface HowItWorksProps {
  className?: string;
}

export function HowItWorks({ className }: HowItWorksProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: horizontal timeline */}
      <div className="hidden md:grid md:grid-cols-4 md:gap-0 relative">
        {/* Connector line behind cards */}
        <div
          className="absolute top-[52px] left-[12.5%] right-[12.5%] h-px"
          style={{
            background:
              "linear-gradient(90deg, var(--violet), var(--green), var(--cyan), var(--gold))",
            opacity: 0.25,
          }}
          aria-hidden
        />

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const ac = ACCENT_CLASSES[step.accent];
          return (
            <div
              key={step.number}
              className={cn("flex flex-col items-center text-center px-4 fade-up")}
              style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}
            >
              {/* Icon circle */}
              <div
                className={cn(
                  "relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full border",
                  ac.icon,
                  ac.border
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
              </div>

              {/* Step number */}
              <span className={cn("mt-4 font-mono text-[11px] font-medium tracking-widest", ac.number)}>
                {step.number}
              </span>

              {/* Title */}
              <h3 className="mt-1.5 font-display font-bold text-[18px] text-foreground leading-tight">
                {step.title}
              </h3>

              {/* Description */}
              <p className="mt-2 font-body text-sm text-text-secondary leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical timeline */}
      <div className="flex flex-col gap-0 md:hidden">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const ac = ACCENT_CLASSES[step.accent];
          const isLast = i === STEPS.length - 1;
          return (
            <div key={step.number} className="flex gap-4">
              {/* Left: icon + connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border",
                    ac.icon,
                    ac.border
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                </div>
                {!isLast && (
                  <div
                    className="w-px flex-1 mt-1"
                    style={{
                      background:
                        "linear-gradient(180deg, var(--border-bright), transparent)",
                      minHeight: 32,
                    }}
                    aria-hidden
                  />
                )}
              </div>

              {/* Right: content */}
              <div className={cn("pb-8", isLast && "pb-0")}>
                <span className={cn("font-mono text-[11px] font-medium tracking-widest", ac.number)}>
                  {step.number}
                </span>
                <h3 className="mt-0.5 font-display font-bold text-[17px] text-foreground leading-tight">
                  {step.title}
                </h3>
                <p className="mt-1.5 font-body text-sm text-text-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
