"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import type { MarketCategory } from "@/lib/utils";

// ─── Constantes ───────────────────────────────────────────────────────────────

export const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "Open", label: "Open" },
  { value: "Locked", label: "Locked" },
  { value: "Resolved", label: "Resolved" },
  { value: "Cancelled", label: "Cancelled" },
] as const;

export const CATEGORY_TABS: { value: MarketCategory | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "Crypto", label: "Crypto" },
  { value: "Sports", label: "Sports" },
  { value: "Weather", label: "Weather" },
  { value: "Other", label: "Other" },
];

export type SortOption = "newest" | "closes_soon" | "most_volume" | "ai_confidence";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "closes_soon", label: "Closes Soon" },
  { value: "most_volume", label: "Most Volume" },
  { value: "ai_confidence", label: "Highest AI Confidence" },
];

const SORT_VALUES: SortOption[] = SORT_OPTIONS.map((o) => o.value);

// ─── URL param helpers ────────────────────────────────────────────────────────

export interface FilterState {
  status: string;
  category: MarketCategory | "";
  sort: SortOption;
  q: string;
}

export function filterStateFromParams(params: URLSearchParams): FilterState {
  const status = params.get("status") ?? "";
  const rawCat = params.get("category") ?? "";
  const category = (["Crypto", "Sports", "Weather", "Other"].includes(rawCat)
    ? rawCat
    : "") as MarketCategory | "";
  const rawSort = params.get("sort") ?? "newest";
  const sort = (SORT_VALUES.includes(rawSort as SortOption) ? rawSort : "newest") as SortOption;
  const q = params.get("q") ?? "";
  return { status, category, sort, q };
}

export function filterStateToParams(state: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.status) p.set("status", state.status);
  if (state.category) p.set("category", state.category);
  if (state.sort !== "newest") p.set("sort", state.sort);
  if (state.q) p.set("q", state.q);
  return p;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MarketFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  categoryFilter: MarketCategory | "";
  onCategoryChange: (value: MarketCategory | "") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  totalCount?: number;
  className?: string;
}

// ─── Active filter chips ──────────────────────────────────────────────────────

interface ActiveChip {
  label: string;
  onRemove: () => void;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MarketFilters({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sort,
  onSortChange,
  totalCount,
  className,
}: MarketFiltersProps) {
  const [displayCount, setDisplayCount] = useState(totalCount ?? 0);
  const [fadeKey, setFadeKey] = useState(0);
  const [inputValue, setInputValue] = useState(searchQuery);

  const debouncedSearch = useDebounce(inputValue, 300);

  // Propagate debounced value only; parent callbacks intentionally omitted to avoid feedback loop.
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      onSearchChange(debouncedSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync local input when parent clears search; omit onSearchChange to avoid loop.
  useEffect(() => {
    if (searchQuery !== inputValue && searchQuery === "") {
      setInputValue("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    const count = totalCount ?? 0;
    if (count !== displayCount) {
      setFadeKey((k: number) => k + 1);
      setDisplayCount(count);
    }
  }, [totalCount, displayCount]);

  // Chips de filtros activos
  const activeChips: ActiveChip[] = [];
  if (statusFilter) {
    activeChips.push({
      label: `Status: ${statusFilter}`,
      onRemove: () => onStatusChange(""),
    });
  }
  if (categoryFilter) {
    activeChips.push({
      label: `Category: ${categoryFilter}`,
      onRemove: () => onCategoryChange(""),
    });
  }
  if (sort !== "newest") {
    const label = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort;
    activeChips.push({
      label: `Sort: ${label}`,
      onRemove: () => onSortChange("newest"),
    });
  }
  if (searchQuery) {
    activeChips.push({
      label: `"${searchQuery.length > 20 ? searchQuery.slice(0, 20) + "…" : searchQuery}"`,
      onRemove: () => { setInputValue(""); onSearchChange(""); },
    });
  }

  const clearAll = useCallback(() => {
    onStatusChange("");
    onCategoryChange("");
    onSortChange("newest");
    setInputValue("");
    onSearchChange("");
  }, [onStatusChange, onCategoryChange, onSortChange, onSearchChange]);

  return (
    <div
      className={cn("space-y-3", className)}
      role="search"
      aria-label="Filter and sort markets"
    >
      {/* ROW 1: Status tabs + search + sort */}
      <div className="flex flex-wrap items-center gap-3" style={{ padding: "8px 0" }}>
        {/* Status tabs */}
        <Tabs
          value={statusFilter || "all"}
          onValueChange={(v: string) => onStatusChange(v === "all" ? "" : v)}
        >
          <TabsList
            className="flex h-auto gap-0 rounded-xl border border-border bg-elevated p-1"
            style={{ padding: 4 }}
          >
            {STATUS_TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value || "all"}
                value={value || "all"}
                className={cn(
                  "font-body font-medium text-xs rounded-[4px] border border-transparent",
                  "data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:border-border-bright",
                  "data-[state=inactive]:text-text-secondary"
                )}
                style={{ padding: "6px 14px", fontSize: 12 }}
                aria-label={`Filter by status: ${label}`}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Search input */}
        <div className="relative w-[220px]">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search markets..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={cn(
              "w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-elevated font-body text-sm text-foreground placeholder:text-text-muted",
              "focus:outline-none focus:border-cyan focus:ring-[3px] focus:ring-cyan-dim"
            )}
            style={{ fontSize: 14 }}
            aria-label="Search markets by question"
          />
        </div>

        {/* Sort select */}
        <Select value={sort} onValueChange={(v: string) => onSortChange(v as SortOption)}>
          <SelectTrigger
            className={cn(
              "h-10 w-[200px] rounded-lg border border-border bg-elevated font-body text-sm",
              "focus:ring-[3px] focus:ring-cyan-dim focus:border-cyan"
            )}
            style={{ fontSize: 14 }}
            aria-label="Sort markets"
          >
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="bg-elevated border-border">
            {SORT_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} className="font-body">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Result count */}
        <span
          key={fadeKey}
          className="font-mono text-xs text-text-muted count-fade"
          role="status"
          aria-live="polite"
        >
          {displayCount} market{displayCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ROW 2: Category chips */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
        {CATEGORY_TABS.map(({ value, label }) => {
          const isActive = (value === "" && categoryFilter === "") || value === categoryFilter;
          return (
            <button
              key={value || "cat-all"}
              type="button"
              onClick={() => onCategoryChange(value as MarketCategory | "")}
              aria-pressed={isActive}
              className={cn(
                "h-7 rounded-full border px-3 font-mono text-[11px] tracking-wide transition-colors",
                isActive
                  ? "bg-cyan-dim border-cyan text-cyan"
                  : "bg-elevated border-border text-text-muted hover:border-cyan/40 hover:text-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ROW 3: Active filter chips + Clear all */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {activeChips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 rounded-full border border-violet/40 bg-violet-dim px-2.5 py-0.5 font-mono text-[11px] text-violet"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="ml-0.5 rounded-full hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="font-mono text-[11px] text-text-muted hover:text-red transition-colors underline underline-offset-2"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
