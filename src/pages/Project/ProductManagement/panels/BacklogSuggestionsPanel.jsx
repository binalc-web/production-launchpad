import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyBacklogSuggestion,
  discardBacklogSuggestionDraft,
  fetchBacklogSuggestionDraft,
  fetchBacklogSuggestions,
  uploadChatAttachment,
} from "@/api";
import { BacklogSuggestionContextPanel } from "@/components/BacklogSuggestions/BacklogSuggestionContextPanel";
import {
  BacklogAddContextCard,
  BacklogSourceMaterialCard,
} from "@/components/BacklogSuggestions/BacklogSuggestionSteps";
import { useProjectDiscoveryBridge } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronDown, Circle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { cn } from "@/lib/utils";
import { useBacklogSuggestionContext } from "@/hooks/useBacklogSuggestionContext";
import { useSuggestionDecisions } from "@/hooks/useSuggestionDecisions";
import {
  ReleaseSuggestionDraftEditor,
  suggestionToDraft,
} from "@/components/ReleaseSuggestions/ReleaseSuggestionDraftEditor";
import { EpicStoryChatSheet } from "@/components/ReleaseSuggestions/EpicStoryChatSheet";
import { ComposerStopTextButton } from "@/components/chat/ComposerStopButton";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
import { draftToApplyPayload, formatEpicDraftForManualContext } from "@/lib/backlogSuggestionApply";
import {
  backlogDraftDaysUntilExpiry,
  buildBacklogDraftRestoreState,
  freshBacklogDraftMeta,
} from "@/lib/backlogSuggestionDraftRestore";
import { epicTierBadgeClassName } from "@/components/ReleaseSuggestions/EpicStoryAccordion";
import { JiraEpicStoryAiSection } from "../components/JiraEpicStoryAiSection";
import { LaunchpadQuestionsCard } from "@/components/LaunchpadQuestionsCard";
import {
  formatLaunchpadQuestionsAnswerPrompt,
  LAUNCHPAD_QUESTIONS_CONTINUE_BACKLOG_SUGGESTIONS,
} from "@/lib/launchpadQuestions.util.js";

function isAbortError(err) {
  return (
    err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError"
  );
}

function suggestionDisplayTitle(s) {
  if (s?.epic?.title) return s.epic.title;
  return s?.releaseTheme ?? "Epic";
}

