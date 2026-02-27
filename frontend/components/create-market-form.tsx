"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { useNetworkGuard } from "@/hooks/use-network-guard";
import { formatEther } from "viem";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { createMarketBackend, getSentiment } from "@/lib/api";
import { predictionMarketContract, EXPLORER_URL } from "@/lib/constants";
import { formatEth } from "@/lib/utils";
import { parseContractError } from "@/lib/contract-errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateMarket } from "@/hooks/use-create-market";
import { TxStatus } from "@/components/tx-status";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MARKET_TYPES = [
  { value: "base", label: "Base", description: "Standard binary outcome market" },
  { value: "conditional", label: "Conditional", description: "Depends on another market outcome" },
  { value: "private", label: "Private", description: "Restricted to invited participants" },
] as const;

const QUESTION_TEMPLATES = [
  { label: "Will ETH exceed $4,000 by Dec 31, 2025?", value: "Will ETH exceed $4,000 by December 31, 2025?" },
  { label: "Will BTC reach $100,000 by Dec 31, 2025?", value: "Will BTC reach $100,000 by December 31, 2025?" },
  { label: "Custom question", value: "" },
] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const createMarketSchema = z
  .object({
    question: z.string().min(10, "At least 10 characters").max(500, "Max 500 characters"),
    closeTime: z.string().min(1, "Required"),
    resolveTime: z.string().min(1, "Required"),
    marketType: z.enum(["base", "conditional", "private"]),
  })
  .refine(
    (data) => new Date(data.closeTime).getTime() > Date.now(),
    { message: "Close time must be in the future", path: ["closeTime"] }
  )
  .refine(
    (data) => new Date(data.resolveTime).getTime() > new Date(data.closeTime).getTime(),
    { message: "Resolve time must be after close time", path: ["resolveTime"] }
  );

type CreateMarketFormValues = z.infer<typeof createMarketSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Indicador de pasos ───────────────────────────────────────────────────────

const STEPS = ["Question", "Timing", "Deploy"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8" role="list" aria-label="Form steps">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center" role="listitem">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center font-display font-bold text-sm border-2 transition-colors",
                  done
                    ? "bg-green border-green text-black"
                    : active
                    ? "bg-cyan border-cyan text-black"
                    : "bg-elevated border-border text-text-muted"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1 font-mono text-[11px] tracking-widest uppercase",
                  active ? "text-cyan" : done ? "text-green" : "text-text-muted"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-16 mx-2 mb-5 transition-colors",
                  done ? "bg-green" : "bg-border"
                )}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Botón Deploy con estados ─────────────────────────────────────────────────

type DeployState = "idle" | "pending" | "confirming" | "success";

