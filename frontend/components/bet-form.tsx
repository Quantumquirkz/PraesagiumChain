"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState, useEffect, useCallback } from "react";
import { useAccount, useBalance } from "wagmi";
import { useNetworkGuard } from "@/hooks/use-network-guard";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TxStatus } from "@/components/tx-status";
import { cn } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/constants";
import { parseContractError } from "@/lib/contract-errors";
import {
  subscribeToMarketResolution,
  requestNotificationPermission,
} from "@/lib/notifications";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Outcome = 1 | 2; // 1 = Yes, 2 = No

export interface BetFormProps {
  marketId: number;
  marketStatus: string; // "Open" | "Locked" | "Resolved" | "Cancelled"
  question?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUICK_AMOUNTS = ["0.01", "0.05", "0.1", "0.5"] as const;

function isValidAmount(val: string): boolean {
  const n = Number.parseFloat(val);
  return !Number.isNaN(n) && n > 0;
}

// ─── Estados del botón ────────────────────────────────────────────────────────

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

// ─── Componente principal ─────────────────────────────────────────────────────

export function BetForm({ marketId, marketStatus, question }: BetFormProps) {
  const { address, isConnected } = useAccount();
  const { isWrongNetwork, switchToRequired, isSwitching } = useNetworkGuard();
  const { data: balance } = useBalance({ address });
  const queryClient = useQueryClient();

  const { placeBet, hash, isPending, isConfirming, isSuccess, error, reset } =
    usePlaceBet();

  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [btnState, setBtnState] = useState<BtnState>("idle");

  // ── Sincronizar estado del botón con el ciclo de vida de la tx ──────────────

  useEffect(() => {
    if (isPending) {
      setBtnState("pending");
      toast.loading("Waiting for wallet confirmation...", { id: "bet" });
    }
  }, [isPending]);

  useEffect(() => {
    if (isConfirming && hash) {
      setBtnState("confirming");
      toast.loading(`Confirming on-chain… TX: ${hash.slice(0, 10)}…`, { id: "bet" });
    }
  }, [isConfirming, hash]);

  useEffect(() => {
    if (isSuccess && hash) {
      setBtnState("success");
      toast.success("Bet placed!", {
        id: "bet",
        description: "Transaction confirmed on-chain.",
        action: {
          label: "View →",
          onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank"),
        },
      });

      // Invalidar queries para refrescar datos del mercado y stake del usuario
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      queryClient.invalidateQueries({ queryKey: ["user-stake", marketId] });

      // Suscribir al mercado para notificación cuando se resuelva
      if (question) {
        subscribeToMarketResolution(marketId, question);
      }
      // Pedir permiso de notificación en la primera apuesta
      requestNotificationPermission();

      // Resetear formulario tras 2 s
      const t = setTimeout(() => {
        setAmount("");
        setSelectedOutcome(null);
        setFieldError(null);
        setBtnState("idle");
        reset();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [isSuccess, hash, marketId, question, queryClient, reset]);

  useEffect(() => {
    if (error) {
      setBtnState("error");
      toast.error("Bet failed", {
        id: "bet",
        description: parseContractError(error),
      });
    }
  }, [error]);

  // ── Validaciones ─────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    if (!selectedOutcome) {
      setFieldError("Select Yes or No before placing a bet.");
      return false;
    }
    if (!isValidAmount(amount)) {
      setFieldError("Enter a valid amount greater than 0.");
      return false;
    }
    if (balance) {
      const amtWei = BigInt(Math.floor(Number(amount) * 1e18));
      if (amtWei > balance.value) {
        setFieldError(
          `Insufficient balance (${Number(formatEther(balance.value)).toFixed(4)} ETH).`
        );
        return false;
      }
    }
    setFieldError(null);
    return true;
  }, [selectedOutcome, amount, balance]);

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (btnState === "success") return;

      // Resetear error previo al reintentar
      if (btnState === "error") {
        reset();
        setBtnState("idle");
      }

      if (!validate()) return;
      placeBet(marketId, selectedOutcome!, amount);
    },
    [btnState, validate, placeBet, marketId, selectedOutcome, amount, reset]
  );

