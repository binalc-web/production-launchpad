import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/pages/DiscoveryQuestionnaire/discoveryUtils";
import {
  CAPTURE_CONTENT_FILTERS,
  CAPTURE_SORT_OPTIONS,
  captureFilterOptions,
  captureFiltersActive,
  filterAndSortCaptureItems,
} from "@/lib/captureSourceList";

const EMPTY_CONTROLS = {
  query: "",
  typeFilter: "all",
  phaseFilter: "all",
  sourceFilter: "all",
  contentFilter: "any",
  sort: "newest",
};

export function useCaptureSourceControls(items) {
  const [controls, setControls] = useState(EMPTY_CONTROLS);
  const options = useMemo(() => captureFilterOptions(items), [items]);
  const filtered = useMemo(() => filterAndSortCaptureItems(items, controls), [items, controls]);
  const active = captureFiltersActive(controls);

  useEffect(() => {
    setControls((prev) => {
      const next = { ...prev };
      let changed = false;
      if (
        prev.typeFilter !== "all" &&
        !options.types.some((option) => option.id === prev.typeFilter)
      ) {
        next.typeFilter = "all";
        changed = true;
      }
      if (
        prev.phaseFilter !== "all" &&
        !options.phases.some((option) => option.id === prev.phaseFilter)
      ) {
        next.phaseFilter = "all";
        changed = true;
      }
      if (
        prev.sourceFilter !== "all" &&
        !options.sources.some((option) => option.id === prev.sourceFilter)
      ) {
        next.sourceFilter = "all";
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [options]);

  const setControl = (key, value) => {
    setControls((prev) => ({ ...prev, [key]: value }));
  };

  return {
    controls,
    options,
    filtered,
    active,
    totalCount: Array.isArray(items) ? items.length : 0,
    setControl,
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

export function CaptureSourceControls({ browser, idPrefix = "capture-source" }) {
  const { controls, options, filtered, active, setControl, reset } = browser;
  const total = browser.totalCount ?? 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label
          htmlFor={`${idPrefix}-search`}
          className="text-[11px] font-medium text-muted-foreground"
        >
          Search
        </Label>
        <Input
          id={`${idPrefix}-search`}
          value={controls.query}
          onChange={(event) => setControl("query", event.target.value)}
          placeholder="Title, notes, source, insights…"
          className="h-8 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
        {options.types.map((filter) => {
          const selected = controls.typeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setControl("typeFilter", filter.id)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
              <span className="ml-1 tabular-nums opacity-80">{filter.count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          id={`${idPrefix}-sort`}
          label="Sort"
          value={controls.sort}
          onChange={(value) => setControl("sort", value)}
          options={CAPTURE_SORT_OPTIONS}
        />
        <FilterSelect
          id={`${idPrefix}-phase`}
          label="Phase"
          value={controls.phaseFilter}
          onChange={(value) => setControl("phaseFilter", value)}
          options={options.phases}
        />
        <FilterSelect
          id={`${idPrefix}-source`}
          label="Source"
          value={controls.sourceFilter}
          onChange={(value) => setControl("sourceFilter", value)}
          options={options.sources}
        />
        <FilterSelect
          id={`${idPrefix}-content`}
          label="Content"
          value={controls.contentFilter}
          onChange={(value) => setControl("contentFilter", value)}
          options={CAPTURE_CONTENT_FILTERS}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {total}
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

function Fact({ children }) {
  if (!children) return null;
  return <span className="text-[11px] text-muted-foreground">{children}</span>;
}

function CaptureSourceRow({ item, checked, disabled, onToggle }) {
  const [open, setOpen] = useState(false);
  const details = item.details;
  const preview = item.preview?.trim() || "No preview available.";
  const relative = details?.createdLabel ? formatRelativeTime(details.createdAt) : "";

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        checked ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-pressed={checked}
          aria-disabled={disabled || undefined}
          onClick={() => {
            if (!disabled) onToggle(item.id);
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle(item.id);
            }
          }}
          className={cn(
            "flex min-w-0 flex-1 items-start gap-3 text-left",
            "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !disabled && "cursor-pointer",
            disabled && "pointer-events-none",
          )}
        >
          <Checkbox
            checked={checked}
            tabIndex={-1}
            aria-hidden
            className={cn(
              "mt-0.5 shrink-0",
              checked && "border-primary data-[state=checked]:bg-primary",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {checked && item.selectionOrder != null ? (
                <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums">
                  #{item.selectionOrder}
                </Badge>
              ) : null}
              <p className="min-w-0 text-sm font-semibold leading-snug text-foreground">
                {item.label}
              </p>
              <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                {item.typeLabel}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Fact>
                {details?.createdLabel
                  ? `Created ${details.createdLabel}${relative ? ` · ${relative}` : ""}`
                  : "Created date unknown"}
              </Fact>
              {details?.sourceLabel ? <Fact>Source {details.sourceLabel}</Fact> : null}
              {details?.phaseLabel ? <Fact>Phase {details.phaseLabel}</Fact> : null}
              {details?.scopeLabel ? <Fact>{details.scopeLabel} website</Fact> : null}
              {details?.mimeLabel ? <Fact>{details.mimeLabel}</Fact> : null}
              {details?.fileName ? <Fact>{details.fileName}</Fact> : null}
              {details?.pageCount ? (
                <Fact>
                  {details.pageCount} {details.pageCount === 1 ? "page" : "pages"}
                </Fact>
              ) : null}
              <Fact>
                {details?.bodyLength ? `${details.bodyLength.toLocaleString()} chars` : "No notes"}
              </Fact>
              <Fact>
                {details?.extractedCount
                  ? `${details.extractedCount} ${details.extractedCount === 1 ? "insight" : "insights"}`
                  : "No insights"}
              </Fact>
            </div>
            {details?.extractedGroups?.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {details.extractedGroups.map((group) => (
                  <Badge key={group.key} variant="secondary" className="text-[10px] font-normal">
                    {group.label} {group.items.length}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="mt-1 max-h-5 overflow-hidden text-muted-foreground [&_.assistant-markdown_p]:mb-0 [&_.assistant-markdown_p]:truncate [&_.assistant-markdown_p]:text-xs">
              <AssistantMarkdown text={preview} emptyLabel="" />
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-xs"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide" : "Details"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-border/70 px-4 py-3 text-xs">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-muted-foreground">Created</dt>
              <dd className="text-foreground">
                {details?.createdLabel || "Unknown"}
                {relative ? ` (${relative})` : ""}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Type</dt>
              <dd className="text-foreground">{item.typeLabel || "Capture"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Source</dt>
              <dd className="text-foreground">{details?.sourceLabel || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Engagement phase</dt>
              <dd className="text-foreground">{details?.phaseLabel || "—"}</dd>
            </div>
            {details?.fileName ? (
              <div>
                <dt className="font-medium text-muted-foreground">File</dt>
                <dd className="break-all text-foreground">{details.fileName}</dd>
              </div>
            ) : null}
            {details?.mimeLabel ? (
              <div>
                <dt className="font-medium text-muted-foreground">Format</dt>
                <dd className="text-foreground">{details.mimeLabel}</dd>
              </div>
            ) : null}
            {details?.scopeLabel ? (
              <div>
                <dt className="font-medium text-muted-foreground">Website scope</dt>
                <dd className="text-foreground">{details.scopeLabel}</dd>
              </div>
            ) : null}
            {details?.externalNoteId ? (
              <div>
                <dt className="font-medium text-muted-foreground">External id</dt>
                <dd className="break-all text-foreground">{details.externalNoteId}</dd>
              </div>
            ) : null}
          </dl>

          {details?.urls?.length ? (
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground">Links</p>
              <ul className="m-0 list-none space-y-1 p-0">
                {details.urls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-primary underline-offset-2 hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {details?.appliedLabels?.length ? (
            <p className="text-muted-foreground">
              Applied to profiles:{" "}
              <span className="text-foreground">{details.appliedLabels.join(", ")}</span>
            </p>
          ) : null}

          {details?.extractedGroups?.length ? (
            <div className="space-y-2">
              {details.extractedGroups.map((group) => (
                <div key={group.key}>
                  <p className="font-medium text-foreground">{group.label}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                    {group.items.map((text, index) => (
                      <li key={`${group.key}-${index}`}>{text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No extracted insights on this entry.</p>
          )}

          {details?.body ? (
            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-2 text-muted-foreground">
              {details.body}
            </div>
          ) : (
            <p className="text-muted-foreground">No note body stored on this entry.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CaptureSourceList({ items, selectedIdSet, disabled, onToggle, emptyLabel }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {items.map((item) => (
        <li key={item.id}>
          <CaptureSourceRow
            item={item}
            checked={selectedIdSet.has(item.id)}
            disabled={disabled}
            onToggle={onToggle}
          />
        </li>
      ))}
    </ul>
  );
}
