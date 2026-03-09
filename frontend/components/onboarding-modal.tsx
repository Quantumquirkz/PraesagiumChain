"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARDED_KEY = "pc_onboarded";

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function IllustrationWallet() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="8" y="20" width="48" height="32" rx="4" stroke="var(--cyan)" strokeWidth="1.5" fill="none" />
      <path d="M8 28h48" stroke="var(--cyan)" strokeWidth="1.5" />
      <rect x="36" y="34" width="14" height="10" rx="2" stroke="var(--violet)" strokeWidth="1.5" fill="var(--violet-dim)" />
      <circle cx="43" cy="39" r="2" fill="var(--violet)" />
      <path d="M16 14h24a4 4 0 014 4H12a4 4 0 014-4z" stroke="var(--cyan)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function IllustrationMarket() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Chart bars */}
      <rect x="10" y="38" width="8" height="14" rx="1" fill="var(--green-dim)" stroke="var(--green)" strokeWidth="1.2" />
      <rect x="22" y="28" width="8" height="24" rx="1" fill="var(--cyan-dim)" stroke="var(--cyan)" strokeWidth="1.2" />
      <rect x="34" y="20" width="8" height="32" rx="1" fill="var(--violet-dim)" stroke="var(--violet)" strokeWidth="1.2" />
      <rect x="46" y="32" width="8" height="20" rx="1" fill="var(--green-dim)" stroke="var(--green)" strokeWidth="1.2" />
      {/* Trend line */}
      <path d="M14 36L26 26L38 18L50 30" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" />
      {/* Axis */}
      <path d="M8 54h48M8 14v40" stroke="var(--border-bright)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationBet() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* YES bar */}
      <rect x="8" y="24" width="22" height="16" rx="8" fill="var(--green-dim)" stroke="var(--green)" strokeWidth="1.5" />
      <text x="19" y="35" textAnchor="middle" fontFamily="monospace" fontSize="9" fill="var(--green)" fontWeight="bold">YES</text>
      {/* NO bar */}
      <rect x="34" y="24" width="22" height="16" rx="8" fill="var(--red-dim)" stroke="var(--red)" strokeWidth="1.5" />
      <text x="45" y="35" textAnchor="middle" fontFamily="monospace" fontSize="9" fill="var(--red)" fontWeight="bold">NO</text>
      {/* ETH coin */}
      <circle cx="32" cy="48" r="8" stroke="var(--cyan)" strokeWidth="1.5" fill="var(--cyan-dim)" />
      <path d="M32 42l-4 6 4 2.5 4-2.5-4-6zM28 48l4 2.5 4-2.5" stroke="var(--cyan)" strokeWidth="1" strokeLinecap="round" />
      {/* Arrow down */}
      <path d="M32 16v6M29 20l3 3 3-3" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IllustrationClaim() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Trophy */}
      <path d="M22 12h20v18a10 10 0 01-20 0V12z" stroke="var(--gold)" strokeWidth="1.5" fill="rgba(245,166,35,0.1)" />
      <path d="M22 18H14a6 6 0 006 6M42 18h8a6 6 0 01-6 6" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 30v8M26 38h12" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Check badge */}
      <circle cx="46" cy="46" r="10" fill="var(--green-dim)" stroke="var(--green)" strokeWidth="1.5" />
      <path d="M41 46l3 3 6-6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Mini preview panels ──────────────────────────────────────────────────────

function PreviewWallet() {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3 text-center">
      <div className="inline-flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan-dim px-3 py-1.5">
        <span className="font-body text-xs font-medium text-foreground">Connect Wallet</span>
      </div>
      <p className="mt-2 font-mono text-[10px] text-text-muted">MetaMask · WalletConnect · Coinbase</p>
    </div>
  );
}

