"use client";

import { useState } from "react";
import {
  Lock,
  Eye,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCommitReveal } from "@/features/markets/hooks/use-commit-reveal";
import { usePrivateMarketCommitCount, usePrivateTotalCommitted } from "@/features/markets/hooks/use-private-markets";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";

interface CommitRevealWizardProps {
  marketId: number;
  className?: string;
}

const OUTCOME_OPTIONS = [
  {
    value: 1,
    label: "YES",
    className:
      "border-green/40 bg-green-dim text-green hover:bg-green/20",
  },
  {
    value: 2,
    label: "NO",
    className:
      "border-red/40 bg-red-dim text-red hover:bg-red/20",
  },
] as const;

// ─── Step indicator ───────────────────────────────────────────────────────────

type StepState = "pending" | "active" | "done";

function StepDot({
  number,
  label,
  state,
}: {
  number: string;
  label: string;
  state: StepState;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] font-bold transition-colors",
          state === "done" &&
            "border-green bg-green-dim text-green",
          state === "active" &&
            "border-cyan bg-cyan-dim text-cyan",
          state === "pending" &&
            "border-border bg-elevated text-text-muted"
        )}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" /> : number}
      </div>
      <span
        className={cn(
          "font-mono text-[10px] uppercase tracking-widest",
          state === "active" ? "text-cyan" : state === "done" ? "text-green" : "text-text-muted"
        )}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export function CommitRevealWizard({ marketId, className }: CommitRevealWizardProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<number>(1);
  const [amount, setAmount] = useState("");
  const [manualNonce, setManualNonce] = useState("");
  const [nonceCopied, setNonceCopied] = useState(false);

  const { address } = useAccount();

  const {
    state,
    isConfirmingCommit,
    isConfirmingReveal,
    isConfirmingClaim,
    startCommit,
    executeCommit,
    startReveal,
    executeReveal,
    startClaim,
    executeClaim,
    hasSavedNonce,
  } = useCommitReveal(marketId);

  const { count: commitCount } = usePrivateMarketCommitCount(
    marketId,
    address as `0x${string}` | undefined
  );
  const { totalCommittedEth } = usePrivateTotalCommitted(marketId);

  const handleCopyNonce = async () => {
    if (!state.nonce) return;
    await navigator.clipboard.writeText(state.nonce);
    setNonceCopied(true);
    setTimeout(() => setNonceCopied(false), 2000);
  };

  const isIdle = state.step === "idle";
  const isCommitPhase = state.step === "commit" || state.step === "committing";
  const isCommitted = state.step === "committed";
  const isRevealPhase = state.step === "reveal" || state.step === "revealing";
  const isDone = state.step === "done";
  const isClaimPhase = state.step === "claiming";
  const isClaimed = state.step === "claimed";

  const isBusy =
    state.step === "committing" ||
    state.step === "revealing" ||
    state.step === "claiming" ||
    isConfirmingCommit ||
    isConfirmingReveal ||
    isConfirmingClaim;

  // Derive step states for the indicator
  const commitStepState: StepState =
    isCommitPhase || isIdle ? "active" : "done";
  const revealStepState: StepState =
    isIdle || isCommitPhase || isCommitted
      ? "pending"
      : isRevealPhase || isDone
      ? "active"
      : isDone || isClaimPhase || isClaimed
      ? "done"
      : "pending";
  const claimStepState: StepState =
    isClaimPhase ? "active" : isClaimed ? "done" : "pending";

  return (
    <div className={cn("rounded-xl border border-border bg-surface", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Lock className="h-4 w-4 text-violet" />
        <span className="font-display font-bold text-[13px] tracking-widest text-text-muted uppercase">
          Private Bet
        </span>
        <span className="ml-auto rounded-full border border-violet/30 bg-violet-dim px-2 py-0.5 font-mono text-[10px] text-violet">
          Commit-Reveal
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Pool size */}
        {parseFloat(totalCommittedEth) > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-border-bright bg-elevated px-3 py-2">
            <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
              Hidden Pool
            </span>
            <span className="font-mono text-sm font-bold text-violet">
              {parseFloat(totalCommittedEth).toFixed(4)} ETH
            </span>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <StepDot number="1" label="Commit" state={commitStepState} />
          <div className="flex-1 h-px bg-border" aria-hidden />
          <StepDot number="2" label="Reveal" state={revealStepState} />
          <div className="flex-1 h-px bg-border" aria-hidden />
          <StepDot number="3" label="Claim" state={claimStepState} />
        </div>

        {/* ── Idle ── */}
        {isIdle && (
          <div className="space-y-3">
            <p className="font-body text-sm text-text-secondary">
              Private bets use commit-reveal cryptography to hide your position
              until the market closes. No one can see your choice before resolution.
            </p>
            <div className="rounded-lg border border-violet/20 bg-violet-dim px-3 py-2">
              <p className="font-mono text-[11px] text-violet">
                Powered by Chainlink Confidential Compute architecture
              </p>
            </div>
            <Button
              className="w-full font-mono text-sm bg-secondary text-primary-foreground border-none hover:opacity-90"
              onClick={startCommit}
            >
              <Lock className="mr-2 h-4 w-4" />
              Start Private Bet
            </Button>
          </div>
        )}

        {/* ── Step 1: Commit ── */}
        {isCommitPhase && (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="font-mono text-[11px] text-amber-400">
                  Save your nonce somewhere safe. Without it you cannot reveal your bet.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                Your prediction
              </label>
              <div className="flex gap-2">
                {OUTCOME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedOutcome(opt.value)}
                    className={cn(
                      "flex-1 rounded-md border py-2 font-display font-bold text-sm transition-all",
                      selectedOutcome === opt.value
                        ? opt.className
                        : "border-border bg-elevated text-text-muted hover:border-border-bright"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                Amount (ETH)
              </label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <Button
              className="w-full font-mono text-sm bg-primary text-primary-foreground border-none hover:opacity-90"
              onClick={() =>
                executeCommit(selectedOutcome, amount || "0.01", commitCount)
              }
              disabled={isBusy || !amount}
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting commit…
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Confirm Commit
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── Commit confirmed — show nonce ── */}
        {isCommitted && state.nonce && (
          <div className="space-y-3">
            <div className="rounded-md border border-green/30 bg-green-dim p-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green" />
                <span className="font-mono text-xs text-green font-bold">
                  Commit recorded on-chain
                </span>
                {state.index != null && (
                  <span className="ml-auto font-mono text-[10px] text-text-muted">
                    index #{state.index}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
                  Your secret nonce
                </p>
                <div className="flex items-center gap-2 rounded border border-border bg-elevated px-2 py-1.5">
                  <code className="flex-1 break-all font-mono text-[10px] text-cyan">
                    {state.nonce}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyNonce}
                    className="shrink-0 text-text-muted hover:text-foreground"
                    aria-label="Copy nonce"
                  >
                    {nonceCopied ? (
                      <Check className="h-3.5 w-3.5 text-green" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="font-mono text-[10px] text-amber-400">
                ⚠ Copy and save this nonce. It was also saved in your browser automatically.
              </p>
            </div>

            <Button
              className="w-full font-mono text-sm bg-secondary text-primary-foreground border-none hover:opacity-90"
              onClick={startReveal}
            >
              <Eye className="mr-2 h-4 w-4" />
              Go to Reveal Step
            </Button>
          </div>
        )}

        {/* ── Step 2: Reveal ── */}
        {isRevealPhase && (
          <div className="space-y-3">
            <p className="font-body text-sm text-text-secondary">
              The market has closed. Reveal your bet to register your stake and
              claim your payout if you won.
            </p>

            {!hasSavedNonce() && (
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                  Manual nonce (if not saved)
                </label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={manualNonce}
                  onChange={(e) => setManualNonce(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            )}

            {hasSavedNonce() && (
              <div className="flex items-center gap-2 rounded-md border border-green/20 bg-green-dim px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-green shrink-0" />
                <span className="font-mono text-xs text-green">
                  Nonce found in your browser
                </span>
              </div>
            )}

            <Button
              className="w-full font-mono text-sm bg-primary text-primary-foreground border-none hover:opacity-90"
              onClick={() => executeReveal(manualNonce || undefined)}
              disabled={isBusy}
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revealing…
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Reveal Bet
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── Reveal done — prompt claim ── */}
        {isDone && (
          <div className="space-y-3">
            <div className="rounded-md border border-green/30 bg-green-dim p-3 text-center space-y-1">
              <ShieldCheck className="mx-auto h-6 w-6 text-green" />
              <p className="font-display font-bold text-sm text-green">
                Reveal complete
              </p>
              <p className="font-mono text-xs text-text-secondary">
                Your bet has been revealed. If you won, claim your payout below.
              </p>
            </div>
            <Button
              className="w-full font-mono text-sm bg-[var(--gold)] text-primary-foreground border-none hover:opacity-90"
              onClick={startClaim}
            >
              <Trophy className="mr-2 h-4 w-4" />
              Claim Payout
            </Button>
          </div>
        )}

        {/* ── Step 3: Claim ── */}
        {isClaimPhase && (
          <div className="space-y-3">
            <p className="font-body text-sm text-text-secondary">
              Claiming your proportional share of the committed pool.
            </p>
            <Button
              className="w-full font-mono text-sm bg-[var(--gold)] text-primary-foreground border-none hover:opacity-90"
              onClick={executeClaim}
              disabled={isBusy}
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming…
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Confirm Claim
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── Claimed ── */}
        {isClaimed && (
          <div className="rounded-md border border-gold/30 bg-[rgba(245,166,35,0.1)] p-4 text-center space-y-2">
            <Trophy className="mx-auto h-8 w-8 text-gold" />
            <p className="font-display font-bold text-[18px] text-gold">
              Payout Claimed!
            </p>
            <p className="font-mono text-xs text-text-secondary">
              Your winnings have been sent to your wallet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
