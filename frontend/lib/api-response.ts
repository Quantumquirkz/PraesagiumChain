import type { MarketView, PaginatedResponse } from "@/types/api";

/** Backend may return either a direct paginated payload or { data: paginated }. */
export type MarketsListResponse =
  | PaginatedResponse<MarketView>
  | { data: PaginatedResponse<MarketView> };

export function isPaginatedMarketsResponse(
  raw: MarketsListResponse
): raw is PaginatedResponse<MarketView> {
  return (
    raw != null &&
    typeof raw === "object" &&
    "items" in raw &&
    Array.isArray((raw as PaginatedResponse<MarketView>).items)
  );
}
