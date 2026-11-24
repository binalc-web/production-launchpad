import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_LISTING_LABELS } from "../projectListingDisplay";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "lastUpdated", label: "Last updated" },
  { value: "name", label: "Name (A–Z)" },
];

function formatCountLine({ visibleCount, searchQuery }) {
  const q = searchQuery.trim();
  if (q) {
    return `${visibleCount} matching "${q}"`;
  }
  return `${visibleCount} project${visibleCount !== 1 ? "s" : ""}`;
}

export function ProjectsToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  showInactive,
  onShowInactiveChange,
  activeCount,
  inactiveCount,
  visibleCount,
}) {
  const countLine = formatCountLine({ visibleCount, searchQuery: search });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or description..."
            className="h-9 w-full rounded-lg border-border bg-card pl-9 text-sm"
            aria-label="Search projects"
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
          <p className="text-sm text-muted-foreground">{countLine}</p>
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger
              id="projects-sort"
              className="h-9 w-[10.5rem] text-sm"
              aria-label="Sort projects"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {inactiveCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="shrink-0 text-sm text-muted-foreground whitespace-nowrap">
            <span className="font-medium text-foreground">
              {PROJECT_LISTING_LABELS.activeCount(activeCount)}
            </span>
            <span className="mx-2 text-border">·</span>
            <span className="font-medium text-foreground">
              {PROJECT_LISTING_LABELS.inactiveCount(inactiveCount)}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Switch
              id="show-inactive-projects"
              checked={showInactive}
              onCheckedChange={onShowInactiveChange}
              aria-label={PROJECT_LISTING_LABELS.showInactive}
            />
            <Label
              htmlFor="show-inactive-projects"
              className="cursor-pointer whitespace-nowrap text-sm font-normal text-foreground"
            >
              {PROJECT_LISTING_LABELS.showInactive}
            </Label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
