/**
 * Same implementation as ../praesagium-resolver/lib/sentiment.ts (duplicate for isolated CRE package + typings).
 * Keep both files in sync when changing the sentiment HTTP contract.
 */
import { ok, json, type HTTPSendRequester } from "@chainlink/cre-sdk"

export type SentimentResponse = {
  provider?: string
  probability: number
  sentiment_score?: number
}

export type SentimentAPIResult = {
  outcome: number
  prob: number
  resolved: string
}

function sentimentRequestBodyBase64(text: string): string {
  const bodyBytes = new TextEncoder().encode(JSON.stringify({ text }))
  return Buffer.from(bodyBytes).toString("base64")
}

export function fetchSentiment(
  sendRequester: HTTPSendRequester,
  config: { api_base_url: string; text_to_analyze: string }
): SentimentAPIResult {
  const body = sentimentRequestBodyBase64(config.text_to_analyze)
  const resp = sendRequester
    .sendRequest({
      url: `${config.api_base_url}/api/ai/sentiment`,
      method: "POST" as const,
      body,
      headers: { "Content-Type": "application/json" },
    })
    .result()

  if (!ok(resp)) {
    throw new Error(`HTTP request failed with status: ${resp.statusCode}`)
  }

  const data = json(resp) as SentimentResponse
  const prob = Math.max(0, Math.min(1, data.probability ?? 0.5))
  const outcome = prob >= 0.5 ? 1 : 0
  const resolved = outcome === 1 ? "Yes" : "No"
  return { outcome, prob, resolved }
}
