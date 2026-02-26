"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContract } from "wagmi";
import { notFound } from "next/navigation";
import { getMarket, getMarketPredictions } from "@/lib/api";
import { predictionMarketContract } from "@/lib/constants";
import type { MarketOnChain, UserStakeOnChain } from "@/components/market-detail";
import { MarketDetail } from "@/components/market-detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

function MarketDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-3/4 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <Card className="card-bg border-border">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 rounded" />
            <Skeleton className="h-16 rounded" />
          </div>
        </CardContent>
      </Card>
      <Card className="card-bg border-border">
        <CardHeader>
          <Skeleton className="h-6 w-24 rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-48 w-full rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MarketPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { address } = useAccount();

  const isInvalidId = !Number.isInteger(id) || id < 1;

  const {
    data: market,
    isLoading: marketLoading,
    isError: marketError,
    error: marketErr,
    refetch: refetchMarket,
  } = useQuery({
    queryKey: ["market", id],
    queryFn: () => getMarket(id),
    enabled: !isInvalidId,
  });

  const { data: predictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ["market-predictions", id],
    queryFn: () => getMarketPredictions(id),
    enabled: !isInvalidId && !!market,
  });

  const { data: marketOnChainRaw } = useReadContract({
    ...predictionMarketContract,
    functionName: "getMarket",
    args: [BigInt(id)],
  });

  const { data: userStakeRaw } = useReadContract({
    ...predictionMarketContract,
    functionName: "getUserStake",
    args: [BigInt(id), address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });

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
    <div className="mx-auto w-full max-w-[1280px] p-6" style={{ padding: 24 }}>
      <MarketDetail
        marketId={id}
        market={market}
        predictions={predictions ?? []}
        marketOnChain={marketOnChain}
        userStake={userStake}
      />
    </div>
  );
}
