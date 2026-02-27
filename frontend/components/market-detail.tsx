"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Info, Loader2 } from "lucide-react";
import type { MarketView, PredictionView } from "@/types/api";
import { formatDate, formatEth, formatRelativeTime } from "@/lib/utils";
import { predictionMarketContract, OUTCOME, EXPLORER_URL } from "@/lib/constants";
import { OHLCVChart, type IndicatorId } from "@/components/ohlcv-chart";
import { useCountdown, CountdownBlocks } from "@/components/countdown";
import { BetForm } from "@/components/bet-form";
import { CreatorReputationBadge } from "@/components/creator-reputation-badge";
import { PHPEHistoryChart } from "@/components/phpe-history-chart";
import { ShareMarketButton } from "@/components/share-market-button";
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
import { usePHPEPrediction } from "@/hooks/use-phpe-prediction";
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
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [indicators, setIndicators] = useState<Set<IndicatorId>>(new Set(["ma7", "volume"]));
  const [stakesMounted, setStakesMounted] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { writeContractAsync, isPending: writePending } = useWriteContract();
  // balance y writePending se usan en CARD 2 (claimPayout) y CARD 3 (BetForm delegado)

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

  useEffect(() => {
    const t = setTimeout(() => setStakesMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
            <ShareMarketButton market={market} className="ml-auto" />
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
          <div className="border border-border-bright rounded-b-md overflow-x-auto overflow-y-hidden md:overflow-visible" style={{ background: "var(--bg-base)" }}>
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

        {/* SECCIÓN 5 — PHPE Probability Trend */}
        <PHPEHistoryChart predictions={predictions} />
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

        {/* CARD 1b — Creator */}
        {(market.creator || marketOnChain?.creator) && (
          <div className="rounded-md border border-border bg-surface p-4">
            <h3
              className="mb-3 font-display font-bold tracking-widest text-text-muted"
              style={{ fontSize: 12 }}
            >
              CREATOR
            </h3>
            <CreatorReputationBadge
              address={(market.creator || marketOnChain!.creator) as string}
            />
          </div>
        )}

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
        <div className="rounded-md border border-border bg-surface p-4">
          <h3 className="font-display font-bold text-[13px] text-text-muted tracking-widest mb-4">
            PLACE BET
          </h3>
          <BetForm marketId={marketId} marketStatus={market.status} question={market.question} />
        </div>

        {/* CARD 4 — PHPE AI Preview */}
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
              <PHPEWidget marketId={marketId} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── PHPE Components ──────────────────────────────────────────────────────────

const BINANCE_SYMBOLS_PHPE = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;

interface PHPEResultProps {
  probability: number;
  uncertainty?: number;
}

function PHPEResult({ probability, uncertainty }: PHPEResultProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const target = probability * 100;
    let current = 0;
    let rafId: number;
    const step = () => {
      current = Math.min(current + 2, target);
      setDisplayed(current);
      if (current < target) {
        rafId = requestAnimationFrame(step);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [probability]);

  const low = uncertainty != null ? Math.max(0, probability - uncertainty) * 100 : null;
  const high = uncertainty != null ? Math.min(1, probability + uncertainty) * 100 : null;
  const isPositive = displayed >= 50;

  return (
    <div className="mt-4 space-y-2">
      {/* Número grande + incertidumbre */}
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-3xl font-bold tabular-nums transition-colors",
            isPositive ? "text-green" : "text-red"
          )}
        >
          {displayed.toFixed(1)}%
        </span>
        {uncertainty != null && (
          <span className="font-mono text-sm text-violet">
            ± {(uncertainty * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Barra con banda de incertidumbre */}
      <div
        className="relative h-3 w-full rounded-full bg-surface overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(displayed)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Banda de incertidumbre */}
        {low != null && high != null && (
          <div
            className="absolute top-0 h-full rounded-sm"
            style={{
              left: `${low}%`,
              width: `${high - low}%`,
              background: "var(--violet-dim, rgba(139,92,246,0.2))",
              border: "1px solid var(--violet, #8b5cf6)",
              transition: "all 0.5s ease",
            }}
            aria-hidden
          />
        )}
        {/* Barra principal */}
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${displayed}%`,
            background: isPositive ? "var(--green, #22c55e)" : "var(--red, #ef4444)",
            transition: "width 0.05s linear",
          }}
          aria-hidden
        />
      </div>

      <p className="font-mono text-[10px] text-text-muted italic">
        Model: PHPE v2 • Not stored on-chain
      </p>
    </div>
  );
}

function PHPEWidget({ marketId }: { marketId: number }) {
  const [sentimentText, setSentimentText] = useState("");
  const [binanceSymbol, setBinanceSymbol] = useState("ETHUSDT");
  const [useChainlink, setUseChainlink] = useState(true);

  const { mutate: predict, data, isPending, error, reset } = usePHPEPrediction(marketId);

  const handlePredict = () => {
    reset();
    predict({
      sentimentText: sentimentText.trim() || undefined,
      binanceSymbol,
      useChainlink,
    });
  };

  return (
    <div className="space-y-3">
      {/* Sentiment text */}
      <div>
        <label className="mb-1 block font-mono text-[11px] text-text-muted uppercase tracking-widest">
          Sentiment text (optional)
        </label>
        <Textarea
          placeholder="Paste news, tweet, or any text context..."
          value={sentimentText}
          onChange={(e: { target: { value: string } }) => setSentimentText(e.target.value)}
          className="font-mono text-sm min-h-[72px] bg-elevated border-border resize-none"
          disabled={isPending}
        />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Binance symbol */}
        <Select
          value={binanceSymbol}
          onValueChange={setBinanceSymbol}
          disabled={isPending}
        >
          <SelectTrigger className="font-mono text-xs bg-elevated border-border h-8 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BINANCE_SYMBOLS_PHPE.map((s) => (
              <SelectItem key={s} value={s} className="font-mono text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Chainlink toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useChainlink}
            onChange={(e) => setUseChainlink(e.target.checked)}
            disabled={isPending}
            className="h-3.5 w-3.5 accent-cyan"
          />
          <span className="font-mono text-xs text-text-muted">Chainlink</span>
        </label>

        {/* Predict button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePredict}
          disabled={isPending}
          className="ml-auto border-violet text-violet hover:bg-violet-dim font-display font-bold tracking-widest h-8 px-4"
          aria-label="Get AI prediction"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              Analyzing…
            </>
          ) : (
            "GET AI PREDICTION"
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p className="font-mono text-xs text-red" role="alert">
          {error instanceof Error ? error.message : "Prediction failed"}
        </p>
      )}

      {/* Resultado animado */}
      {data && !isPending && (
        <PHPEResult probability={data.probability} uncertainty={data.uncertainty} />
      )}
    </div>
  );
}

// ─── PredictionRow ────────────────────────────────────────────────────────────

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
