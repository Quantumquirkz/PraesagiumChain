"use client";

import { useMemo, useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";
import { useInfiniteMarkets, useMarketStats } from "@/features/markets/hooks/use-markets";
import {
  MarketFilters,
  filterStateFromParams,
  filterStateToParams,
  type SortOption,
  type FilterState,
} from "@/features/markets/components/market-filters";
import { StatsCards } from "@/components/stats-cards";
import { MarketCard } from "@/features/markets/components/market-card";
import { MarketCardSkeleton, StatsSkeleton } from "@/components/skeletons";
import { NoMarkets } from "@/components/empty-states/no-markets";
import { LastUpdated } from "@/components/last-updated";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/hero-section";
import type { MarketView } from "@/types/api";
import { detectCategory, type MarketCategory } from "@/lib/utils";
import { getMarketCategoryFromMetadata } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─── Category for filter (metadata when present, else question-based) ─────────

/** Returns filter tab category: use metadata when present, else detect from question. Maps general → Other. */
function getMarketCategoryForFilter(market: MarketView): MarketCategory {
  if (market.metadata?.trim()) {
    const metaCat = getMarketCategoryFromMetadata(market.metadata);
    switch (metaCat) {
      case "crypto":  return "Crypto";
      case "sports":  return "Sports";
      case "weather": return "Weather";
      case "general": return "Other";
      default: return "Other";
    }
  }
  return detectCategory(market.question);
}

// ─── Helpers de filtrado/ordenamiento (client-side) ───────────────────────────

function filterAndSort(items: MarketView[], filters: FilterState): MarketView[] {
  const q = filters.q.trim().toLowerCase();
  let list = [...items];

  if (q) list = list.filter((m) => m.question.toLowerCase().includes(q));
  if (filters.category) list = list.filter((m) => getMarketCategoryForFilter(m) === filters.category);

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
    default: {
      const _: never = filters.sort;
      return list;
    }
  }

  return list;
}

// ─── Página ───────────────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initial state from URL — recomputed when searchParams change
  const initialFilters = useMemo(() => filterStateFromParams(searchParams), [searchParams]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Sincronizar filtros cuando la URL cambia externamente (ej. navegación atrás)
  useEffect(() => {
    setFilters(filterStateFromParams(searchParams));
  }, [searchParams]);

  // Sync filters → URL without reload
  useEffect(() => {
    const params = filterStateToParams(filters);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

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
    error: marketsQueryError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch: refetchMarkets,
    dataUpdatedAt: marketsUpdatedAt,
  } = useInfiniteMarkets(statusParam);

  // Flatten all pages and apply filters client-side
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

  // Track how many items there were before last load to animate only new ones
  const prevCountRef = useRef(0);
  const newBatchStart = prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = filteredAndSorted.length;
  }, [filteredAndSorted.length]);

  const lastUpdatedAt = Math.max(statsUpdatedAt ?? 0, marketsUpdatedAt ?? 0) || undefined;
  const isEmpty = !marketsLoading && !marketsError && filteredAndSorted.length === 0;
  const isFirstEmpty = totalFromApi === 0 && !filters.status;

  const statsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (marketsError) toast.error("Failed to load markets.");
  }, [marketsError]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <HeroSection marketsRef={statsRef} />

      {/* Stats */}
      <section aria-label="Statistics" ref={statsRef}>
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
            {marketsQueryError?.message && (
              <p className="font-body text-sm text-text-secondary mb-3 max-w-md">
                {marketsQueryError.message}
              </p>
            )}
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
                // Animate only the new cards from the last loaded page
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
              <>
                <p className="mt-8 text-center font-mono text-xs text-text-muted" role="status">
                  All markets loaded • {filteredAndSorted.length} total
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/markets/private?join=1"
                    className="inline-flex items-center gap-2 rounded-xl border border-violet/30 bg-violet-dim/50 px-4 py-2.5 font-body text-sm text-violet hover:bg-violet-dim transition-colors"
                  >
                    Have a private market token? Join from Private Markets
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-8">
      <section aria-label="Statistics">
        <StatsSkeleton aria-busy="true" />
      </section>
      <section aria-label="Markets">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-foreground">Markets</h2>
        </div>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading markets"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
