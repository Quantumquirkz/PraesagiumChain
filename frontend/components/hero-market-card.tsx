"use client";

import { useState, useCallback } from "react";
import { ProbabilityBar } from "@/components/probability-bar";
import { PHPESignal } from "@/components/phpe-signal";

export interface HeroMarketCardData {
  id: string;
  category: string;
  question: string;
  yesPct: number;
  noPct: number;
  phpSignal: string;
  phpConfidence: number;
  yesOdds: number;
  noOdds: number;
  pool: string;
  participants: number;
  timeLeft: string;
}

interface HeroMarketCardProps {
  market: HeroMarketCardData;
  /** Enable market transition animation */
  animate?: boolean;
}

export function HeroMarketCard({ market, animate = true }: HeroMarketCardProps) {
  const [amount, setAmount] = useState(0.1);

  const incAmount = useCallback(
    () => setAmount((a) => Math.min(10, Math.round((a + 0.1) * 100) / 100)),
    []
  );
  const decAmount = useCallback(
    () => setAmount((a) => Math.max(0.01, Math.round((a - 0.1) * 100) / 100)),
    []
  );

  return (
    <div
      className={animate ? "hero-market-enter" : ""}
      role="article"
      aria-label={`Market: ${market.question}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md border border-border bg-elevated/50 px-2 py-0.5 font-body text-[10px] text-text-secondary">
          {market.category}
        </span>
        <span className="font-mono text-[10px] text-text-muted">
          Closes in {market.timeLeft}
        </span>
      </div>

      <p className="mb-4 font-body text-sm font-medium text-foreground leading-snug">
        &quot;{market.question}&quot;
      </p>

      <ProbabilityBar initialYesPct={market.yesPct} animate />

      <PHPESignal
        signal={market.phpSignal}
        confidence={market.phpConfidence}
        tooltip="Based on 847 on-chain data points"
      />

      {/* BettingArea */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg border border-cyan/50 bg-cyan-dim/30 py-2 font-mono text-[11px] font-medium text-cyan transition-all duration-200 hover:scale-[1.02] hover:bg-cyan-dim hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
            style={{ boxShadow: "0 0 12px rgba(0,212,255,0.1)" }}
          >
            YES — {market.yesOdds}x
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border border-red/50 bg-red-dim/30 py-2 font-mono text-[11px] font-medium text-red transition-all duration-200 hover:scale-[1.02] hover:bg-red-dim hover:shadow-[0_0_20px_rgba(255,61,90,0.3)]"
            style={{ boxShadow: "0 0 12px rgba(255,61,90,0.1)" }}
          >
            NO — {market.noOdds}x
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={decAmount}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-elevated font-mono text-sm text-foreground transition-colors hover:border-border-bright"
            aria-label="Decrease amount"
          >
            −
          </button>
          <input
            type="text"
            readOnly
            value={`${amount} ETH`}
            className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-center font-mono text-sm text-foreground"
            aria-label="Amount in ETH"
          />
          <button
            type="button"
            onClick={incAmount}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-elevated font-mono text-sm text-foreground transition-colors hover:border-border-bright"
            aria-label="Increase amount"
          >
            +
          </button>
        </div>
      </div>

      {/* MarketStats */}
      <div className="flex flex-wrap gap-4 border-t border-border pt-3 font-mono text-[10px] text-text-muted">
        <span>💰 Pool: {market.pool}</span>
        <span>👥 {market.participants} participants</span>
        <span>⏱ {market.timeLeft} left</span>
      </div>
    </div>
  );
}
