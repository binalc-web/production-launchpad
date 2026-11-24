import { ComposerStopButton } from "@/components/chat/ComposerStopButton";
import { cn } from "@/lib/utils";

/**
 * Slim status row above the composer while the agent is generating (Cursor-like).
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {() => void} props.onStop
 * @param {boolean} [props.stopDisabled]
 * @param {string} [props.className]
 */
export function ComposerGeneratingBar({
  label = "Generating…",
  onStop,
  stopDisabled = false,
  className,
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-2",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <p className="truncate text-xs font-medium text-foreground">{label}</p>
      </div>
      <ComposerStopButton
        onClick={onStop}
        disabled={stopDisabled}
        size="sm"
        tooltip="Stop"
        showPulse={false}
      />
    </div>
  );
}
