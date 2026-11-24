import { Button } from "@/components/ui/button";
import { Loader2, Pause, PencilLine, Play, RefreshCw, ScrollText, Trash2 } from "lucide-react";
import { AUTOMATION_LABELS } from "../automationDisplay";
import { cn } from "@/lib/utils";

const ACTION_BUTTON_CLASS =
  "h-9 gap-2 rounded-none border-r border-border px-3 transition-colors duration-200";

export function AutomationDetailsPageActions({
  isActive,
  busy,
  manualRunBlocked = false,
  onEdit,
  onRunNow,
  onViewLogs,
  onToggleEnabled,
  onRefresh,
  onDelete,
}) {
  const hasDelete = typeof onDelete === "function";

  return (
    <div className="inline-flex max-w-full shrink-0 flex-wrap items-center rounded-lg border border-border bg-background shadow-xs sm:flex-nowrap">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(ACTION_BUTTON_CLASS, "rounded-l-lg")}
        disabled={busy}
        onClick={onEdit}
      >
        <PencilLine className="size-4 shrink-0" aria-hidden />
        Edit
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={ACTION_BUTTON_CLASS}
        disabled={busy || manualRunBlocked}
        onClick={onRunNow}
      >
        {busy ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Play className="size-4 shrink-0" aria-hidden />
        )}
        Run now
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={ACTION_BUTTON_CLASS}
        disabled={busy}
        onClick={onViewLogs}
      >
        <ScrollText className="size-4 shrink-0" aria-hidden />
        View logs
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={ACTION_BUTTON_CLASS}
        disabled={busy}
        onClick={onToggleEnabled}
      >
        {isActive ? (
          <Pause className="size-4 shrink-0" aria-hidden />
        ) : (
          <Play className="size-4 shrink-0" aria-hidden />
        )}
        {isActive ? AUTOMATION_LABELS.pauseSchedule : AUTOMATION_LABELS.resumeSchedule}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(ACTION_BUTTON_CLASS, !hasDelete && "rounded-r-lg border-r-0")}
        disabled={busy}
        onClick={onRefresh}
      >
        <RefreshCw className="size-4 shrink-0" aria-hidden />
        Refresh
      </Button>
      {hasDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-2 rounded-r-lg px-3 text-destructive transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 className="size-4 shrink-0" aria-hidden />
          {AUTOMATION_LABELS.deleteAutomation}
        </Button>
      ) : null}
    </div>
  );
}
