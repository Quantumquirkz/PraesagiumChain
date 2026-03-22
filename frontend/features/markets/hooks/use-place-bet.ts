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
      // Sepolia block gas limit ~16.7M; 2M es suficiente para placeBet y evita que la wallet use > cap
      gas: 2_000_000n,
    })
  }

  return { placeBet, hash, isPending, isConfirming, isSuccess, error, reset }
}
