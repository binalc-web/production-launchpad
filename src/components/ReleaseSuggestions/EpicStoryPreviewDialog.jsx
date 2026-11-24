import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { parseReleaseDescriptionForJira } from "@/utils/releaseDescriptionJiraDisplayParse";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { JiraPreview } from "./JiraPreview";

/**
 * Opens a dialog with the same Epic → Story scope preview as Release management.
 *
 * @param {object} props
 * @param {string|null|undefined} props.description
 * @param {string|null|undefined} [props.releaseDescription] — optional manual notes (not Jira scope)
 * @param {object|null|undefined} props.jiraReleaseSync
 * @param {'management'|'roadmap'} [props.variant] — trigger styling
 */
export function EpicStoryPreviewDialog({
  description,
  releaseDescription,
  jiraReleaseSync,
  variant = "management",
}) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setModalOpen(false);
  }, [description, releaseDescription]);

  const trimmed = typeof description === "string" ? description.trim() : "";
  const manualTrim = typeof releaseDescription === "string" ? releaseDescription.trim() : "";
  const parsed = trimmed ? parseReleaseDescriptionForJira(trimmed) : { ok: false, reason: "empty" };

  const isRoadmap = variant === "roadmap";
  const hasScope = Boolean(trimmed);
  const hasManual = Boolean(manualTrim);

  let dialogBlurb =
    "Epics and Stories in the saved release description (aligned with Jira issue keys from when the release was created). Exclusions chosen in Release management are already applied to this text.";
  if (!hasScope && !hasManual) {
    dialogBlurb = "No manual notes or Epic/Story scope has been added for this release yet.";
  } else if (hasManual && !hasScope) {
    dialogBlurb = "Manual release notes only. Epic/Story scope is stored separately for Jira sync.";
  } else if (hasScope && !parsed.ok) {
    dialogBlurb = hasManual
      ? "Manual notes (above) plus unstructured scope text — Jira automation may not apply."
      : "Unstructured scope text — Jira automation may not apply.";
  } else if (hasScope && hasManual) {
    dialogBlurb =
      "Manual notes (above) plus Epics and Stories in the saved release description (aligned with Jira issue keys). Exclusions from Release management are applied to the scope text.";
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "group flex w-full min-w-0 items-center gap-2 rounded-lg text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9",
          isRoadmap
            ? "border border-border/80 bg-muted/40 px-3 py-2 text-foreground ring-1 ring-border/60 hover:bg-muted/60"
            : "border border-slate-100 bg-slate-50/80 px-3 py-2 text-slate-700 ring-1 ring-slate-100/80 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-900/70",
        )}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        onClick={() => setModalOpen(true)}
      >
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wider",
            isRoadmap ? "text-muted-foreground" : "text-slate-500 dark:text-slate-400",
          )}
        >
          Scope (Epics &amp; stories)
        </span>
        <ChevronRight
          className="ml-auto size-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-5 py-5 text-left sm:px-6">
            <DialogTitle>Release description</DialogTitle>
            <DialogDescription className="text-left text-xs text-slate-600 dark:text-slate-400">
              {dialogBlurb}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-muted/20 px-5 py-5 sm:px-6">
            {hasManual ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-none dark:border-slate-700 dark:bg-slate-950/50">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Release description
                </p>
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap wrap-break-word text-sm text-slate-700 dark:text-slate-300">
                  {manualTrim}
                </pre>
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-none dark:border-slate-700 dark:bg-slate-950/50">
              {hasScope ? (
                <>
                  <JiraPreview
                    description={trimmed}
                    preParsed={parsed}
                    showHeading={false}
                    jiraReleaseSync={jiraReleaseSync}
                    className="border-0 bg-transparent px-0 py-0"
                  />
                  {!parsed.ok ? (
                    <pre className="mt-3 max-h-48 overflow-y-auto wrap-break-word whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50">
                      {trimmed}
                    </pre>
                  ) : null}
                </>
              ) : (
                <p className="text-sm italic text-slate-500 dark:text-slate-400">
                  No Epic/Story scope saved yet.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
