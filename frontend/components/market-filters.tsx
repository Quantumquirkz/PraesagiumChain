"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "Open", label: "Open" },
  { value: "Locked", label: "Locked" },
  { value: "Resolved", label: "Resolved" },
  { value: "Cancelled", label: "Cancelled" },
] as const;

export type SortOption = "newest" | "closes_soon" | "most_volume";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "closes_soon", label: "Closes Soon" },
  { value: "most_volume", label: "Most Volume" },
];

export interface MarketFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  /** Total count for "N markets" display; optional */
  totalCount?: number;
  className?: string;
}

export function MarketFilters({
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  sort,
  onSortChange,
  totalCount,
  className,
}: MarketFiltersProps) {
  const [displayCount, setDisplayCount] = useState(totalCount ?? 0);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    const count = totalCount ?? 0;
    if (count !== displayCount) {
      setFadeKey((k: number) => k + 1);
      setDisplayCount(count);
    }
  }, [totalCount, displayCount]);

  return (
    <div
      className={cn("flex flex-wrap items-center gap-3 py-4", className)}
      role="search"
      aria-label="Filter and sort markets"
      style={{ padding: "16px 0" }}
    >
      {/* Status tabs — unified tab bar */}
      <Tabs
        value={statusFilter || "all"}
        onValueChange={(v: string) => onStatusChange(v === "all" ? "" : v)}
      >
        <TabsList
          className={cn(
            "flex h-auto gap-0 rounded-md border border-border bg-elevated p-1",
            "rounded-[6px]"
          )}
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
              aria-label={`Filter by ${label}`}
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
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "w-full h-10 pl-9 pr-3 rounded-md border border-border bg-elevated font-body text-sm text-foreground placeholder:text-text-muted",
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
            "h-10 w-[180px] rounded-md border border-border bg-elevated font-body text-sm",
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
      >
        {displayCount} market{displayCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
