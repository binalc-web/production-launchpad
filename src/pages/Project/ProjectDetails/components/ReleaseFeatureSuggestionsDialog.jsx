import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchReleaseFeatureSuggestions } from "@/api";
import { ReleaseSuggestionContextPanel } from "@/components/ReleaseSuggestions/ReleaseSuggestionContextPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { suggestionApiRowToTheme } from "@/lib/releaseDescriptionThemes";
import { useReleaseSuggestionContext } from "@/hooks/useReleaseSuggestionContext";
import { useSuggestionDecisions } from "@/hooks/useSuggestionDecisions";
import {
  ReleaseSuggestionDraftEditor,
  suggestionToDraft,
} from "@/components/ReleaseSuggestions/ReleaseSuggestionDraftEditor";
import { ComposerStopTextButton } from "@/components/chat/ComposerStopButton";

function isAbortError(err) {
  return (
    err?.code === "ERR_CANCELED" ||
    err?.name === "CanceledError" ||
    err?.name === "AbortError"
  );
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string|number} props.projectId
 * @param {object|null} props.project
 * @param {boolean} [props.jiraEpicsStoriesReady=true] — when false, skip Jira backlog API calls (same rule as release Epics).
 * @param {(themes: Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }>) => void | Promise<void>} [props.onApplyToNewRelease] — opens create release with structured themes
 * @param {number} [props.contextSessionKey] — increment from Release Management to start fresh; keep stable when toggling from Create New Release
 */
