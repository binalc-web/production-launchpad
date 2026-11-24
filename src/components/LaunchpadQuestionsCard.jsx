import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PLATFORM_PROMPT_BOX_SURFACE } from "@/components/chat/platformPromptBox.classes";
import { cn } from "@/lib/utils";
import {
  formatLaunchpadQuestionsAnswerPrompt,
  LAUNCHPAD_QUESTIONS_CONTINUE_IMPLEMENT,
  LAUNCHPAD_QUESTIONS_CONTINUE_PLAN,
  LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID,
} from "@/lib/launchpadQuestions.util.js";

function isOtherSelected(value, allowMultiple) {
  if (allowMultiple) {
    return Array.isArray(value) && value.includes(LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID);
  }
  return value === LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID;
}

function questionAnswered(q, answers, customAnswers) {
  const v = answers[q.id];
  const custom = typeof customAnswers[q.id] === "string" ? customAnswers[q.id].trim() : "";
  if (!Array.isArray(q?.options) || q.options.length === 0) return Boolean(custom);
  if (q.allowMultiple) {
    if (!Array.isArray(v) || v.length === 0) return false;
    if (v.includes(LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID) && !custom) return false;
    return true;
  }
  if (typeof v !== "string" || !v.trim()) return false;
  if (v === LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID) return Boolean(custom);
  return true;
}

/**
 * Cursor-style MCQ clarifying questions card (Plan + implement agents).
 *
 * @param {{
 *   questions: Array<object>,
 *   onSubmit: (prompt: string) => void,
 *   sending?: boolean,
 *   disabled?: boolean,
 *   continueMode?: "plan"|"implement",
 *   continueInstruction?: string,
 *   variant?: "default" | "thread",
 *   optionLayout?: "default" | "cursor",
 *   className?: string,
 * }} props
 */
