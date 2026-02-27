import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEventLogs } from 'viem'
import { predictionMarketAbi } from '@/lib/abis/prediction-market'
import { PREDICTION_MARKET_ADDRESS } from '@/lib/constants'

export function useCreateMarket() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess, data: receipt } =
    useWaitForTransactionReceipt({ hash })

  /**
   * Llama a createMarket en el contrato.
   * `fee` se pasa como `value` solo si el contrato es payable en el deploy real;
   * si es 0n se omite para no revertir en contratos nonpayable.
   */
  const createMarket = (
    question: string,
    closeTime: number,
    resolveTime: number,
    fee: bigint
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: predictionMarketAbi,
      functionName: 'createMarket',
      args: [question, BigInt(closeTime), BigInt(resolveTime)],
      ...(fee > 0n ? { value: fee } : {}),
    } as any)
  }

  /**
   * Extrae el marketId del evento MarketCreated usando parseEventLogs de viem.
   * El evento tiene `marketId` como primer tópico indexed.
   */
  const getNewMarketId = (): number | null => {
    if (!receipt) return null
    try {
      const logs = parseEventLogs({
        abi: predictionMarketAbi,
        logs: receipt.logs,
        eventName: 'MarketCreated',
      })
      const event = logs[0]
      if (!event) return null
      const id = (event.args as { marketId?: bigint }).marketId
      return id != null ? Number(id) : null
    } catch {
      // Fallback: leer el primer tópico del primer log directamente
      const log = receipt.logs[0]
      if (!log?.topics[1]) return null
      try {
        return Number(BigInt(log.topics[1]))
      } catch {
        return null
      }
    }
  }

  return { createMarket, hash, isPending, isConfirming, isSuccess, getNewMarketId, error, reset }
}
