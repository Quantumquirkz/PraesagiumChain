"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { getStats, getMarkets } from "@/lib/api";
import { MarketFilters, type SortOption } from "@/components/market-filters";
import { StatsCards } from "@/components/stats-cards";
import { MarketCard } from "@/components/market-card";
import { MarketCardSkeleton } from "@/components/market-card-skeleton";
import { StatsSkeleton } from "@/components/skeletons/stats-skeleton";
import { NoMarkets } from "@/components/empty-states/no-markets";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import type { MarketView } from "@/types/api";

const LIMIT = 12;
const MAX_VISIBLE_PAGES = 5;

function filterAndSort(
  items: MarketView[],
  searchQuery: string,
  sort: SortOption
): MarketView[] {
  const q = searchQuery.trim().toLowerCase();
  let list = q
    ? items.filter((m) => m.question.toLowerCase().includes(q))
    : [...items];
  if (sort === "newest") {
    list.sort((a, b) => b.id - a.id);
  } else if (sort === "closes_soon") {
    list.sort((a, b) => a.close_time - b.close_time);
  } else if (sort === "most_volume") {
    list.sort((a, b) => {
      const volA = Number(a.total_yes_stake) + Number(a.total_no_stake);
      const volB = Number(b.total_yes_stake) + Number(b.total_no_stake);
      return volB - volA;
    });
  }
  return list;
}

function getPageRange(
  page: number,
  total: number,
  displayedCount: number
): { start: number; end: number } {
  const start = (page - 1) * LIMIT + 1;
  const end = (page - 1) * LIMIT + displayedCount;
  return { start, end };
}

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const statusParam = statusFilter || undefined;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  const {
    data: marketsData,
    isLoading: marketsLoading,
    isError: marketsError,
    refetch: refetchMarkets,
  } = useQuery({
    queryKey: ["markets", page, statusParam],
    queryFn: () => getMarkets(page, LIMIT, statusParam),
  });

  const filteredAndSorted = useMemo(() => {
    const items = marketsData?.items ?? [];
    return filterAndSort(items, searchQuery, sort);
  }, [marketsData?.items, searchQuery, sort]);

  const totalFromApi = marketsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFromApi / LIMIT));
  const { start, end } = getPageRange(page, totalFromApi, filteredAndSorted.length);
  const isEmpty = !marketsLoading && !marketsError && filteredAndSorted.length === 0;
  const isFirstEmpty = totalFromApi === 0 && !statusFilter;

  const pageNumbers = useMemo(() => {
    let low = Math.max(1, page - Math.floor(MAX_VISIBLE_PAGES / 2));
    let high = Math.min(totalPages, low + MAX_VISIBLE_PAGES - 1);
    if (high - low + 1 < MAX_VISIBLE_PAGES) {
      low = Math.max(1, high - MAX_VISIBLE_PAGES + 1);
    }
    return Array.from({ length: high - low + 1 }, (_, i) => low + i);
  }, [page, totalPages]);

  if (marketsError) {
    toast.error("Failed to load markets.");
  }

  return (
    <div className="space-y-8">
      <section aria-label="Statistics">
        {statsLoading ? (
          <StatsSkeleton aria-busy="true" />
        ) : (
          <StatsCards stats={stats} isLoading={false} />
        )}
      </section>

      <section aria-label="Markets">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Markets
          </h2>
          <MarketFilters
            statusFilter={statusFilter}
            onStatusChange={(v) => {
              setStatusFilter(v === "all" ? "" : v);
              setPage(1);
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sort={sort}
            onSortChange={setSort}
            totalCount={totalFromApi}
          />
        </div>

        {marketsLoading ? (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
            aria-label="Loading markets"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
        ) : marketsError ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12 px-4 text-center"
            role="alert"
          >
            <p className="font-body font-medium text-foreground mb-2">
              Failed to load markets.
            </p>
            <Button
              onClick={() => refetchMarkets()}
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              aria-label="Retry loading markets"
            >
              Retry
            </Button>
          </div>
        ) : isEmpty ? (
          <NoMarkets
            className="rounded-xl border border-border bg-surface py-16"
            description={isFirstEmpty ? undefined : "Try changing filters or search."}
          />
        ) : (
          <>
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              role="list"
              aria-label="Market list"
            >
              {filteredAndSorted.map((market: MarketView) => (
                <article key={market.id} role="listitem">
                  <MarketCard market={market} />
                </article>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:justify-between">
              <p className="font-mono text-sm text-text-secondary order-2 sm:order-1">
                Showing {start}–{end} of {totalFromApi} markets
              </p>
              <nav
                className="flex items-center gap-2 order-1 sm:order-2"
                aria-label="Pagination"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  Prev
                </Button>
                <div className="flex items-center gap-1">
                  {pageNumbers.map((n: number) => (
                    <Button
                      key={n}
                      variant={n === page ? "default" : "ghost"}
                      size="sm"
                      className="min-w-[2rem] font-mono"
                      onClick={() => setPage(n)}
                      aria-label={`Page ${n}`}
                      aria-current={n === page ? "page" : undefined}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </nav>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
