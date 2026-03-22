/**
 * Chainlink Functions script: weather market resolution.
 * Args: [marketId, lat, lon, date] e.g. ["1", "9", "-79.5", "2026-02-20"]
 * Returns: 0 (no rain) or 1 (rain). API: Open-Meteo Archive.
 */
async function main(args) {
  const lat = args[1] || "9";
  const lon = args[2] || "-79.5";
  const date = args[3] || "2026-02-20";
  const url = "https://archive-api.open-meteo.com/v1/archive?latitude=" + lat + "&longitude=" + lon + "&start_date=" + date + "&end_date=" + date + "&daily=precipitation_sum";
  const res = await fetch(url);
  if (!res.ok) return 0;
  const data = await res.json();
  const sum = data.daily?.precipitation_sum?.[0] ?? 0;
  return sum > 0 ? 1 : 0;
}

module.exports = { main };
