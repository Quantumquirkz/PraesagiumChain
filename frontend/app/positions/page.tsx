"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { useAccount, useReadContracts } from "wagmi";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Wallet } from "lucide-react";
import { getMarkets } from "@/lib/api";
import { predictionMarketContract, EXPLORER_URL, OUTCOME } from "@/lib/constants";
import { formatEth } from "@/lib/utils";
import type { MarketView } from "@/types/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";
import { NoPositions } from "@/components/empty-states/no-positions";
import { cn } from "@/lib/utils";
import { useClaimWinnings } from "@/hooks/use-claim-winnings";
import { TxStatus } from "@/components/tx-status";
import { useNetworkGuard } from "@/hooks/use-network-guard";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { parseContractError } from "@/lib/contract-errors";
import { TableRowSkeleton, PositionsSummarySkeleton } from "@/components/skeletons";

// ─── Constantes ───────────────────────────────────────────────────────────────

const LIMIT = 50;
const QUESTION_MAX = 40;
const FEE_FACTOR = 98n; // 98/100 = 2% fee

const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-open",
  Locked: "badge-locked",
  Resolved: "badge-resolved",
  Cancelled: "badge-cancelled",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function parseMarketOnChain(
  item: { result?: readonly unknown[]; status?: string } | undefined
): { totalYesStake: bigint; totalNoStake: bigint; outcome: number } | null {
  if (!item?.result || item.result.length < 7) return null;
  const r = item.result as readonly unknown[];
  return {
    totalYesStake: r[5] as bigint,
    totalNoStake: r[6] as bigint,
    outcome: r[4] as number,
  };
}

/** Payout estimado con fee del 2%:
 *  claimable = (userStake / winningSideTotal) * totalPool * 0.98
 *  Usa aritmética entera con factor 1e6 para precisión.
 */
function estimatePayout(
  userStake: bigint,
  winningSideTotal: bigint,
  totalPool: bigint
): bigint {
  if (winningSideTotal === 0n) return 0n;
  return (userStake * totalPool * FEE_FACTOR) / (winningSideTotal * 100n);
}


// ─── Tipos ────────────────────────────────────────────────────────────────────

type PositionResult = "won" | "lost" | "pending" | "claimed";

type PositionItem = {
  market: MarketView;
  stake: { yesStake: bigint; noStake: bigint };
  result: PositionResult;
  /** Payout estimado on-chain con fee del 2% */
  estimatedPayout: bigint;
  side: "yes" | "no" | "both";
  stakeAmount: bigint;
};

// ─── ClaimButton ──────────────────────────────────────────────────────────────

interface ClaimButtonProps {
  marketId: number;
  /** ETH formateado para mostrar en el botón, p.ej. "0.0490 ETH" */
  claimableEth: string;
}

