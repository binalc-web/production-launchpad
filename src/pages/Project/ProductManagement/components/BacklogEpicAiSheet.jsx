import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyBacklogSuggestion, createBacklogStory, fetchBacklogSuggestions } from "@/api";
import { EpicStoryChatSheet } from "@/components/ReleaseSuggestions/EpicStoryChatSheet";
import {
  ReleaseSuggestionDraftEditor,
  suggestionToDraft,
} from "@/components/ReleaseSuggestions/ReleaseSuggestionDraftEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildCaptureContextFromEpic,
  draftToApplyPayload,
  mergeThemeWithEpicDraft,
} from "@/lib/backlogSuggestionApply";
import { LaunchpadQuestionsCard } from "@/components/LaunchpadQuestionsCard";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import {
  formatLaunchpadQuestionsAnswerPrompt,
  LAUNCHPAD_QUESTIONS_CONTINUE_BACKLOG_SUGGESTIONS,
} from "@/lib/launchpadQuestions.util.js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function isAbortError(err) {
  return (
    err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError"
  );
}

function defaultIncludedIndexes(features) {
  const feats = Array.isArray(features) ? features : [];
  return new Set(feats.map((_, idx) => idx));
}

function backlogEpicDraftStorageKey(projectId, mode, epicId) {
  const pid = Number(projectId) || 0;
  const epic = epicId != null ? String(epicId) : "new";
  return `launchpad:backlog-epic-ai-draft:${pid}:${mode}:${epic}`;
}

