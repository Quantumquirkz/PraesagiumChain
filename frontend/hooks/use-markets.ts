import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { getMarkets, getMarket, getStats } from '@/lib/api'
import type { PaginatedResponse, MarketView } from '@/types/api'

const PAGE_SIZE = 20

export function useMarkets(page: number, limit: number, status?: string) {
  return useQuery({
    queryKey: ['markets', page, limit, status],
    queryFn: () => getMarkets(page, limit, status),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

export function useMarket(id: number) {
  return useQuery({
    queryKey: ['market', id],
    queryFn: () => getMarket(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 20_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  })
}

export function useInfiniteMarkets(status?: string) {
  return useInfiniteQuery<PaginatedResponse<MarketView>, Error>({
    queryKey: ['markets-infinite', status],
    queryFn: ({ pageParam }) => getMarkets(pageParam as number, PAGE_SIZE, status),
    getNextPageParam: (lastPage: PaginatedResponse<MarketView>) => {
      const totalPages = Math.ceil(lastPage.total / PAGE_SIZE)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
    initialPageParam: 1,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useMarketStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}
