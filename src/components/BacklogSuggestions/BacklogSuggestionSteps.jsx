import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ChatAttachControl } from "@/components/chat/ChatAttachControl";
import { ChatAttachmentChips } from "@/components/chat/ChatAttachmentChips";
import {
  CaptureSourceControls,
  CaptureSourceList,
  useCaptureSourceControls,
} from "@/components/BacklogSuggestions/CaptureSourceBrowser";

function StepHeader({ number, title, hint, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {number}
        </span>
        <p className="text-base font-semibold text-foreground">{title}</p>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Step 1 of backlog suggestions: pick Discovery capture entries (or edit a document selection). */
export function BacklogSourceMaterialCard({ captureContext, sourcesLoading }) {
  const {
    textareaProps,
    characterCount,
    documentSelectionSource,
    focusDocumentSelection = false,
    multiSelect,
    maxEntries,
    loading,
  } = captureContext;
  const disabled = loading || sourcesLoading;
  const selectedIdSet = useMemo(() => new Set(multiSelect.selectedIds), [multiSelect.selectedIds]);
  const browser = useCaptureSourceControls(multiSelect.items);
  const shownIds = browser.filtered.slice(0, maxEntries).map((item) => item.id);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selectedIdSet.has(id));

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <StepHeader
        number={1}
        title="Choose source material"
        hint={`Up to ${maxEntries}`}
        actions={
          multiSelect.items.length > 0 && shownIds.length > 0 ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm font-semibold"
              disabled={disabled}
              onClick={() =>
                allShownSelected
                  ? multiSelect.removeSelection(shownIds)
                  : multiSelect.addSelection(shownIds)
              }
            >
              {allShownSelected
                ? browser.active
                  ? "Deselect shown"
                  : "Deselect all"
                : browser.active
                  ? "Select shown"
                  : "Select all"}
            </Button>
          ) : null
        }
      />

      {focusDocumentSelection ? (
        <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label
              htmlFor={textareaProps.id}
              className="text-xs font-semibold uppercase tracking-wide text-primary"
            >
              Your selection
            </Label>
            {documentSelectionSource?.docName ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                from {documentSelectionSource.docName}
              </Badge>
            ) : null}
          </div>
          <Textarea
            {...textareaProps}
            rows={6}
            className="min-h-[120px] resize-y bg-background text-sm"
          />
          {characterCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {characterCount.toLocaleString()} chars in context
            </p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div
          className="space-y-2"
          role="status"
          aria-busy="true"
          aria-label="Loading Capture entries"
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : multiSelect.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No Capture entries yet. Add notes or files in Discovery → Capture.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <CaptureSourceControls browser={browser} idPrefix="backlog-source" />
          <CaptureSourceList
            items={browser.filtered}
            selectedIdSet={selectedIdSet}
            disabled={disabled}
            onToggle={multiSelect.toggle}
            emptyLabel="No entries match these filters."
          />
        </div>
      )}
    </section>
  );
}

/** Step 2 of backlog suggestions: optional notes and attached documents. */
export function BacklogAddContextCard({
  captureContext,
  attach,
  disabled = false,
  showNotes = true,
}) {
  const { textareaProps, characterCount } = captureContext;
  const hasNotes = Boolean(String(textareaProps.value ?? "").trim());
  const [notesOpen, setNotesOpen] = useState(false);
  const notesVisible = showNotes && (notesOpen || hasNotes);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <StepHeader
        number={2}
        title="Add context"
        hint="Optional"
        actions={
          <>
            {showNotes && !notesVisible ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={disabled}
                onClick={() => setNotesOpen(true)}
              >
                <Plus className="size-4" aria-hidden />
                Add notes
              </Button>
            ) : null}
            <ChatAttachControl
              disabled={disabled}
              uploading={attach.uploading}
              onFiles={(files) => void attach.addFiles(files)}
              variant="outline"
              size="sm"
              text={attach.uploading ? "Uploading…" : "Attach document"}
            />
          </>
        }
      />
      {notesVisible ? (
        <div className="space-y-2">
          <Label htmlFor={textareaProps.id} className="sr-only">
            Notes
          </Label>
          <Textarea {...textareaProps} autoFocus={notesOpen && !hasNotes} />
          {characterCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {characterCount.toLocaleString()} chars in context
            </p>
          ) : null}
        </div>
      ) : null}
      {attach.items.length ? (
        <ChatAttachmentChips items={attach.items} onRemove={attach.remove} disabled={disabled} />
      ) : null}
      {attach.uploading && !attach.items.length ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
    </section>
  );
}
