"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState } from "react";
import { Lock, Eye, AlertTriangle, Copy, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCommitReveal } from "@/hooks/use-commit-reveal";
import { cn } from "@/lib/utils";

interface CommitRevealWizardProps {
  marketId: number;
  className?: string;
}

const OUTCOME_OPTIONS = [
  { value: 1, label: "SÍ", className: "border-green-400/40 bg-green-400/10 text-green-400 hover:bg-green-400/20" },
  { value: 2, label: "NO", className: "border-red-400/40 bg-red-400/10 text-red-400 hover:bg-red-400/20" },
] as const;

export function CommitRevealWizard({ marketId, className }: CommitRevealWizardProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<number>(1);
  const [amount, setAmount] = useState("");
  const [manualNonce, setManualNonce] = useState("");
  const [nonceCopied, setNonceCopied] = useState(false);

  const {
    state,
    isConfirmingCommit,
    isConfirmingReveal,
    startCommit,
    executeCommit,
    startReveal,
    executeReveal,
    hasSavedNonce,
  } = useCommitReveal(marketId);

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

  const isBusy = state.step === "committing" || state.step === "revealing" || isConfirmingCommit || isConfirmingReveal;

  return (
    <div className={cn("rounded-md border border-border bg-surface", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Lock className="h-4 w-4 text-violet" />
        <span className="font-display font-bold text-[13px] tracking-widest text-text-muted uppercase">
          Apuesta Privada
        </span>
        <span className="ml-auto rounded-full border border-violet/30 bg-violet-dim px-2 py-0.5 font-mono text-[10px] text-violet">
          Commit-Reveal
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Paso indicador */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[11px] font-bold",
              isCommitPhase || isIdle
                ? "border-cyan bg-cyan-dim text-cyan"
                : "border-green-400 bg-green-400/10 text-green-400"
            )}
          >
            {isCommitPhase || isIdle ? "1" : "✓"}
          </div>
          <span className="font-mono text-xs text-text-secondary">Commit</span>
          <div className="flex-1 h-px bg-border" />
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[11px] font-bold",
              isDone
                ? "border-green-400 bg-green-400/10 text-green-400"
                : isRevealPhase
                ? "border-cyan bg-cyan-dim text-cyan"
                : "border-border bg-elevated text-text-muted"
            )}
          >
            {isDone ? "✓" : "2"}
          </div>
          <span className="font-mono text-xs text-text-secondary">Reveal</span>
        </div>

        {/* Estado: Idle */}
        {isIdle && (
          <div className="space-y-3">
            <p className="font-body text-sm text-text-secondary">
              Las apuestas privadas usan criptografía commit-reveal para ocultar tu elección hasta que el mercado cierre.
            </p>
            <Button
              className="w-full bg-violet text-white hover:bg-violet/90 border-0 font-mono text-sm"
              onClick={startCommit}
            >
              <Lock className="mr-2 h-4 w-4" />
              Iniciar apuesta privada
            </Button>
          </div>
        )}

        {/* Paso 1: Commit */}
        {isCommitPhase && (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="font-mono text-[11px] text-amber-400">
                  Guarda el nonce en un lugar seguro. Sin él no podrás revelar tu apuesta.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                Tu predicción
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
                Cantidad (ETH)
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
              className="w-full bg-cyan text-black hover:bg-cyan/90 border-0 font-mono text-sm"
              onClick={() => executeCommit(selectedOutcome, amount || "0.01")}
              disabled={isBusy || !amount}
            >
              {isBusy ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando commit…</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" />Confirmar commit</>
              )}
            </Button>
          </div>
        )}

        {/* Commit confirmado — mostrar nonce */}
        {isCommitted && state.nonce && (
          <div className="space-y-3">
            <div className="rounded-md border border-green-400/30 bg-green-400/10 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-400" />
                <span className="font-mono text-xs text-green-400 font-bold">Commit registrado on-chain</span>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">Tu nonce secreto</p>
                <div className="flex items-center gap-2 rounded border border-border bg-elevated px-2 py-1.5">
                  <code className="flex-1 break-all font-mono text-[10px] text-cyan">
                    {state.nonce}
                  </code>
                  <button type="button" onClick={handleCopyNonce} className="shrink-0 text-text-muted hover:text-foreground">
                    {nonceCopied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <p className="font-mono text-[10px] text-amber-400">
                ⚠ Copia y guarda este nonce. También se guardó en tu navegador automáticamente.
              </p>
            </div>

            <Button
              className="w-full bg-violet text-white hover:bg-violet/90 border-0 font-mono text-sm"
              onClick={startReveal}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ir al paso de Reveal
            </Button>
          </div>
        )}

        {/* Paso 2: Reveal */}
        {isRevealPhase && (
          <div className="space-y-3">
            <p className="font-body text-sm text-text-secondary">
              El mercado ha cerrado. Ahora puedes revelar tu apuesta para reclamar tu pago si ganaste.
            </p>

            {!hasSavedNonce() && (
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                  Nonce manual (si no está guardado)
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
              <div className="flex items-center gap-2 rounded-md border border-green-400/20 bg-green-400/10 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-green-400 shrink-0" />
                <span className="font-mono text-xs text-green-400">Nonce encontrado en tu navegador</span>
              </div>
            )}

            <Button
              className="w-full bg-cyan text-black hover:bg-cyan/90 border-0 font-mono text-sm"
              onClick={() => executeReveal(manualNonce || undefined)}
              disabled={isBusy}
            >
              {isBusy ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revelando…</>
              ) : (
                <><Eye className="mr-2 h-4 w-4" />Revelar apuesta</>
              )}
            </Button>
          </div>
        )}

        {/* Done */}
        {isDone && (
          <div className="rounded-md border border-green-400/30 bg-green-400/10 p-4 text-center space-y-2">
            <div className="text-2xl">✅</div>
            <p className="font-display font-bold text-sm text-green-400">Reveal completado</p>
            <p className="font-mono text-xs text-text-secondary">
              Tu apuesta ha sido revelada. Si ganaste, podrás reclamar tu pago.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
