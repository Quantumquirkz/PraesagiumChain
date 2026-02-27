import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { predictionMarketAbi } from '@/lib/abis/prediction-market'
import { PREDICTION_MARKET_ADDRESS } from '@/lib/constants'

export function usePlaceBet() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const placeBet = (marketId: number, outcome: 1 | 2, amountEth: string) => {
    writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: predictionMarketAbi,
      functionName: 'placeBet',
      args: [BigInt(marketId), outcome],
      value: parseEther(amountEth),
    })
  }

  return { placeBet, hash, isPending, isConfirming, isSuccess, error, reset }
}
