"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Info, Loader2 } from "lucide-react";
import type { MarketView, PredictionView } from "@/types/api";
import { getSentiment, getHybridPrediction } from "@/lib/api";
import { formatDate, formatEth, formatRelativeTime } from "@/lib/utils";
import { predictionMarketContract, OUTCOME, EXPLORER_URL } from "@/lib/constants";
import { OHLCVChart, type IndicatorId } from "@/components/ohlcv-chart";
import { useCountdown, CountdownBlocks } from "@/components/countdown";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import type { Timeframe } from "@/lib/ohlcv-utils";

export interface MarketOnChain {
  question: string;
  closeTime: bigint;
  resolveTime: bigint;
  status: number;
  outcome: number;
  totalYesStake: bigint;
  totalNoStake: bigint;
  creator: string;
}

export interface UserStakeOnChain {
  yesStake: bigint;
  noStake: bigint;
}

const betSchema = z.object({
  amount: z.string().min(1, "Amount required"),
}).refine(
  (data) => {
    const n = Number.parseFloat(data.amount);
    return !Number.isNaN(n) && n >= 0.001;
  },
  { message: "Min 0.001 ETH", path: ["amount"] }
);

type BetFormValues = z.infer<typeof betSchema>;

const BINANCE_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;
const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "24h", "1W", "1M"];
const INDICATOR_PILLS: { id: IndicatorId; label: string }[] = [
  { id: "ma7", label: "MA" },
  { id: "bb", label: "BB" },
  { id: "macd", label: "MACD" },
  { id: "rsi", label: "RSI" },
  { id: "stochRsi", label: "Stoch RSI" },
  { id: "stoch", label: "Stochastic" },
  { id: "ichimoku", label: "Ichimoku" },
  { id: "atr", label: "ATR" },
  { id: "volume", label: "Volume" },
  { id: "obv", label: "OBV" },
  { id: "bop", label: "BOP" },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-open",
  Locked: "badge-locked",
  Resolved: "badge-resolved",
  Cancelled: "badge-cancelled",
};

export interface MarketDetailProps {
  marketId: number;
  market: MarketView;
  predictions: PredictionView[];
  marketOnChain: MarketOnChain | null;
  userStake: UserStakeOnChain | null;
}