  // ── Guardia: mercado no abierto ───────────────────────────────────────────────

  if (marketStatus !== "Open") {
    return (
      <p className="font-mono text-sm text-text-muted text-center py-2">
        Betting is closed for this market.
      </p>
    );
  }

  // ── Guardia: wallet no conectada ──────────────────────────────────────────────

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
          onClick={switchToRequired}
          disabled={isSwitching}
          className="rounded-md border border-red/40 bg-red/10 px-4 py-1.5 font-mono text-xs text-red transition-colors hover:bg-red/20 disabled:opacity-60"
        >
          {isSwitching ? "Switching…" : "Switch to Sepolia →"}
        </button>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────────

  const isDisabled = isPending || isConfirming || btnState === "success";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Selector Yes / No */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedOutcome(1);
            setFieldError(null);
          }}
          disabled={isDisabled}
          aria-pressed={selectedOutcome === 1}
          className={cn(
            "h-12 rounded-md border font-display font-extrabold text-[20px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
            selectedOutcome === 1
              ? "bg-green-dim border-green text-green"
              : "bg-elevated border-border text-text-muted hover:border-green/50 hover:text-green/80"
          )}
        >
          YES
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedOutcome(2);
            setFieldError(null);
          }}
          disabled={isDisabled}
          aria-pressed={selectedOutcome === 2}
          className={cn(
            "h-12 rounded-md border font-display font-extrabold text-[20px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
            selectedOutcome === 2
              ? "bg-red-dim border-red text-red"
              : "bg-elevated border-border text-text-muted hover:border-red/50 hover:text-red/80"
          )}
        >
          NO
        </button>
      </div>

      {/* Input de cantidad */}
      <div>
        <div className="flex rounded-md border border-border bg-elevated overflow-hidden focus-within:border-cyan/60 transition-colors">
          <span className="flex items-center pl-3 font-mono text-cyan select-none" aria-hidden>
            Ξ
          </span>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.01"
            value={amount}
            onChange={(e: { target: { value: string } }) => {
              setAmount(e.target.value);
              setFieldError(null);
              if (btnState === "error") { reset(); setBtnState("idle"); }
            }}
            disabled={isDisabled}
            aria-label="Bet amount in ETH"
            className="border-0 bg-transparent font-mono text-[18px] focus-visible:ring-0 disabled:opacity-40"
          />
        </div>

        {/* Quick-amount pills */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setAmount(v); setFieldError(null); }}
              disabled={isDisabled}
              className="rounded-md border border-border bg-elevated px-2 py-1 font-mono text-xs text-text-secondary hover:text-foreground hover:border-cyan/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {v}
            </button>
          ))}
          {balance && (
            <button
              type="button"
              onClick={() => {
                const max = Number(formatEther(balance.value));
                setAmount(max.toFixed(6));
                setFieldError(null);
              }}
              disabled={isDisabled}
              className="rounded-md border border-border bg-elevated px-2 py-1 font-mono text-xs text-cyan hover:border-cyan/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          )}
        </div>

        {/* Balance disponible */}
        {balance && (
          <p className="mt-1.5 font-mono text-[11px] text-text-muted">
            Balance: {Number(formatEther(balance.value)).toFixed(4)} ETH
          </p>
        )}

        {/* Error de validación */}
        {fieldError && (
          <p className="mt-1 text-xs text-red" role="alert">
            {fieldError}
          </p>
        )}

        {/* Error de contrato */}
        {btnState === "error" && error && !fieldError && (
          <p className="mt-1 text-xs text-red" role="alert">
            {parseContractError(error)}
          </p>
        )}
      </div>

      {/* Botón con estados */}
      <BetButton state={btnState} disabled={isDisabled} />

      {/* Progreso de la transacción */}
      <TxStatus
        hash={hash}
        requiredConfirmations={3}
        dismissAfterMs={5_000}
      />
    </form>
  );
}
