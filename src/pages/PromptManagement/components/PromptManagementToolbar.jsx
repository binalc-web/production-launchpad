import React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryLabel } from "../managedPromptUiLabels";

/**
 * @param {object} props
 * @param {string} props.search
 * @param {(value: string) => void} props.onSearchChange
 * @param {string} props.category
 * @param {(value: string) => void} props.onCategoryChange
 * @param {Array<{ value: string; slug: string | null }>} props.categoryOptions
 * @param {number} props.total
 * @param {number} props.rangeStart
 * @param {number} props.rangeEnd
 * @param {number} props.page
 * @param {number} props.totalPages
 */
export function PromptManagementToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categoryOptions,
  total,
  rangeStart,
  rangeEnd,
  page,
  totalPages,
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="pm-search"
            type="search"
            placeholder="Search by name or content…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 w-full rounded-lg border-border bg-card pl-10 transition-all duration-200"
            aria-label="Search prompts"
          />
        </div>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-11 w-full min-w-0 rounded-lg sm:w-[min(100%,280px)]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            sideOffset={4}
            collisionPadding={12}
            className="max-h-[min(70dvh,22rem)] w-[var(--radix-select-trigger-width)]"
          >
            {categoryOptions.map((o) => {
              if (o.value === "__all") {
                return (
                  <SelectItem key="__all" value="__all">
                    All categories
                  </SelectItem>
                );
              }
              const lab = getCategoryLabel(o.slug);
              return (
                <SelectItem key={o.value} value={o.value} title={`${o.slug}: ${lab.summary}`}>
                  <span className="font-medium">{lab.title}</span>
                  <span className="block text-xs text-muted-foreground">{lab.summary}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">
          {total} prompt{total !== 1 ? "s" : ""}
        </Badge>
        {total > 0 ? (
          <span>
            Showing {rangeStart}
            {rangeEnd >= rangeStart ? `–${rangeEnd}` : ""} of {total}
            {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}
