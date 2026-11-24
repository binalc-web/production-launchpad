import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DatePickerSingle } from "@/components/ui/date-picker-single";
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
import { actualShipDateChanged } from "@/lib/releasePresentation";
import { cn } from "@/lib/utils";
import { ReleaseTagsInput } from "@/components/release/ReleaseTagsInput";

export function CreateReleaseDialog({
  open,
  onOpenChange,
  creating,
  newRelease,
  setNewRelease,
  suggestedPatchReleaseName,
  lastRelease,
  onSubmit,
}) {
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const canSubmit =
    Boolean(newRelease.name.trim()) &&
    Boolean(newRelease.startDate) &&
    Boolean(newRelease.releaseDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Release</DialogTitle>
          <DialogDescription className="text-left">
            Set the release number and schedule. Add stories afterward on the Active release tab
            under Release scope.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-4 rounded-lg border border-border/80 bg-muted/20 p-4">
            <div className="space-y-2">
              <Label htmlFor="release-number">
                Release number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="release-number"
                type="text"
                value={newRelease.name}
                onChange={(e) => setNewRelease((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={suggestedPatchReleaseName}
                required
              />
              <p className="text-xs text-muted-foreground">
                {lastRelease ? (
                  <>
                    Last release is{" "}
                    <span className="font-mono font-medium text-foreground">{lastRelease}</span>.
                    Suggested patch:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {suggestedPatchReleaseName}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Use a dot-separated version (e.g.{" "}
                    <span className="font-mono font-medium text-foreground">1.0.0</span>
                    ).
                  </>
                )}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Schedule start <span className="text-destructive">*</span>
                </Label>
                <DatePickerSingle
                  className="h-10 w-full border-slate-200 bg-white hover:bg-slate-50/90"
                  date={newRelease.startDate}
                  onDateChange={(d) => setNewRelease((prev) => ({ ...prev, startDate: d }))}
                  placeholder="Select start date"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Target release <span className="text-destructive">*</span>
                </Label>
                <DatePickerSingle
                  className="h-10 w-full border-slate-200 bg-white hover:bg-slate-50/90"
                  date={newRelease.releaseDate}
                  onDateChange={(d) => setNewRelease((prev) => ({ ...prev, releaseDate: d }))}
                  placeholder="Select target date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-release-manual-desc">Release notes (optional)</Label>
              <Textarea
                id="create-release-manual-desc"
                value={newRelease.releaseDescription}
                onChange={(e) =>
                  setNewRelease((prev) => ({
                    ...prev,
                    releaseDescription: e.target.value,
                  }))
                }
                placeholder="Goals, context, or stakeholder notes."
                rows={3}
                className="min-h-[80px] resize-y border-slate-200 bg-white text-sm"
              />
            </div>
          </div>

          <Collapsible open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex h-auto w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-sm font-medium hover:bg-muted/50"
              >
                <span>More options (optional)</span>
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
              <div className="space-y-2">
                <Label>Actual ship date (optional)</Label>
                <DatePickerSingle
                  className="h-10 w-full border-slate-200 bg-white hover:bg-slate-50/90"
                  date={newRelease.actualReleaseDate}
                  onDateChange={(d) => {
                    setNewRelease((prev) => {
                      if (actualShipDateChanged(prev.actualReleaseDate, d) && d) {
                        toast.message(
                          "Optional: add actual release notes below for this ship date.",
                          { duration: 5000 },
                        );
                      }
                      return { ...prev, actualReleaseDate: d };
                    });
                  }}
                  placeholder="Not set"
                />
                {newRelease.actualReleaseDate ? (
                  <Textarea
                    id="new-actual-release-notes"
                    rows={3}
                    placeholder="Actual release notes (optional)"
                    value={newRelease.actualReleaseNotes}
                    onChange={(e) =>
                      setNewRelease((prev) => ({
                        ...prev,
                        actualReleaseNotes: e.target.value,
                      }))
                    }
                    className="min-h-[72px] resize-y"
                  />
                ) : null}
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                <Checkbox
                  id="release-is-mvp"
                  checked={newRelease.isMvp}
                  onCheckedChange={(checked) =>
                    setNewRelease((prev) => ({
                      ...prev,
                      isMvp: checked === true,
                    }))
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="release-is-mvp" className="cursor-pointer text-sm font-medium">
                  MVP release
                </Label>
              </div>

              <ReleaseTagsInput
                id="create-release-tags"
                tags={newRelease.tags}
                onChange={(tags) => setNewRelease((prev) => ({ ...prev, tags }))}
              />

              <div className="space-y-2">
                <Label htmlFor="new-client-release-note">Notes for clients (optional)</Label>
                <Textarea
                  id="new-client-release-note"
                  rows={3}
                  placeholder="e.g. Do not test billing — out of scope for this build."
                  value={newRelease.clientReleaseNote}
                  onChange={(e) =>
                    setNewRelease((prev) => ({
                      ...prev,
                      clientReleaseNote: e.target.value,
                    }))
                  }
                  className="min-h-[72px] resize-y"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={creating}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="text-white" disabled={creating || !canSubmit}>
              {creating ? (
                <>
                  <Spinner /> Creating
                </>
              ) : (
                "Create Release"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
