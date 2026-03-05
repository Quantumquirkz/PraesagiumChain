import { useEffect } from 'react'
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

  // wagmi v2 no expone refetchInterval nativo en useReadContract;
  // usamos un intervalo manual para revalidar los datos on-chain cada 10s.
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      result.refetch()
    }, REFETCH_INTERVAL_MS)
    return () => clearInterval(id)
  // result.refetch es estable entre renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      result.refetch()
    }, REFETCH_INTERVAL_MS)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, marketId, address])

  return result
}