function ClaimButton({ marketId, claimableEth }: ClaimButtonProps) {
  const { claim, hash, isPending, isConfirming, isSuccess, error, reset } =
    useClaimWinnings();
  const queryClient = useQueryClient();
  const { isWrongNetwork, switchToRequired, isSwitching } = useNetworkGuard();

  useEffect(() => {
    if (isSuccess) {
      toast.success(`Claimed ${claimableEth}!`, {
        action: hash
          ? {
              label: "View →",
              onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank"),
            }
          : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["user-stake", marketId] });
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      queryClient.invalidateQueries({ queryKey: ["markets-positions"] });
    }
    if (error) {
      toast.error("Claim failed", { description: parseContractError(error) });
    }
    // Intentionally omit hash, marketId, queryClient — we only react to isSuccess/error transitions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, error]);

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1 font-mono text-xs text-green">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Claimed ✓
        </span>
        <TxStatus hash={hash} requiredConfirmations={3} dismissAfterMs={5_000} />
      </div>
    );
  }

  // ── Guardia: red incorrecta ───────────────────────────────────────────────────
  if (isWrongNetwork) {
    return (
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
        title="Switch to Sepolia to continue"
        className="rounded-md border border-red/40 bg-red/10 px-3 py-1 font-mono text-xs text-red transition-colors hover:bg-red/20 disabled:opacity-60 h-8"
        aria-label="Switch to Sepolia to claim winnings"
      >
        {isSwitching ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Switching…
          </span>
        ) : (
          "⚠ Switch to Sepolia"
        )}
      </button>
    );
  }

  const label = isPending
    ? "Confirm…"
    : isConfirming
    ? "Claiming…"
    : `Claim ${claimableEth}`;

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        size="sm"
        disabled={isPending || isConfirming}
        onClick={() => {
          if (error) reset();
          claim(marketId);
        }}
        title={isWrongNetwork ? "Switch to Sepolia to continue" : undefined}
        className={cn(
          "font-mono text-xs border-0 h-8 transition-all",
          error
            ? "bg-red/20 text-red hover:bg-red/30"
            : "bg-green text-black hover:bg-green/90"
        )}
        aria-label={`Claim winnings for market ${marketId}`}
      >
        {isPending || isConfirming ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : null}
        {label}
      </Button>
      {/* TxStatus aparece en cuanto hay hash, se desvanece 5s tras confirmación */}
      <TxStatus hash={hash} requiredConfirmations={3} dismissAfterMs={5_000} />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const mounted = useIsMounted();

  // 1. Cargar lista de mercados desde la API
  const { data: marketsData, isLoading: marketsLoading, isError: marketsError, error: marketsErrorDetail, refetch: refetchMarkets } = useQuery({
    queryKey: ["markets-positions", 1, LIMIT],
    queryFn: () => getMarkets(1, LIMIT),
    enabled: !!address,
  });

  const markets = useMemo(() => marketsData?.items ?? [], [marketsData?.items]);

  // 2. Leer getUserStake para todos los mercados (usar on_chain_market_id cuando exista para coincidir con el contrato)
  const stakeContracts = useMemo(
    () =>
      address
        ? markets.map((m: MarketView) => ({
            ...predictionMarketContract,
            functionName: "getUserStake" as const,
            args: [BigInt(m.on_chain_market_id ?? m.id), address] as const,
          }))
        : [],
    [address, markets]
  );

  const { data: stakesResult, isLoading: stakesLoading } = useReadContracts({
    contracts: stakeContracts,
    query: { enabled: stakeContracts.length > 0 },
  });

  // 3. Pre-filtrar mercados resueltos con stake > 0 para leer on-chain
  const resolvedWithStake = useMemo(() => {
    if (!stakesResult) return [];
    return markets
      .map((m: MarketView, i: number) => {
        const stake = parseStake(stakesResult[i]);
        if (!stake) return null;
        const hasStake = stake.yesStake > 0n || stake.noStake > 0n;
        if (m.status !== "Resolved" || !hasStake) return null;
        return { market: m, idx: i };
      })
      .filter((x: { market: MarketView; idx: number } | null): x is { market: MarketView; idx: number } => x !== null);
  }, [markets, stakesResult]);

  // 4. Leer getMarket on-chain solo para mercados resueltos con stake (usar on_chain_market_id cuando exista)
  const marketOnChainContracts = useMemo(
    () =>
      resolvedWithStake.map(({ market }: { market: MarketView; idx: number }) => ({
        ...predictionMarketContract,
        functionName: "getMarket" as const,
        args: [BigInt(market.on_chain_market_id ?? market.id)] as const,
      })),
    [resolvedWithStake]
  );

  const { data: marketsOnChainResult } = useReadContracts({
    contracts: marketOnChainContracts,
    query: { enabled: marketOnChainContracts.length > 0 },
  });

  // Mapa marketId → datos on-chain
  const marketOnChainMap = useMemo(() => {
    const map = new Map<
      number,
      { totalYesStake: bigint; totalNoStake: bigint; outcome: number }
    >();
    resolvedWithStake.forEach(({ market }: { market: MarketView; idx: number }, i: number) => {
      const parsed = parseMarketOnChain(marketsOnChainResult?.[i]);
      if (parsed) map.set(market.id, parsed);
    });
    return map;
  }, [resolvedWithStake, marketsOnChainResult]);

  // 5. Construir lista de posiciones
  const positions = useMemo<PositionItem[]>(() => {
    const stakeResults =
      stakesResult?.map((r: { result?: readonly unknown[]; status?: string }) => parseStake(r)) ?? [];

    return markets
      .map((market: MarketView, i: number): PositionItem | null => {
        const stake = stakeResults[i];
        if (!stake) return null;

        const { yesStake, noStake } = stake;
        const isResolved = market.status === "Resolved";

        // Sin stake en absoluto → ignorar
        if (yesStake === 0n && noStake === 0n) return null;

        // Determinar lado dominante para mostrar
        const side: "yes" | "no" | "both" =
          yesStake > 0n && noStake > 0n
            ? "both"
            : yesStake > 0n
            ? "yes"
            : "no";
        const stakeAmount = yesStake + noStake;

        if (!isResolved) {
          return {
            market,
            stake,
            result: "pending",
            estimatedPayout: 0n,
            side,
            stakeAmount,
          };
        }

        // Mercado resuelto — determinar outcome
        const onChain = marketOnChainMap.get(market.id);
        // Preferir outcome on-chain; fallback a API
        const outcomeNum =
          onChain?.outcome ??
          (market.outcome === "Yes"
            ? OUTCOME.YES
            : market.outcome === "No"
            ? OUTCOME.NO
            : OUTCOME.NONE);

        const outcomeIsYes = outcomeNum === OUTCOME.YES;
        const outcomeIsNo = outcomeNum === OUTCOME.NO;

        const userWinningSide = outcomeIsYes ? yesStake : outcomeIsNo ? noStake : 0n;

        // Si el usuario tenía stake en el lado ganador pero ahora es 0 → ya reclamó
        const hadWinningStake =
          (outcomeIsYes && yesStake === 0n && noStake === 0n) ||
          (outcomeIsNo && noStake === 0n && yesStake === 0n);

        if (hadWinningStake) {
          return {
            market,
            stake,
            result: "claimed",
            estimatedPayout: 0n,
            side,
            stakeAmount,
          };
        }

        const won = userWinningSide > 0n;
        const lost = !won;

        let estimatedPayout = 0n;
        if (won && onChain) {
          const winningSideTotal = outcomeIsYes
            ? onChain.totalYesStake
            : onChain.totalNoStake;
          const totalPool = onChain.totalYesStake + onChain.totalNoStake;
          estimatedPayout = estimatePayout(
            userWinningSide,
            winningSideTotal,
            totalPool
          );
        } else if (won) {
          // Sin datos on-chain: usar stake como estimación mínima
          estimatedPayout = userWinningSide;
        }

        return {
          market,
          stake,
          result: won ? "won" : "lost",
          estimatedPayout,
          side,
          stakeAmount,
        };
      })
      .filter((p: PositionItem | null): p is PositionItem => p !== null);
  }, [markets, stakesResult, marketOnChainMap]);

  // 6. Stats summary
  const stats = useMemo(() => {
    let totalInvested = 0n;
    let totalClaimable = 0n;
    let activeBets = 0;
    for (const p of positions) {
      totalInvested += p.stakeAmount;
      if (p.result === "won") totalClaimable += p.estimatedPayout;
      if (p.market.status === "Open" || p.market.status === "Locked") activeBets++;
    }
    return { totalInvested, totalClaimable, activeBets };
  }, [positions]);

  const isLoading = marketsLoading || (markets.length > 0 && stakesLoading);

  // ── Guard: wallet no conectada (solo tras mount para evitar hydration mismatch) ──

  if (mounted && !isConnected) {
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

  // ── Guard: error al cargar mercados ─────────────────────────────────────────

  if (marketsError) {
    const errMsg = marketsErrorDetail instanceof Error ? marketsErrorDetail.message : "Failed to load positions.";
    return (
      <div className="container py-8 px-4">
        <h1 className="font-display font-extrabold text-[36px] text-foreground mb-8">
          MY POSITIONS
        </h1>
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12 px-4 text-center"
          role="alert"
        >
          <p className="font-body font-medium text-foreground mb-2">Failed to load positions.</p>
          <p className="font-body text-sm text-text-secondary mb-3 max-w-md">{errMsg}</p>
          <Button
            onClick={() => refetchMarkets()}
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            aria-label="Retry loading positions"
          >
            Retry
          </Button>
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
          <PositionsSummarySkeleton className="mb-6" />
          <div className="space-y-2" aria-busy="true" aria-label="Loading positions">
            {[0, 1, 2, 3, 4].map((i) => (
              <TableRowSkeleton key={i} />
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
              <p className="font-mono text-xs text-text-muted uppercase tracking-wider">
                Total Invested
              </p>
              <p className="font-mono text-lg text-cyan mt-0.5">
                {formatEth(stats.totalInvested)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="font-mono text-xs text-text-muted uppercase tracking-wider">
                Claimable
              </p>
              <p
                className={cn(
                  "font-mono text-lg text-green mt-0.5",
                  stats.totalClaimable > 0n && "animate-pulse"
                )}
              >
                {formatEth(stats.totalClaimable)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="font-mono text-xs text-text-muted uppercase tracking-wider">
                Active Bets
              </p>
              <p className="font-mono text-lg text-foreground mt-0.5">
                {stats.activeBets}
              </p>
            </div>
          </div>

          {/* Table — desktop */}
          <div
            className="hidden md:block rounded-md border border-border overflow-hidden bg-surface"
            style={{ borderRadius: 6 }}
          >
            <table
              className="w-full border-collapse"
              role="table"
              aria-label="Positions"
            >
              <thead>
                <tr className="bg-elevated">
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">
                    Market
                  </th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">
                    Side
                  </th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">
                    Stake
                  </th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">
                    Status
                  </th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">
                    Result
                  </th>
                  <th className="text-left font-display font-bold text-xs text-text-muted tracking-widest py-3 px-4">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map(
                  (
                    { market, result, estimatedPayout, side, stakeAmount }: PositionItem,
                    i: number
                  ) => (
                    <tr
                      key={market.id}
                      className={cn(
                        "border-b border-border transition-colors hover:bg-elevated fade-up",
                        i === positions.length - 1 && "border-b-0"
                      )}
                      style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}
                    >
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/markets/${market.id}`}
                          className="font-body text-foreground hover:text-cyan transition-colors line-clamp-1 max-w-[280px]"
                        >
                          {truncateQuestion(market.question)}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <SideBadge side={side} />
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
                        <ResultBadge result={result} />
                      </td>
                      <td className="py-3.5 px-4">
                        <ActionCell
                          marketId={market.on_chain_market_id ?? market.id}
                          result={result}
                          estimatedPayout={estimatedPayout}
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile — cards */}
          <div className="md:hidden space-y-3">
            {positions.map(
              (
                { market, result, estimatedPayout, side, stakeAmount }: PositionItem,
                i: number
              ) => (
                <div
                  key={market.id}
                  className={cn(
                    "rounded-md border border-border bg-surface p-4 fade-up"
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
                    <SideBadge side={side} />
                    <span className="font-mono text-xs text-cyan">
                      {formatEth(stakeAmount)}
                    </span>
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
                    <ResultBadge result={result} />
                    <ActionCell
                      marketId={market.on_chain_market_id ?? market.id}
                      result={result}
                      estimatedPayout={estimatedPayout}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-componentes de presentación ─────────────────────────────────────────

function SideBadge({ side }: { side: "yes" | "no" | "both" }) {
  if (side === "both") {
    return (
      <span className="inline-flex gap-1">
        <span className="rounded-full px-2 py-0.5 font-mono text-[11px] bg-green-dim text-green">
          YES
        </span>
        <span className="rounded-full px-2 py-0.5 font-mono text-[11px] bg-red-dim text-red">
          NO
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
        side === "yes" ? "bg-green-dim text-green" : "bg-red-dim text-red"
      )}
    >
      {side === "yes" ? "YES" : "NO"}
    </span>
  );
}

function ResultBadge({ result }: { result: PositionResult }) {
  if (result === "won")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-green-dim text-green px-2 py-0.5 font-body text-xs font-medium">
        🎯 Won
      </span>
    );
  if (result === "lost")
    return (
      <span className="inline-flex items-center rounded-md bg-red-dim text-red px-2 py-0.5 font-body text-xs font-medium">
        ✗ Lost
      </span>
    );
  if (result === "claimed")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-elevated text-text-muted px-2 py-0.5 font-body text-xs font-medium">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Claimed
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-md bg-gold/20 text-gold px-2 py-0.5 font-body text-xs font-medium">
      ⏳ Pending
    </span>
  );
}

interface ActionCellProps {
  marketId: number;
  result: PositionResult;
  estimatedPayout: bigint;
}

function ActionCell({ marketId, result, estimatedPayout }: ActionCellProps) {
  if (result === "won" && estimatedPayout > 0n) {
    const ethStr = formatEth(estimatedPayout);
    return <ClaimButton marketId={marketId} claimableEth={ethStr} />;
  }
  if (result === "claimed") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-text-muted">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Claimed ✓
      </span>
    );
  }
  return <span className="font-mono text-xs text-text-muted">—</span>;
}
