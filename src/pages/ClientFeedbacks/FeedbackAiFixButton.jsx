import React from "react";
import { Button } from "@/components/ui/button";
import {
  getAiFixPhaseLabel,
  isAiFixCompleted,
  isAiFixFailed,
  isAiFixRunning,
} from "@/lib/feedbackAiFixLabels";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, Loader2, Sparkles } from "lucide-react";

/**
 * @param {object} props
 * @param {string|null|undefined} props.status
 * @param {boolean} [props.busy]
 * @param {boolean} [props.disabled]
 * @param {"sm"|"default"} [props.size]
 * @param {() => void} props.onStart
 * @param {() => void} props.onOpenDetails
 */
export function FeedbackAiFixButton({
  status,
  busy = false,
  disabled = false,
  size = "sm",
  onStart,
  onOpenDetails,
}) {
  const running = isAiFixRunning(status);
  const completed = isAiFixCompleted(status);
  const failed = isAiFixFailed(status);
  const phaseLabel = getAiFixPhaseLabel(status);

  if (completed) {
    return (
      <Button
        type="button"
        size={size}
        variant="outline"
        className={cn(
          "group shrink-0 gap-1.5 rounded-lg border-primary/35 bg-primary/8 text-primary",
          "transition-all duration-200 hover:border-primary/50 hover:bg-primary/12",
        )}
        onClick={onOpenDetails}
      >
        <CheckCircle2 className="size-3.5" aria-hidden />
        Fixed
        <ChevronRight
          className="size-3.5 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </Button>
    );
  }

  if (running) {
    return (
      <Button
        type="button"
        size={size}
        variant="outline"
        className={cn(
          "group relative shrink-0 gap-2 overflow-hidden rounded-lg border-primary/30 bg-background",
          "transition-all duration-300 hover:border-primary/45 hover:bg-primary/5",
        )}
        onClick={onOpenDetails}
        title="View live fix progress"
      >
        <span
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        <span className="relative flex min-w-0 items-center gap-2">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
          <span className="max-w-[9.5rem] truncate text-xs font-medium sm:max-w-[11rem]">
            {phaseLabel}
          </span>
          <ChevronRight
            className="size-3.5 shrink-0 opacity-50 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant={failed ? "outline" : "default"}
      className={cn(
        "shrink-0 gap-1.5 rounded-lg",
        failed && "border-destructive/30 text-destructive hover:bg-destructive/8",
      )}
      disabled={disabled || busy}
      onClick={onStart}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="size-3.5" aria-hidden />
      )}
      {failed ? "Retry AI fix" : "Fix with AI"}
    </Button>
  );
}
