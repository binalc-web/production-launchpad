import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOURCE_LABELS, AGENT_ANALYTICS_HORIZON_OPTIONS } from "../agentAnalyticsDisplay";

const STATUS_FILTER_OPTIONS = [
  { value: "__all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "finished", label: "Finished" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const FILTER_TRIGGER_CLASS =
  "h-8 w-full min-w-0 border-border/60 bg-background shadow-none sm:w-[132px]";

/**
 * Filters for project-scoped agent analytics tab.
 */
export function AgentAnalyticsToolbar({
  horizon,
  onHorizonChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  search,
  onSearchChange,
  resultCount,
}) {
  const sourceOptions = [
    { value: "__all", label: "All sources" },
    ...Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
          Filters
        </div>
        {typeof resultCount === "number" ? (
          <p className="text-xs text-muted-foreground">
            {resultCount} agent{resultCount === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:shrink-0">
          <Select value={horizon} onValueChange={onHorizonChange}>
            <SelectTrigger size="sm" className={FILTER_TRIGGER_CLASS}>
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {AGENT_ANALYTICS_HORIZON_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger size="sm" className={FILTER_TRIGGER_CLASS}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
            <SelectTrigger size="sm" className={FILTER_TRIGGER_CLASS}>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {sourceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="h-8 border-border/60 bg-background pl-9 shadow-none"
            placeholder="Search agents by label or id…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
