"use client";

import { useState, useEffect } from "react";
import { HeroMarketCard } from "@/components/hero-market-card";
import type { HeroMarketCardData } from "@/components/hero-market-card";

// Demo data

const DEMO_MARKETS: HeroMarketCardData[] = [
  {
    id: "1",
    category: "🏛️ Politics",
    question: "Will ETH surpass $4,000 before March 15?",
    yesPct: 67,
    noPct: 33,
    phpSignal: "BULLISH",
    phpConfidence: 89,
    yesOdds: 1.49,
    noOdds: 2.87,
    pool: "12.4 ETH",
    participants: 234,
    timeLeft: "2h 34m",
  },
  {
    id: "2",
    category: "📈 Crypto",
    question: "Will BTC hit $100K by end of Q2 2025?",
    yesPct: 58,
    noPct: 42,
    phpSignal: "BULLISH",
    phpConfidence: 82,
    yesOdds: 1.72,
    noOdds: 2.18,
    pool: "8.2 ETH",
    participants: 156,
    timeLeft: "1d 12h",
  },
  {
    id: "3",
    category: "🤖 AI",
    question: "Will an AI agent pass AGI benchmark in 2025?",
    yesPct: 35,
    noPct: 65,
    phpSignal: "BEARISH",
    phpConfidence: 76,
    yesOdds: 2.86,
    noOdds: 1.35,
    pool: "5.1 ETH",
    participants: 89,
    timeLeft: "4d 8h",
  },
];

const LIVE_FEED_ITEMS = [
  "● New stake: 0.5 ETH on YES · 2s ago",
  "● Market #12 resolved YES · 5m ago",
  "● 1.2 ETH staked on NO · 12s ago",
  "● PHPE: ±6% uncertainty update · 1m ago",
  "● Market #7 closes in 1h · just now",
];

// ─── Componente principal ─────────────────────────────────────────────────────

export function HeroDemoPanel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedIndex, setFeedIndex] = useState(0);

  const market = DEMO_MARKETS[activeIndex];

  // Live feed ticker cada 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex((i) => (i + 1) % LIVE_FEED_ITEMS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative overflow-hidden md:rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(0,245,255,0.15)",
        borderRadius: 16,
        backdropFilter: "blur(12px)",
        padding: "1.25rem",
        boxShadow:
          "0 0 60px rgba(0,245,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      aria-label="Panel demo interactivo"
    >
      {/* Scroll container on mobile (fixed height 420px), no scroll on md+ */}
      <div className="hero-demo-panel-scroll flex h-[420px] min-h-0 flex-col overflow-y-auto overflow-x-hidden md:h-auto md:min-h-0 md:overflow-visible">
        {/* Header */}
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-green"
              style={{ boxShadow: "0 0 8px var(--green)" }}
              aria-hidden
            />
            <span className="font-mono text-[11px] font-medium text-cyan uppercase tracking-widest">
              Live Markets
            </span>
            <span
              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] text-amber-400 uppercase"
              title="Sample data for illustration"
            >
              Demo
            </span>
          </div>
          <span
            className="rounded-full border border-violet/40 bg-violet-dim px-2.5 py-1 font-mono text-[10px] font-medium text-violet"
            style={{ boxShadow: "0 0 12px rgba(139,92,246,0.15)" }}
          >
            PHPE AI
          </span>
        </div>
        <div className="mb-4 h-px shrink-0 bg-border" aria-hidden />

        {/* MarketCard principal — transición opacity + translateY al cambiar */}
        <div key={market.id} className="shrink-0">
          <HeroMarketCard market={market} animate />
        </div>

        {/* Navegación mini-cards */}
        <div className="mt-4 flex shrink-0 gap-2">
          {DEMO_MARKETS.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`
                flex-1 truncate rounded-xl border px-2 py-2 text-left transition-all
                ${activeIndex === i
                  ? "border-cyan bg-cyan-dim/30"
                  : "border-border bg-elevated/30 hover:border-border-bright"
                }
              `}
              style={
                activeIndex === i
                  ? { boxShadow: "0 0 12px rgba(0,212,255,0.15)" }
                  : undefined
              }
              aria-label={`Ver demo: ${m.question}`}
              aria-pressed={activeIndex === i}
            >
              <span className="block font-body text-[9px] text-text-muted">
                {m.category}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[10px] text-foreground">
                {m.question.slice(0, 28)}…
              </span>
              <span className="mt-0.5 block font-mono text-[9px] text-cyan">
                YES {m.yesPct}%
              </span>
            </button>
          ))}
        </div>

        {/* Live feed ticker */}
        <div
          className="mt-4 shrink-0 overflow-hidden rounded border border-border/50 bg-elevated/30 px-3 py-2"
          aria-live="polite"
          aria-label="Live feed"
        >
          <div
            key={feedIndex}
            className="animate-in fade-in slide-in-from-bottom-2 font-mono text-[10px] text-text-secondary duration-300"
            style={{ animationFillMode: "both" }}
          >
            {LIVE_FEED_ITEMS[feedIndex]}
          </div>
        </div>
      </div>
    </div>
  );
}
