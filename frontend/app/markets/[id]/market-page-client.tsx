"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { notFound } from "next/navigation";
import { getMarketPredictions } from "@/lib/api";
import { useMarket } from "@/hooks/use-markets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { useMarketOnChain, useUserStakeOnChain } from "@/hooks/use-market-on-chain";
import type { MarketOnChain, UserStakeOnChain } from "@/components/market-detail";
import { MarketDetail } from "@/components/market-detail";
import { LastUpdated } from "@/components/last-updated";
import { Button } from "@/components/ui/button";
import { MarketDetailSkeleton } from "@/components/skeletons";

function parseMarketResult(data: readonly unknown[] | undefined): MarketOnChain | null {
  if (!data || data.length < 8) return null;
  return {
    question: data[0] as string,
    closeTime: data[1] as bigint,
    resolveTime: data[2] as bigint,
    status: data[3] as number,
    outcome: data[4] as number,
    totalYesStake: data[5] as bigint,
    totalNoStake: data[6] as bigint,
    creator: data[7] as string,
  };
}

function parseUserStakeResult(data: readonly unknown[] | undefined): UserStakeOnChain | null {
  if (!data || data.length < 2) return null;
  return {
    yesStake: data[0] as bigint,
    noStake: data[1] as bigint,
  };
}

export function MarketPageClient() {
  const params = useParams();
  const id = Number(params?.id);
  const { address } = useAccount();

  const isInvalidId = !Number.isInteger(id) || id < 1;

  useMarketStream(isInvalidId ? null : id);

  const {
    data: market,
    isLoading: marketLoading,
    isError: marketError,
    error: marketErr,
    refetch: refetchMarket,
    dataUpdatedAt: marketUpdatedAt,
  } = useMarket(id);

  const chainIdForContract =
    market?.on_chain_market_id ?? (market ? 0 : id);

  const { data: predictions } = useQuery({
    queryKey: ["market-predictions", market?.id ?? id],
    queryFn: () => getMarketPredictions(market!.id),
    enabled: !isInvalidId && !!market,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const { data: marketOnChainRaw, isLoading: onChainLoading, isError: onChainError, refetch: refetchMarketOnChain } = useMarketOnChain(
    isInvalidId ? 0 : chainIdForContract
  );
  const { data: userStakeRaw, refetch: refetchUserStake } = useUserStakeOnChain(
    isInvalidId ? 0 : chainIdForContract,
    address
  );

  const onBetSuccess = useCallback(() => {
    refetchMarketOnChain();
    refetchUserStake();
  }, [refetchMarketOnChain, refetchUserStake]);

  const marketOnChain = parseMarketResult(marketOnChainRaw as readonly unknown[] | undefined);
  const userStake =
    address != null
      ? parseUserStakeResult(userStakeRaw as readonly unknown[] | undefined) ?? {
          yesStake: BigInt(0),
          noStake: BigInt(0),
        }
      : null;

  if (isInvalidId) {
    notFound();
  }

  const isLoading = !isInvalidId && marketLoading;
  const notFoundCondition = !marketLoading && !market && !isInvalidId;

  if (notFoundCondition) {
    notFound();
  }

  if (marketError) {
    const message = marketErr instanceof Error ? marketErr.message : "Failed to load market";
    return (
      <div className="container py-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border border-red/30 bg-red-dim/10 py-12 px-4 text-center">
          <p className="font-body font-medium text-foreground mb-2">{message}</p>
          <Button
            onClick={() => refetchMarket()}
            variant="outline"
            className="border-red/50 text-red hover:bg-red-dim font-body"
            aria-label="Retry loading market"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !market) {
    return (
      <div className="container py-6">
        <MarketDetailSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6">
      <div className="flex justify-end mb-2">
        <LastUpdated updatedAt={marketUpdatedAt || undefined} freshThresholdMs={10_000} />
      </div>

      <MarketDetail
        marketId={chainIdForContract || id}
        market={market}
        predictions={predictions ?? []}
        marketOnChain={marketOnChain}
        onChainLoading={onChainLoading}
        onChainError={onChainError}
        userStake={userStake}
        onBetSuccess={onBetSuccess}
      />
    </div>
  );
}
