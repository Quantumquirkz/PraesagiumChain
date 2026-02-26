/**
 * PraesagiumChain CRE: Private Prediction Market resolution (Confidential Compute)
 * For TEE execution: inputs private; only outcome 0/1 emitted.
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
  is_private_market: z.boolean().optional().default(false),
})

type Config = z.infer<typeof configSchema>

type SentimentResponse = { provider?: string; probability: number; sentiment_score?: number }
type SentimentAPIResult = { outcome: number; prob: number; resolved: string }

const fetchSentiment = (sendRequester: HTTPSendRequester, config: Config): SentimentAPIResult => {
  const body = Buffer.from(JSON.stringify({ text: config.text_to_analyze })).toString("base64")
  const resp = sendRequester.sendRequest({
    url: `${config.api_base_url}/api/ai/sentiment`,
    method: "POST" as const,
    body,
    headers: { "Content-Type": "application/json" },
  }).result()
  if (!ok(resp)) throw new Error(`HTTP failed: ${resp.statusCode}`)
  const data = json(resp) as SentimentResponse
  const prob = Math.max(0, Math.min(1, data.probability ?? 0.5))
  const outcome = prob >= 0.5 ? 1 : 0
  return { outcome, prob, resolved: outcome === 1 ? "Yes" : "No" }
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const result = new HTTPClient()
    .sendRequest(runtime, fetchSentiment, consensusIdenticalAggregation<SentimentAPIResult>())(runtime.config)
    .result()
  const prefix = runtime.config.is_private_market ? "[Private/CC] " : ""
  runtime.log(`${prefix}market_id=${runtime.config.market_id} outcome=${result.outcome} resolved=${result.resolved}`)
  if (runtime.config.oracle_consumer_address) {
    runtime.log(`In production: OracleConsumer.oracleCallback(${runtime.config.market_id}, ${result.outcome})`)
  }
  return JSON.stringify({ market_id: runtime.config.market_id, outcome: result.outcome, probability: result.prob })
}

const initWorkflow = (config: Config) => [
  handler(new CronCapability().trigger({ schedule: config.schedule }), onCronTrigger),
]

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
