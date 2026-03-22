import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { predictionMarketAbi } from '@/lib/abis/prediction-market'
import { PREDICTION_MARKET_ADDRESS } from '@/lib/constants'

export function useClaimWinnings() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // ABI expone claimPayout(uint256 marketId)
  const claim = (marketId: number) => {
    writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: predictionMarketAbi,
      functionName: 'claimPayout',
      args: [BigInt(marketId)],
      gas: 2_000_000n,
    })
  }

  return { claim, hash, isPending, isConfirming, isSuccess, error, reset }
}
