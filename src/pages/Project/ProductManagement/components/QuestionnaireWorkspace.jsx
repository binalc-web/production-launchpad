import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import {
  generateDiscoveryQuestions,
  generateQuestionnaireSummary,
  patchDiscoveryQuestions,
  captureQuestionnaire,
  publishQuestionnaire,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { NameInputDialog } from "./NameInputDialog";
import { useProjectDiscoveryBridge } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import { Textarea } from "@/components/ui/textarea";
import { useDiscoveryResponsesPoll } from "@/pages/Project/ClientInfo/hooks/useDiscoveryResponsesPoll";
import { QuestionThreadBubble } from "@/pages/DiscoveryQuestionnaire/components/QuestionThreadBubble";
import {
  answerCountForQuestion,
  responsesForQuestion,
} from "@/pages/DiscoveryQuestionnaire/components/discoveryThreadUtils";
import { QuestionnaireList } from "./QuestionnaireList";
import { QuestionnaireShareBar } from "./QuestionnaireShareBar";
import { QuestionnaireStepper } from "./QuestionnaireStepper";
import { QuestionOptionsEditor } from "./QuestionOptionsEditor";
import { EmptyState } from "./EmptyState";
import {
  buildQuestionnaireShareUrl,
  getQuestionnaireLifecycleStatus,
} from "../utils/questionnaireLifecycle";

const SELECT_TYPES = new Set(["singleselect", "multiselect"]);

const QUESTION_TYPES = [
  { value: "text", label: "Text" },
  { value: "yesno", label: "Yes / No" },
  { value: "singleselect", label: "Single select" },
  { value: "multiselect", label: "Multiple choice" },
  { value: "fileupload", label: "File upload" },
];

export const QuestionnaireWorkspace = forwardRef(function QuestionnaireWorkspace(_props, ref) {
  const { projectId, discoveryData, refresh, setDiscoveryData, meta } = useClientInfoContext();
  const { notifyPrdRefresh } = useProjectDiscoveryBridge();
  const [generating, setGenerating] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [questions, setQuestions] = useState(discoveryData?.questions || []);
  const [responses, setResponses] = useState(discoveryData?.responses || []);
  const editingQuestionIdsRef = useRef(new Set());
  const pendingFocusIdRef = useRef(null);

  const markEditing = (id) => {
    editingQuestionIdsRef.current.add(id);
  };

  const markDoneEditing = (id) => {
    editingQuestionIdsRef.current.delete(id);
  };

  const questionnaires = discoveryData?.questionnaires || [];
  const activeId = discoveryData?.activeQuestionnaireId || questionnaires[0]?.id;
  const activeQuestionnaire = questionnaires.find((q) => q.id === activeId) || questionnaires[0];
  const publishedQuestionnaires = questionnaires.filter((q) => q.publishedAt && q.publicPath);
  const activeLifecycleStatus = getQuestionnaireLifecycleStatus(activeQuestionnaire);
  const stakeholders = discoveryData?.stakeholders || [];
  const activePublicPath = activeQuestionnaire?.publicPath
    ? `/${activeQuestionnaire.publicPath}`
    : meta?.slug && activeQuestionnaire?.slug
      ? `/${meta.slug}-${activeQuestionnaire.slug}`
      : "";
  const shouldPollResponses =
    publishedQuestionnaires.some((q) => getQuestionnaireLifecycleStatus(q) === "live") ||
    publishedQuestionnaires.some((q) => getQuestionnaireLifecycleStatus(q) === "captured");

  useImperativeHandle(ref, () => ({
    openCreateDialog: () => setCreateOpen(true),
  }));

  useEffect(() => {
    if (editingQuestionIdsRef.current.size > 0) return;
    setQuestions(discoveryData?.questions || []);
    setResponses(discoveryData?.responses || []);
  }, [discoveryData?.questions, discoveryData?.responses, discoveryData?.activeQuestionnaireId]);

  useEffect(() => {
    const id = pendingFocusIdRef.current;
    if (!id) return;
    const el = document.querySelector(`[data-question-input="${id}"]`);
    if (!el) return;
    // Don't yank focus away from an in-progress option draft.
    const active = document.activeElement;
    if (active?.getAttribute?.("data-question-option")) {
      pendingFocusIdRef.current = null;
      return;
    }
    el.focus();
    pendingFocusIdRef.current = null;
  }, [questions]);

  const onPoll = useCallback(
    (data) => {
      setDiscoveryData(data);
      setResponses(data.responses || []);
      if (editingQuestionIdsRef.current.size === 0) {
        setQuestions(data.questions || []);
      }
    },
    [setDiscoveryData],
  );

  useDiscoveryResponsesPoll(projectId, shouldPollResponses, onPoll);

  const persist = async (body) => {
    const data = await patchDiscoveryQuestions(projectId, body);
    if (editingQuestionIdsRef.current.size === 0) {
      setQuestions(data.questions);
    }
    await refresh({ silent: true });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await generateDiscoveryQuestions(projectId);
      editingQuestionIdsRef.current.clear();
      setQuestions(data.questions);
      await refresh({ silent: true });
      toast.success("Questions generated");
    } catch (err) {
      toast.error(err?.error || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  const moveQuestion = async (index, dir) => {
    const next = [...questions];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    const reordered = next.map((q, i) => ({ ...q, order: i }));
    setQuestions(reordered);
    await persist({ questions: reordered });
  };

  const updateQuestion = async (id, patch) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        // While options are being edited, do not optimistic-replace `options`
        // with the trimmed server payload — that unmounted draft inputs mid-type.
        if (Array.isArray(patch.options) && editingQuestionIdsRef.current.has(id)) {
          const rest = { ...patch };
          delete rest.options;
          return Object.keys(rest).length > 0 ? { ...q, ...rest } : q;
        }
        return { ...q, ...patch };
      }),
    );
    try {
      const data = await patchDiscoveryQuestions(projectId, { action: "update", id, ...patch });
      if (editingQuestionIdsRef.current.size === 0) {
        setQuestions(data.questions);
      }
      // Silent refresh keeps the workspace mounted so Select/options do not blink.
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err?.error || "Failed to update question");
      throw err;
    }
  };

  const deleteQuestion = async (id) => {
    markDoneEditing(id);
    await persist({ action: "delete", id });
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const addQuestion = async () => {
    if (addingQuestion) return;
    setAddingQuestion(true);
    try {
      const data = await patchDiscoveryQuestions(projectId, {
        action: "add",
        text: "",
        type: "text",
      });
      const nextQuestions = data.questions || [];
      const newId = nextQuestions[nextQuestions.length - 1]?.id;
      setQuestions(nextQuestions);
      if (newId) {
        markEditing(newId);
        pendingFocusIdRef.current = newId;
      }
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err?.error || "Failed to add question");
    } finally {
      setAddingQuestion(false);
    }
  };

  const handlePublish = async () => {
    if (!activeId) return;
    setPublishing(true);
    try {
      await publishQuestionnaire(projectId, activeId);
      await refresh({ silent: true });
      toast.success("Published — share link ready");
    } catch (err) {
      toast.error(err?.error || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleCapture = async () => {
    if (!activeId) return;
    setCapturing(true);
    try {
      await captureQuestionnaire(projectId, activeId);
      await refresh({ silent: true });
      toast.success("Questionnaire captured — response collection closed");
    } catch (err) {
      toast.error(err?.error || "Failed to capture questionnaire");
    } finally {
      setCapturing(false);
    }
  };

  const copyActiveLink = async () => {
    if (!activePublicPath) return;
    const url = buildQuestionnaireShareUrl(activePublicPath);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const switchQuestionnaire = async (questionnaireId) => {
    if (questionnaireId === activeId) return;
    editingQuestionIdsRef.current.clear();
    try {
      const data = await patchDiscoveryQuestions(projectId, {
        action: "setActive",
        questionnaireId,
      });
      setQuestions(data.questions || []);
      setResponses(data.responses || []);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err?.error || "Failed to switch questionnaire");
    }
  };

  const handleCreateQuestionnaire = async (name) => {
    try {
      await patchDiscoveryQuestions(projectId, { action: "createQuestionnaire", name });
      await refresh({ silent: true });
      toast.success("Questionnaire created");
    } catch (err) {
      toast.error(err?.error || "Failed to create questionnaire");
      throw err;
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeId) return;
    setSummarizing(true);
    try {
      await generateQuestionnaireSummary(projectId, activeId);
      await refresh({ silent: true });
      notifyPrdRefresh();
      toast.success("Summary generated — PRD stakeholder inputs updated");
    } catch (err) {
      toast.error(err?.error || "Failed to generate summary");
    } finally {
      setSummarizing(false);
    }
  };

  const staleCount = questions.filter((q) => q.stale).length;

  if (questionnaires.length === 0) {
    return (
      <div className="w-full">
        <EmptyState
          icon={ClipboardList}
          title="No questionnaires yet"
          description="Create a questionnaire, add questions, publish, and share the link with your client."
          action={
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Create questionnaire
            </Button>
          }
        />
        <NameInputDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          dialogTitle="New questionnaire"
          label="Questionnaire name"
          defaultValue="Q1"
          submitLabel="Create"
          onSubmit={handleCreateQuestionnaire}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <QuestionnaireList
        questionnaires={questionnaires}
        activeId={activeId}
        stakeholders={stakeholders}
        onSelect={switchQuestionnaire}
        onCreate={() => setCreateOpen(true)}
      />

      <QuestionnaireStepper questionnaire={activeQuestionnaire} />

      <NameInputDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        dialogTitle="New questionnaire"
        label="Questionnaire name"
        defaultValue={`Q${questionnaires.length + 1}`}
        submitLabel="Create"
        onSubmit={handleCreateQuestionnaire}
      />

      <QuestionnaireShareBar
        questionnaire={activeQuestionnaire}
        questionnaireName={activeQuestionnaire?.name}
        publicPath={activeLifecycleStatus !== "draft" ? activePublicPath : ""}
        stakeholders={stakeholders}
        questionCount={questions.length}
        publishing={publishing}
        capturing={capturing}
        onPublish={handlePublish}
        onCapture={handleCapture}
        onCopyLink={copyActiveLink}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateSummary}
          disabled={summarizing || questions.length === 0}
        >
          {summarizing ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="size-4 mr-2" />
          )}
          Generate summary
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          {staleCount > 0 ? "Regenerate affected" : "Generate questions"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addQuestion}
          disabled={addingQuestion}
        >
          {addingQuestion ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Plus className="size-4 mr-2" />
          )}
          Add question
        </Button>
        {staleCount > 0 ? (
          <Badge variant="outline" className="text-amber-700 border-amber-300">
            {staleCount} stale
          </Badge>
        ) : null}
      </div>

      {activeQuestionnaire?.summary ? (
        <div className="rounded-xl border bg-card p-4 space-y-2 shadow-sm">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            AI summary
          </h4>
          <Textarea
            value={activeQuestionnaire.summary}
            readOnly
            rows={4}
            className="text-sm bg-muted/30 resize-none"
          />
        </div>
      ) : null}

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          Generate questions from your discovery context, or add them manually.
        </div>
      ) : (
        <ol className="space-y-4">
          {questions.map((q, index) => {
            const qResponses = responsesForQuestion(responses, q.id);
            const answerCount = answerCountForQuestion(responses, q.id);

            return (
              <li key={q.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="text-xs font-medium text-muted-foreground pt-2 shrink-0">
                    Q{index + 1}
                  </span>
                  <div className="flex-1 space-y-2 min-w-0">
                    <Input
                      data-question-input={q.id}
                      value={q.text ?? ""}
                      placeholder="Enter question text…"
                      onFocus={() => markEditing(q.id)}
                      onChange={(e) =>
                        setQuestions((prev) =>
                          prev.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)),
                        )
                      }
                      onBlur={async (e) => {
                        await updateQuestion(q.id, { text: e.target.value });
                        markDoneEditing(q.id);
                      }}
                      className="w-full bg-background"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={q.type || "text"}
                        onValueChange={(v) => {
                          const patch = { type: v };
                          if (SELECT_TYPES.has(v) && !Array.isArray(q.options)) {
                            patch.options = [""];
                          }
                          if (!SELECT_TYPES.has(v)) {
                            patch.options = [];
                          }
                          updateQuestion(q.id, patch);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-emerald-700 border-emerald-300"
                      >
                        {answerCount === 1
                          ? "1 message"
                          : answerCount === 0
                            ? "0 messages"
                            : `${answerCount} messages`}
                      </Badge>
                      {q.stale ? (
                        <Badge variant="outline" className="shrink-0">
                          Stale
                        </Badge>
                      ) : null}
                      {q.editedAfterResponses ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-amber-800 border-amber-300 max-w-[220px] truncate"
                        >
                          Edited after responses
                        </Badge>
                      ) : null}
                    </div>
                    {SELECT_TYPES.has(q.type) ? (
                      <QuestionOptionsEditor
                        questionId={q.id}
                        options={q.options || []}
                        onFocusEditing={() => markEditing(q.id)}
                        onDoneEditing={() => markDoneEditing(q.id)}
                        onChange={(options) =>
                          setQuestions((prev) =>
                            prev.map((x) => (x.id === q.id ? { ...x, options } : x)),
                          )
                        }
                        onPersist={(options) => updateQuestion(q.id, { options })}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === questions.length - 1}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive"
                      onClick={() => deleteQuestion(q.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {qResponses.length > 0 ? (
                  <div className="space-y-3 pt-2 border-t ml-8">
                    {qResponses.map((r) => (
                      <QuestionThreadBubble key={r.id} response={r} />
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
});
