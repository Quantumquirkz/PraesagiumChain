/**
 * PraesagiumChain CRE Workflow: Prediction market resolution (TypeScript)
 * Integrates: blockchain (Sepolia) + external API (backend /api/ai/sentiment - LLM)
 * Flow: CRON trigger → HTTP POST to API → outcome 0/1 → log (and in production, executor or script calls OracleConsumer.oracleCallback)
 *
 * This workflow only computes the outcome; it does not send an on-chain transaction.
 * For production, the actual oracleCallback(marketId, outcome) must be invoked by:
 * - Chainlink CRE executor (when supported), or
 * - scripts/resolveFromBackend.js (cron/Automation), or
 * - A custom resolver service. See docs/architecture.md §3.3.
 */
import {
  CronCapability,
  HTTPClient,
  handler,
  consensusIdenticalAggregation,
  type Runtime,
  type HTTPSendRequester,
  Runner,
} from "@chainlink/cre-sdk"
import { z } from "zod"
import {
  fetchSentiment,
  type SentimentAPIResult,
} from "./lib/sentiment.js"

const configSchema = z.object({
  schedule: z.string(),
  api_base_url: z.string(),
  text_to_analyze: z.string(),
  market_id: z.number(),
  chain_name: z.string(),
  oracle_consumer_address: z.string().default(""),
})

type Config = z.infer<typeof configSchema>

const fetchSentimentAdapter = (
  sendRequester: HTTPSendRequester,
  config: Config
): SentimentAPIResult => fetchSentiment(sendRequester, config)

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const httpClient = new HTTPClient()

  const result = httpClient
    .sendRequest(
      runtime,
      fetchSentimentAdapter,
      consensusIdenticalAggregation<SentimentAPIResult>()
    )(runtime.config)
    .result()

  runtime.log(
    `PraesagiumChain CRE workflow: market_id=${runtime.config.market_id} outcome=${result.outcome} resolved=${result.resolved}`
  )

  if (runtime.config.oracle_consumer_address) {
    runtime.log(
      `Production: call OracleConsumer.oracleCallback(${runtime.config.market_id}, ${result.outcome}) via CRE executor, resolveFromBackend.js, or resolver service (see docs/architecture.md §3.3)`
    )
  }

  return JSON.stringify({
    market_id: runtime.config.market_id,
    outcome: result.outcome,
    probability: result.prob,
  })
}

const initWorkflow = (config: Config) => {
  return [
    handler(
      new CronCapability().trigger({ schedule: config.schedule }),
      onCronTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configSchema: configSchema as never,
  })
  await runner.run(initWorkflow)
}