export function BacklogSuggestionsPanel({
  isActive = true,
  projectId,
  project,
  onApplied,
  scopeNotice = null,
}) {
  const jiraReady = isProjectJiraBacklogReady(project);

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [awaitingQuestions, setAwaitingQuestions] = useState(null);
  const [clarifySummary, setClarifySummary] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [restoredDraftMeta, setRestoredDraftMeta] = useState(null);
  const generateAbortRef = useRef(null);
  const attach = useChatAttachments({
    upload: (file) => uploadChatAttachment(file, { channel: "backlog", scopeId: projectId }),
  });
  const attachmentIds = attach.ids;
  const clearAttachments = attach.clear;
  const clarificationHistoryRef = useRef("");
  const clarifyRoundRef = useRef(0);

  const suggestionIds = useMemo(() => (result?.suggestions ?? []).map((s) => s.id), [result]);
  const { decisionById, setDecision } = useSuggestionDecisions(suggestionIds);

  const suggestionsResultKey = useMemo(
    () => (result?.suggestions ?? []).map((s) => s.id).join("\0"),
    [result?.suggestions],
  );

  const [draftById, setDraftById] = useState({});
  const [describeAiOpen, setDescribeAiOpen] = useState(false);
  const [aiContextAdded, setAiContextAdded] = useState(false);

  const { consumeBacklogSuggestionBootstrap, backlogBootstrapSessionKey } =
    useProjectDiscoveryBridge();

  const {
    sourcesLoading,
    captureContext,
    jiraBacklog,
    buildSuggestionRequestBody,
    appendManualContextText,
    hasStrictCaptureFocus,
  } = useBacklogSuggestionContext({
    platformProjectId: projectId,
    isActive,
    resetScopeKey: project?.id,
    contextResetSessionKey: backlogBootstrapSessionKey,
    jiraBacklogEnabled: jiraReady,
    consumeBootstrap: consumeBacklogSuggestionBootstrap,
  });

  useEffect(() => {
    if (!isActive) {
      generateAbortRef.current?.abort();
    }
  }, [isActive]);

  const clearSuggestionUiState = useCallback(() => {
    setResult(null);
    setAwaitingQuestions(null);
    setClarifySummary(null);
    setFetchError(null);
    setLoading(false);
    setDraftById({});
    setAiContextAdded(false);
    setRestoredDraftMeta(null);
    clarificationHistoryRef.current = "";
    clarifyRoundRef.current = 0;
    generateAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    clearSuggestionUiState();
    if (!projectId || !isActive) {
      setDraftLoading(false);
      return undefined;
    }

    let cancelled = false;
    setDraftLoading(true);
    void fetchBacklogSuggestionDraft(projectId)
      .then((data) => {
        if (cancelled) return;
        const draft = data?.draft;
        const restored = draft ? buildBacklogDraftRestoreState(draft) : null;
        if (!restored) return;
        setResult(restored.result);
        setDraftById(restored.draftById);
        setAwaitingQuestions(restored.awaitingQuestions);
        setClarifySummary(restored.clarifySummary);
        clarificationHistoryRef.current = restored.clarificationHistory || "";
        clarifyRoundRef.current = restored.clarificationRound || 0;
        setRestoredDraftMeta(restored.restoredDraftMeta);
      })
      .catch((err) => {
        if (cancelled || err?.code === "BACKLOG_DRAFT_NOT_FOUND" || err?.status === 404) {
          return;
        }
        logger.error("backlog_suggestion_draft_restore", err);
      })
      .finally(() => {
        if (!cancelled) setDraftLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project?.id, projectId, isActive, clearSuggestionUiState]);

  const runGenerate = useCallback(
    async ({ clarificationPrompt, clarificationRound } = {}) => {
      if (!projectId || !project) return;
      generateAbortRef.current?.abort();
      const ac = new AbortController();
      generateAbortRef.current = ac;

      setLoading(true);
      setFetchError(null);
      if (!clarificationPrompt) {
        setResult(null);
        setDraftById({});
        setAwaitingQuestions(null);
        setClarifySummary(null);
        setRestoredDraftMeta(null);
        clarificationHistoryRef.current = "";
        clarifyRoundRef.current = 0;
      }

      const body = {
        ...buildSuggestionRequestBody(),
        ...(clarificationPrompt ? { clarificationPrompt } : {}),
        ...(Number.isInteger(clarificationRound) ? { clarificationRound } : {}),
        ...(attachmentIds.length ? { attachmentIds } : {}),
      };

      try {
        const data = await fetchBacklogSuggestions(projectId, body, {
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;

        if (
          data?.status === "awaiting_questions" &&
          Array.isArray(data.questions) &&
          data.questions.length > 0
        ) {
          setAwaitingQuestions(data.questions);
          setClarifySummary(typeof data.researchSummary === "string" ? data.researchSummary : null);
          setResult(null);
          setDraftById({});
          if (data?.warning) {
            toast.message(data.warning, { duration: 6000 });
          }
          setRestoredDraftMeta(freshBacklogDraftMeta());
          return;
        }

        if (!data?.suggestions?.length) {
          const msg = "Could not generate suggestions";
          setFetchError(msg);
          toast.error(msg);
          return;
        }

        const drafts = {};
        for (const s of data.suggestions || []) {
          drafts[s.id] = suggestionToDraft(s);
        }
        setDraftById(drafts);
        setResult(data);
        setAwaitingQuestions(null);
        setClarifySummary(null);
        clarificationHistoryRef.current = "";
        clarifyRoundRef.current = 0;
        if (data?.warning) {
          toast.message(data.warning, { duration: 6000 });
        }
        setRestoredDraftMeta(freshBacklogDraftMeta());
        clearAttachments();
      } catch (err) {
        if (ac.signal.aborted || isAbortError(err)) return;
        const msg = typeof err?.error === "string" ? err.error : "Could not generate suggestions";
        setFetchError(msg);
        toast.error(msg);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [projectId, project, buildSuggestionRequestBody, attachmentIds, clearAttachments],
  );

  const handleGenerate = useCallback(() => {
    void runGenerate();
  }, [runGenerate]);

  const handleClarifySubmit = useCallback(
    (prompt) => {
      const thisRound =
        typeof prompt === "string" && prompt.trim()
          ? prompt.trim()
          : formatLaunchpadQuestionsAnswerPrompt(
              awaitingQuestions ?? [],
              {},
              {
                continueInstruction: LAUNCHPAD_QUESTIONS_CONTINUE_BACKLOG_SUGGESTIONS,
              },
            );
      const prior = clarificationHistoryRef.current.trim();
      const combined = prior ? `${prior}\n\n---\n\n${thisRound}` : thisRound;
      clarificationHistoryRef.current = combined;
      clarifyRoundRef.current = (clarifyRoundRef.current || 0) + 1;
      void runGenerate({
        clarificationPrompt: combined,
        clarificationRound: clarifyRoundRef.current,
      });
    },
    [runGenerate, awaitingQuestions],
  );

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

  const totalEpics = result?.suggestions?.length ?? 0;
  const allEpicsSelected = totalEpics > 0 && approvedList.length === totalEpics;
  const someEpicsSelected = approvedList.length > 0 && !allEpicsSelected;

  // Activating "Select all epics" completes the selection from any partial
  // (indeterminate) state; it only clears when every epic is already selected.
  // Deriving this from selection state — not the checkbox's raw checked value —
  // keeps it correct even if the checkbox reports "indeterminate" on activation.
  const handleToggleAllEpics = useCallback(() => {
    const nextStatus = allEpicsSelected ? "pending" : "approved";
    for (const s of result?.suggestions ?? []) {
      setDecision(s.id, nextStatus);
    }
  }, [result, setDecision, allEpicsSelected]);

  const handleApply = async () => {
    if (!approvedList.length) {
      toast.error("Select at least one suggestion to add.");
      return;
    }
    setApplying(true);
    let appliedCount = 0;
    try {
      for (const s of approvedList) {
        const draft = draftById[s.id] ?? suggestionToDraft(s);
        const payload = draftToApplyPayload(draft, s);
        if (!payload.stories.length) {
          toast.error(`Epic "${draft.title || "Untitled"}" has no stories with titles.`);
          continue;
        }
        await applyBacklogSuggestion(projectId, payload);
        appliedCount += 1;
      }
      if (appliedCount === 0) {
        toast.error("No epics with selected stories to add.");
        return;
      }
      toast.success(
        jiraReady
          ? `Created ${appliedCount} epic(s) in Jira`
          : `Added ${appliedCount} epic(s) to backlog`,
      );
      try {
        await discardBacklogSuggestionDraft(projectId);
      } catch (discardErr) {
        logger.warn("backlog_suggestion_draft_discard_after_apply", discardErr);
      }
      setRestoredDraftMeta(null);
      onApplied?.();
    } catch (err) {
      toast.error(typeof err?.error === "string" ? err.error : "Could not apply suggestions");
    } finally {
      setApplying(false);
    }
  };

  const handleDiscardDraft = useCallback(async () => {
    if (!projectId) return;
    try {
      await discardBacklogSuggestionDraft(projectId);
    } catch (err) {
      logger.warn("backlog_suggestion_draft_discard", err);
    }
    clearSuggestionUiState();
    toast.message("Saved suggestions discarded");
  }, [projectId, clearSuggestionUiState]);

  const showGenerateCard =
    !result && !loading && !fetchError && !awaitingQuestions && !draftLoading;
  const selectedSourceCount = jiraReady
    ? (jiraBacklog?.selectedKeys?.length ?? 0)
    : (captureContext?.multiSelect?.selectedIds?.length ?? 0);
  const generateDisabled = loading || !project || sourcesLoading;

  return (
    <div className={cn("space-y-6", !result && "mx-auto w-full max-w-3xl")}>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Backlog suggestions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose what the AI should use, then generate epics and stories.
        </p>
      </div>

      {draftLoading ? (
        <div
          className="space-y-2"
          role="status"
          aria-busy="true"
          aria-label="Loading saved suggestions"
        >
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : null}

      {restoredDraftMeta && (result || awaitingQuestions) ? (
        <Alert className="border-border/80 bg-muted/30">
          <AlertDescription className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing suggestions from{" "}
              <time dateTime={restoredDraftMeta.createdAt}>
                {new Date(restoredDraftMeta.createdAt).toLocaleDateString()}
              </time>
              . Expires in {backlogDraftDaysUntilExpiry(restoredDraftMeta.expiresAt)} day
              {backlogDraftDaysUntilExpiry(restoredDraftMeta.expiresAt) === 1 ? "" : "s"}.
            </span>
            <span className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleDiscardDraft()}
              >
                Discard
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={handleGenerate}>
                Generate again
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      {scopeNotice && !result ? (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            Release <strong>{scopeNotice.releaseName}</strong> has no scope yet. You can assign
            stories after generating.
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto shrink-0 p-0 font-semibold"
            onClick={scopeNotice.onOpen}
          >
            Open Release scope
          </Button>
        </div>
      ) : null}

      {!result ? (
        <div id="backlog-suggestions-capture-context" className="space-y-4">
          {jiraReady ? (
            <BacklogSuggestionContextPanel
              sourcesLoading={sourcesLoading}
              captureContext={captureContext}
              jiraBacklog={jiraBacklog}
              jiraReady={jiraReady}
            />
          ) : (
            <BacklogSourceMaterialCard
              captureContext={captureContext}
              sourcesLoading={sourcesLoading}
            />
          )}
          {showGenerateCard ? (
            <BacklogAddContextCard
              captureContext={captureContext}
              attach={attach}
              disabled={generateDisabled}
              showNotes={!jiraReady && !captureContext?.focusDocumentSelection}
            />
          ) : null}
        </div>
      ) : null}

      {jiraReady ? (
        <JiraEpicStoryAiSection
          projectId={projectId}
          jiraBacklog={jiraBacklog}
          onStoriesCreated={() => {
            void jiraBacklog.refresh?.({ quiet: true, useDefaultFilters: true });
            onApplied?.();
          }}
        />
      ) : null}

      {showGenerateCard && aiContextAdded ? (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertDescription className="text-sm">
            Epic draft added to your notes in <strong>Add context</strong>. Click{" "}
            <strong>Generate suggestions</strong> when ready.
          </AlertDescription>
        </Alert>
      ) : null}

      <EpicStoryChatSheet
        open={describeAiOpen}
        onOpenChange={setDescribeAiOpen}
        projectId={projectId}
        intent="create"
        closeOnApply={false}
        target={{
          type: "epic",
          title: "",
          description: "",
          siblingNames: [],
        }}
        onConfirm={(suggestion) => {
          appendManualContextText(
            formatEpicDraftForManualContext({
              title: suggestion?.title ?? "",
              description: suggestion?.description ?? "",
            }),
          );
          setAiContextAdded(true);
          document
            .getElementById("backlog-suggestions-capture-context")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
          toast.success(
            "Epic draft added to Optional notes. Click Generate suggestions when ready.",
          );
        }}
      />

      {loading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20 px-6 py-12 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">
            {awaitingQuestions?.length
              ? "Generating suggestions with your answers…"
              : "Generating suggestions…"}
          </p>
          <ComposerStopTextButton onClick={handleStopGeneration} />
        </div>
      ) : null}

      {!loading && awaitingQuestions?.length ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Clarifying · round {Math.max(1, clarifyRoundRef.current + 1)}
          </p>
          {clarifySummary ? (
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              <AssistantMarkdown text={clarifySummary} className="text-sm text-muted-foreground" />
            </div>
          ) : null}
          <LaunchpadQuestionsCard
            variant="thread"
            optionLayout="cursor"
            questions={awaitingQuestions}
            onSubmit={handleClarifySubmit}
            sending={false}
            continueInstruction={LAUNCHPAD_QUESTIONS_CONTINUE_BACKLOG_SUGGESTIONS}
            className="mb-0"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setAwaitingQuestions(null);
              setClarifySummary(null);
              clarificationHistoryRef.current = "";
              clarifyRoundRef.current = 0;
            }}
          >
            Cancel
          </Button>
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              <Button
                type="button"
                className="text-white gap-2"
                disabled={applying || !approvedList.length}
                onClick={handleApply}
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Adding…
                  </>
                ) : jiraReady ? (
                  "Create selected in Jira"
                ) : (
                  "Add selected to backlog"
                )}
              </Button>
            </div>

            {totalEpics > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="backlog-suggestions-select-all-epics"
                    checked={someEpicsSelected ? "indeterminate" : allEpicsSelected}
                    disabled={applying}
                    onCheckedChange={handleToggleAllEpics}
                    aria-label="Select all epics"
                    className="data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                  />
                  <label
                    htmlFor="backlog-suggestions-select-all-epics"
                    className="cursor-pointer text-sm font-medium text-foreground"
                  >
                    Select all epics
                  </label>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                  {approvedList.length} of {totalEpics} {totalEpics === 1 ? "epic" : "epics"}{" "}
                  selected
                </span>
              </div>
            ) : null}

            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors">
                Research summary
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <AssistantMarkdown
                    text={result.researchSummary}
                    className="text-sm text-muted-foreground"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <ul key={suggestionsResultKey || "none"} className="space-y-4 list-none p-0 m-0">
              {result.suggestions?.map((s) => {
                const d = decisionById[s.id] ?? "pending";
                const selected = d === "approved";
                const title = suggestionDisplayTitle(s);
                const storyCount = Array.isArray(s.stories)
                  ? s.stories.length
                  : (s.features ?? []).length;
                const toggleThis = () => setDecision(s.id, selected ? "pending" : "approved");
                return (
                  <li key={s.id}>
                    <Card
                      className={cn(
                        "overflow-hidden border-border shadow-sm transition-colors",
                        selected && "ring-2 ring-primary/35 border-primary/40",
                      )}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        className={cn(
                          "flex cursor-pointer flex-col gap-2 border-b border-border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between",
                          selected ? "bg-primary/5" : "bg-muted/20 hover:bg-muted/35",
                        )}
                        onClick={toggleThis}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleThis();
                          }
                        }}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <Badge variant="secondary" className={epicTierBadgeClassName}>
                            Epic
                          </Badge>
                          <span className="min-w-0 truncate font-semibold text-foreground">
                            {title}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            · {storyCount} {storyCount === 1 ? "story" : "stories"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          className={cn(
                            "pointer-events-none gap-1.5 shrink-0",
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
                      <CardContent className="p-4 pt-3">
                        <ReleaseSuggestionDraftEditor
                          draft={draftById[s.id] ?? suggestionToDraft(s)}
                          onDraftChange={(next) =>
                            setDraftById((prev) => ({ ...prev, [s.id]: next }))
                          }
                          projectId={projectId}
                        />
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div id="backlog-suggestions-capture-context">
              <BacklogSuggestionContextPanel
                sourcesLoading={sourcesLoading}
                captureContext={captureContext}
                jiraBacklog={jiraBacklog}
                jiraReady={jiraReady}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showGenerateCard ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-sm">
            <span
              className="font-medium text-foreground"
              title={
                hasStrictCaptureFocus
                  ? "Suggestions will stay within your selected sources."
                  : undefined
              }
            >
              {selectedSourceCount} {selectedSourceCount === 1 ? "source" : "sources"} selected
            </span>
            {!jiraReady && selectedSourceCount > 0 ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-muted-foreground"
                onClick={() => captureContext.multiSelect.clear()}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-foreground"
              onClick={() => setDescribeAiOpen(true)}
              disabled={generateDisabled}
            >
              Or create a single epic
            </Button>
            <Button
              type="button"
              className="gap-2 text-white"
              onClick={handleGenerate}
              disabled={generateDisabled}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Generate suggestions
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
