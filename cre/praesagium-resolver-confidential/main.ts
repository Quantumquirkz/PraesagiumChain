/**
 * PraesagiumChain CRE: Private Prediction Market resolution (Confidential Compute)
 * For TEE execution: inputs private; only outcome 0/1 emitted.
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
  is_private_market: z.boolean().default(false),
})

type Config = z.infer<typeof configSchema>

const fetchSentimentAdapter = (
  sendRequester: HTTPSendRequester,
  config: Config
): SentimentAPIResult => fetchSentiment(sendRequester, config)

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const result = new HTTPClient()
    .sendRequest(
      runtime,
      fetchSentimentAdapter,
      consensusIdenticalAggregation<SentimentAPIResult>()
    )(runtime.config)
    .result()
  const prefix = runtime.config.is_private_market ? "[Private/CC] " : ""
  runtime.log(
    `${prefix}market_id=${runtime.config.market_id} outcome=${result.outcome} resolved=${result.resolved}`
  )
  if (runtime.config.oracle_consumer_address) {
    runtime.log(
      `In production: OracleConsumer.oracleCallback(${runtime.config.market_id}, ${result.outcome})`
    )
  }
  return JSON.stringify({
    market_id: runtime.config.market_id,
    outcome: result.outcome,
    probability: result.prob,
  })
}

const initWorkflow = (config: Config) => [
  handler(new CronCapability().trigger({ schedule: config.schedule }), onCronTrigger),
]

export async function main() {
  // zod v3 schema input types vs @chainlink/cre-sdk StandardSchema — keep runtime validation, relax compile check
  const runner = await Runner.newRunner<Config>({
    configSchema: configSchema as never,
  })
  await runner.run(initWorkflow)
}
