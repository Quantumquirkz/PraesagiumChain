"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { parseEventLogs } from "viem";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Link2 } from "lucide-react";
import { createMarketBackend } from "@/lib/api";
import { predictionMarketContract, EXPLORER_URL } from "@/lib/constants";
import { formatEth } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MARKET_TYPES = [
  { value: "base", label: "Base", description: "Standard binary outcome market" },
  { value: "conditional", label: "Conditional", description: "Depends on another market outcome" },
  { value: "private", label: "Private", description: "Restricted to invited participants" },
] as const;

const QUESTION_TEMPLATES = [
  { label: "₿ BTC > $X", value: "Will BTC exceed $100,000 by December 31, 2025?" },
  { label: "Ξ ETH > $X", value: "Will ETH exceed $4,000 before March 2026?" },
  { label: "📊 Custom", value: "" },
] as const;

const createMarketSchema = z
  .object({
    question: z.string().min(10, "At least 10 characters").max(500, "Max 500 characters"),
    closeTime: z.string().min(1, "Close time is required"),
    resolveTime: z.string().min(1, "Resolve time is required"),
    marketType: z.enum(["base", "conditional", "private"]),
  })
  .refine((data) => new Date(data.closeTime).getTime() > Date.now(), {
    message: "Close time must be in the future",
    path: ["closeTime"],
  })
  .refine(
    (data) => new Date(data.resolveTime).getTime() > new Date(data.closeTime).getTime(),
    { message: "Resolve time must be after close time", path: ["resolveTime"] }
  );

type FormValues = z.infer<typeof createMarketSchema>;

const EXPECTED_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : 11155111;

function formatRelativeFromNow(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;
  if (diff < 0) return "in the past";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `in ${days} days, ${hours} hours`;
  if (hours > 0) return `in ${hours} hours`;
  const mins = Math.floor((diff % (60 * 60 * 1000)) / 60000);
  return `in ${mins} minutes`;
}

