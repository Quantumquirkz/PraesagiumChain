export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export interface WatchedMarket {
  id: number;
  question: string;
  timestamp: number;
}

export function subscribeToMarketResolution(
  marketId: number,
  question: string
): void {
  try {
    const raw = localStorage.getItem("pc_watched_markets") ?? "[]";
    const watched: WatchedMarket[] = JSON.parse(raw);
    const alreadyWatched = watched.some((m) => m.id === marketId);
    if (!alreadyWatched) {
      watched.push({ id: marketId, question, timestamp: Date.now() });
      localStorage.setItem("pc_watched_markets", JSON.stringify(watched));
    }
  } catch {
    // localStorage no disponible (SSR o modo privado)
  }
}

export function getWatchedMarkets(): WatchedMarket[] {
  try {
    const raw = localStorage.getItem("pc_watched_markets") ?? "[]";
    return JSON.parse(raw) as WatchedMarket[];
  } catch {
    return [];
  }
}

export function removeWatchedMarket(marketId: number): void {
  try {
    const raw = localStorage.getItem("pc_watched_markets") ?? "[]";
    const watched: WatchedMarket[] = JSON.parse(raw);
    const updated = watched.filter((m) => m.id !== marketId);
    localStorage.setItem("pc_watched_markets", JSON.stringify(updated));
  } catch {
    // ignorar
  }
}

export function notifyMarketResolved(
  marketId: number,
  question: string,
  outcome: string
): void {
  if (Notification.permission !== "granted") return;
  const notification = new Notification(
    "🔮 Market Resolved — PraesagiumChain",
    {
      body: `"${question.slice(0, 60)}..." resolved as ${outcome}. Check your winnings!`,
      icon: "/icon-192.png",
      tag: `market-resolved-${marketId}`,
      data: { url: `/markets/${marketId}` },
    }
  );
  notification.onclick = () => {
    window.focus();
    window.location.href = `/markets/${marketId}`;
  };
}
