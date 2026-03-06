"use client";

import { useQuery } from "@tanstack/react-query";
import { getFeedPrice } from "@/lib/api";

export type ChainlinkFeedSymbol = "ETH_USD" | "BTC_USD";

export function useChainlinkPrice(feed: ChainlinkFeedSymbol | string | null) {
  return useQuery({
    queryKey: ["chainlink-price", feed],
    queryFn: () => getFeedPrice(feed!),
    enabled: !!feed,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