function DeployButton({
  state,
  disabled,
}: {
  state: DeployState;
  disabled: boolean;
}) {
  const base =
    "w-full h-12 font-display font-extrabold text-base tracking-widest border-0 transition-all duration-200";

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
        DEPLOYING ON-CHAIN… ⛓
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
        DEPLOYED ✓
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      disabled={disabled}
      className={cn(
        base,
        "bg-gradient-to-br from-cyan to-violet text-black hover:brightness-110 hover:scale-[1.01]",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100 hover:brightness-100"
      )}
    >
      DEPLOY MARKET
    </Button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CreateMarketForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isWrongNetwork, switchToRequired, isSwitching } = useNetworkGuard();
  const publicClient = usePublicClient();

  const [step, setStep] = useState(0);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentPreview, setSentimentPreview] = useState<number | null>(null);
  const [deployState, setDeployState] = useState<DeployState>("idle");

  const { createMarket, hash, isPending, isConfirming, isSuccess, getNewMarketId, error, reset } =
    useCreateMarket();

  // Leer creationFee del contrato (puede ser 0 si el contrato no la tiene)
  const { data: creationFeeRaw } = useReadContract({
    ...predictionMarketContract,
    functionName: "creationFee",
    query: { retry: false },
  });
  const creationFee = (creationFeeRaw as bigint | undefined) ?? 0n;
  const creationFeeEth =
    creationFee > 0n ? `${Number(formatEther(creationFee)).toFixed(4)} ETH` : "Free";

  const form = useForm<CreateMarketFormValues>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: { question: "", closeTime: "", resolveTime: "", marketType: "base" },
  });

  const question = form.watch("question");
  const closeTimeStr = form.watch("closeTime");
  const resolveTimeStr = form.watch("resolveTime");
  const marketType = form.watch("marketType");

  const closeTime = closeTimeStr ? new Date(closeTimeStr) : null;
  const resolveTime = resolveTimeStr ? new Date(resolveTimeStr) : null;
  const now = Date.now();
  const daysUntilClose =
    closeTime && closeTime.getTime() > now
      ? Math.ceil((closeTime.getTime() - now) / 86_400_000)
      : null;
  const daysResolveAfterClose =
    closeTime && resolveTime && resolveTime.getTime() > closeTime.getTime()
      ? Math.ceil((resolveTime.getTime() - closeTime.getTime()) / 86_400_000)
      : null;

  // Estimación de gas en paso 2
  useEffect(() => {
    if (!question || !closeTimeStr || !resolveTimeStr || !publicClient) {
      setGasEstimate(null);
      return;
    }
    const close = new Date(closeTimeStr);
    const resolve = new Date(resolveTimeStr);
    if (close.getTime() <= Date.now() || resolve.getTime() <= close.getTime()) {
      setGasEstimate(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const gas = await publicClient.estimateContractGas({
          ...predictionMarketContract,
          functionName: "createMarket",
          args: [
            question,
            BigInt(Math.floor(close.getTime() / 1000)),
            BigInt(Math.floor(resolve.getTime() / 1000)),
          ],
          account: address ?? "0x0000000000000000000000000000000000000000",
        });
        if (cancelled) return;
        const gasPrice = await publicClient.getGasPrice();
        setGasEstimate(`~${formatEth(gas * gasPrice)}`);
      } catch {
        if (!cancelled) setGasEstimate(null);
      }
    })();
    return () => { cancelled = true; };
  }, [question, closeTimeStr, resolveTimeStr, publicClient, address]);

  // Sincronizar estado del botón con el ciclo de vida de la tx
  useEffect(() => {
    if (isPending) {
      setDeployState("pending");
      toast.loading("Confirm in wallet...", { id: "create" });
    }
  }, [isPending]);

  useEffect(() => {
    if (isConfirming && hash) {
      setDeployState("confirming");
      toast.loading(`Deploying on-chain… TX: ${hash.slice(0, 10)}…`, { id: "create" });
    }
  }, [isConfirming, hash]);

  useEffect(() => {
    if (!isSuccess) return;
    setDeployState("success");
    const newId = getNewMarketId();
    toast.success(newId != null ? `Market created! #${newId}` : "Market created!", {
      id: "create",
      action: hash
        ? { label: "View →", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") }
        : undefined,
    });

    // Sincronizar backend (non-blocking)
    const data = form.getValues();
    const closeUnix = Math.floor(new Date(data.closeTime).getTime() / 1000);
    const resolveUnix = Math.floor(new Date(data.resolveTime).getTime() / 1000);
    createMarketBackend({
      question: data.question,
      close_time: closeUnix,
      resolve_time: resolveUnix,
      market_type: data.marketType,
    }).catch(() => {/* non-blocking */});

    setTimeout(() => {
      router.push(newId != null ? `/markets/${newId}` : "/");
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  useEffect(() => {
    if (!error) return;
    setDeployState("idle");
    toast.error("Transaction failed", { id: "create", description: parseContractError(error) });
  }, [error]);

  const handleTemplate = useCallback(
    (value: string) => form.setValue("question", value, { shouldValidate: true }),
    [form]
  );

  const runSentimentPreview = useCallback(async () => {
    const q = form.getValues("question").trim();
    if (q.length < 10) { toast.error("Enter at least 10 characters"); return; }
    setSentimentLoading(true);
    setSentimentPreview(null);
    try {
      const res = await getSentiment(q);
      setSentimentPreview(res.probability);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sentiment failed");
    } finally {
      setSentimentLoading(false);
    }
  }, [form]);

  // Avanzar al paso siguiente validando solo los campos del paso actual
  const goNext = async () => {
    let valid = false;
    if (step === 0) {
      valid = await form.trigger("question");
    } else if (step === 1) {
      valid = await form.trigger(["closeTime", "resolveTime"]);
    }
    if (valid) setStep((s: number) => s + 1);
  };

  const onSubmit = form.handleSubmit((data) => {
    if (!isConnected || !address) { toast.error("Connect your wallet"); return; }
    if (isWrongNetwork) { toast.error("Wrong network. Switch to Sepolia."); return; }
    if (deployState === "success") return;
    if (error) reset();

    const closeUnix = Math.floor(new Date(data.closeTime).getTime() / 1000);
    const resolveUnix = Math.floor(new Date(data.resolveTime).getTime() / 1000);
    createMarket(data.question, closeUnix, resolveUnix, creationFee);
  });

  const canDeploy = isConnected && !isWrongNetwork;

  return (
    <div className="mx-auto max-w-[640px]">
      <StepIndicator current={step} />

      {/* Banners de estado */}
      {!isConnected && (
        <Card className="card-bg border-amber-500/40 mb-6">
          <CardContent className="pt-6">
            <p className="font-display font-medium text-amber-600 dark:text-amber-400">
              Connect your wallet to create a market.
            </p>
          </CardContent>
        </Card>
      )}
      {isConnected && isWrongNetwork && (
        <Card className="card-bg border-red/40 mb-6">
          <CardContent className="pt-4 flex items-center justify-between gap-3">
            <p className="font-mono text-sm text-red">
              ⚠ Wrong network — Switch to Sepolia to create a market.
            </p>
            <button
              type="button"
              onClick={switchToRequired}
              disabled={isSwitching}
              className="shrink-0 rounded-md border border-red/40 bg-red/10 px-3 py-1.5 font-mono text-xs text-red transition-colors hover:bg-red/20 disabled:opacity-60"
            >
              {isSwitching ? "Switching…" : "Switch to Sepolia →"}
            </button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={onSubmit} className="space-y-6" noValidate>

        {/* ── PASO 0: Question ──────────────────────────────────────────────── */}
        {step === 0 && (
          <Card className="card-bg border-border">
            <CardHeader>
              <CardTitle className="font-display">Market Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {QUESTION_TEMPLATES.map((t) => (
                  <Button
                    key={t.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-display"
                    onClick={() => handleTemplate(t.value)}
                    aria-label={t.label}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
              <div>
                <Textarea
                  placeholder="Enter your prediction question (10–500 characters)"
                  className="font-mono min-h-[120px] resize-y"
                  maxLength={500}
                  {...form.register("question")}
                  aria-invalid={!!form.formState.errors.question}
                />
                <div className="mt-1 flex justify-between font-mono text-xs text-muted-foreground">
                  <span className="text-destructive">
                    {form.formState.errors.question?.message}
                  </span>
                  <span>{question.length}/500</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="font-display"
                  onClick={runSentimentPreview}
                  disabled={sentimentLoading || question.length < 10}
                  aria-label="Preview AI sentiment"
                >
                  {sentimentLoading ? "Analyzing…" : "Preview AI Sentiment"}
                </Button>
                {sentimentPreview != null && (
                  <span className="font-mono text-sm text-primary">
                    Probability: {Math.round(sentimentPreview * 100)}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── PASO 1: Timing ────────────────────────────────────────────────── */}
        {step === 1 && (
          <Card className="card-bg border-border">
            <CardHeader>
              <CardTitle className="font-display">Close & Resolve Times</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="closeTime" className="mb-1 block font-mono text-sm">
                  Close time
                </label>
                <Input
                  id="closeTime"
                  type="datetime-local"
                  className="font-mono"
                  {...form.register("closeTime")}
                  aria-invalid={!!form.formState.errors.closeTime}
                />
                {form.formState.errors.closeTime && (
                  <p className="mt-1 text-sm text-destructive">
                    {form.formState.errors.closeTime.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="resolveTime" className="mb-1 block font-mono text-sm">
                  Resolve time
                </label>
                <Input
                  id="resolveTime"
                  type="datetime-local"
                  className="font-mono"
                  {...form.register("resolveTime")}
                  aria-invalid={!!form.formState.errors.resolveTime}
                />
                {form.formState.errors.resolveTime && (
                  <p className="mt-1 text-sm text-destructive">
                    {form.formState.errors.resolveTime.message}
                  </p>
                )}
              </div>
              {daysUntilClose != null && daysResolveAfterClose != null && (
                <p className="font-mono text-sm text-muted-foreground">
                  Closes in <strong>{daysUntilClose}</strong> days, resolves{" "}
                  <strong>{daysResolveAfterClose}</strong> days after close.
                </p>
              )}
              <div>
                <label className="mb-1 block font-mono text-sm">Market Type</label>
                <Select
                  value={marketType}
                  onValueChange={(v: string) =>
                    form.setValue("marketType", v as CreateMarketFormValues["marketType"])
                  }
                >
                  <SelectTrigger className="font-mono" aria-label="Market type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {MARKET_TYPES.find((t) => t.value === marketType)?.description}
                </p>
              </div>
              {gasEstimate && (
                <p className="font-mono text-sm text-muted-foreground">
                  Est. gas: {gasEstimate}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── PASO 2: Deploy ────────────────────────────────────────────────── */}
        {step === 2 && (
          <Card className="card-bg border-border">
            <CardHeader>
              <CardTitle className="font-display">Review & Deploy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Summary */}
              <div className="rounded-md border border-border bg-elevated p-4 space-y-3">
                <div>
                  <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-1">
                    Question
                  </p>
                  <p className="font-body text-sm text-foreground leading-snug">
                    {question}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-0.5">
                      Close
                    </p>
                    <p className="font-mono text-sm text-foreground">
                      {closeTime
                        ? closeTime.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </p>
                    {daysUntilClose != null && (
                      <p className="font-mono text-[11px] text-text-muted">
                        in {daysUntilClose}d
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-0.5">
                      Resolve
                    </p>
                    <p className="font-mono text-sm text-foreground">
                      {resolveTime
                        ? resolveTime.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </p>
                    {daysResolveAfterClose != null && (
                      <p className="font-mono text-[11px] text-text-muted">
                        +{daysResolveAfterClose}d after close
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-0.5">
                      Type
                    </p>
                    <p className="font-mono text-sm text-foreground capitalize">
                      {marketType}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-0.5">
                      Creation Fee
                    </p>
                    <p
                      className={cn(
                        "font-mono text-sm font-semibold",
                        creationFee > 0n ? "text-cyan" : "text-green"
                      )}
                    >
                      {creationFeeEth}
                    </p>
                  </div>
                </div>
                {gasEstimate && (
                  <div>
                    <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest mb-0.5">
                      Est. Gas
                    </p>
                    <p className="font-mono text-sm text-text-muted">{gasEstimate}</p>
                  </div>
                )}
              </div>

              {/* Botón Deploy */}
              <DeployButton
                state={deployState}
                disabled={!canDeploy || deployState !== "idle"}
              />

              {/* Error inline */}
              {error && deployState === "idle" && (
                <p className="text-xs text-red text-center" role="alert">
                  {parseContractError(error)}
                </p>
              )}

              {/* Progreso de la transacción */}
              <TxStatus
                hash={hash}
                requiredConfirmations={3}
                dismissAfterMs={5_000}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Navegación entre pasos ────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          {step > 0 && deployState === "idle" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s: number) => s - 1)}
              className="font-display gap-1"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 2 && (
            <Button
              type="button"
              onClick={goNext}
              className="font-display gap-1 bg-primary text-primary-foreground"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
