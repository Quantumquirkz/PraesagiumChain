import { describe, expect, it } from "vitest";
import { isPaginatedMarketsResponse } from "./api-response";
import type { MarketView } from "@/types/api";

describe("isPaginatedMarketsResponse", () => {
  it("returns true for direct paginated shape", () => {
    const raw = {
      items: [] as MarketView[],
      total: 0,
      page: 1,
      limit: 10,
    };
    expect(isPaginatedMarketsResponse(raw)).toBe(true);
  });

  it("returns false for wrapped { data: ... } shape", () => {
    const raw = {
      data: {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      },
    };
    expect(isPaginatedMarketsResponse(raw as never)).toBe(false);
  });
});
