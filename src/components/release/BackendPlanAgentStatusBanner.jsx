import { Button } from "@/components/ui/button";
import {
  isBackendAgentFailureTerminal,
  isReleaseBackendAgentFailed,
  isReleaseBackendAgentRunning,
  normalizeBackendAgentStatus,
} from "@/lib/backendAgentStatus";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, RotateCw } from "lucide-react";

/**
 * @param {{
 *   release: { id?: number, name?: string, backendAgentStatus?: string | null },
 *   onRetry?: () => void,
 *   retryLoading?: boolean,
 *   retryDisabled?: boolean,
 *   logsHref?: string | null, // project backend-code tab with live lock logs (preview page)
 *   className?: string,
 * }} props
 */
export function BackendPlanAgentStatusBanner({
  release,
  onRetry,
  retryLoading = false,
  retryDisabled = false,
  logsHref = null,
  className,
}) {
  const st = release?.backendAgentStatus;
  const running = isReleaseBackendAgentRunning(release);
  const failed = isReleaseBackendAgentFailed(release);
  const awaitingQuestions =
    String(release?.backendAgentLockPhase ?? "")
      .trim()
      .toLowerCase() === "awaiting_questions";
  if (!running && !failed && !awaitingQuestions) return null;

  const statusLabel = awaitingQuestions ? "AWAITING_QUESTIONS" : normalizeBackendAgentStatus(st);

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm",
        (running || awaitingQuestions) && "border-amber-200 bg-amber-50/90 text-amber-950",
        failed && "border-red-200 bg-red-50/90 text-red-950",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        {running || awaitingQuestions ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin opacity-80" aria-hidden />
        ) : null}
        <div className="min-w-0">
          <span className="font-semibold">{release?.name}: </span>
          {awaitingQuestions ? (
            <>
              Backend plan agent needs clarifying answers before continuing the lock.
              <span className="ml-2 font-mono text-xs opacity-80">{statusLabel}</span>
            </>
          ) : null}
          {running && !awaitingQuestions ? (
            <>
              Backend plan agent is running…
              {statusLabel ? (
                <span className="ml-2 font-mono text-xs opacity-80">{statusLabel}</span>
              ) : null}
            </>
          ) : null}
          {failed ? (
            <>
              Backend plan agent failed. The release is still active — retry to run the plan agent
              and complete the lock.
              {statusLabel && isBackendAgentFailureTerminal(st) ? (
                <span className="mt-1 block font-mono text-xs opacity-80">{statusLabel}</span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      {running && logsHref ? (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5 border-amber-300/80 bg-white/80 hover:bg-white text-amber-950"
        >
          <a href={logsHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden />
            View detailed logs
          </a>
        </Button>
      ) : null}
      {failed && onRetry ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "shrink-0 gap-1.5 border-red-300/80 bg-white/80 hover:bg-white",
            failed && "text-red-950",
          )}
          onClick={onRetry}
          disabled={retryLoading || retryDisabled}
        >
          {retryLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RotateCw className="h-4 w-4" aria-hidden />
          )}
          Retry
        </Button>
      ) : null}
    </div>
  );
}
