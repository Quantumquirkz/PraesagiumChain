"use client";

import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { useAccount, useBalance } from "wagmi";
import { useNetworkGuard } from "@/hooks/use-network-guard";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { usePlaceBet } from "../hooks/use-place-bet";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TxStatus } from "@/components/tx-status";
import { cn, formatEth } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/constants";
import { parseContractError } from "@/lib/contract-errors";
import {
  subscribeToMarketResolution,
  requestNotificationPermission,
} from "@/lib/notifications";
import { BET_TOKENS, type BetToken } from "@/lib/constants";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Outcome = 1 | 2; // 1 = Yes, 2 = No

export interface BetFormProps {
  marketId: number;
  marketStatus: string; // "Open" | "Locked" | "Resolved" | "Cancelled"
  /** Unix seconds; if in the past, betting is closed regardless of marketStatus */
  closeTime?: number;
  question?: string;
  /** JSON string from market.metadata — used to extract betToken */
  metadata?: string;
  /** Called after confirming the on-chain bet to refresh your stake on screen */
  onBetSuccess?: () => void;
}

function parseBetToken(metadata?: string): BetToken {
  try {
    const m = metadata ? JSON.parse(metadata) : {};
    const sym: string = (m.betToken ?? "ETH").toUpperCase();
    return BET_TOKENS.find((t) => t.symbol === sym) ?? BET_TOKENS[0]!;
  } catch {
    return BET_TOKENS[0]!;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUICK_AMOUNTS = ["0.01", "0.05", "0.1", "0.5"] as const;

function isValidAmount(val: string): boolean {
  const n = Number.parseFloat(val);
  return !Number.isNaN(n) && n > 0;
}

// Button states

type BtnState = "idle" | "pending" | "confirming" | "success" | "error";

interface BetButtonProps {
  state: BtnState;
  disabled: boolean;
}

function BetButton({ state, disabled }: BetButtonProps) {
  const base =
    "w-full h-12 font-display font-extrabold text-base tracking-widest border-0 transition-all duration-200 select-none";

  if (state === "idle") {
    return (
      <Button
        type="submit"
        disabled={disabled}
        className={cn(
          base,
          "bg-gradient-to-br from-cyan to-violet text-black hover:brightness-110 hover:scale-[1.01]"
        )}
      >
        PLACE BET
      </Button>
    );
  }

  if (state === "pending") {
    return (
      <Button
        type="submit"
        disabled
        className={cn(base, "bg-[var(--gold,#f5a623)] text-black cursor-not-allowed")}
      >
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        CONFIRM IN WALLET…
      </Button>
    );
  }

  if (state === "confirming") {
    return (
      <Button
        type="submit"
        disabled
        className={cn(base, "bg-violet/30 text-violet border border-violet/40 cursor-not-allowed")}
      >
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        CONFIRMING… ⛓
      </Button>
    );
  }

  if (state === "success") {
    return (
      <Button
        type="submit"
        disabled
        className={cn(base, "bg-green/80 text-black cursor-default")}
      >
        <CheckCircle2 className="mr-2 h-5 w-5" aria-hidden />
        BET PLACED ✓
      </Button>
    );
  }

  // error
  return (
    <Button
      type="submit"
      disabled={disabled}
      className={cn(base, "bg-red/20 text-red border border-red/40 hover:bg-red/30")}
    >
      TRY AGAIN
    </Button>
  );
}

// Main component

export function BetForm({ marketId, marketStatus, closeTime, question, metadata, onBetSuccess }: BetFormProps) {
  const { address, isConnected } = useAccount();
  const { isWrongNetwork, switchToRequired, isSwitching } = useNetworkGuard();
  const { data: balance, isLoading: balanceLoading } = useBalance({ address });
  const queryClient = useQueryClient();

  // If balance is slow (e.g. slow RPC), don't block the form forever
  const [balanceLoadTimedOut, setBalanceLoadTimedOut] = useState(false);
  useEffect(() => {
    if (!balanceLoading) {
      setBalanceLoadTimedOut(false);
      return;
    }
    const t = setTimeout(() => setBalanceLoadTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [balanceLoading]);

  const balanceReady = !balanceLoading || balanceLoadTimedOut;

  const betToken = parseBetToken(metadata);

  const { placeBet, hash, isPending, isSuccess, error, reset } =
    usePlaceBet();

  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [btnState, setBtnState] = useState<BtnState>("idle");

  // Sync button state with tx lifecycle

  useEffect(() => {
    if (isPending) {
      setBtnState("pending");
      toast.loading("Waiting for wallet confirmation...", { id: "bet" });
    }
  }, [isPending]);

  useEffect(() => {
    if (hash && !isPending) {
      setBtnState("success");
      toast.success("Bet placed!", {
        id: "bet",
        description: "Transaction submitted. It may take a moment to confirm on-chain.",
        action: {
          label: "View →",
          onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank"),
        },
      });

      // Refresh on-chain data (your stake and totals) so the bet shows on screen
      onBetSuccess?.();
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      queryClient.invalidateQueries({ queryKey: ["user-stake", marketId] });

      // Subscribe to market for notification when resolved
      if (question) {
        subscribeToMarketResolution(marketId, question);
      }
      // Request notification permission on first bet
      requestNotificationPermission();

      // Reset form after 2 s
      const t = setTimeout(() => {
        setAmount("");
        setSelectedOutcome(null);
        setFieldError(null);
        setBtnState("idle");
        reset();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [isSuccess, hash, isPending, marketId, question, queryClient, reset, onBetSuccess]);

  useEffect(() => {
    if (error) {
      setBtnState("error");
      toast.error("Bet failed", {
        id: "bet",
        description: parseContractError(error),
      });
    }
  }, [error]);

  // Validations

  const validate = useCallback((): boolean => {
    if (!selectedOutcome) {
      setFieldError("Select Yes or No before placing a bet.");
      return false;
    }
    if (!isValidAmount(amount)) {
      setFieldError("Enter a valid amount greater than 0.");
      return false;
    }
    if (!balanceReady) {
      setFieldError("Please wait for your balance to load.");
      return false;
    }
    if (balance) {
      const amtWei = BigInt(Math.floor(Number(amount) * 1e18));
      if (amtWei > balance.value) {
        setFieldError(
          `Insufficient balance (${formatEth(balance.value)}).`
        );
        return false;
      }
    }
    setFieldError(null);
    return true;
  }, [selectedOutcome, amount, balance, balanceReady]);

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (btnState === "success") return;

      // Reset previous error when retrying
      if (btnState === "error") {
        reset();
        setBtnState("idle");
      }

      if (!validate()) return;
      placeBet(marketId, selectedOutcome!, amount);
    },
    [btnState, validate, placeBet, marketId, selectedOutcome, amount, reset]
  );

  // Guard: market not open (or close_time already passed)
  const closeTimePassed = closeTime != null && closeTime * 1000 < Date.now();
  if (marketStatus !== "Open" || closeTimePassed) {
    return (
      <p className="font-mono text-sm text-text-muted text-center py-2">
        Betting is closed for this market.
      </p>
    );
  }

  // Guard: wallet not connected

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="font-mono text-sm text-text-muted">
          Connect your wallet to place a bet.
        </p>
        <WalletButton />
      </div>
    );
  }

  // ── Guardia: red incorrecta ───────────────────────────────────────────────────

  if (isWrongNetwork) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="font-mono text-sm text-red text-center">
          ⚠ Wrong network — Switch to Sepolia to place a bet.
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await switchToRequired();
            } catch (e) {
              toast.error("Failed to switch network", {
                description: e instanceof Error ? e.message : "Please switch manually in your wallet.",
              });
            }
          }}
          disabled={isSwitching}
          className="rounded-md border border-red/40 bg-red/10 px-4 py-1.5 font-mono text-xs text-red transition-colors hover:bg-red/20 disabled:opacity-60"
        >
          {isSwitching ? "Switching…" : "Switch to Sepolia →"}
        </button>
      </div>
    );
  }

  // Main form

  const isDisabled = isPending || btnState === "success";
  const amountNum = Number.parseFloat(amount) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

      {/* Outcome: YES / NO with market token symbol */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setSelectedOutcome(1); setFieldError(null); }}
          disabled={isDisabled}
          aria-pressed={selectedOutcome === 1}
          className={cn(
            "relative h-14 rounded-lg border font-display font-extrabold text-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden flex flex-col items-center justify-center gap-0.5",
            selectedOutcome === 1
              ? "bg-green-dim border-green text-green shadow-[0_0_12px_rgba(0,232,122,0.2)]"
              : "bg-elevated border-border text-text-muted hover:border-green/50 hover:text-green/80"
          )}
        >
          {selectedOutcome === 1 && (
            <span className="absolute inset-0 bg-gradient-to-br from-green/10 to-transparent" />
          )}
          <span className="relative">YES</span>
          <span className="relative font-mono text-[10px] font-medium opacity-80" style={{ color: selectedOutcome === 1 ? "inherit" : betToken.color }}>{betToken.symbol}</span>
        </button>
        <button
          type="button"
          onClick={() => { setSelectedOutcome(2); setFieldError(null); }}
          disabled={isDisabled}
          aria-pressed={selectedOutcome === 2}
          className={cn(
            "relative h-14 rounded-lg border font-display font-extrabold text-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden flex flex-col items-center justify-center gap-0.5",
            selectedOutcome === 2
              ? "bg-red-dim border-red text-red shadow-[0_0_12px_rgba(255,61,90,0.2)]"
              : "bg-elevated border-border text-text-muted hover:border-red/50 hover:text-red/80"
          )}
        >
          {selectedOutcome === 2 && (
            <span className="absolute inset-0 bg-gradient-to-br from-red/10 to-transparent" />
          )}
          <span className="relative">NO</span>
          <span className="relative font-mono text-[10px] font-medium opacity-80" style={{ color: selectedOutcome === 2 ? "inherit" : betToken.color }}>{betToken.symbol}</span>
        </button>
      </div>

      {/* Amount — minimal: single input + compact presets */}
      <div className="space-y-2">
        <label className="font-mono text-[11px] text-text-muted uppercase tracking-wider">
          Amount
        </label>
        <div className={cn(
          "flex rounded-lg border bg-elevated overflow-hidden transition-colors",
          fieldError ? "border-red/60" : "border-border focus-within:border-[var(--token-color)]"
        )}
        style={{ "--token-color": betToken.color } as React.CSSProperties}
        >
          <span className="flex items-center pl-3 font-mono text-base shrink-0" style={{ color: betToken.color }} aria-hidden>
            {betToken.icon}
          </span>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.01"
            value={amount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setAmount(e.target.value);
              setFieldError(null);
              if (btnState === "error") { reset(); setBtnState("idle"); }
            }}
            disabled={isDisabled}
            aria-label={`Amount in ${betToken.symbol}`}
            className="border-0 bg-transparent font-mono text-lg focus-visible:ring-0 disabled:opacity-40 flex-1 min-w-0"
          />
          <span className="flex items-center pr-3 font-mono text-xs font-medium shrink-0" style={{ color: betToken.color }}>
            {betToken.symbol}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_AMOUNTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setAmount(v); setFieldError(null); }}
              disabled={isDisabled}
              className={cn(
                "rounded border px-2 py-1 font-mono text-[11px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                amount === v ? "border-current font-semibold" : "border-border bg-elevated/80 text-text-secondary hover:text-foreground"
              )}
              style={amount === v ? { borderColor: betToken.color, color: betToken.color, background: `${betToken.color}15` } : {}}
            >
              {v} {betToken.symbol}
            </button>
          ))}
          {balance && (
            <button
              type="button"
              onClick={() => { setAmount(Number(formatEther(balance.value)).toFixed(6)); setFieldError(null); }}
              disabled={isDisabled}
              className="rounded border px-2 py-1 font-mono text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: `${betToken.color}50`, color: betToken.color, background: `${betToken.color}12` }}
            >
              MAX
            </button>
          )}
        </div>
        {balanceReady && balance != null && (
          <p className="font-mono text-[10px] text-text-muted">
            Balance: <span className="text-foreground">{formatEth(balance.value)}</span> ETH
          </p>
        )}
        {balanceLoading && !balanceLoadTimedOut && (
          <p className="font-mono text-[10px] text-text-muted">Loading balance…</p>
        )}
        {amountNum > 0 && selectedOutcome && (
          <p className={cn("font-mono text-[11px]", selectedOutcome === 1 ? "text-green" : "text-red")}>
            Est. payout if {selectedOutcome === 1 ? "YES" : "NO"}: ~{(amountNum * 1.9).toFixed(4)} {betToken.symbol}
          </p>
        )}
        {fieldError && (
          <p className="text-[11px] text-red flex items-center gap-1" role="alert">
            <span>⚠</span> {fieldError}
          </p>
        )}
        {btnState === "error" && error && !fieldError && (
          <p className="text-[11px] text-red" role="alert">{parseContractError(error)}</p>
        )}
      </div>

      <BetButton state={btnState} disabled={isDisabled} />
      <TxStatus hash={hash} requiredConfirmations={3} dismissAfterMs={5_000} />
    </form>
  );
}
