import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/pages/DiscoveryQuestionnaire/discoveryUtils";
import {
  BACKLOG_CONTENT_FILTERS,
  BACKLOG_EPIC_SORT_OPTIONS,
  BACKLOG_KIND_FILTERS,
  BACKLOG_STATUS_OPTIONS,
  BACKLOG_STORY_SORT_OPTIONS,
  backlogEpicStats,
  backlogFiltersActive,
  backlogStatusCounts,
  filterAndSortBacklogEpics,
  formatBacklogTimestamp,
} from "@/lib/backlogBoardList";

const EMPTY_CONTROLS = {
  query: "",
  status: "all",
  storyStatus: "all",
  kind: "any",
  content: "any",
  epicSort: "board",
  storySort: "board",
};

export function useBacklogBoardControls(epics, resetKey) {
  const [controls, setControls] = useState(EMPTY_CONTROLS);

  useEffect(() => {
    setControls(EMPTY_CONTROLS);
  }, [resetKey]);

  const visible = useMemo(() => filterAndSortBacklogEpics(epics, controls), [epics, controls]);
  const counts = useMemo(() => backlogStatusCounts(epics), [epics]);

  return {
    controls,
    visible,
    counts,
    active: backlogFiltersActive(controls),
    total: Array.isArray(epics) ? epics.length : 0,
    setControl: (key, value) => setControls((prev) => ({ ...prev, [key]: value })),
    reset: () => setControls(EMPTY_CONTROLS),
  };
}

function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div className="min-w-[9.5rem] flex-1 space-y-1">
      <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BacklogBoardControls({ board }) {
  const { controls, counts, visible, active, total, setControl, reset } = board;
  const statusOptions = [
    { id: "all", label: "All" },
    ...BACKLOG_STATUS_OPTIONS.map((option) => ({ ...option })),
  ];
  const storyStatusOptions = [{ id: "all", label: "Any story status" }, ...BACKLOG_STATUS_OPTIONS];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="space-y-1">
        <Label
          htmlFor="backlog-board-search"
          className="text-[11px] font-medium text-muted-foreground"
        >
          Search
        </Label>
        <Input
          id="backlog-board-search"
          value={controls.query}
          onChange={(event) => setControl("query", event.target.value)}
          placeholder="Epic, story, description, or creator…"
          className="h-8 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by epic status">
        {statusOptions.map((option) => {
          const selected = controls.status === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setControl("status", option.id)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              <span className="ml-1 tabular-nums opacity-80">{counts[option.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          id="backlog-board-epic-sort"
          label="Sort epics"
          value={controls.epicSort}
          onChange={(value) => setControl("epicSort", value)}
          options={BACKLOG_EPIC_SORT_OPTIONS}
        />
        <FilterSelect
          id="backlog-board-story-sort"
          label="Sort stories"
          value={controls.storySort}
          onChange={(value) => setControl("storySort", value)}
          options={BACKLOG_STORY_SORT_OPTIONS}
        />
        <FilterSelect
          id="backlog-board-story-status"
          label="Story status"
          value={controls.storyStatus}
          onChange={(value) => setControl("storyStatus", value)}
          options={storyStatusOptions}
        />
        <FilterSelect
          id="backlog-board-kind"
          label="Items"
          value={controls.kind}
          onChange={(value) => setControl("kind", value)}
          options={BACKLOG_KIND_FILTERS}
        />
        <FilterSelect
          id="backlog-board-content"
          label="Content"
          value={controls.content}
          onChange={(value) => setControl("content", value)}
          options={BACKLOG_CONTENT_FILTERS}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Showing {visible.length} of {total}
          {active ? " · filters on" : ""}
        </p>
        {active ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>
            Reset filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function timestampLabel(prefix, iso) {
  const absolute = formatBacklogTimestamp(iso);
  if (!absolute) return "";
  const relative = formatRelativeTime(iso);
  return `${prefix} ${absolute}${relative ? ` · ${relative}` : ""}`;
}

export function BacklogItemMeta({ createdAt, updatedAt, createdByName, children }) {
  const created = timestampLabel("Created", createdAt);
  const updatedAbsolute = formatBacklogTimestamp(updatedAt);
  const createdAbsolute = formatBacklogTimestamp(createdAt);
  const updated =
    updatedAbsolute && updatedAbsolute !== createdAbsolute
      ? timestampLabel("Updated", updatedAt)
      : "";

  return (
    <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
      <span>{created || "Created date unknown"}</span>
      {updated ? <span>{updated}</span> : null}
      {createdByName ? <span>By {createdByName}</span> : null}
      {children}
    </p>
  );
}

export function BacklogEpicMeta({ epic }) {
  const stats = backlogEpicStats(epic);
  const statusBits = BACKLOG_STATUS_OPTIONS.filter((option) => stats.byStatus[option.id] > 0).map(
    (option) => `${stats.byStatus[option.id]} ${option.label.toLowerCase()}`,
  );

  return (
    <BacklogItemMeta
      createdAt={epic.createdAt}
      updatedAt={epic.updatedAt}
      createdByName={epic.createdByName}
    >
      <span>
        {stats.storyCount} {stats.storyCount === 1 ? "story" : "stories"}
        {stats.taskCount ? ` · ${stats.taskCount} ${stats.taskCount === 1 ? "task" : "tasks"}` : ""}
      </span>
      {statusBits.length ? <span>{statusBits.join(" · ")}</span> : null}
      <span>
        {stats.descriptionLength
          ? `${stats.descriptionLength.toLocaleString()} description chars`
          : "No description"}
      </span>
      <span>Order {epic.sortOrder ?? 0}</span>
    </BacklogItemMeta>
  );
}

export function BacklogStoryMeta({ story }) {
  const bodyLength = typeof story.body === "string" ? story.body.trim().length : 0;
  return (
    <BacklogItemMeta createdAt={story.createdAt} updatedAt={story.updatedAt}>
      <span>{bodyLength ? `${bodyLength.toLocaleString()} note chars` : "No notes"}</span>
      <span>Order {story.sortOrder ?? 0}</span>
    </BacklogItemMeta>
  );
}