export function MarketDetail({
  marketId,
  market,
  predictions,
  marketOnChain,
  userStake,
}: MarketDetailProps) {
  const [aiCollapsed, setAiCollapsed] = useState(true);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<{ probability: number; sentiment_score?: number; provider?: string } | null>(null);
  const [hybridLoading, setHybridLoading] = useState(false);
  const [hybridResult, setHybridResult] = useState<{ probability: number; uncertainty?: number } | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [indicators, setIndicators] = useState<Set<IndicatorId>>(new Set(["ma7", "volume"]));
  const [stakesMounted, setStakesMounted] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { writeContractAsync, isPending: writePending } = useWriteContract();

  const totalYes = marketOnChain ? marketOnChain.totalYesStake : BigInt(Number(market.total_yes_stake));
  const totalNo = marketOnChain ? marketOnChain.totalNoStake : BigInt(Number(market.total_no_stake));
  const totalStake = totalYes + totalNo;
  const yesPct = totalStake > BigInt(0) ? Number((totalYes * BigInt(100)) / totalStake) : 50;
  const noPct = 100 - yesPct;

  const isResolved = market.status === "Resolved";
  const outcomeYes = market.outcome === "Yes" || marketOnChain?.outcome === OUTCOME.YES;
  const outcomeNo = market.outcome === "No" || marketOnChain?.outcome === OUTCOME.NO;
  const userWon = isResolved && userStake && ((outcomeYes && userStake.yesStake > BigInt(0)) || (outcomeNo && userStake.noStake > BigInt(0)));
  const claimable = userWon && userStake ? (outcomeYes ? userStake.yesStake : userStake.noStake) : BigInt(0);

  const betForm = useForm<BetFormValues>({
    resolver: zodResolver(betSchema),
    defaultValues: { amount: "" },
  });
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const amount = betForm.watch("amount");
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);

  useEffect(() => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) < 0.001) {
      setGasEstimate(null);
      return;
    }
    setGasEstimate("≈ 0.002 ETH gas");
  }, [amount]);

  useEffect(() => {
    const t = setTimeout(() => setStakesMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const onPlaceBet = betForm.handleSubmit(async (data) => {
    if (!address) return;
    const amt = Number.parseFloat(data.amount);
    if (balance && amt > Number(formatEther(balance.value))) {
      betForm.setError("amount", { message: "Exceeds balance" });
      return;
    }
    try {
      toast.info("Confirm in wallet");
      const hash = await writeContractAsync({
        ...predictionMarketContract,
        functionName: "placeBet",
        args: [BigInt(marketId), selectedOutcome === "yes" ? OUTCOME.YES : OUTCOME.NO],
        value: parseEther(data.amount),
      });
      toast.success("Bet placed!", {
        action: hash ? { label: "View tx", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") } : undefined,
      });
      betForm.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction failed");
    }
  });

  const onClaimPayout = async () => {
    try {
      toast.info("Confirm in wallet");
      const hash = await writeContractAsync({
        ...predictionMarketContract,
        functionName: "claimPayout",
        args: [BigInt(marketId)],
      });
      toast.success("Payout claimed!", {
        action: hash ? { label: "View on Etherscan", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") } : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Claim failed");
    }
  };

  const closeUnix = market.close_time;
  const resolveUnix = market.resolve_time;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.86fr_1fr] lg:gap-6" style={{ gap: 24 }}>
      {/* ——— MAIN COLUMN ——— */}
      <div className="min-w-0 space-y-6" style={{ gap: 24 }}>
        {/* SECCIÓN 1 — Market Header */}
        <div>
          <nav className="font-mono text-xs text-text-muted mb-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Markets</Link>
            <span className="mx-1">/</span>
            <span>#{marketId}</span>
          </nav>
          <h1 className="font-display font-extrabold text-[28px] leading-tight text-foreground line-clamp-3">
            {market.question}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-md px-2 py-0.5 font-mono text-[11px] uppercase", STATUS_BADGE_CLASS[market.status] ?? "badge-cancelled")}>
              {market.status}
            </span>
            <span className="rounded-md border border-border bg-elevated px-2 py-0.5 font-mono text-[11px] uppercase text-text-secondary">
              {market.market_type || "Base"}
            </span>
            {isResolved && (
              <span
                className={cn(
                  "rounded-md px-3 py-1 font-display font-bold text-[18px]",
                  outcomeYes ? "bg-green-dim text-green border border-green/30" : "bg-red-dim text-red border border-red/30"
                )}
              >
                RESOLVED: {outcomeYes ? "YES ✓" : "NO ✗"}
              </span>
            )}
          </div>
        </div>

        {/* SECCIÓN 2 — OHLCV Chart */}
        <div className="scanlines relative rounded-md border border-border bg-surface overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-display font-bold text-[13px] text-text-muted tracking-widest">
                ODDS CHART
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      "rounded px-2.5 py-1 font-mono text-xs transition-colors",
                      timeframe === tf ? "bg-cyan-dim border border-cyan text-cyan" : "bg-transparent border border-border text-text-muted hover:text-foreground"
                    )}
                    aria-pressed={timeframe === tf}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {INDICATOR_PILLS.map(({ id, label }) => (
                <label
                  key={id}
                  className={cn(
                    "cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
                    indicators.has(id) ? "bg-violet-dim border-violet text-violet" : "bg-transparent border-border text-text-muted hover:text-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={indicators.has(id)}
                    onChange={() => {
                      const next = new Set(indicators);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      setIndicators(next);
                    }}
                    className="sr-only"
                    aria-label={label}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="border border-border-bright rounded-b-md overflow-x-auto overflow-y-hidden md:overflow-visible" style={{ background: "#050810" }}>
            <div className="min-w-[480px]">
            <OHLCVChart
              height={380}
              embedded
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              indicators={indicators}
              onIndicatorsChange={setIndicators}
            />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3 — Stakes */}
        <div>
          <h2 className="font-display font-bold text-[13px] text-text-muted tracking-widest mb-3">
            MARKET STAKES
          </h2>
          <div className="space-y-3">
            <div className="relative h-10 overflow-hidden rounded-md bg-elevated" style={{ height: 40 }}>
              <div
                className="absolute inset-y-0 left-0 rounded-l-md bg-gradient-to-r from-green to-green/80 transition-[width] duration-1000 ease-out"
                style={{ width: stakesMounted ? `${yesPct}%` : "0%" }}
              />
              {yesPct > 30 && (
                <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-medium text-foreground mix-blend-difference pointer-events-none">
                  YES — {formatEth(totalYes)} — {yesPct}%
                </span>
              )}
            </div>
            <div className="relative h-10 overflow-hidden rounded-md bg-elevated" style={{ height: 40 }}>
              <div
                className="absolute inset-y-0 left-0 rounded-l-md bg-gradient-to-r from-red to-red/80 transition-[width] duration-1000 ease-out"
                style={{ width: stakesMounted ? `${noPct}%` : "0%" }}
              />
              {noPct > 30 && (
                <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-medium text-foreground mix-blend-difference pointer-events-none">
                  NO — {formatEth(totalNo)} — {noPct}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 4 — PHPE */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-display font-bold text-[13px] text-text-muted tracking-widest">
              PHPE ANALYSIS
            </h2>
            <button
              type="button"
              className="text-text-muted hover:text-foreground"
              title="Probabilistic Hybrid Prediction Engine — combines sentiment, market data and on-chain signals with calibrated uncertainty."
              aria-label="What is PHPE?"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          {predictions.length === 0 ? (
            <p className="font-mono text-sm text-text-muted">No predictions yet</p>
          ) : predictions.length > 1 ? (
            <div className="space-y-4">
              <div className="h-48 w-full rounded-md border border-border bg-elevated/50 p-2">
                {/* Tipos de recharts pueden fallar con React namespace; componentes son válidos en runtime */}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={predictions.slice().reverse().map((p, i) => ({
                      index: i,
                      time: p.timestamp,
                      probability: p.probability * 100,
                    }))}
                  >
                    {/* @ts-expect-error recharts components types vs React */}
                    <XAxis dataKey="index" hide />
                    {/* @ts-expect-error recharts */}
                    <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} width={32} stroke="#666" fontSize={10} />
                    {/* @ts-expect-error recharts */}
                    <RechartsTooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Probability"]} />
                    {/* @ts-expect-error recharts */}
                    <Area type="monotone" dataKey="probability" fill="var(--violet)" fillOpacity={0.15} stroke="none" />
                    {/* @ts-expect-error recharts */}
                    <Line type="monotone" dataKey="probability" stroke="var(--cyan)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-3">
                {predictions.map((p, i) => (
                  <PredictionRow key={i} p={p} />
                ))}
              </ul>
            </div>
          ) : (
            <PredictionRow p={predictions[0]} />
          )}
        </div>
      </div>

      {/* ——— SIDEBAR ——— */}
      <aside className="space-y-6 min-w-0" style={{ gap: 24 }}>
        {/* CARD 1 — Times & Countdown */}
        <div className="rounded-md border border-border bg-surface p-4">
          <CountdownBlocks targetUnix={closeUnix} label="CLOSES IN" />
          <div className="mt-4 pt-4 border-t border-border">
            <CountdownBlocks targetUnix={resolveUnix} label="RESOLVES IN" urgentClassName="border-violet bg-violet-dim text-violet" />
          </div>
        </div>

        {/* CARD 2 — User Position */}
        {isConnected && userStake !== null && (
          <div className="card-gradient-border rounded-md p-4">
            <h3 className="font-display font-bold text-[13px] text-text-muted tracking-widest mb-3">
              YOUR POSITION
            </h3>
            <p className="font-mono text-sm text-foreground">
              YES: {formatEth(userStake.yesStake)} · NO: {formatEth(userStake.noStake)}
            </p>
            {userWon && claimable > BigInt(0) && (
              <div className="mt-4 rounded-md border border-green/40 bg-green-dim p-4">
                <p className="font-display font-bold text-green mb-1">🎉 WINNER</p>
                <p className="font-mono text-sm text-foreground mb-3">Claimable: {formatEth(claimable)}</p>
                <Button
                  onClick={onClaimPayout}
                  disabled={writePending}
                  className="w-full h-12 font-display font-bold text-base bg-green text-black hover:brightness-110 hover:scale-[1.02] transition-all"
                  aria-label="Claim payout"
                >
                  {writePending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                      Claiming...
                    </>
                  ) : (
                    "CLAIM PAYOUT"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* CARD 3 — Bet Form */}
        {market.status === "Open" && (
          <div className="rounded-md border border-border bg-surface p-4">
            <h3 className="font-display font-bold text-[13px] text-text-muted tracking-widest mb-4">
              PLACE BET
            </h3>
            {!isConnected ? (
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-sm text-text-muted">Connect your wallet to place a bet</p>
                <WalletButton />
              </div>
            ) : (
              <form onSubmit={onPlaceBet} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome("yes")}
                    className={cn(
                      "h-12 rounded-md border font-display font-extrabold text-[20px] transition-colors",
                      selectedOutcome === "yes" ? "bg-green-dim border-green text-green" : "bg-elevated border-border text-text-muted"
                    )}
                    aria-pressed={selectedOutcome === "yes"}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome("no")}
                    className={cn(
                      "h-12 rounded-md border font-display font-extrabold text-[20px] transition-colors",
                      selectedOutcome === "no" ? "bg-red-dim border-red text-red" : "bg-elevated border-border text-text-muted"
                    )}
                    aria-pressed={selectedOutcome === "no"}
                  >
                    NO
                  </button>
                </div>
                <div>
                  <div className="flex rounded-md border border-border bg-elevated overflow-hidden">
                    <span className="flex items-center pl-3 font-mono text-cyan">Ξ</span>
                    <Input
                      type="text"
                      placeholder="0.01"
                      className="border-0 bg-transparent font-mono text-[18px] focus-visible:ring-0"
                      {...betForm.register("amount")}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["0.01", "0.05", "0.1", "0.5"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => betForm.setValue("amount", v)}
                        className="rounded-md border border-border bg-elevated px-2 py-1 font-mono text-xs text-text-secondary hover:text-foreground"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {gasEstimate && (
                    <p className="mt-1 font-mono text-[11px] text-text-muted">{gasEstimate}</p>
                  )}
                  {betForm.formState.errors.amount && (
                    <p className="mt-1 text-xs text-red">{betForm.formState.errors.amount.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={writePending}
                  className="w-full h-12 font-display font-extrabold text-base bg-gradient-to-br from-cyan to-violet text-black hover:brightness-110 border-0"
                >
                  {writePending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                      Confirming...
                    </>
                  ) : (
                    "PLACE BET"
                  )}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* CARD 4 — AI Preview */}
        <div className="rounded-md border border-border bg-surface overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 text-left font-display font-bold text-[13px] text-text-muted tracking-widest"
            onClick={() => setAiCollapsed(!aiCollapsed)}
            aria-expanded={!aiCollapsed}
          >
            AI PREVIEW
            {aiCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {!aiCollapsed && (
            <div className="border-t border-border p-4">
              <Tabs defaultValue="sentiment" className="w-full">
                <TabsList className="mb-3 bg-elevated border border-border">
                  <TabsTrigger value="sentiment" className="font-body text-xs">Sentiment</TabsTrigger>
                  <TabsTrigger value="hybrid" className="font-body text-xs">Hybrid</TabsTrigger>
                </TabsList>
                <TabsContent value="sentiment" className="mt-0 space-y-3">
                  <Textarea placeholder="Paste text (news, tweet...)" className="font-mono text-sm min-h-[80px] bg-elevated border-border" id="sentiment-text" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-cyan text-cyan hover:bg-cyan-dim"
                    disabled={sentimentLoading}
                    onClick={async () => {
                      const el = document.getElementById("sentiment-text") as HTMLTextAreaElement | null;
                      const text = el?.value?.trim();
                      if (!text) { toast.error("Enter some text"); return; }
                      setSentimentLoading(true);
                      setSentimentResult(null);
                      try {
                        const res = await getSentiment(text);
                        setSentimentResult({ probability: res.probability, sentiment_score: res.sentiment_score, provider: res.provider });
                      } catch (e) { toast.error(e instanceof Error ? e.message : "Analysis failed"); }
                      finally { setSentimentLoading(false); }
                    }}
                  >
                    {sentimentLoading ? "Analyzing..." : "ANALYZE"}
                  </Button>
                  {sentimentResult && (
                    <p className="font-mono text-sm text-violet">Probability: {Math.round(sentimentResult.probability * 100)}%</p>
                  )}
                </TabsContent>
                <TabsContent value="hybrid" className="mt-0 space-y-3">
                  <Input placeholder="Sentiment text (optional)" className="font-mono text-sm bg-elevated border-border" id="hybrid-sentiment" />
                  <Select defaultValue="ETHUSDT">
                    <SelectTrigger className="font-mono text-sm bg-elevated border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BINANCE_SYMBOLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-violet text-violet hover:bg-violet-dim"
                    disabled={hybridLoading}
                    onClick={async () => {
                      const el = document.getElementById("hybrid-sentiment") as HTMLInputElement | null;
                      setHybridLoading(true);
                      setHybridResult(null);
                      try {
                        const res = await getHybridPrediction({ market_id: marketId, sentiment_text: el?.value?.trim(), social_texts: [] });
                        setHybridResult({ probability: res.probability, uncertainty: res.uncertainty });
                      } catch (e) { toast.error(e instanceof Error ? e.message : "Prediction failed"); }
                      finally { setHybridLoading(false); }
                    }}
                  >
                    {hybridLoading ? "Predicting..." : "PREDICT"}
                  </Button>
                  {hybridResult && (
                    <p className="font-mono text-sm text-violet">
                      {Math.round(hybridResult.probability * 100)}% ±{hybridResult.uncertainty != null ? Math.round(hybridResult.uncertainty * 100) : "?"}%
                    </p>
                  )}
                </TabsContent>
              </Tabs>
              <p className="mt-3 font-body text-[10px] text-text-muted italic">Preview only — not stored on-chain</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function PredictionRow({ p }: { p: PredictionView }) {
  const unc = p.uncertainty ?? 0;
  const low = Math.max(0, (p.probability - unc) * 100);
  const high = Math.min(100, (p.probability + unc) * 100);
  const mid = p.probability * 100;
  return (
    <div className="rounded-md border border-border bg-elevated/50 p-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl text-cyan tabular-nums shrink-0">{Math.round(mid)}%</span>
        <div className="flex-1 min-w-0">
          <div className="relative h-3 w-full rounded-full bg-surface overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-cyan/30 rounded-full" style={{ left: `${low}%`, width: `${high - low}%` }} />
            <div className="absolute inset-y-0 left-0 w-0.5 h-full bg-cyan rounded-full" style={{ left: `${mid}%` }} />
          </div>
          {unc > 0 && (
            <p className="font-mono text-[11px] text-text-muted mt-1">±{Math.round(unc * 100)}%</p>
          )}
        </div>
      </div>
      {p.model_version && <p className="font-mono text-[11px] text-text-muted mt-1">v{p.model_version}</p>}
      <p className="font-mono text-[11px] text-text-muted">{formatRelativeTime(p.timestamp)}</p>
    </div>
  );
}
