"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";
import { useInfiniteMarkets, useMarketStats } from "@/hooks/use-markets";
import {
  MarketFilters,
  filterStateFromParams,
  filterStateToParams,
  type SortOption,
  type FilterState,
} from "@/components/market-filters";
import { StatsCards } from "@/components/stats-cards";
import { MarketCard } from "@/components/market-card";
import { MarketCardSkeleton, StatsSkeleton } from "@/components/skeletons";
import { NoMarkets } from "@/components/empty-states/no-markets";
import { LastUpdated } from "@/components/last-updated";
import { Button } from "@/components/ui/button";
import type { MarketView } from "@/types/api";
import { detectCategory, type MarketCategory } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Helpers de filtrado/ordenamiento (client-side) ───────────────────────────

function filterAndSort(items: MarketView[], filters: FilterState): MarketView[] {
  const q = filters.q.trim().toLowerCase();
  let list = [...items];

  if (q) list = list.filter((m) => m.question.toLowerCase().includes(q));
  if (filters.category) list = list.filter((m) => detectCategory(m.question) === filters.category);

  switch (filters.sort) {
    case "newest":
      list.sort((a, b) => b.id - a.id);
      break;
    case "closes_soon":
      list.sort((a, b) => a.close_time - b.close_time);
      break;
    case "most_volume":
      list.sort((a, b) => {
        const volA = Number(a.total_yes_stake) + Number(a.total_no_stake);
        const volB = Number(b.total_yes_stake) + Number(b.total_no_stake);
        return volB - volA;
      });
      break;
    case "ai_confidence":
      list.sort((a, b) => (b.latest_prediction?.probability ?? -1) - (a.latest_prediction?.probability ?? -1));
      break;
  }

  return list;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estado inicial desde URL
  const initialFilters = useMemo(() => filterStateFromParams(searchParams), []);  // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Sincronizar filtros → URL sin reload
  useEffect(() => {
    const params = filterStateToParams(filters);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev: FilterState) => ({ ...prev, [key]: value }));
  }, []);

  // Stats
  const { data: stats, isLoading: statsLoading, dataUpdatedAt: statsUpdatedAt } = useMarketStats();

  // Infinite markets — solo status va al backend; category/sort/q son client-side
  const statusParam = filters.status || undefined;
  const {
    data,
    isLoading: marketsLoading,
    isError: marketsError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch: refetchMarkets,
    dataUpdatedAt: marketsUpdatedAt,
  } = useInfiniteMarkets(statusParam);

  // Aplanar todas las páginas y aplicar filtros client-side
  const allItems = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data?.pages]
  );
  const filteredAndSorted = useMemo(() => filterAndSort(allItems, filters), [allItems, filters]);
  const totalFromApi = data?.pages[0]?.total ?? 0;

  // Sentinel para IntersectionObserver
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1, rootMargin: "200px" });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Rastrear cuántos items había antes de la última carga para animar solo los nuevos
  const prevCountRef = useRef(0);
  const newBatchStart = prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = filteredAndSorted.length;
  }, [filteredAndSorted.length]);

  const lastUpdatedAt = Math.max(statsUpdatedAt ?? 0, marketsUpdatedAt ?? 0) || undefined;
  const isEmpty = !marketsLoading && !marketsError && filteredAndSorted.length === 0;
  const isFirstEmpty = totalFromApi === 0 && !filters.status;

  if (marketsError) toast.error("Failed to load markets.");

  return (
    <div className="space-y-8">
      {/* Stats */}
      <section aria-label="Statistics">
        {statsLoading ? (
          <StatsSkeleton aria-busy="true" />
        ) : (
          <>
            <StatsCards stats={stats} isLoading={false} />
            <div className="mt-2 flex justify-end">
              <LastUpdated updatedAt={lastUpdatedAt} freshThresholdMs={15_000} />
            </div>
          </>
        )}
      </section>

      {/* Markets */}
      <section aria-label="Markets">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-foreground">Markets</h2>
            {!marketsLoading && (
              <LastUpdated updatedAt={marketsUpdatedAt || undefined} freshThresholdMs={15_000} />
            )}
          </div>
          <MarketFilters
            statusFilter={filters.status}
            onStatusChange={(v) => setFilter("status", v === "all" ? "" : v)}
            categoryFilter={filters.category}
            onCategoryChange={(v) => setFilter("category", v as MarketCategory | "")}
            searchQuery={filters.q}
            onSearchChange={(v) => setFilter("q", v)}
            sort={filters.sort}
            onSortChange={(v) => setFilter("sort", v as SortOption)}
            totalCount={filteredAndSorted.length}
          />
        </div>

        {/* Initial loading skeleton */}
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
            <p className="font-body font-medium text-foreground mb-2">Failed to load markets.</p>
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
            className={cn(
              "rounded-xl py-12",
              isFirstEmpty
                ? "border border-border-bright bg-surface card-gradient-border"
                : "border border-border bg-surface"
            )}
            description={isFirstEmpty ? undefined : "Try changing filters or search."}
          />
        ) : (
          <>
            {/* Market grid */}
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              role="list"
              aria-label="Market list"
            >
              {filteredAndSorted.map((market: MarketView, i: number) => {
                // Animar solo las cards nuevas de la última página cargada
                const isNew = i >= newBatchStart;
                const delay = isNew ? (i - newBatchStart) * 0.05 : 0;
                return (
                  <article
                    key={market.id}
                    role="listitem"
                    className={cn(isNew && "fade-up")}
                    style={isNew ? { animationDelay: `${delay}s`, opacity: 0 } : undefined}
                  >
                    <MarketCard market={market} searchQuery={filters.q} />
                  </article>
                );
              })}
            </div>

            {/* Sentinel — dispara fetchNextPage cuando entra en viewport */}
            <div ref={sentinelRef} className="h-px" aria-hidden />

            {/* Skeletons de carga de siguiente página */}
            {isFetchingNextPage && (
              <div
                className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                aria-busy="true"
                aria-label="Loading more markets"
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <MarketCardSkeleton key={`next-${i}`} />
                ))}
              </div>
            )}

            {/* Footer: todo cargado */}
            {!hasNextPage && filteredAndSorted.length > 0 && (
              <p className="mt-8 text-center font-mono text-xs text-text-muted" role="status">
                All markets loaded • {filteredAndSorted.length} total
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