export default function CreateMarketPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [deploySuccess, setDeploySuccess] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: writePending } = useWriteContract();

  const form = useForm<FormValues>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: {
      question: "",
      closeTime: "",
      resolveTime: "",
      marketType: "base",
    },
  });

  const question = form.watch("question");
  const closeTimeStr = form.watch("closeTime");
  const resolveTimeStr = form.watch("resolveTime");
  const marketType = form.watch("marketType");

  const closeTime = closeTimeStr ? new Date(closeTimeStr) : null;
  const resolveTime = resolveTimeStr ? new Date(resolveTimeStr) : null;
  const now = Date.now();
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);

  useEffect(() => {
    if (!question || !closeTimeStr || !resolveTimeStr) {
      setGasEstimate(null);
      return;
    }
    const now = Date.now();
    const close = new Date(closeTimeStr);
    const resolve = new Date(resolveTimeStr);
    if (close.getTime() <= now || resolve.getTime() <= close.getTime()) {
      setGasEstimate(null);
      return;
    }
    if (!publicClient || !address) {
      setGasEstimate(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const gas = await publicClient.estimateContractGas({
          ...predictionMarketContract,
          functionName: "createMarket",
          args: [question, BigInt(Math.floor(close.getTime() / 1000)), BigInt(Math.floor(resolve.getTime() / 1000))],
          account: address,
        });
        if (cancelled) return;
        const gasPrice = await publicClient.getGasPrice();
        setGasEstimate(formatEth(gas * gasPrice));
      } catch {
        if (!cancelled) setGasEstimate(null);
      }
    })();
    return () => { cancelled = true; };
  }, [question, closeTimeStr, resolveTimeStr, publicClient, address]);

  const handleTemplate = (value: string) => {
    if (value) form.setValue("question", value, { shouldValidate: true });
  };

  const validateStep = async (s: number): Promise<boolean> => {
    if (s === 1) {
      const ok = await form.trigger("question");
      return ok;
    }
    if (s === 2) {
      const ok = await form.trigger(["closeTime", "resolveTime"]);
      return ok;
    }
    return true;
  };

  const goNext = async () => {
    const ok = await validateStep(step);
    if (!ok) return;
    if (step < 3) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (chainId !== EXPECTED_CHAIN_ID) {
      toast.error("Wrong network. Switch to Sepolia.");
      return;
    }
    const closeUnix = Math.floor(new Date(data.closeTime).getTime() / 1000);
    const resolveUnix = Math.floor(new Date(data.resolveTime).getTime() / 1000);
    try {
      toast.info("Confirm in wallet...");
      const hash = await writeContractAsync({
        ...predictionMarketContract,
        functionName: "createMarket",
        args: [data.question, BigInt(closeUnix), BigInt(resolveUnix)],
      });
      if (!publicClient || !hash) {
        toast.success("Market created!");
        setDeploySuccess(true);
        setTimeout(() => router.push("/"), 1500);
        return;
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({ abi: predictionMarketContract.abi, logs: receipt.logs });
      const created = logs.find((e) => e.eventName === "MarketCreated");
      const newId = created?.args?.marketId != null ? Number(created.args.marketId) : null;
      toast.success("Market created!", {
        action: { label: "View on Etherscan", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") },
      });
      setDeploySuccess(true);
      try {
        await createMarketBackend({
          question: data.question,
          close_time: closeUnix,
          resolve_time: resolveUnix,
          market_type: data.marketType,
        });
      } catch {
        // non-blocking
      }
      setTimeout(() => (newId != null ? router.push(`/markets/${newId}`) : router.push("/")), 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction failed");
    }
  });

  const isWrongNetwork = chainId !== undefined && chainId !== EXPECTED_CHAIN_ID;

  return (
    <div className="mx-auto w-full max-w-[720px] py-10 px-6" style={{ padding: "40px 24px" }}>
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-[40px] text-foreground leading-tight">
          CREATE MARKET
        </h1>
        <p className="mt-2 font-body text-sm text-text-secondary" style={{ fontSize: 14 }}>
          Deploy a new prediction market on-chain
        </p>
      </header>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10">
        {[
          { num: 1, label: "Question" },
          { num: 2, label: "Timeline" },
          { num: 3, label: "Deploy" },
        ].map((s, i) => (
          <div key={s.num} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-display font-bold text-sm transition-colors",
                  step > s.num && "border-green bg-green text-black",
                  step === s.num && "border-cyan bg-cyan/20 text-cyan",
                  step < s.num && "border-border bg-transparent text-text-muted"
                )}
              >
                {step > s.num ? <Check className="h-4 w-4" aria-hidden /> : s.num}
              </div>
              <span
                className={cn(
                  "mt-1.5 font-body text-xs font-medium",
                  step > s.num && "text-green",
                  step === s.num && "text-cyan",
                  step < s.num && "text-text-muted"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 min-w-[24px] rounded transition-colors",
                  step > s.num ? "bg-green" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Question */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block font-display font-bold text-xs text-text-muted tracking-widest uppercase">
            YOUR QUESTION
          </label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => handleTemplate(t.value)}
                className={cn(
                  "rounded-full border px-4 py-2 font-body text-sm transition-colors",
                  question === t.value || (t.value && question.startsWith(t.value.slice(0, 20)))
                    ? "border-cyan bg-cyan-dim text-cyan"
                    : "border-border bg-elevated text-text-secondary hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <textarea
              placeholder="Will ETH exceed $4,000 before March 2026?"
              className={cn(
                "w-full min-h-[120px] rounded border bg-elevated px-4 py-3 font-body text-[15px] leading-relaxed text-foreground placeholder:text-text-muted resize-y",
                "focus:outline-none focus:border-cyan focus:ring-[3px] focus:ring-cyan-dim",
                form.formState.errors.question && "border-red focus:border-red focus:ring-red-dim"
              )}
              style={{ borderRadius: 4, lineHeight: 1.6 }}
              maxLength={500}
              {...form.register("question")}
            />
            <span
              className={cn(
                "absolute bottom-2 right-3 font-mono text-xs",
                question.length > 450 ? "text-red" : "text-text-muted"
              )}
            >
              {question.length}/500
            </span>
          </div>
          {form.formState.errors.question && (
            <p className="text-sm text-red">{form.formState.errors.question.message}</p>
          )}
        </div>
      )}

      {/* Step 2 — Timeline */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block font-display font-bold text-xs text-text-muted tracking-widest uppercase mb-2">
                CLOSE TIME
              </label>
              <input
                type="datetime-local"
                className={cn(
                  "w-full rounded border bg-elevated px-4 py-3 font-body text-foreground focus:outline-none focus:border-cyan focus:ring-[3px] focus:ring-cyan-dim",
                  form.formState.errors.closeTime && "border-red"
                )}
                style={{ borderRadius: 4, padding: "12px 16px" }}
                {...form.register("closeTime")}
              />
              {closeTime && closeTime.getTime() > now && (
                <p className="mt-1.5 font-body text-xs text-text-secondary">
                  {formatRelativeFromNow(closeTime)}
                </p>
              )}
              {form.formState.errors.closeTime && (
                <p className="mt-1 text-sm text-red">{form.formState.errors.closeTime.message}</p>
              )}
            </div>
            <div>
              <label className="block font-display font-bold text-xs text-text-muted tracking-widest uppercase mb-2">
                RESOLVE TIME
              </label>
              <input
                type="datetime-local"
                className={cn(
                  "w-full rounded border bg-elevated px-4 py-3 font-body text-foreground focus:outline-none focus:border-cyan focus:ring-[3px] focus:ring-cyan-dim",
                  form.formState.errors.resolveTime && "border-red"
                )}
                style={{ borderRadius: 4, padding: "12px 16px" }}
                {...form.register("resolveTime")}
              />
              {resolveTime && resolveTime.getTime() > now && (
                <p className="mt-1.5 font-body text-xs text-text-secondary">
                  {formatRelativeFromNow(resolveTime)}
                </p>
              )}
              {form.formState.errors.resolveTime && (
                <p className="mt-1 text-sm text-red">{form.formState.errors.resolveTime.message}</p>
              )}
            </div>
          </div>

          {closeTime && resolveTime && resolveTime.getTime() > closeTime.getTime() && (
            <div className="flex items-center gap-0 py-4">
              <span className="h-2 w-2 rounded-full bg-cyan shrink-0" aria-hidden />
              <div className="flex-1 flex items-center gap-1 mx-1">
                <div className="flex-1 h-1 rounded-l-full bg-cyan/50" />
                <span className="text-[10px] font-mono text-cyan bg-elevated px-2 py-1 rounded shrink-0">CLOSE</span>
                <div className="w-4 h-1 shrink-0 bg-transparent" aria-hidden />
                <span className="text-[10px] font-mono text-cyan bg-elevated px-2 py-1 rounded shrink-0">RESOLVE</span>
                <div className="flex-1 h-1 rounded-r-full bg-cyan/50" />
              </div>
              <span className="h-2 w-2 rounded-full bg-cyan shrink-0" aria-hidden />
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Deploy */}
      {step === 3 && (
        <form onSubmit={onSubmit} className="space-y-6">
          {!isConnected && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="font-body text-sm text-amber-600 dark:text-amber-400">
                Please connect your wallet to deploy.
              </p>
            </div>
          )}
          {isConnected && isWrongNetwork && (
            <div className="rounded-md border border-red/40 bg-red-dim p-4">
              <p className="font-body text-sm text-red">Wrong network. Switch to Sepolia.</p>
            </div>
          )}

          <div className="card-gradient-border rounded-md p-4">
            <p className="font-body text-sm text-foreground line-clamp-2">{question || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs text-text-secondary">
              <span>Close: {closeTime ? closeTime.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}</span>
              <span>Resolve: {resolveTime ? resolveTime.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}</span>
            </div>
            {gasEstimate && (
              <p className="mt-2 font-mono text-xs text-text-muted">Est. gas cost: {gasEstimate}</p>
            )}
          </div>

          <div>
            <label className="block font-display font-bold text-xs text-text-muted tracking-widest uppercase mb-3">
              MARKET TYPE
            </label>
            <div className="grid grid-cols-3 gap-3">
              {MARKET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => form.setValue("marketType", t.value)}
                  className={cn(
                    "rounded-md border p-4 text-left transition-colors",
                    marketType === t.value
                      ? "border-cyan bg-cyan-dim"
                      : "border-border bg-elevated hover:border-border-bright"
                  )}
                >
                  <span className="font-display font-bold text-foreground">{t.label}</span>
                  <p className="mt-1 font-body text-xs text-text-secondary">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isConnected || isWrongNetwork || writePending || deploySuccess}
            className="w-full h-14 font-display font-extrabold text-lg bg-gradient-to-br from-cyan to-violet text-black border-0 hover:brightness-110"
            style={{ height: 56 }}
          >
            {deploySuccess ? (
              <>
                <Check className="mr-2 h-5 w-5 animate-in" aria-hidden />
                Deployed!
              </>
            ) : writePending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                Deploying...
              </>
            ) : (
              "DEPLOY MARKET ON-CHAIN"
            )}
          </Button>
        </form>
      )}

      {/* Navigation */}
      {step < 3 && (
        <div className="mt-10 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={step === 1}
            className="font-body border-border"
            aria-label="Previous step"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back
          </Button>
          <Button
            type="button"
            onClick={goNext}
            className="font-body bg-cyan text-black hover:bg-cyan/90 border-0"
            aria-label="Next step"
          >
            Continue
            <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Button>
        </div>
      )}

      <div className="mt-8">
        <Button asChild variant="ghost" size="sm" className="font-body text-text-muted" aria-label="Back to markets">
          <Link href="/">
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
            Back to markets
          </Link>
        </Button>
      </div>
    </div>
  );
}