function PreviewMarket() {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
      {[
        { q: "Will BTC hit $150k?",  yes: 68, status: "open"     },
        { q: "ETH merge v2 in 2025?", yes: 45, status: "open"    },
      ].map((m) => (
        <div key={m.q} className="flex items-center gap-2">
          <span className="font-body text-[10px] text-text-secondary truncate flex-1">{m.q}</span>
          <div className="flex gap-1 shrink-0">
            <span className="font-mono text-[10px] text-green">{m.yes}%</span>
            <span className="font-mono text-[10px] text-text-muted">/</span>
            <span className="font-mono text-[10px] text-red">{100 - m.yes}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewBet() {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3">
      <p className="font-mono text-[10px] text-text-muted mb-2">Will BTC hit $150k?</p>
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border border-green/40 bg-green-dim py-1.5 text-center">
          <span className="font-mono text-xs font-bold text-green">YES</span>
          <p className="font-mono text-[10px] text-green/70">68%</p>
        </div>
        <div className="flex-1 rounded-lg border border-red/40 bg-red-dim py-1.5 text-center">
          <span className="font-mono text-xs font-bold text-red">NO</span>
          <p className="font-mono text-[10px] text-red/70">32%</p>
        </div>
      </div>
    </div>
  );
}

function PreviewClaim() {
  return (
    <div className="rounded-xl border border-green/20 bg-green-dim p-3 text-center">
      <p className="font-mono text-[10px] text-green uppercase tracking-widest mb-1">Market Resolved</p>
      <p className="font-display font-bold text-[18px] text-green">+0.42 ETH</p>
      <p className="font-mono text-[10px] text-text-muted mt-1">Claimable winnings</p>
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    illustration: <IllustrationWallet />,
    preview: <PreviewWallet />,
    title: "Connect your wallet",
    description: "Link MetaMask, WalletConnect, or Coinbase Wallet to get started on Ethereum Sepolia.",
  },
  {
    illustration: <IllustrationMarket />,
    preview: <PreviewMarket />,
    title: "Browse prediction markets",
    description: "Explore binary YES/NO questions on real-world events, powered by AI probability signals.",
  },
  {
    illustration: <IllustrationBet />,
    preview: <PreviewBet />,
    title: "Place your bet",
    description: "Stake ETH on the outcome you believe in. Use commit-reveal for private bets.",
  },
  {
    illustration: <IllustrationClaim />,
    preview: <PreviewClaim />,
    title: "Claim your winnings",
    description: "When the market resolves on-chain, claim your proportional share of the pool.",
  },
];

// ─── Modal ────────────────────────────────────────────────────────────────────

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = window.localStorage.getItem(ONBOARDED_KEY);
    if (!done) setOpen(true);
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s: number) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDED_KEY, "true");
    }
    setOpen(false);
    setStep(0);
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setStep(0);
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[480px] border-0 bg-surface p-0 overflow-hidden card-gradient-border rounded-xl"
        overlayClassName="fixed inset-0 z-50 backdrop-blur-sm bg-[var(--overlay-bg)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        showClose={false}
        aria-describedby="onboarding-description"
        aria-labelledby="onboarding-title"
      >
        {/* Progress bar */}
        <div className="h-1 w-full bg-elevated" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          <div
            className="h-full rounded-full bg-cyan transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="font-mono text-xs text-text-muted">
            {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </span>
          <DialogClose asChild>
            <button
              type="button"
              onClick={handleSkip}
              className="font-mono text-[12px] text-text-muted hover:text-foreground transition-colors"
              aria-label="Skip onboarding"
            >
              Skip
            </button>
          </DialogClose>
        </div>

        {/* Content */}
        <div id="onboarding-description" className="px-6 pt-4 pb-2">
          <div className="flex flex-col items-center text-center">
            {/* SVG Illustration */}
            <div
              className="mb-4 flex h-[80px] w-[80px] items-center justify-center rounded-2xl border border-border-bright bg-elevated"
              aria-hidden
            >
              {current.illustration}
            </div>

            <h2
              id="onboarding-title"
              className="font-display font-bold text-[20px] text-foreground leading-tight"
            >
              {current.title}
            </h2>
            <p className="mt-2 font-body text-[13px] text-text-secondary max-w-[340px] leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Mini preview */}
          <div className="mt-5">
            {current.preview}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex items-center justify-between">
          {/* Dot indicators */}
          <div className="flex gap-1.5" role="tablist" aria-label="Onboarding steps">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Step ${i + 1}`}
                aria-current={step === i ? "step" : undefined}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  step === i ? "w-5 bg-cyan" : "w-1.5 bg-border-bright hover:bg-text-muted"
                )}
              />
            ))}
          </div>

          <Button
            onClick={isLast ? handleFinish : handleNext}
            className="font-body font-medium text-sm"
            aria-label={isLast ? "Let's go" : "Next step"}
          >
            {isLast ? "Let's go →" : "Next →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
