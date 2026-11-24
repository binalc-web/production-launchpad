import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { cn } from "@/lib/utils";
import { describeCaptureSource } from "@/lib/captureSourceList";
import { formatRelativeTime } from "@/pages/DiscoveryQuestionnaire/discoveryUtils";
import { ChevronDown } from "lucide-react";
import {
  CaptureSourceControls,
  CaptureSourceList,
  useCaptureSourceControls,
} from "@/components/BacklogSuggestions/CaptureSourceBrowser";

function SelectedFacts({ item }) {
  const details = describeCaptureSource(item);
  const relative = details.createdAt ? formatRelativeTime(details.createdAt) : "";
  const bits = [
    details.createdLabel ? `Created ${details.createdLabel}` : null,
    relative || null,
    details.sourceLabel || null,
    details.phaseLabel || null,
    details.fileName || null,
    details.extractedCount
      ? `${details.extractedCount} ${details.extractedCount === 1 ? "insight" : "insights"}`
      : null,
  ].filter(Boolean);
  if (!bits.length) return null;
  return <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{bits.join(" · ")}</p>;
}

function SelectedCaptureSummary({ selectedItems, onClear, onToggle }) {
  if (!selectedItems.length) return null;

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Selected context ({selectedItems.length})
          </p>
          <Badge variant="secondary" className="text-[10px] font-normal">
            Strict scope
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          Clear all
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {selectedItems.map((item) => (
          <li key={`sel-${item.id}`}>
            <div className="flex h-full min-h-[88px] flex-col rounded-md border border-primary/25 bg-background/80 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums">
                      #{item.selectionOrder}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="h-auto max-w-full min-w-0 whitespace-normal break-words rounded-md text-left text-[10px] font-normal leading-snug"
                    >
                      <span className="min-w-0 max-w-full break-words whitespace-normal">
                        {item.typeLabel}
                      </span>
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug line-clamp-1">{item.label}</p>
                  <SelectedFacts item={item} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-[10px]"
                  onClick={() => onToggle(item.id)}
                >
                  Remove
                </Button>
              </div>
              <div className="mt-1.5 max-h-[2.75rem] overflow-hidden text-muted-foreground [&_.assistant-markdown_p]:mb-0 [&_.assistant-markdown_p]:text-xs [&_.assistant-markdown_p]:leading-snug">
                <AssistantMarkdown
                  text={item.preview?.trim() || "No preview available."}
                  emptyLabel="No preview available."
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CaptureContextPicker({ captureContext, sourcesLoading, embedded = false }) {
  const {
    labelProps,
    textareaProps,
    characterCount,
    hasSelectedCapture,
    documentSelectionSource,
    focusDocumentSelection = false,
    multiSelect,
    maxEntries,
    entriesLoaded,
    loading,
  } = captureContext;

  const [captureListOpen, setCaptureListOpen] = useState(!focusDocumentSelection);
  const pickerDisabled = loading || sourcesLoading;
  const selectedIdSet = useMemo(() => new Set(multiSelect.selectedIds), [multiSelect.selectedIds]);
  const availableItems = useMemo(
    () => multiSelect.items.filter((item) => !selectedIdSet.has(item.id)),
    [multiSelect.items, selectedIdSet],
  );
  const browser = useCaptureSourceControls(availableItems);
  const shownIds = browser.filtered.slice(0, maxEntries).map((item) => item.id);

  const captureEntriesSection = loading ? (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label="Loading Capture entries"
    >
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  ) : multiSelect.items.length === 0 ? (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        No Capture entries yet. Add notes or files in Discovery → Capture.
      </p>
    </div>
  ) : availableItems.length === 0 ? (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        All Capture entries are selected. Remove one above to pick a different entry.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      <CaptureSourceControls browser={browser} idPrefix="capture-picker" />
      <CaptureSourceList
        items={browser.filtered}
        selectedIdSet={selectedIdSet}
        disabled={pickerDisabled}
        onToggle={multiSelect.toggle}
        emptyLabel="No entries match these filters."
      />
    </div>
  );

  return (
    <section
      className={cn(
        "space-y-6 rounded-xl",
        embedded ? "space-y-4 border border-border/60 bg-muted/20 p-4" : "bg-muted/10 p-5 md:p-6",
      )}
    >
      {focusDocumentSelection ? (
        <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Your selection
            </p>
            {documentSelectionSource?.docName ? (
              <Badge
                variant="outline"
                className="h-auto max-w-full min-w-0 whitespace-normal break-words rounded-md text-left text-[10px] font-normal leading-snug"
              >
                <span className="min-w-0 max-w-full break-words whitespace-normal">
                  from {documentSelectionSource.docName}
                </span>
              </Badge>
            ) : null}
          </div>
          <Textarea
            {...textareaProps}
            rows={6}
            className="min-h-[120px] resize-y bg-background text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Edit the selection before generating suggestions, or add capture entries below.
            {characterCount > 0 ? ` · ${characterCount.toLocaleString()} chars in context` : ""}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Label {...labelProps} className="text-sm font-medium">
            {focusDocumentSelection ? "Add capture entries (optional)" : "Discovery capture"}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {focusDocumentSelection
              ? `Optionally include up to ${maxEntries} timeline entries alongside your selection.`
              : `Choose up to ${maxEntries} timeline entries. Each row shows when it was created, plus source, phase, and insights.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!focusDocumentSelection && shownIds.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={pickerDisabled || entriesLoaded === 0}
              onClick={() => multiSelect.addSelection(shownIds)}
            >
              {browser.active ? "Select shown" : "Select recent"}
            </Button>
          ) : null}
          {multiSelect.selectedIds.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => multiSelect.clear()}
            >
              Clear ({multiSelect.selectedIds.length})
            </Button>
          ) : null}
        </div>
      </div>

      <SelectedCaptureSummary
        selectedItems={multiSelect.selectedItems ?? []}
        onClear={() => multiSelect.clear()}
        onToggle={(id) => multiSelect.toggle(id)}
      />

      <div className="space-y-4 border-t border-border/50 pt-6">
        {focusDocumentSelection ? (
          <Collapsible open={captureListOpen} onOpenChange={setCaptureListOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors">
              Browse capture timeline
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 opacity-60 transition-transform",
                  captureListOpen && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">{captureEntriesSection}</CollapsibleContent>
          </Collapsible>
        ) : (
          captureEntriesSection
        )}
      </div>

      {!focusDocumentSelection ? (
        <div className="space-y-2 border-t border-border/50 pt-6">
          <Label htmlFor={textareaProps.id} className="text-sm font-medium">
            Optional notes
          </Label>
          <Textarea {...textareaProps} />
          <p className="text-xs text-muted-foreground">
            {hasSelectedCapture
              ? `${multiSelect.selectedIds.length} Capture ${multiSelect.selectedIds.length === 1 ? "entry" : "entries"} selected`
              : "Select Capture timeline entries or add optional notes below"}
            {characterCount > 0 ? ` · ${characterCount.toLocaleString()} chars in context` : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}
