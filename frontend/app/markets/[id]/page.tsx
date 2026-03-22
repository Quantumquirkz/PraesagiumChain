import type { Metadata } from "next";
import { getMarket } from "@/lib/api";
import { MarketPageClient } from "./market-page-client";

// Revalidate this segment at most every 30s when deployed behind a CDN (ISR).
export const revalidate = 30;

// ─── Open Graph / SEO dinámico ────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const market = await getMarket(Number(id));
    const totalPool = (
      Number(market.total_yes_stake) + Number(market.total_no_stake)
    ).toFixed(3);
    const closeDate = new Date(market.close_time * 1000).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );

    return {
      title: `${market.question} — PraesagiumChain`,
      description: `Bet YES or NO. Status: ${market.status}. Closes: ${closeDate}`,
      openGraph: {
        title: market.question,
        description: `Total pool: ${totalPool} ETH · Status: ${market.status} · Closes ${closeDate}`,
        type: "website",
        siteName: "PraesagiumChain",
      },
      twitter: {
        card: "summary",
        title: market.question,
        description: `Total pool: ${totalPool} ETH · Bet on PraesagiumChain`,
      },
    };
  } catch {
    // Fallback when market does not exist or API fails
    return {
      title: "Market — PraesagiumChain",
      description: "Decentralized prediction market",
    };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  return <MarketPageClient />;
}
