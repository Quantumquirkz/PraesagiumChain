import { useEffect, useRef } from 'react'
import { useReadContract } from 'wagmi'
import { predictionMarketContract } from '@/lib/constants'

const REFETCH_INTERVAL_MS = 10_000

export function useMarketOnChain(marketId: number) {
  const enabled = Number.isInteger(marketId) && marketId > 0

  const result = useReadContract({
    ...predictionMarketContract,
    functionName: 'getMarket',
    args: [BigInt(enabled ? marketId : 0)],
    query: { enabled },
  })

  const refetchRef = useRef(result.refetch)
  refetchRef.current = result.refetch

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      void refetchRef.current()
    }, REFETCH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [enabled, marketId])

  return result
}

export function useUserStakeOnChain(marketId: number, address: `0x${string}` | undefined) {
  const enabled = Number.isInteger(marketId) && marketId > 0 && !!address

  const result = useReadContract({
    ...predictionMarketContract,
    functionName: 'getUserStake',
    args: [
      BigInt(enabled ? marketId : 0),
      address ?? '0x0000000000000000000000000000000000000000',
    ],
    query: { enabled },
  })

  const refetchRef = useRef(result.refetch)
  refetchRef.current = result.refetch

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      void refetchRef.current()
    }, REFETCH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [enabled, marketId, address])

  return result
}