function readPersistedEpicDraft(key) {
  if (!key || typeof globalThis.sessionStorage === "undefined") return null;
  try {
    const raw = globalThis.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedEpicDraft(key, payload) {
  if (!key || typeof globalThis.sessionStorage === "undefined") return;
  try {
    globalThis.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

function clearPersistedEpicDraft(key) {
  if (!key || typeof globalThis.sessionStorage === "undefined") return;
  try {
    globalThis.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Optional AI-assisted epic + story creation using existing APIs only.
 */
export function BacklogEpicAiSheet({
  open,
  onOpenChange,
  projectId,
  mode = "create",
  existingEpic,
  jiraReady = false,
  startWithChat = false,
  onCreated,
}) {
  const [step, setStep] = useState(
    /** @type {"chat" | "generating" | "clarify" | "review"} */ ("chat"),
  );
  const [awaitingQuestions, setAwaitingQuestions] = useState(null);
  const [clarifySummary, setClarifySummary] = useState(null);
  const clarificationHistoryRef = useRef("");
  const clarifyRoundRef = useRef(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [epicDraft, setEpicDraft] = useState({ title: "", description: "" });
  const [reviewDraft, setReviewDraft] = useState(null);
  const [originalSuggestion, setOriginalSuggestion] = useState(null);
  const [includedStoryIndexes, setIncludedStoryIndexes] = useState(() => new Set());
  const [applying, setApplying] = useState(false);
  const generateAbortRef = useRef(null);
  const openSessionRef = useRef(false);
  const skipParentCloseRef = useRef(false);

  const isAddStories = mode === "add_stories";
  const isJiraAddStories = isAddStories && jiraReady && existingEpic?.jiraKey;
  const draftStorageKey = backlogEpicDraftStorageKey(projectId, mode, existingEpic?.id);

  const reset = useCallback(() => {
    generateAbortRef.current?.abort();
    setStep(isAddStories && !startWithChat ? "generating" : "chat");
    setChatOpen(false);
    setEpicDraft({
      title: existingEpic?.title ?? "",
      description: existingEpic?.description ?? "",
    });
    setReviewDraft(null);
    setOriginalSuggestion(null);
    setIncludedStoryIndexes(new Set());
    setApplying(false);
    setAwaitingQuestions(null);
    setClarifySummary(null);
    clarificationHistoryRef.current = "";
    clarifyRoundRef.current = 0;
  }, [isAddStories, startWithChat, existingEpic?.title, existingEpic?.description]);

  // Persist in-progress draft so close/reload does not lose uploaded context.
  useEffect(() => {
    if (!open || !draftStorageKey) return;
    if (step !== "review" && step !== "clarify" && step !== "generating") return;
    writePersistedEpicDraft(draftStorageKey, {
      step,
      epicDraft,
      reviewDraft,
      includedStoryIndexes: [...includedStoryIndexes],
      awaitingQuestions,
      clarifySummary,
      clarificationHistory: clarificationHistoryRef.current,
      clarifyRound: clarifyRoundRef.current,
    });
  }, [
    open,
    draftStorageKey,
    step,
    epicDraft,
    reviewDraft,
    includedStoryIndexes,
    awaitingQuestions,
    clarifySummary,
  ]);

  const runGenerateStories = useCallback(
    async (draftOverride, { clarificationPrompt, clarificationRound } = {}) => {
      if (!projectId) return;
      generateAbortRef.current?.abort();
      const ac = new AbortController();
      generateAbortRef.current = ac;

      const draft = draftOverride ?? epicDraft;
      setChatOpen(false);
      if (!clarificationPrompt) {
        setAwaitingQuestions(null);
        setClarifySummary(null);
        clarificationHistoryRef.current = "";
        clarifyRoundRef.current = 0;
      }
      setStep("generating");

      const captureContextText = buildCaptureContextFromEpic(draft);
      if (!captureContextText.trim()) {
        toast.error("Describe the epic first before generating stories.");
        setStep(isAddStories && !startWithChat ? "generating" : "chat");
        if (!isAddStories || startWithChat) setChatOpen(true);
        return;
      }

      try {
        const data = await fetchBacklogSuggestions(
          projectId,
          {
            captureContextText,
            singleEpicStories: true,
            ...(clarificationPrompt ? { clarificationPrompt } : {}),
            ...(Number.isInteger(clarificationRound) ? { clarificationRound } : {}),
          },
          { signal: ac.signal },
        );
        if (ac.signal.aborted) return;

        if (
          data?.status === "awaiting_questions" &&
          Array.isArray(data.questions) &&
          data.questions.length > 0
        ) {
          setAwaitingQuestions(data.questions);
          setClarifySummary(typeof data.researchSummary === "string" ? data.researchSummary : null);
          setStep("clarify");
          if (data?.warning) {
            toast.message(data.warning, { duration: 6000 });
          }
          return;
        }

        const first = data?.suggestions?.[0];
        if (!first) {
          toast.error("No stories were generated. Try adding more detail.");
          setStep(isAddStories && !startWithChat ? "generating" : "chat");
          if (!isAddStories || startWithChat) setChatOpen(true);
          return;
        }

        const theme = mergeThemeWithEpicDraft(suggestionToDraft(first), draft);
        setReviewDraft(theme);
        setOriginalSuggestion(first);
        setIncludedStoryIndexes(defaultIncludedIndexes(theme.features));
        setAwaitingQuestions(null);
        setClarifySummary(null);
        clarificationHistoryRef.current = "";
        clarifyRoundRef.current = 0;
        setStep("review");
      } catch (err) {
        if (ac.signal.aborted || isAbortError(err)) return;
        toast.error(typeof err?.error === "string" ? err.error : "Could not generate stories");
        setStep(isAddStories && !startWithChat ? "generating" : "chat");
        if (!isAddStories || startWithChat) setChatOpen(true);
      }
    },
    [projectId, epicDraft, isAddStories, startWithChat],
  );

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
      void runGenerateStories(undefined, {
        clarificationPrompt: combined,
        clarificationRound: clarifyRoundRef.current,
      });
    },
    [runGenerateStories, awaitingQuestions],
  );

  // Initialize once per open session — do not re-run when epicDraft / runGenerateStories changes.
  useEffect(() => {
    if (!open) {
      openSessionRef.current = false;
      reset();
      return;
    }
    if (openSessionRef.current) return;
    openSessionRef.current = true;

    const persisted = readPersistedEpicDraft(draftStorageKey);
    if (persisted?.reviewDraft || persisted?.step === "clarify" || persisted?.step === "review") {
      setEpicDraft(
        persisted.epicDraft && typeof persisted.epicDraft === "object"
          ? persisted.epicDraft
          : { title: existingEpic?.title ?? "", description: existingEpic?.description ?? "" },
      );
      if (persisted.reviewDraft) setReviewDraft(persisted.reviewDraft);
      if (Array.isArray(persisted.includedStoryIndexes)) {
        setIncludedStoryIndexes(new Set(persisted.includedStoryIndexes));
      }
      if (Array.isArray(persisted.awaitingQuestions)) {
        setAwaitingQuestions(persisted.awaitingQuestions);
      }
      if (typeof persisted.clarifySummary === "string") {
        setClarifySummary(persisted.clarifySummary);
      }
      if (typeof persisted.clarificationHistory === "string") {
        clarificationHistoryRef.current = persisted.clarificationHistory;
      }
      if (Number.isInteger(persisted.clarifyRound)) {
        clarifyRoundRef.current = persisted.clarifyRound;
      }
      setStep(
        persisted.step === "clarify" || persisted.step === "review" ? persisted.step : "review",
      );
      setChatOpen(false);
      toast.message("Restored your previous epic draft from this session.");
      return;
    }

    if (isAddStories && existingEpic) {
      const draft = {
        title: existingEpic.title ?? "",
        description: existingEpic.description ?? "",
      };
      setEpicDraft(draft);
      if (startWithChat) {
        setStep("chat");
        setChatOpen(true);
        return;
      }
      void runGenerateStories(draft);
      return;
    }

    setStep("chat");
    setChatOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init only when `open` flips true
  }, [
    open,
    isAddStories,
    startWithChat,
    existingEpic?.id,
    existingEpic?.jiraKey,
    reset,
    draftStorageKey,
  ]);

  const handleChatConfirm = useCallback(
    (suggestion) => {
      skipParentCloseRef.current = true;
      const next = {
        title: suggestion?.title ?? "",
        description: suggestion?.description ?? "",
      };
      setEpicDraft(next);
      void runGenerateStories(next);
    },
    [runGenerateStories],
  );

  const handleDismiss = useCallback(() => {
    if (applying || step === "generating") return;
    if (step === "review" || step === "clarify") {
      const ok = globalThis.confirm(
        "Close and discard this draft? Your work is kept in this browser tab until you clear it or save.",
      );
      if (!ok) return;
      clearPersistedEpicDraft(draftStorageKey);
    }
    generateAbortRef.current?.abort();
    onOpenChange(false);
  }, [applying, step, onOpenChange, draftStorageKey]);

  const includedCount = useMemo(() => {
    if (!reviewDraft?.features?.length) return 0;
    return reviewDraft.features.filter((f, idx) => {
      const title = typeof f?.name === "string" ? f.name.trim() : "";
      return title && includedStoryIndexes.has(idx);
    }).length;
  }, [reviewDraft, includedStoryIndexes]);

  const handleApply = async () => {
    if (!reviewDraft || includedCount === 0) {
      toast.error("Select at least one story to add.");
      return;
    }

    setApplying(true);
    try {
      if (isJiraAddStories) {
        const payload = draftToApplyPayload(reviewDraft, originalSuggestion, {
          includedStoryIndexes,
          jiraEpicKey: existingEpic.jiraKey,
        });
        await applyBacklogSuggestion(projectId, payload);
        toast.success(`Created ${payload.stories.length} story(ies) in Jira`);
      } else if (isAddStories && existingEpic?.id) {
        const payload = draftToApplyPayload(reviewDraft, originalSuggestion, {
          includedStoryIndexes,
        });
        for (const story of payload.stories) {
          await createBacklogStory(projectId, {
            epicId: existingEpic.id,
            title: story.title,
            body: story.body,
            type: story.type ?? "story",
          });
        }
        toast.success(`Added ${payload.stories.length} story(ies) to epic`);
      } else {
        const payload = draftToApplyPayload(reviewDraft, originalSuggestion, {
          includedStoryIndexes,
        });
        await applyBacklogSuggestion(projectId, payload);
        toast.success("Epic and stories added to backlog");
      }
      clearPersistedEpicDraft(draftStorageKey);
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(typeof err?.error === "string" ? err.error : "Could not save backlog items");
    } finally {
      setApplying(false);
    }
  };

  const chatTarget = useMemo(
    () => ({
      type: "epic",
      title: epicDraft.title,
      description: epicDraft.description,
      siblingNames: Array.isArray(existingEpic?.siblingStoryNames)
        ? existingEpic.siblingStoryNames
        : [],
    }),
    [epicDraft.title, epicDraft.description, existingEpic?.siblingStoryNames],
  );

  const progressDialogOpen =
    open && (step === "generating" || step === "clarify" || step === "review");

  return (
    <>
      <EpicStoryChatSheet
        open={open && chatOpen && step === "chat"}
        onOpenChange={(next) => {
          setChatOpen(next);
          if (!next && step === "chat" && !reviewDraft) {
            if (skipParentCloseRef.current) {
              skipParentCloseRef.current = false;
              return;
            }
            onOpenChange(false);
          }
        }}
        projectId={projectId}
        target={chatTarget}
        intent="create"
        onConfirm={handleChatConfirm}
      />

      <Dialog
        open={progressDialogOpen}
        onOpenChange={(next) => {
          if (!next) handleDismiss();
        }}
      >
        <DialogContent
          className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl"
          showCloseButton={step !== "generating" && step !== "clarify"}
          onPointerDownOutside={(e) => {
            if (step === "generating" || step === "clarify") e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (step === "generating" || step === "clarify") e.preventDefault();
          }}
        >
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-5 py-5 text-left sm:px-6">
            <DialogTitle>
              {step === "generating"
                ? "Generating stories…"
                : step === "clarify"
                  ? "A few clarifying questions"
                  : isAddStories
                    ? "Review generated stories"
                    : "Review and edit"}
            </DialogTitle>
            <DialogDescription>
              {step === "generating"
                ? "Using your epic description to suggest stories. This may take a moment."
                : step === "clarify"
                  ? "Answer below so we can generate stories that match your intent."
                  : "Fine-tune the epic and stories, then add them to your backlog."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {step === "generating" ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">Generating stories…</p>
                <p className="text-xs text-muted-foreground max-w-sm text-center">
                  AI is drafting stories for your epic. Please keep this window open.
                </p>
              </div>
            ) : step === "clarify" && awaitingQuestions?.length ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Clarifying · round {Math.max(1, clarifyRoundRef.current + 1)}
                </p>
                {clarifySummary ? (
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                    <AssistantMarkdown
                      text={clarifySummary}
                      className="text-sm text-muted-foreground"
                    />
                  </div>
                ) : null}
                <LaunchpadQuestionsCard
                  variant="thread"
                  optionLayout="cursor"
                  questions={awaitingQuestions}
                  onSubmit={handleClarifySubmit}
                  sending={false}
                  continueInstruction={LAUNCHPAD_QUESTIONS_CONTINUE_BACKLOG_SUGGESTIONS}
                  className="mb-0 max-h-none"
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
                    setStep(isAddStories && !startWithChat ? "generating" : "chat");
                    if (!isAddStories || startWithChat) setChatOpen(true);
                  }}
                >
                  Back to chat
                </Button>
              </div>
            ) : reviewDraft ? (
              <ReleaseSuggestionDraftEditor
                draft={reviewDraft}
                onDraftChange={(next) => {
                  setReviewDraft(next);
                  setIncludedStoryIndexes((prev) => {
                    const oldLen = reviewDraft?.features?.length ?? 0;
                    const newLen = next.features?.length ?? 0;
                    if (newLen <= oldLen) return prev;
                    const nextSet = new Set(prev);
                    for (let i = oldLen; i < newLen; i += 1) {
                      nextSet.add(i);
                    }
                    return nextSet;
                  });
                }}
                projectId={projectId}
                showStoryInclusionToggles
                includedStoryIndexes={includedStoryIndexes}
                onIncludedStoryIndexesChange={setIncludedStoryIndexes}
              />
            ) : null}
          </div>

          {step === "review" && reviewDraft ? (
            <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                disabled={applying}
                onClick={() => {
                  if (isAddStories) {
                    if (startWithChat) {
                      setStep("chat");
                      setChatOpen(true);
                    } else {
                      void runGenerateStories();
                    }
                  } else {
                    setStep("chat");
                    setChatOpen(true);
                  }
                }}
              >
                {isAddStories ? (startWithChat ? "Back to chat" : "Regenerate") : "Back to chat"}
              </Button>
              <Button
                type="button"
                className="text-white"
                disabled={applying || includedCount === 0}
                onClick={() => void handleApply()}
              >
                {applying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : isJiraAddStories ? (
                  `Create ${includedCount} in Jira`
                ) : isAddStories ? (
                  `Add ${includedCount} ${includedCount === 1 ? "story" : "stories"}`
                ) : (
                  "Add to backlog"
                )}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
