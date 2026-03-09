"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseEventLogs } from "viem";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Link2, AlertTriangle, Wifi, Lock, Copy, CheckCircle, Sparkles, Coins, Globe, Trophy, Cloud, BarChart2 } from "lucide-react";
import { createMarketBackend, registerPrivateMarket, getAISentimentPreview } from "@/lib/api";
import { predictionMarketContract, EXPLORER_URL, BET_TOKENS, CHART_CRYPTO_SYMBOLS, CHART_CRYPTO_BINANCE_LIST, type BetToken } from "@/lib/constants";
import { predictionMarketAbi } from "@/lib/abis/prediction-market";
import { privatePredictionMarketAbi } from "@/lib/abis/private-prediction-market";
import { formatEth, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ResolutionSourcePicker,
  type ResolutionSourceParams,
} from "@/components/resolution-source-picker";
import { LiveContextPreview } from "@/components/live-context-preview";
import { useNetworkGuard } from "@/hooks/use-network-guard";
import { useIsMounted } from "@/hooks/use-is-mounted";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PRIVATE_MARKET_ADDRESS = (process.env
  .NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

const IS_PRIVATE_DEPLOYED =
  PRIVATE_MARKET_ADDRESS !== "0x0000000000000000000000000000000000000000";

const MARKET_CATEGORIES = [
  { value: "crypto",  label: "Crypto",  description: "Price, volatility, or market predictions", icon: Coins,   color: "text-amber-400", border: "border-amber-400/40", bg: "bg-amber-400/10" },
  { value: "general", label: "General", description: "Events, politics, or any yes/no outcome",   icon: Globe,  color: "text-cyan",      border: "border-cyan/40",     bg: "bg-cyan/10" },
  { value: "sports",  label: "Sports",  description: "Match results, tournaments, or outcomes",   icon: Trophy, color: "text-green-400",  border: "border-green-400/40", bg: "bg-green-400/10" },
  { value: "weather", label: "Weather", description: "Rain, temperature, or climate events",      icon: Cloud,  color: "text-blue-400",  border: "border-blue-400/40", bg: "bg-blue-400/10" },
] as const;

const MARKET_TYPES = [
  { value: "base",        label: "Base",        description: "Standard binary outcome market (yes/no)"                          },
  { value: "conditional", label: "Conditional", description: "Depends on another market outcome"                               },
  { value: "private",     label: "Private",     description: "Positions hidden until reveal — commit-reveal cryptography"      },
] as const;

const QUESTION_TEMPLATES = [
  { label: "BTC > $X", value: "Will BTC exceed $100,000 by December 31, 2025?", icon: BarChart2 },
  { label: "ETH > $X", value: "Will ETH exceed $4,000 before March 2026?", icon: BarChart2 },
  { label: "Custom", value: "", icon: BarChart2 },
] as const;

const RESOLUTION_TYPE_BY_CATEGORY = {
  crypto: "price_above" as const,
  general: "ai_sentiment" as const,
  sports: "sports_winner" as const,
  weather: "weather_rained" as const,
} as const;

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
  const [marketCategory, setMarketCategory] = useState<"crypto" | "general" | "sports" | "weather">("crypto");
  const [deploySuccess, setDeploySuccess] = useState(false);

  const [accessKeyModal, setAccessKeyModal] = useState<{ open: boolean; accessKey?: string }>({ open: false });
  const [copiedKey, setCopiedKey] = useState(false);
  const [betToken, setBetToken] = useState<BetToken>(BET_TOKENS[0]!);
  const [resolutionParams, setResolutionParams] = useState<ResolutionSourceParams>({
    type: "price_above",
    symbol: "BTCUSDT",
    priceSource: "binance",
  });
  /** Which crypto chart to show on the market page (crypto category only). Persisted in metadata.chartSymbol. */
  const [chartSymbolToDisplay, setChartSymbolToDisplay] = useState<string>("BTCUSDT");

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: writePending } = useWriteContract();
  const { isWrongNetwork, switchToRequired, isSwitching, walletChainId } = useNetworkGuard();
  const mounted = useIsMounted();

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
  const [now, setNow] = useState<number>(0);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
  const [aiPreviewResult, setAiPreviewResult] = useState<{ probability: number; sentiment_score?: number; provider?: string } | null>(null);
  const [aiPreviewError, setAiPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, [closeTimeStr, resolveTimeStr]);

  useEffect(() => {
    if (question.length < 10) {
      setAiPreviewResult(null);
      setAiPreviewError(null);
      return;
    }
    const t = setTimeout(() => {
      setAiPreviewLoading(true);
      setAiPreviewError(null);
      getAISentimentPreview(question)
        .then((res) => {
          setAiPreviewResult({ probability: res.probability, sentiment_score: res.sentiment_score, provider: res.provider });
        })
        .catch((err) => {
          setAiPreviewResult(null);
          setAiPreviewError(err instanceof Error ? err.message : "Backend error");
        })
        .finally(() => setAiPreviewLoading(false));
    }, 800);
    return () => clearTimeout(t);
  }, [question]);

  useEffect(() => {
    const type = RESOLUTION_TYPE_BY_CATEGORY[marketCategory];
    setResolutionParams((prev) => {
      const next = { ...prev, type };
      if (marketCategory === "crypto") next.symbol = betToken.symbol + "USDT";
      return next;
    });
  }, [marketCategory, betToken.symbol]);

  /** When resolution symbol changes for crypto, sync chart to display if it matches a known symbol. */
  useEffect(() => {
    if (marketCategory !== "crypto") return;
    const sym = resolutionParams.symbol?.toUpperCase?.()?.replace?.(/USDT$/, "")?.trim?.();
    const binance = sym ? `${sym}USDT` : "BTCUSDT";
    if (CHART_CRYPTO_BINANCE_LIST.includes(binance)) setChartSymbolToDisplay(binance);
  }, [marketCategory, resolutionParams.symbol]);

  useEffect(() => {
    if (!question || !closeTimeStr || !resolveTimeStr) {
      setGasEstimate(null);
      return;
    }
    const currentTime = Date.now();
    const close = new Date(closeTimeStr);
    const resolve = new Date(resolveTimeStr);
    if (close.getTime() <= currentTime || resolve.getTime() <= close.getTime()) {
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
          address: predictionMarketContract.address,
          abi: predictionMarketAbi,
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

  const questionStep = marketCategory === "crypto" ? 3 : 2;
  const timelineStep = marketCategory === "crypto" ? 4 : 3;
  const resolutionStep = marketCategory === "crypto" ? 5 : 4;
  const deployStep = marketCategory === "crypto" ? 6 : 5;

  const validateStep = async (s: number): Promise<boolean> => {
    if (s === questionStep) {
      const ok = await form.trigger("question");
      return ok;
    }
    if (s === timelineStep) {
      const ok = await form.trigger(["closeTime", "resolveTime"]);
      return ok;
    }
    return true;
  };

  const totalSteps = marketCategory === "crypto" ? 6 : 5;

  const goNext = async () => {
    const ok = await validateStep(step);
    if (!ok) return;
    if (step < totalSteps) setStep(step + 1);
  };

  const goBack = () => {
    if (step === 2 && marketCategory !== "crypto") {
      setStep(1);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const onSubmit = form.handleSubmit(async (data) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isWrongNetwork) {
      toast.error("Wrong network. Switch to Sepolia.");
      return;
    }
    if (data.marketType === "private" && !IS_PRIVATE_DEPLOYED) {
      toast.error("PrivatePredictionMarket contract is not deployed yet.");
      return;
    }

    const closeUnix = Math.floor(new Date(data.closeTime).getTime() / 1000);
    const resolveUnix = Math.floor(new Date(data.resolveTime).getTime() / 1000);

    const isPrivate = data.marketType === "private";

    try {
      toast.info("Confirm in wallet...");

      const hash = isPrivate
        ? await writeContractAsync({
            address: PRIVATE_MARKET_ADDRESS,
            abi: privatePredictionMarketAbi,
            functionName: "createMarket",
            args: [data.question, BigInt(closeUnix), BigInt(resolveUnix)],
            gas: 2_000_000n,
          })
        : await writeContractAsync({
            address: predictionMarketContract.address,
            abi: [...predictionMarketAbi],
            functionName: "createMarket",
            args: [data.question, BigInt(closeUnix), BigInt(resolveUnix)],
            gas: 2_000_000n,
          });

      if (!publicClient || !hash) {
        toast.success("Market created!");
        setDeploySuccess(true);
        setTimeout(() => router.push(isPrivate ? "/markets/private" : "/"), 1500);
        return;
      }

      let receipt: Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>;
      try {
        receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 240_000, // 4 min — Sepolia can be slow
          confirmations: 1,
        });
      } catch (waitErr) {
        const isTimeout =
          waitErr != null &&
          typeof (waitErr as Error).message === "string" &&
          ((waitErr as Error).message.includes("timed out") || (waitErr as Error).message.includes("timeout"));
        if (isTimeout) {
          toast.success("Transaction submitted. It may take a moment to confirm.", {
            action: { label: "View on Explorer", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") },
          });
        } else {
          toast.success("Transaction sent. Check the explorer for status.", {
            action: { label: "View on Explorer", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") },
          });
        }
        setDeploySuccess(true);
        setTimeout(() => router.push(isPrivate ? "/markets/private" : "/"), 2000);
        return;
      }

      let newId: number | null = null;
      if (isPrivate) {
        const logs = parseEventLogs({ abi: privatePredictionMarketAbi, logs: receipt.logs });
        const created = logs.find((e) => e.eventName === "MarketCreated");
        newId = created?.args?.marketId != null ? Number(created.args.marketId) : null;

        if (newId != null) {
          try {
            const reg = await registerPrivateMarket({
              on_chain_market_id: newId,
              creator_address: address,
              question: data.question,
              close_time: closeUnix,
              resolve_time: resolveUnix,
            });
            toast.success("Private market created!");
            setDeploySuccess(true);
            setAccessKeyModal({ open: true, accessKey: reg.access_key });
            return; // Modal handles redirect
          } catch (err) {
            toast.warning("Market is on-chain but access key could not be generated. Others can still join if you add the market ID to env.", { duration: 8000 });
          }
        }
        setDeploySuccess(true);
        setTimeout(() => router.push("/markets/private"), 1500);
      } else {
        const logs = parseEventLogs({ abi: predictionMarketAbi, logs: receipt.logs });
        const created = logs.find((e) => e.eventName === "MarketCreated");
        newId = created?.args?.marketId != null ? Number(created.args.marketId) : null;

        toast.success("Market created!", {
          action: { label: "View on Etherscan", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") },
        });
        setDeploySuccess(true);

        const registerPayload = {
          question: data.question,
          close_time: closeUnix,
          resolve_time: resolveUnix,
          creator: address,
          market_type: data.marketType,
          metadata: JSON.stringify({
            category: marketCategory,
            resolution: resolutionParams,
            betToken: betToken.symbol,
            symbol: resolutionParams.symbol ?? betToken.symbol,
            ...(marketCategory === "crypto" && { chartSymbol: chartSymbolToDisplay }),
          }),
          on_chain_market_id: newId ?? undefined,
        };
        // Only register in backend if we have on_chain_market_id; otherwise the indexer will do it later.
        if (newId != null) {
          const maxRetries = 3;
          let lastErr: unknown;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              await createMarketBackend(registerPayload);
              lastErr = undefined;
              break;
            } catch (err) {
              lastErr = err;
              if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, 1500 * attempt));
              }
            }
          }
          if (lastErr != null) {
            toast.warning(
              "Market is on-chain but could not register in the app. It may appear in a few seconds. Refresh the page.",
              { duration: 10000 }
            );
          }
        }

        setTimeout(
          () => (newId != null ? router.push(`/markets/${newId}`) : router.push("/")),
          1500
        );
      }
    } catch (e) {
      // Do not set deploySuccess on error so the user can retry the deploy.
      const msg = e instanceof Error ? e.message : String(e);
      const isUserRejected =
        /user rejected|user denied|not been authorized|rejected the request|User denied/i.test(msg);
      toast.error(
        isUserRejected
          ? "Transaction not signed. Open your wallet (e.g. MetaMask), confirm the popup and click «Confirm»."
          : msg
      );
    }
  });

  // isWrongNetwork comes from useNetworkGuard (already includes isConnected check)

  return (
    <div className="mx-auto w-full max-w-[720px] py-10 px-6" style={{ padding: "40px 24px" }}>
      <header className="mb-10">
        <h1 className="font-display font-extrabold text-[32px] sm:text-[40px] text-foreground leading-tight tracking-tight">
          Create Market
        </h1>
        <p className="mt-2 font-body text-[15px] text-text-secondary max-w-md leading-relaxed">
          Deploy a prediction market on-chain. Choose a category, set your question, timeline, and resolution.
        </p>
      </header>

      {/* Network guard — visible on all steps (only after mount to avoid hydration mismatch) */}
      {mounted && !isConnected && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <Wifi className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <p className="font-body text-sm text-amber-400">
            Connect your wallet to deploy on Sepolia.
          </p>
        </div>
      )}
      {mounted && isConnected && isWrongNetwork && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red/40 bg-red-dim px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red" aria-hidden />
            <p className="font-body text-sm text-red">
              Wrong network — this market deploys on <span className="font-bold">Sepolia</span>.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-red text-red hover:bg-red-dim font-mono text-xs"
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
            aria-label="Switch to Sepolia"
          >
            {isSwitching ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />Switching…</>
            ) : (
              "Switch to Sepolia"
            )}
          </Button>
        </div>
      )}
      {mounted && isConnected && walletChainId !== null && !isWrongNetwork && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-green/20 bg-green-dim px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-green shrink-0" style={{ boxShadow: "0 0 6px var(--green)" }} aria-hidden />
          <p className="font-mono text-xs text-green font-medium">
            Connected to Sepolia — ready to deploy
          </p>
        </div>
      )}

      {/* Stepper */}
      <nav aria-label="Form progress" className="mb-12">
        <div className="flex items-center justify-between">
          {(marketCategory === "crypto"
            ? [
                { num: 1, label: "Category" },
                { num: 2, label: "Token" },
                { num: 3, label: "Question" },
                { num: 4, label: "Timeline" },
                { num: 5, label: "Resolution" },
                { num: 6, label: "Deploy" },
              ]
            : [
                { num: 1, label: "Category" },
                { num: 2, label: "Question" },
                { num: 3, label: "Timeline" },
                { num: 4, label: "Resolution" },
                { num: 5, label: "Deploy" },
              ]
          ).map((s, i, arr) => (
            <div key={s.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center min-w-0">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-display font-bold text-sm transition-all duration-300",
                    step > s.num && "border-green bg-green text-black scale-100",
                    step === s.num && "border-cyan bg-cyan/15 text-cyan ring-4 ring-cyan/20 scale-105",
                    step < s.num && "border-border bg-elevated text-text-muted"
                  )}
                >
                  {step > s.num ? <Check className="h-5 w-5" aria-hidden /> : s.num}
                </div>
                <span
                  className={cn(
                    "mt-2 font-body text-xs font-medium truncate max-w-[72px] sm:max-w-none text-center transition-colors",
                    step > s.num && "text-green",
                    step === s.num && "text-cyan",
                    step < s.num && "text-text-muted"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div
                  className={cn(
                    "mx-1 sm:mx-2 h-0.5 flex-1 min-w-[12px] rounded-full transition-colors duration-300",
                    step > s.num ? "bg-green/80" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Step 1 — Category */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <section className="rounded-xl border border-border bg-elevated/30 p-6 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display font-bold text-base text-foreground">Market category</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2 py-0.5 font-mono text-[10px] text-cyan">Step 1</span>
            </div>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Choose the type of market you want to create. This will guide resolution and display.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MARKET_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const isSelected = marketCategory === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setMarketCategory(c.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                      isSelected ? `${c.border} ${c.bg}` : "border-border bg-elevated/50 hover:border-border-bright hover:bg-elevated"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", isSelected ? c.color : "text-text-muted")} aria-hidden />
                    <div>
                      <p className={cn("font-display font-bold text-sm", isSelected ? c.color : "text-foreground")}>{c.label}</p>
                      <p className="font-body text-xs text-text-secondary mt-0.5">{c.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          <LiveContextPreview
            category={marketCategory}
            chartSymbol={marketCategory === "crypto" ? "BTCUSDT" : undefined}
            question={question}
            className="mt-4"
          />
        </div>
      )}

      {/* Step 2 — Token (crypto only) */}
      {step === 2 && marketCategory === "crypto" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <section className="rounded-xl border border-border bg-elevated/30 p-6 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display font-bold text-base text-foreground">Bet token</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2 py-0.5 font-mono text-[10px] text-cyan">Step 2</span>
            </div>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Choose the crypto asset for this market. Bets settle in SepoliaETH on-chain.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {BET_TOKENS.map((t) => {
                const isSelected = betToken.symbol === t.symbol;
                return (
                  <button
                    key={t.symbol}
                    type="button"
                    onClick={() => setBetToken(t)}
                    className={cn(
                      "rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all duration-200",
                      isSelected ? "shadow-md" : "border-border bg-elevated/50 text-text-muted hover:border-border-bright hover:text-foreground hover:bg-elevated"
                    )}
                    style={isSelected ? { borderColor: t.color, background: `${t.color}14`, color: t.color } : {}}
                  >
                    <span className="text-xl leading-none font-mono" aria-hidden>{t.icon}</span>
                    <span className="font-display font-bold text-xs tracking-wide">{t.symbol}</span>
                    <span className="font-body text-[10px] truncate w-full text-center opacity-80">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Step 2/3 — Question */}
      {((marketCategory === "crypto" && step === 3) || (marketCategory !== "crypto" && step === 2)) && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Question section */}
          <section className="rounded-xl border border-border bg-elevated/30 p-6 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display font-bold text-base text-foreground">Your question</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2 py-0.5 font-mono text-[10px] text-cyan">{marketCategory === "crypto" ? "Step 3" : "Step 2"}</span>
            </div>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">
              Write a clear binary outcome question (yes/no). Participants will bet on the result.
            </p>

            <div className="mb-4">
              <p className="font-body text-xs font-medium text-text-muted mb-2">Quick templates</p>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const isActive = question === t.value || (t.value && question.startsWith(t.value.slice(0, 20)));
                  return (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => handleTemplate(t.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-4 py-2.5 font-body text-sm transition-all duration-200",
                        isActive
                          ? "border-cyan bg-cyan/10 text-cyan shadow-[0_0_0_1px_var(--cyan)]"
                          : "border-border bg-elevated text-text-secondary hover:border-border-bright hover:text-foreground hover:bg-elevated"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <textarea
                placeholder="e.g. Will ETH exceed $4,000 before March 2026?"
                className={cn(
                  "w-full min-h-[120px] rounded-xl border bg-elevated px-4 py-3.5 font-body text-[15px] leading-relaxed text-foreground placeholder:text-text-muted resize-y transition-colors",
                  "focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20",
                  form.formState.errors.question && "border-red focus:border-red focus:ring-red/20"
                )}
                maxLength={500}
                {...form.register("question")}
              />
              <span
                className={cn(
                  "absolute bottom-3 right-3 font-mono text-xs tabular-nums",
                  question.length > 450 ? "text-red" : "text-text-muted"
                )}
              >
                {question.length}/500
              </span>
            </div>
            {form.formState.errors.question && (
              <p className="mt-1.5 text-sm text-red flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {form.formState.errors.question.message}
              </p>
            )}
            {/* AI prediction preview — only when question has enough text */}
            {question.length >= 10 && (
              <div className="mt-4 rounded-xl border border-border bg-elevated/50 p-3 space-y-1.5">
                <p className="font-mono text-[11px] text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet" aria-hidden />
                  AI resolution preview
                </p>
                {aiPreviewLoading && (
                  <p className="font-body text-sm text-text-secondary flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Loading…
                  </p>
                )}
                {!aiPreviewLoading && aiPreviewResult && (
                  <>
                    <p className="font-body text-sm text-foreground">
                      Probability ~{Math.round(aiPreviewResult.probability * 100)}%
                      {aiPreviewResult.sentiment_score != null && (
                        <span className="text-text-muted font-mono text-xs ml-2">
                          (sentiment {aiPreviewResult.sentiment_score.toFixed(2)})
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] text-text-muted">
                      Resolution will use Chainlink CRE with this type of signal.
                    </p>
                  </>
                )}
                {!aiPreviewLoading && aiPreviewError && (
                  <p className="font-body text-xs text-text-muted">
                    {aiPreviewError.includes("unreachable") || aiPreviewError.includes("fetch")
                      ? "Preview unavailable. Backend may be offline. Start the backend (e.g. npm run backend)."
                      : aiPreviewError}
                  </p>
                )}
              </div>
            )}
            {marketCategory !== "crypto" && (
              <p className="mt-4 font-mono text-[11px] text-text-muted flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan/70" aria-hidden />
                Bets are settled in SepoliaETH on-chain.
              </p>
            )}
          </section>
        </div>
      )}

      {/* Step 4/3 — Timeline */}
      {((marketCategory === "crypto" && step === 4) || (marketCategory !== "crypto" && step === 3)) && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <section className="rounded-xl border border-border bg-elevated/30 p-6 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display font-bold text-base text-foreground">Timeline</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2 py-0.5 font-mono text-[10px] text-cyan">{marketCategory === "crypto" ? "Step 4" : "Step 3"}</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              Set when betting closes and when the market resolves.
            </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block font-display font-bold text-xs text-text-muted tracking-wider uppercase mb-2">
                Close time
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
              <label className="block font-display font-bold text-xs text-text-muted tracking-wider uppercase mb-2">
                Resolve time
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
                <span className="text-[10px] font-mono text-cyan bg-elevated px-2 py-1 rounded shrink-0">Close</span>
                <div className="w-4 h-1 shrink-0 bg-transparent" aria-hidden />
                <span className="text-[10px] font-mono text-cyan bg-elevated px-2 py-1 rounded shrink-0">Resolve</span>
                <div className="flex-1 h-1 rounded-r-full bg-cyan/50" />
              </div>
              <span className="h-2 w-2 rounded-full bg-cyan shrink-0" aria-hidden />
            </div>
          )}
          </section>
        </div>
      )}

      {/* Step 5/4 — Resolution Source */}
      {((marketCategory === "crypto" && step === 5) || (marketCategory !== "crypto" && step === 4)) && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <ResolutionSourcePicker
            value={resolutionParams}
            onChange={setResolutionParams}
            compactMode
            onlyAssetPrice={marketCategory === "crypto"}
          />
            {marketCategory === "crypto" && (
            <section className="rounded-xl border border-border bg-elevated/30 p-4">
              <h3 className="font-display font-bold text-sm text-foreground mb-2">Chart to display on market page</h3>
              <p className="text-xs text-text-secondary mb-3">
                Choose which crypto price chart will be shown on this market&apos;s page. This can match the resolution symbol or a related asset.
              </p>
              <div className="flex flex-wrap gap-2">
                {CHART_CRYPTO_SYMBOLS.map((opt) => {
                  const isSelected = chartSymbolToDisplay === opt.binance;
                  return (
                    <button
                      key={opt.binance}
                      type="button"
                      onClick={() => setChartSymbolToDisplay(opt.binance)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 font-mono text-xs font-semibold transition-all duration-200",
                        isSelected ? "border-cyan bg-cyan/15 text-cyan" : "border-border bg-elevated text-text-muted hover:border-border-bright hover:text-foreground"
                      )}
                    >
                      {opt.symbol}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {marketCategory === "crypto" && (
            <LiveContextPreview
              category="crypto"
              chartSymbol={chartSymbolToDisplay}
              question={question}
              className="mt-4"
            />
          )}
          <p className="font-body text-xs text-text-muted">
            The outcome is submitted on-chain by a Chainlink CRE workflow (Compute-Report-Evaluate), using the source you configure above.
          </p>
        </div>
      )}

      {/* Step 6/5 — Deploy */}
      {((marketCategory === "crypto" && step === 6) || (marketCategory !== "crypto" && step === 5)) && (
        <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-300">
          <div className="card-gradient-border rounded-2xl p-4 space-y-3">
            <p className="font-body text-sm text-foreground line-clamp-2">{question || "—"}</p>
            <div className="flex flex-wrap gap-4 font-mono text-xs text-text-secondary">
              <span>Close: {closeTime ? closeTime.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}</span>
              <span>Resolve: {resolveTime ? resolveTime.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}</span>
            </div>
            {/* Bet token summary */}
            <div className="flex items-center gap-2 pt-1">
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Bet token:</span>
              <span
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display font-bold text-xs"
                style={{ borderColor: betToken.color, color: betToken.color, background: `${betToken.color}18` }}
              >
                <span className="text-sm leading-none">{betToken.icon}</span>
                {betToken.symbol}
              </span>
              <span className="font-mono text-[10px] text-text-muted">· settled in SepoliaETH</span>
            </div>
            {marketCategory === "crypto" && (
              <p className="font-mono text-[10px] text-text-muted">
                Resolution symbol: <span className="text-foreground">{resolutionParams.symbol ?? `${betToken.symbol}USDT`}</span>
                {" · "}
                Chart: <span className="text-foreground">{chartSymbolToDisplay}</span>
              </p>
            )}
            <p className="font-mono text-[10px] text-text-muted">
              Bets are in Sepolia ETH; no platform maximum per bet.
            </p>
            {gasEstimate && (
              <p className="font-mono text-xs text-text-muted">Est. gas: {gasEstimate}</p>
            )}
          </div>

          <div>
            <label className="block font-display font-bold text-xs text-text-muted tracking-wider uppercase mb-3">
              Market type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {MARKET_TYPES.map((t) => {
                const isPrivateType = t.value === "private";
                const isSelected = marketType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => form.setValue("marketType", t.value)}
                    disabled={isPrivateType && !IS_PRIVATE_DEPLOYED}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      isSelected && !isPrivateType && "border-cyan bg-cyan-dim",
                      isSelected && isPrivateType && "border-violet bg-violet-dim",
                      !isSelected && "border-border bg-elevated hover:border-border-bright",
                      isPrivateType && !IS_PRIVATE_DEPLOYED && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {isPrivateType && <Lock className="h-3.5 w-3.5 text-violet shrink-0" aria-hidden />}
                      <span
                        className={cn(
                          "font-display font-bold",
                          isSelected && isPrivateType ? "text-violet" : "text-foreground"
                        )}
                      >
                        {t.label}
                      </span>
                    </div>
                    <p className="font-body text-xs text-text-secondary">{t.description}</p>
                  </button>
                );
              })}
            </div>

            {marketType === "private" && IS_PRIVATE_DEPLOYED && (
              <div className="rounded-xl border border-violet/30 bg-violet-dim px-4 py-3 flex items-start gap-2">
                <Lock className="h-4 w-4 text-violet shrink-0 mt-0.5" aria-hidden />
                <p className="font-mono text-[11px] text-violet leading-relaxed">
                  This market will deploy to <code>PrivatePredictionMarket</code>. Bettors submit
                  cryptographic commitments — positions are hidden until reveal (Chainlink Confidential Compute).
                </p>
              </div>
            )}

            {marketType === "private" && !IS_PRIVATE_DEPLOYED && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                <p className="font-mono text-[11px] text-amber-400">
                  PrivatePredictionMarket contract is not deployed. Deploy it first and set{" "}
                  <code>NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS</code>.
                </p>
              </div>
            )}
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
              "Deploy market on-chain"
            )}
          </Button>
        </form>
      )}

      {/* Navigation */}
      {step < totalSteps && (
        <div className="mt-12 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={step === 1}
            className="font-body border-border hover:bg-elevated"
            aria-label="Previous step"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back
          </Button>
          <Button
            type="button"
            onClick={goNext}
            className="font-body bg-cyan text-black hover:bg-cyan/90 border-0 px-6"
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
        <Button asChild variant="ghost" size="sm" className="font-body text-text-muted hover:text-foreground" aria-label="Back to markets">
          <Link href="/">
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
            Back to markets
          </Link>
        </Button>
      </div>

      {/* Access key modal for private markets */}
      <Dialog open={accessKeyModal.open} onOpenChange={(open) => !open && setAccessKeyModal({ open: false })}>
        <DialogContent className="max-w-md border-border bg-surface" showClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-violet">
              <Lock className="h-5 w-5" aria-hidden />
              Access key generated
            </DialogTitle>
            <DialogDescription>
              Share this key so others can join the private market. They can paste it in the Join section on the Private Markets page.
            </DialogDescription>
          </DialogHeader>
          {accessKeyModal.accessKey && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-violet/30 bg-violet-dim/50 p-3 font-mono text-sm">
                <code className="flex-1 break-all text-foreground">{accessKeyModal.accessKey}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={async () => {
                    await navigator.clipboard.writeText(accessKeyModal.accessKey!);
                    setCopiedKey(true);
                    toast.success("Key copied to clipboard");
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  aria-label="Copy access key"
                >
                  {copiedKey ? (
                    <CheckCircle className="h-4 w-4 text-green" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4 text-text-muted" aria-hidden />
                  )}
                </Button>
              </div>
              <p className="font-mono text-[10px] text-text-muted">
                Or share the link: {typeof window !== "undefined" && `${window.location.origin}/markets/private?key=${accessKeyModal.accessKey}`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              className="bg-violet text-white hover:bg-violet/90"
              onClick={() => {
                setAccessKeyModal({ open: false });
                router.push("/markets/private");
              }}
            >
              Continue to Private Markets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
