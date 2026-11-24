import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DatePickerSingle } from "@/components/ui/date-picker-single";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { actualShipDateChanged } from "@/lib/releasePresentation";
import { cn } from "@/lib/utils";
import { ReleaseTagsInput } from "@/components/release/ReleaseTagsInput";

export function EditReleaseDialog({
  open,
  onOpenChange,
  editDialog,
  setEditDialog,
  editSaving,
  onSubmit,
  onRegenerateReviewSummary,
  aiSummaryRegenerating,
  onManageScope,
}) {
  const [clientLinkOpen, setClientLinkOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(() => Boolean(editDialog?.focusShipDate));
  const shipDateSectionRef = useRef(null);

  useEffect(() => {
    if (!open || !editDialog?.focusShipDate) return;
    setMoreOptionsOpen(true);
    const scrollTimer = window.setTimeout(() => {
      shipDateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(scrollTimer);
  }, [open, editDialog?.focusShipDate, editDialog?.id]);

  if (!editDialog) return null;

  const metadataLocked = editDialog.isLocked;
  const shipDisabled = editDialog.isSkipped;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit release</DialogTitle>
          <DialogDescription className="text-left">
            {editDialog.isSkipped ? (
              <>
                This release is skipped. Update client link content below; actual ship date is not
                available.
              </>
            ) : editDialog.isLocked ? (
              <>
                This release is locked. Schedule, MVP, and release notes cannot change. You can
                update client link content and actual ship date.
              </>
            ) : (
              <>
                Update release metadata. Stories and tasks are managed separately in release scope.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-4 rounded-lg border border-border/80 bg-muted/20 p-4">
            <div className="space-y-2">
              <Label htmlFor="edit-release-name">Release number</Label>
              <Input
                id="edit-release-name"
                value={editDialog.name}
                readOnly
                disabled
                className="cursor-not-allowed bg-muted/50"
              />
            </div>

            <div className={cn("space-y-4", metadataLocked && "pointer-events-none opacity-60")}>
              <div className="space-y-2">
                <Label htmlFor="edit-release-manual-desc">Release notes (optional)</Label>
                <Textarea
                  id="edit-release-manual-desc"
                  value={editDialog.releaseDescription ?? ""}
                  onChange={(e) =>
                    setEditDialog((prev) =>
                      prev ? { ...prev, releaseDescription: e.target.value } : prev,
                    )
                  }
                  readOnly={metadataLocked}
                  placeholder="Goals, context, or stakeholder notes."
                  rows={3}
                  className="min-h-[80px] resize-y text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Schedule</Label>
                <DatePickerWithRange
                  className="h-10 w-full border-slate-200 bg-white hover:bg-slate-50/90"
                  date={
                    editDialog.startDate || editDialog.releaseDate
                      ? {
                          from: editDialog.startDate ?? undefined,
                          to: editDialog.releaseDate ?? undefined,
                        }
                      : undefined
                  }
                  setDate={(range) => {
                    setEditDialog((prev) =>
                      prev
                        ? {
                            ...prev,
                            startDate: range?.from ?? null,
                            releaseDate: range?.to ?? null,
                          }
                        : prev,
                    );
                  }}
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-3">
                <Checkbox
                  id="edit-is-mvp"
                  checked={editDialog.isMvp}
                  disabled={metadataLocked}
                  onCheckedChange={(checked) =>
                    setEditDialog((prev) => (prev ? { ...prev, isMvp: checked === true } : prev))
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="edit-is-mvp" className="cursor-pointer text-sm">
                  MVP release
                </Label>
              </div>

              <ReleaseTagsInput
                id="edit-release-tags"
                tags={editDialog.tags}
                disabled={metadataLocked}
                onChange={(tags) => setEditDialog((prev) => (prev ? { ...prev, tags } : prev))}
              />

              {!metadataLocked ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-reason">Reason for changes</Label>
                  <Textarea
                    id="edit-reason"
                    rows={2}
                    placeholder="Required when changing schedule, MVP, tags, or release notes"
                    value={editDialog.reason}
                    onChange={(e) =>
                      setEditDialog((prev) => (prev ? { ...prev, reason: e.target.value } : prev))
                    }
                    className="min-h-[64px] resize-y text-sm"
                  />
                </div>
              ) : null}
            </div>
          </div>

          {onManageScope && !metadataLocked ? (
            <Alert>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm">
                  Add or remove stories for this release in <strong>Release scope</strong>.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={onManageScope}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Manage scope
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <div ref={shipDateSectionRef}>
            <Collapsible open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-sm font-medium hover:bg-muted/50"
                >
                  <span>Ship date &amp; client notes</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      moreOptionsOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className={cn("space-y-2", shipDisabled && "pointer-events-none opacity-60")}>
                  <Label>Actual ship date (optional)</Label>
                  <DatePickerSingle
                    className="h-10 w-full border-slate-200 bg-white hover:bg-slate-50/90"
                    date={editDialog.actualReleaseDate}
                    disabled={shipDisabled}
                    onDateChange={(d) => {
                      setEditDialog((prev) => {
                        if (!prev) return prev;
                        if (
                          !prev.isSkipped &&
                          actualShipDateChanged(prev.actualReleaseDate, d) &&
                          d
                        ) {
                          toast.message("Optional: add actual release notes below.", {
                            duration: 5000,
                          });
                        }
                        return { ...prev, actualReleaseDate: d };
                      });
                    }}
                    placeholder="Not set"
                  />
                  {editDialog.actualReleaseDate && !shipDisabled ? (
                    <Textarea
                      rows={2}
                      placeholder="Actual release notes (optional)"
                      value={editDialog.actualReleaseNotes}
                      onChange={(e) =>
                        setEditDialog((prev) =>
                          prev ? { ...prev, actualReleaseNotes: e.target.value } : prev,
                        )
                      }
                      className="min-h-[64px] resize-y text-sm"
                    />
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-client-release-note">Notes for clients (optional)</Label>
                  <Textarea
                    id="edit-client-release-note"
                    rows={3}
                    placeholder="Shown on the client link — scope caveats, what not to test."
                    value={editDialog.clientReleaseNote}
                    onChange={(e) =>
                      setEditDialog((prev) =>
                        prev ? { ...prev, clientReleaseNote: e.target.value } : prev,
                      )
                    }
                    className="min-h-[72px] resize-y text-sm"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Collapsible open={clientLinkOpen} onOpenChange={setClientLinkOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex h-auto w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-sm font-medium hover:bg-muted/50"
              >
                <span>Client review checklist</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    clientLinkOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <Textarea
                id="edit-client-review-summary"
                rows={5}
                placeholder="What clients should verify — or generate with AI."
                value={editDialog.clientReviewAiSummary}
                onChange={(e) =>
                  setEditDialog((prev) =>
                    prev ? { ...prev, clientReviewAiSummary: e.target.value } : prev,
                  )
                }
                className="min-h-[100px] resize-y font-mono text-sm"
              />
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <Checkbox
                  id="edit-show-client-review"
                  checked={editDialog.showClientReviewSummary === true}
                  onCheckedChange={(checked) =>
                    setEditDialog((prev) =>
                      prev
                        ? {
                            ...prev,
                            showClientReviewSummary: checked === true,
                          }
                        : prev,
                    )
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor="edit-show-client-review"
                  className="cursor-pointer text-sm leading-snug"
                >
                  Show checklist on client link
                </Label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={aiSummaryRegenerating || editSaving}
                  onClick={onRegenerateReviewSummary}
                >
                  {aiSummaryRegenerating ? (
                    <>
                      <Spinner className="size-4" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
                {editDialog.clientReviewAiSummaryAt ? (
                  <span className="text-xs text-muted-foreground">
                    Last generated:{" "}
                    {new Date(editDialog.clientReviewAiSummaryAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                ) : null}
              </div>
              <Textarea
                rows={3}
                placeholder="Extra instructions for AI only (not shown to clients)"
                value={editDialog.clientReviewAiGenerationContext}
                onChange={(e) =>
                  setEditDialog((prev) =>
                    prev
                      ? {
                          ...prev,
                          clientReviewAiGenerationContext: e.target.value,
                        }
                      : prev,
                  )
                }
                className="min-h-[72px] resize-y text-sm"
              />
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button type="submit" className="text-white" disabled={editSaving}>
              {editSaving ? (
                <>
                  <Spinner /> Saving
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
