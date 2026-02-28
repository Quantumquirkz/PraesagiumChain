"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { privatePredictionMarketAbi } from "@/lib/abis/private-prediction-market";

const PRIVATE_MARKET_ADDRESS = (process.env
  .NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const PRIVATE_MARKET_STATUS = ["Open", "Locked", "Resolved", "Cancelled"] as const;
export const PRIVATE_MARKET_OUTCOME = ["Undecided", "Yes", "No"] as const;

export interface PrivateMarketView {
  id: number;
  question: string;
  closeTime: number;
  resolveTime: number;
  status: (typeof PRIVATE_MARKET_STATUS)[number];
  outcome: (typeof PRIVATE_MARKET_OUTCOME)[number];
  totalYesStake: bigint;
  totalNoStake: bigint;
  totalCommitted: bigint;
  totalYesStakeEth: string;
  totalNoStakeEth: string;
  totalCommittedEth: string;
}

/**
 * Read a single private market from PrivatePredictionMarket on-chain.
 */
export function usePrivateMarket(marketId: number) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: PRIVATE_MARKET_ADDRESS,
    abi: privatePredictionMarketAbi,
    functionName: "getMarket",
    args: [BigInt(marketId)],
    query: {
      enabled: marketId > 0 && PRIVATE_MARKET_ADDRESS !== "0x0000000000000000000000000000000000000000",
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  });

  const { data: totalCommitted } = useReadContract({
    address: PRIVATE_MARKET_ADDRESS,
    abi: privatePredictionMarketAbi,
    functionName: "getTotalCommitted",
    args: [BigInt(marketId)],
    query: {
      enabled: marketId > 0 && PRIVATE_MARKET_ADDRESS !== "0x0000000000000000000000000000000000000000",
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  });

  let market: PrivateMarketView | null = null;
  if (data) {
    const [id, question, closeTime, resolveTime, statusIdx, outcomeIdx, totalYesStake, totalNoStake] = data as [
      bigint, string, bigint, bigint, number, number, bigint, bigint
    ];
    const committed = (totalCommitted as bigint | undefined) ?? 0n;
    market = {
      id: Number(id),
      question,
      closeTime: Number(closeTime),
      resolveTime: Number(resolveTime),
      status: PRIVATE_MARKET_STATUS[statusIdx] ?? "Open",
      outcome: PRIVATE_MARKET_OUTCOME[outcomeIdx] ?? "Undecided",
      totalYesStake,
      totalNoStake,
      totalCommitted: committed,
      totalYesStakeEth: formatEther(totalYesStake),
      totalNoStakeEth: formatEther(totalNoStake),
      totalCommittedEth: formatEther(committed),
    };
  }

  return { market, isLoading, isError, refetch };
}

/**
 * Read how many commitments a user has made on a private market.
 */
export function usePrivateMarketCommitCount(
  marketId: number,
  address: `0x${string}` | undefined
) {
  const { data, isLoading } = useReadContract({
    address: PRIVATE_MARKET_ADDRESS,
    abi: privatePredictionMarketAbi,
    functionName: "getCommitmentCount",
    args: [BigInt(marketId), address ?? "0x0000000000000000000000000000000000000000"],
    query: {
      enabled:
        marketId > 0 &&
        !!address &&
        PRIVATE_MARKET_ADDRESS !== "0x0000000000000000000000000000000000000000",
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  });

  return {
    count: data != null ? Number(data as bigint) : 0,
    isLoading,
  };
}

/**
 * Read the total ETH committed (hidden pool) for a private market.
 */
export function usePrivateTotalCommitted(marketId: number) {
  const { data, isLoading } = useReadContract({
    address: PRIVATE_MARKET_ADDRESS,
    abi: privatePredictionMarketAbi,
    functionName: "getTotalCommitted",
    args: [BigInt(marketId)],
    query: {
      enabled:
        marketId > 0 &&
        PRIVATE_MARKET_ADDRESS !== "0x0000000000000000000000000000000000000000",
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  });

  const raw = (data as bigint | undefined) ?? 0n;
  return {
    totalCommitted: raw,
    totalCommittedEth: formatEther(raw),
    isLoading,
  };
}
