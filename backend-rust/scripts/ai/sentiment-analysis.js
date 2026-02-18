/**
 * Sentiment analysis for Chainlink Functions.
 * Args: [marketId, textToAnalyze]. Returns 0 (No) or 1 (Yes) for market resolution.
 */
async function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') return 0.5;
  const t = text.toLowerCase();
  const positive = ['bull', 'bullish', 'up', 'pump', 'good', 'positive', 'win', 'growth', 'rise', 'gain'];
  const negative = ['bear', 'bearish', 'down', 'dump', 'bad', 'negative', 'lose', 'decline', 'fall', 'crash'];
  let score = 0.5;
  for (const p of positive) {
    if (t.includes(p)) score += 0.1;
  }
  for (const n of negative) {
    if (t.includes(n)) score -= 0.1;
  }
  return Math.max(0, Math.min(1, score));
}

async function main(args) {
  const text = args[1] || '';
  const score = await analyzeSentiment(text);
  const outcome = score >= 0.5 ? 1 : 0;
  return outcome;
}

module.exports = { main, analyzeSentiment };
