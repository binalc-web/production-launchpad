import { Button } from "@/components/ui/button";
import { formatBackendLockAgentModeLabel } from "@/lib/projectStatusPresentation";
import { Loader2 } from "lucide-react";

/**
 * Confirm / discard banner when infra chat agent mode awaits diagram approval.
 */
export function InfraAnalysisChangeConfirmation({
  pendingMessage,
  backendLockAgentMode,
  confirming,
  onConfirm,
  onReject,
}) {
  if (!pendingMessage?.id) return null;

  const modeLabel = formatBackendLockAgentModeLabel(backendLockAgentMode);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-sm text-foreground">
        <p className="font-medium">Review the diagram and suggestions preview</p>
        <p className="mt-0.5 text-muted-foreground">
          Confirm to apply this change using{" "}
          <span className="font-medium text-foreground">{modeLabel}</span>, or discard to revert the
          preview.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={confirming}
          onClick={() => onReject?.(pendingMessage.id)}
        >
          Discard
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={confirming}
          onClick={() => onConfirm?.(pendingMessage.id)}
          className="gap-2"
        >
          {confirming ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Confirm changes
        </Button>
      </div>
    </div>
  );
}
