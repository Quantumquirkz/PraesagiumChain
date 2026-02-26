"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useMemo } from "react";
import Link from "next/link";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getMarkets } from "@/lib/api";
import { predictionMarketContract, EXPLORER_URL } from "@/lib/constants";
import { formatEth } from "@/lib/utils";
import type { MarketView } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";
import { Skeleton } from "@/components/ui/skeleton";
import { NoPositions } from "@/components/empty-states/no-positions";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const LIMIT = 50;
const QUESTION_MAX = 40;

const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-open",
  Locked: "badge-locked",
  Resolved: "badge-resolved",
  Cancelled: "badge-cancelled",
};

function truncateQuestion(q: string, max = QUESTION_MAX): string {
  if (q.length <= max) return q;
  return q.slice(0, max).trim() + "…";
}

function parseStake(
  item: { result?: readonly unknown[]; status?: string } | undefined
): { yesStake: bigint; noStake: bigint } | null {
  if (!item?.result || item.result.length < 2) return null;
  return {
    yesStake: item.result[0] as bigint,
    noStake: item.result[1] as bigint,
  };
}

type PositionItem = {
  market: MarketView;
  stake: { yesStake: bigint; noStake: bigint };
  result: "won" | "lost" | "pending";
  claimable: bigint;
  side: string;
  stakeAmount: bigint;
};

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending: claimPending } = useWriteContract();

  const { data: marketsData, isLoading: marketsLoading } = useQuery({
    queryKey: ["markets-positions", 1, LIMIT],
    queryFn: () => getMarkets(1, LIMIT),
    enabled: !!address,
  });

  const markets = useMemo(() => marketsData?.items ?? [], [marketsData?.items]);
  const contracts = useMemo(
    () =>
      address
        ? markets.map((m: MarketView) => ({
            ...predictionMarketContract,
            functionName: "getUserStake" as const,
            args: [BigInt(m.id), address] as const,
          }))
        : [],
    [address, markets]
  );

  const { data: stakesResult, isLoading: stakesLoading } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const positions = useMemo(() => {
    const results = stakesResult?.map((r: { result?: readonly unknown[]; status?: string } | undefined) => parseStake(r)) ?? [];
    return markets
      .map((market: MarketView, i: number) => {
        const stake = results[i];
        if (!stake || (stake.yesStake === BigInt(0) && stake.noStake === BigInt(0))) return null;
        const isResolved = market.status === "Resolved";
        const outcomeYes = market.outcome === "Yes";
        const outcomeNo = market.outcome === "No";
        const won = isResolved && ((outcomeYes && stake.yesStake > BigInt(0)) || (outcomeNo && stake.noStake > BigInt(0)));
        const lost = isResolved && !won;
        const claimable = won ? (outcomeYes ? stake.yesStake : stake.noStake) : BigInt(0);
        const side = stake.yesStake >= stake.noStake && stake.yesStake > BigInt(0) ? "yes" : "no";
        const stakeAmount = side === "yes" ? stake.yesStake : stake.noStake;
        return {
          market,
          stake,
          result: isResolved ? (won ? "won" : "lost") : "pending" as const,
          claimable,
          side,
          stakeAmount,
        };
      })
      .filter((p: PositionItem | null): p is PositionItem => p != null);
  }, [markets, stakesResult]);

  const stats = useMemo(() => {
    let totalInvested = BigInt(0);
    let totalClaimable = BigInt(0);
    let activeBets = 0;
    for (const p of positions) {
      totalInvested += p.stake.yesStake + p.stake.noStake;
      totalClaimable += p.claimable;
      if (p.market.status === "Open" || p.market.status === "Locked") activeBets++;
    }
    return { totalInvested, totalClaimable, activeBets };
  }, [positions]);

  const handleClaim = async (marketId: number) => {
    try {
      toast.info("Confirm in wallet");
      const hash = await writeContractAsync({
        ...predictionMarketContract,
        functionName: "claimPayout",
        args: [BigInt(marketId)],
      });
      toast.success("Payout claimed!", {
        action: hash
          ? { label: "View tx", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") }
          : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Claim failed");
    }
  };

  const isLoading = marketsLoading || (markets.length > 0 && stakesLoading);

  if (!isConnected) {
    return (
      <div className="container py-8 px-4">
        <h1 className="font-display font-extrabold text-[36px] text-foreground mb-8">
          MY POSITIONS
        </h1>
        <div className="mx-auto max-w-md rounded-md border border-border bg-surface p-10 flex flex-col items-center justify-center">
          <Wallet className="h-14 w-14 text-text-muted mb-4" aria-hidden />
          <p className="font-body text-center text-text-secondary mb-6">
            Connect your wallet to view positions
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4">
      <h1 className="font-display font-extrabold text-[36px] text-foreground mb-8">
        MY POSITIONS
      </h1>

      {isLoading ? (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </>
      ) : positions.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <NoPositions className="py-12" />
        </div>
      ) : (
        <>
          {/* Summary row — 3 stat cards */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="font-mono text-xs text-text-muted uppercase tracking-wider">Total Invested</p>
              <p className="font-mono text-lg text-cyan mt-0.5">{formatEth(stats.totalInvested)}</p>
            </div>
            <div className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="font-mono text-xs text-text-muted uppercase tracking-wider">Claimable</p>
              <p
                className={cn(
                  "font-mono text-lg text-green mt-0.5",
                  stats.totalClaimable > BigInt(0) && "animate-pulse"
                )}
              >
                {formatEth(stats.totalClaimable)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="font-mono text-xs text-text-muted uppercase tracking-wider">Active Bets</p>
              <p className="font-mono text-lg text-foreground mt-0.5">{stats.activeBets}</p>
            </div>
          </div>

          {/* Table — desktop */}
          <div className="hidden md:block rounded-md border border-border overflow-hidden bg-surface" style={{ borderRadius: 6 }}>
            <table className="w-full border-collapse" role="table" aria-label="Positions">
              <thead>
                <tr className="bg-elevated">
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4" style={{ padding: "12px 16px" }}>
                    Market
                  </th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">Side</th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">Stake</th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">Status</th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">Result</th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(({ market, stake, result, claimable, side, stakeAmount }: PositionItem, i: number) => (
                  <tr
                    key={market.id}
                    className={cn(
                      "border-b border-border transition-colors hover:bg-elevated fade-up",
                      i === positions.length - 1 && "border-b-0"
                    )}
                    style={{
                      animationDelay: `${i * 0.06}s`,
                      opacity: 0,
                    }}
                  >
                    <td className="py-3.5 px-4" style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/markets/${market.id}`}
                        className="font-body text-foreground hover:text-cyan transition-colors line-clamp-1 max-w-[280px]"
                      >
                        {truncateQuestion(market.question)}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
                          side === "yes" ? "bg-green-dim text-green" : "bg-red-dim text-red"
                        )}
                      >
                        {side === "yes" ? "YES" : "NO"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-sm text-cyan">
                      {formatEth(stakeAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-mono text-[11px] uppercase",
                          STATUS_BADGE_CLASS[market.status] ?? "badge-cancelled"
                        )}
                      >
                        {market.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {result === "won" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-dim text-green px-2 py-0.5 font-body text-xs font-medium">
                          🎯 Won
                        </span>
                      )}
                      {result === "lost" && (
                        <span className="inline-flex items-center rounded-md bg-red-dim text-red px-2 py-0.5 font-body text-xs font-medium">
                          ✗ Lost
                        </span>
                      )}
                      {result === "pending" && (
                        <span className="inline-flex items-center rounded-md bg-gold/20 text-gold px-2 py-0.5 font-body text-xs font-medium">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {claimable > BigInt(0) ? (
                        <Button
                          size="sm"
                          disabled={claimPending}
                          onClick={() => handleClaim(market.id)}
                          className="font-mono text-xs bg-green text-black hover:bg-green/90 border-0 h-8"
                          aria-label={`Claim ${formatEth(claimable)} for market ${market.id}`}
                        >
                          {claimPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            `Claim ${formatEth(claimable)}`
                          )}
                        </Button>
                      ) : (
                        <span className="font-mono text-xs text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile — cards */}
          <div className="md:hidden space-y-3">
            {positions.map(({ market, stake, result, claimable, side, stakeAmount }: PositionItem, i: number) => (
              <div
                key={market.id}
                className={cn(
                  "rounded-md border border-border bg-surface p-4 fade-up",
                  i === positions.length - 1 && "border-b"
                )}
                style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}
              >
                <Link
                  href={`/markets/${market.id}`}
                  className="font-body text-foreground hover:text-cyan transition-colors line-clamp-2 block mb-2"
                >
                  {truncateQuestion(market.question, 50)}
                </Link>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[11px]",
                      side === "yes" ? "bg-green-dim text-green" : "bg-red-dim text-red"
                    )}
                  >
                    {side === "yes" ? "YES" : "NO"}
                  </span>
                  <span className="font-mono text-xs text-cyan">{formatEth(stakeAmount)}</span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 font-mono text-[11px] uppercase",
                      STATUS_BADGE_CLASS[market.status] ?? "badge-cancelled"
                    )}
                  >
                    {market.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  {result === "won" && (
                    <span className="text-green font-body text-xs font-medium">🎯 Won</span>
                  )}
                  {result === "lost" && (
                    <span className="text-red font-body text-xs font-medium">✗ Lost</span>
                  )}
                  {result === "pending" && (
                    <span className="text-gold font-body text-xs font-medium">⏳ Pending</span>
                  )}
                  {claimable > BigInt(0) ? (
                    <Button
                      size="sm"
                      disabled={claimPending}
                      onClick={() => handleClaim(market.id)}
                      className="font-mono text-xs bg-green text-black hover:bg-green/90 border-0 h-8"
                      aria-label={`Claim ${formatEth(claimable)}`}
                    >
                      {claimPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Claim ${formatEth(claimable)}`}
                    </Button>
                  ) : (
                    <span className="font-mono text-xs text-text-muted">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
