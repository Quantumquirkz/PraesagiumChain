/**
 * Chainlink Functions script: price market resolution.
 * Args: [marketId, symbol, threshold] e.g. ["1", "bitcoin", "50000"]
 * symbol: CoinGecko id (bitcoin, ethereum) or Binance symbol (BTCUSDT).
 * Returns: 1 if price >= threshold, else 0.
 */
async function main(args) {
  const symbol = (args[1] || "bitcoin").toLowerCase();
  const threshold = parseFloat(args[2] || "50000");
  let price = 0;
  if (symbol.endsWith("usdt")) {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
    if (!res.ok) return 0;
    const data = await res.json();
    price = parseFloat(data.price || 0);
  } else {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
    if (!res.ok) return 0;
    const data = await res.json();
    price = data[symbol]?.usd ?? 0;
  }
  return price >= threshold ? 1 : 0;
}

module.exports = { main };
