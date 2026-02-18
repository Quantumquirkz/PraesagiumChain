/**
 * Chainlink Functions script: sports market resolution.
 * Args: [marketId, fixture_id, winner_team] or [marketId, winner_team, demo_outcome].
 * With API key in secrets: call API-Football fixtures endpoint and compare goals.
 * For demo without key: use args[2] as 0 or 1 (demo_outcome).
 * Returns: 0 or 1.
 */
async function main(args) {
  const fixtureId = args[1];
  const winnerTeam = args[2] || "";
  const demoOutcome = args[3] !== undefined ? parseInt(args[3], 10) : undefined;
  if (demoOutcome === 0 || demoOutcome === 1) return demoOutcome;
  // If no fixture id or no secrets for API key, return 0 (or could revert)
  if (!fixtureId) return 0;
  try {
    // In Chainlink Functions, pass API key via DON-hosted or encrypted secrets as API_FOOTBALL_KEY.
    const apiKey = typeof secrets !== "undefined" && secrets && secrets.API_FOOTBALL_KEY ? secrets.API_FOOTBALL_KEY : "";
    if (!apiKey) return 0;
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, {
      headers: { "x-apisports-key": apiKey },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const fixture = data.response?.[0];
    if (!fixture) return 0;
    const homeGoals = parseInt(fixture.goals?.home ?? 0, 10);
    const awayGoals = parseInt(fixture.goals?.away ?? 0, 10);
    const homeName = (fixture.teams?.home?.name || "").toLowerCase();
    const awayName = (fixture.teams?.away?.name || "").toLowerCase();
    const winner = homeGoals > awayGoals ? homeName : awayGoals > homeGoals ? awayName : "";
    const winnerMatch = winnerTeam.toLowerCase().trim();
    return winner === winnerMatch ? 1 : 0;
  } catch (e) {
    return 0;
  }
}

module.exports = { main };