export function ReleaseFeatureSuggestionsDialog({
  open,
  onOpenChange,
  projectId,
  project,
  jiraEpicsStoriesReady = true,
  onApplyToNewRelease,
  contextSessionKey = 0,
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const generateAbortRef = useRef(null);

  const suggestionIds = useMemo(
    () => (result?.suggestions ?? []).map((s) => s.id),
    [result],
  );
  const { decisionById, setDecision } = useSuggestionDecisions(suggestionIds);

  const suggestionsResultKey = useMemo(
    () => (result?.suggestions ?? []).map((s) => s.id).join("\0"),
    [result?.suggestions],
  );

  const [draftById, setDraftById] = useState({});

  const hubProjectId =
    project?.projectId != null && String(project.projectId).trim()
      ? String(project.projectId).trim()
      : null;

  const repoScanEnabled = Boolean(String(project?.gitRepoPath ?? "").trim());

  const {
    sourcesLoading,
    meetingNotes: meetingNotesSection,
    jiraBacklog: jiraBacklogSection,
    buildSuggestionRequestBody,
  } = useReleaseSuggestionContext({
    platformProjectId: projectId,
    hubProjectId,
    isActive: open,
    resetScopeKey: project?.id,
    contextResetSessionKey: contextSessionKey,
    jiraBacklogEnabled: jiraEpicsStoriesReady,
    repoScanEnabled,
  });

  /** Snapshot when the dialog last closed — avoid wiping generated results when reopening from Create New Release with the same session. */
  const closedSnapshotRef = useRef(null);

  useEffect(() => {
    if (!open) {
      generateAbortRef.current?.abort();
      closedSnapshotRef.current = {
        projectId: project?.id,
        session: contextSessionKey,
      };
      return;
    }
    if (closedSnapshotRef.current === null) {
      closedSnapshotRef.current = {
        projectId: project?.id,
        session: contextSessionKey,
      };
      return;
    }
    const snap = closedSnapshotRef.current;
    const sameScope =
      snap.projectId === project?.id && snap.session === contextSessionKey;
    if (!sameScope) {
      setResult(null);
      setFetchError(null);
      setLoading(false);
      setDraftById({});
    }
    closedSnapshotRef.current = {
      projectId: project?.id,
      session: contextSessionKey,
    };
  }, [open, project?.id, contextSessionKey]);

  const handleGenerate = useCallback(async () => {
    if (!projectId || !project) return;
    generateAbortRef.current?.abort();
    const ac = new AbortController();
    generateAbortRef.current = ac;

    setLoading(true);
    setFetchError(null);
    setResult(null);
    setDraftById({});

    const body = buildSuggestionRequestBody();

    try {
      const data = await fetchReleaseFeatureSuggestions(projectId, body, {
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      const drafts = {};
      for (const s of data.suggestions || []) {
        drafts[s.id] = suggestionToDraft(s);
      }
      setDraftById(drafts);
      setResult(data);
      if (data?.warning) {
        toast.message(data.warning, { duration: 6000 });
      }
    } catch (err) {
      if (ac.signal.aborted || isAbortError(err)) return;
      const msg =
        typeof err?.error === "string"
          ? err.error
          : "Could not generate suggestions";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [projectId, project, buildSuggestionRequestBody]);

  const handleStopGeneration = useCallback(() => {
    generateAbortRef.current?.abort();
    generateAbortRef.current = null;
    setLoading(false);
    setFetchError(null);
    toast.message("Generation stopped");
  }, []);

  const approvedList = useMemo(() => {
    if (!result?.suggestions?.length) return [];
    return result.suggestions.filter((s) => decisionById[s.id] === "approved");
  }, [result, decisionById]);

  const handleApply = async () => {
    if (!approvedList.length) {
      toast.error("Select at least one suggestion to apply.");
      return;
    }
    const themes = approvedList.map(
      (s) => draftById[s.id] ?? suggestionApiRowToTheme(s),
    );
    try {
      await onApplyToNewRelease?.(themes);
      toast.success("Applied to new release form");
      onOpenChange(false);
    } catch {
      toast.error("Could not apply to new release form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto min-w-[calc(100vw-10rem)] gap-0 border-border p-0">
        <div className="border-b border-border px-6 py-4">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Sparkles className="h-5 w-5 text-primary shrink-0" aria-hidden />
              Release &amp; feature suggestions
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Add meeting notes and select Jira backlog items, then generate.
              Context is combined with this project&apos;s client and competitor
              fields for the model.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-4">
          <ReleaseSuggestionContextPanel
            sourcesLoading={sourcesLoading}
            meetingNotes={meetingNotesSection}
            jiraBacklog={jiraBacklogSection}
          />

          {!result && !loading && !fetchError ? (
            <div className="space-y-4">
              <Button
                type="button"
                className="gap-2 text-white w-full sm:w-auto"
                onClick={handleGenerate}
                disabled={loading || !project || sourcesLoading}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Generate suggestions
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20 px-6 py-12 text-center"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="h-8 w-8 animate-spin text-primary"
                aria-hidden
              />
              <p className="text-sm font-medium text-foreground">
                Generating suggestions from your project…
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Using meeting notes, selected Jira items, and client details
                from this project.
              </p>
              <ComposerStopTextButton onClick={handleStopGeneration} />
            </div>
          ) : null}

          {!loading && fetchError ? (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">{fetchError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setFetchError(null);
                  handleGenerate();
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Try again
              </Button>
            </div>
          ) : null}

          {result && !loading ? (
            <div className="space-y-3 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleGenerate}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Regenerate
              </Button>

              {result.usedWebSearch ? (
                <Badge variant="secondary" className="ml-2 font-normal">
                  Web search enabled
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="font-normal text-muted-foreground"
                >
                  Context-only mode (no web search)
                </Badge>
              )}

              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors">
                  Research summary
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {result.researchSummary}
                  </p>
                </CollapsibleContent>
              </Collapsible>

              <p className="text-xs text-muted-foreground">
                Select ideas to include, edit Epics and Stories below, then
                apply — your edits are what gets saved to the release
                description.
              </p>

              <ul
                key={suggestionsResultKey || "none"}
                className="space-y-3 list-none p-0 m-0"
              >
                {result.suggestions.map((s) => {
                  const d = decisionById[s.id] ?? "pending";
                  const selected = d === "approved";
                  const toggleThis = () =>
                    setDecision(s.id, selected ? "pending" : "approved");
                  return (
                    <li key={s.id}>
                      <Card
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        aria-label={`${selected ? "Selected" : "Select"} release idea: ${s.releaseTheme}`}
                        className={cn(
                          "border-border border-l-4 border-l-primary/35 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          selected &&
                            "ring-2 ring-primary/30 border-primary/40 border-l-primary",
                        )}
                        onClick={toggleThis}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleThis();
                          }
                        }}
                      >
                        <CardContent className="space-y-3 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <p className="text-xs text-muted-foreground">
                              <Badge
                                variant="outline"
                                className="mr-2 font-normal"
                              >
                                Jira
                              </Badge>
                              <span className="font-medium text-foreground">
                                1 Epic
                              </span>
                              {" · "}
                              <span>
                                {(s.features || []).length} stor
                                {(s.features || []).length !== 1
                                  ? "ies"
                                  : "y"}{" "}
                                in the release description
                              </span>
                              {" — "}
                              click card to include, edit fields below.
                            </p>
                            <div
                              className="flex shrink-0 flex-wrap gap-2"
                              aria-hidden
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant={selected ? "default" : "outline"}
                                className={cn(
                                  "pointer-events-none gap-1.5 min-w-30",
                                  selected && "text-white",
                                )}
                                tabIndex={-1}
                              >
                                {selected ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 shrink-0 opacity-70" />
                                )}
                                {selected ? "Selected" : "Select"}
                              </Button>
                            </div>
                          </div>
                          <div
                            className="cursor-default"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <ReleaseSuggestionDraftEditor
                              draft={draftById[s.id] ?? suggestionToDraft(s)}
                              onDraftChange={(next) =>
                                setDraftById((prev) => ({
                                  ...prev,
                                  [s.id]: next,
                                }))
                              }
                              projectId={projectId}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>

              {result.citations?.length ? (
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-dashed border-border px-3 py-2 mt-2 text-xs font-medium text-muted-foreground">
                    Sources ({result.citations.length})
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <ul className="max-h-40 overflow-y-auto space-y-1 text-xs">
                      {result.citations.map((c, i) => (
                        <li key={`${c.url}-${i}`}>
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-2 hover:underline break-all"
                          >
                            {c.title || c.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {result.meta?.partial ? (
                <p className="text-xs text-muted-foreground">
                  The model returned a different count than requested; results
                  may be partial.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-row flex-wrap justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="text-white gap-2"
            disabled={!result || loading || !approvedList.length}
            onClick={handleApply}
          >
            {onApplyToNewRelease ? (
              <>Apply selected to new release</>
            ) : (
              "Apply selected"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
