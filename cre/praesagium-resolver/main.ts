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
  ok,
  json,
  consensusIdenticalAggregation,
  type Runtime,
  type HTTPSendRequester,
  Runner,
} from "@chainlink/cre-sdk"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  api_base_url: z.string(),
  text_to_analyze: z.string(),
  market_id: z.number(),
  chain_name: z.string(),
  oracle_consumer_address: z.string().optional().default(""),
})

type Config = z.infer<typeof configSchema>

type SentimentResponse = {
  provider?: string
  probability: number
  sentiment_score?: number
}

type SentimentAPIResult = {
  outcome: number
  prob: number
  resolved: string
}

const fetchSentiment = (sendRequester: HTTPSendRequester, config: Config): SentimentAPIResult => {
  const bodyBytes = new TextEncoder().encode(JSON.stringify({ text: config.text_to_analyze }))
  const body = Buffer.from(bodyBytes).toString("base64")

  const req = {
    url: `${config.api_base_url}/api/ai/sentiment`,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
    },
    // cacheSettings removed - sim uses 1 node; protobuf CacheSettings format may differ
  }

  const resp = sendRequester.sendRequest(req).result()

  if (!ok(resp)) {
    throw new Error(`HTTP request failed with status: ${resp.statusCode}`)
  }

  const data = json(resp) as SentimentResponse
  const prob = Math.max(0, Math.min(1, data.probability ?? 0.5))
  const outcome = prob >= 0.5 ? 1 : 0
  const resolved = outcome === 1 ? "Yes" : "No"

  return { outcome, prob, resolved }
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const httpClient = new HTTPClient()

  const result = httpClient
    .sendRequest(
      runtime,
      fetchSentiment,
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
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
