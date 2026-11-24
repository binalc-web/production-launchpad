import React from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Single recovery action — Retry (resumes from checkpoint when saved).
 * Execution is handled by the parent (same path as Send).
 */
export function AgentStatusBar({
  retryEligible = false,
  disabled = false,
  busy = false,
  onRetry,
}) {
  if (!retryEligible) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/80 bg-muted/30 px-4 py-3",
      )}
      role="group"
      aria-label="Agent recovery"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        className="transition-all duration-200"
        onClick={() => onRetry?.()}
      >
        {busy ? <Spinner className="mr-2 size-3.5" /> : null}
        Retry
      </Button>
    </div>
  );
}