export function LaunchpadQuestionsCard({
  questions,
  onSubmit,
  sending = false,
  disabled = false,
  continueMode = "implement",
  continueInstruction,
  variant = "default",
  optionLayout = "default",
  className,
}) {
  const list = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);

  const resolvedContinue =
    typeof continueInstruction === "string" && continueInstruction.trim()
      ? continueInstruction.trim()
      : continueMode === "plan"
        ? LAUNCHPAD_QUESTIONS_CONTINUE_PLAN
        : LAUNCHPAD_QUESTIONS_CONTINUE_IMPLEMENT;

  const initialAnswers = useMemo(() => {
    /** @type {Record<string, string|string[]>} */
    const next = {};
    for (const q of list) {
      if (q.allowMultiple) {
        next[q.id] = q.recommended ? [q.recommended] : [];
      } else {
        next[q.id] = q.recommended || q.options[0]?.id || "";
      }
    }
    return next;
  }, [list]);

  const [answers, setAnswers] = useState(initialAnswers);
  const [customAnswers, setCustomAnswers] = useState({});

  useEffect(() => {
    setAnswers(initialAnswers);
    setCustomAnswers({});
  }, [initialAnswers]);

  const allAnswered = list.every((q) => questionAnswered(q, answers, customAnswers));

  const clearCustomAnswer = (questionId) => {
    setCustomAnswers((prev) => {
      if (!(questionId in prev)) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const selectOption = (questionId, optionId, allowMultiple) => {
    if (!allowMultiple) {
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
      if (optionId !== LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID) clearCustomAnswer(questionId);
      return;
    }
    setAnswers((prev) => {
      const cur = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const next = cur.includes(optionId)
        ? cur.filter((id) => id !== optionId)
        : [...cur, optionId];
      return { ...prev, [questionId]: next };
    });
  };

  const selectOther = (question, allowMultiple) => {
    const questionId = question.id;
    if (allowMultiple) {
      const cur = Array.isArray(answers[questionId]) ? answers[questionId] : [];
      const removing = cur.includes(LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID);
      setAnswers((prev) => {
        const curIds = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        const next = removing
          ? curIds.filter((id) => id !== LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID)
          : [...curIds, LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID];
        return { ...prev, [questionId]: next };
      });
      if (removing) clearCustomAnswer(questionId);
      return;
    }
    setAnswers((prev) => ({ ...prev, [questionId]: LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID }));
  };

  const setOtherText = (questionId, value) => {
    setCustomAnswers((prev) => ({ ...prev, [questionId]: value }));
    setAnswers((prev) => {
      const cur = prev[questionId];
      if (Array.isArray(cur)) {
        if (cur.includes(LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID)) return prev;
        return { ...prev, [questionId]: [...cur, LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID] };
      }
      if (cur === LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID) return prev;
      return { ...prev, [questionId]: LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID };
    });
  };

  const handleSubmit = () => {
    if (!allAnswered || sending || disabled) return;
    const prompt = formatLaunchpadQuestionsAnswerPrompt(list, answers, {
      continueInstruction: resolvedContinue,
      customAnswersByQuestionId: customAnswers,
    });
    if (!prompt.trim()) return;
    onSubmit?.(prompt);
  };

  if (list.length === 0) return null;

  const threadVariant = variant === "thread";
  const cursorOptions = optionLayout === "cursor";

  const continueButton = (
    <Button
      type="button"
      size="sm"
      className="gap-1.5 shadow-none"
      disabled={disabled || sending || !allAnswered}
      onClick={handleSubmit}
    >
      {sending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Send className="size-3.5" aria-hidden />
      )}
      Continue
    </Button>
  );

  const optionCardClass = (isSelected) =>
    cn(
      "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left shadow-none transition-colors",
      isSelected
        ? "border-primary/60 bg-primary/5"
        : "border-border/80 bg-muted/15 hover:bg-muted/30 dark:bg-muted/20 dark:hover:bg-muted/35",
      (disabled || sending) && "cursor-not-allowed opacity-60",
    );

  const recommendedBadgeClass =
    "shrink-0 rounded-xl border-primary/60 bg-primary/5 text-[10px] font-semibold text-primary shadow-none hover:bg-primary/5";

  const radioIndicator = (isSelected) => (
    <span
      className={cn(
        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        isSelected ? "border-primary" : "border-muted-foreground/35",
      )}
      aria-hidden
    >
      {isSelected ? <span className="size-2 rounded-full bg-primary" /> : null}
    </span>
  );

  const questionFields = list.map((q, qIndex) => {
    const selected = answers[q.id];
    const otherSelected = isOtherSelected(selected, q.allowMultiple);
    const otherText = customAnswers[q.id] ?? "";
    const questionDescription = typeof q.description === "string" ? q.description.trim() : "";

    return (
      <div key={q.id} className={cn("space-y-2", cursorOptions && "space-y-3")}>
        {cursorOptions ? (
          <div className="space-y-1">
            {list.length > 1 ? (
              <p className="text-[11px] font-medium text-muted-foreground">
                Question {qIndex + 1} of {list.length}
              </p>
            ) : null}
            <p className="text-base font-semibold leading-snug text-foreground">{q.prompt}</p>
            {questionDescription ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{questionDescription}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-foreground">{q.prompt}</p>
        )}
        {!Array.isArray(q.options) || q.options.length === 0 ? (
          <Input
            value={otherText}
            disabled={disabled || sending}
            placeholder="Type your answer"
            onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            className={cn("h-9 text-sm shadow-none", cursorOptions && "rounded-xl")}
          />
        ) : (
          <ul className={cn("flex flex-col", cursorOptions ? "gap-2" : "gap-1.5")}>
            {q.options.map((opt) => {
              const isSelected = q.allowMultiple
                ? Array.isArray(selected) && selected.includes(opt.id)
                : selected === opt.id;
              const isRecommended = q.recommended === opt.id;
              const optDescription =
                typeof opt.description === "string" ? opt.description.trim() : "";
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    disabled={disabled || sending}
                    onClick={() => selectOption(q.id, opt.id, q.allowMultiple)}
                    className={
                      cursorOptions
                        ? optionCardClass(isSelected)
                        : cn(
                            "flex w-full cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-none transition-colors",
                            isSelected
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                            (disabled || sending) && "cursor-not-allowed opacity-60",
                          )
                    }
                  >
                    {cursorOptions ? radioIndicator(isSelected) : null}
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "flex flex-wrap items-center gap-2",
                          cursorOptions ? "text-sm font-medium text-foreground" : "",
                        )}
                      >
                        <span className={cursorOptions ? "min-w-0 flex-1" : "min-w-0 flex-1"}>
                          {opt.label}
                        </span>
                        {isRecommended ? (
                          <Badge variant="outline" className={recommendedBadgeClass}>
                            Recommended
                          </Badge>
                        ) : null}
                      </span>
                      {cursorOptions && optDescription ? (
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {optDescription}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                disabled={disabled || sending}
                onClick={() => selectOther(q, q.allowMultiple)}
                className={
                  cursorOptions
                    ? optionCardClass(otherSelected)
                    : cn(
                        "flex w-full cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-none transition-colors",
                        otherSelected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                        (disabled || sending) && "cursor-not-allowed opacity-60",
                      )
                }
              >
                {cursorOptions ? radioIndicator(otherSelected) : null}
                <span
                  className={cn(
                    "min-w-0 flex-1",
                    cursorOptions && "text-sm font-medium text-foreground",
                  )}
                >
                  Other
                </span>
              </button>
              {otherSelected ? (
                <Input
                  value={otherText}
                  disabled={disabled || sending}
                  placeholder={cursorOptions ? "Describe another option…" : "Type your answer"}
                  onChange={(e) => setOtherText(q.id, e.target.value)}
                  className={cn("mt-2 h-9 text-sm shadow-none", cursorOptions && "rounded-xl")}
                />
              ) : null}
            </li>
          </ul>
        )}
      </div>
    );
  });

  if (threadVariant) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col shadow-none transition-shadow",
          PLATFORM_PROMPT_BOX_SURFACE,
          "mb-0 max-h-[min(60vh,28rem)]",
          className,
        )}
      >
        <div className="flex shrink-0 items-center border-b border-border bg-muted/30 px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Clarifying questions</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {questionFields}
          <div className="flex justify-end border-t border-border pt-3">{continueButton}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-3 space-y-3 rounded-lg border border-border bg-background p-3 shadow-none",
        className,
      )}
    >
      <p className="text-xs font-semibold text-foreground">Clarifying questions</p>
      {questionFields}
      <div className="flex justify-end pt-1">{continueButton}</div>
    </div>
  );
}

/** @deprecated Prefer LaunchpadQuestionsCard with continueMode="plan" */
export function BackendCodePlanQuestionsCard(props) {
  return <LaunchpadQuestionsCard {...props} continueMode="plan" />;
}
