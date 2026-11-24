import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PLATFORM_PROMPT_BOX_RADIUS } from "@/components/chat/platformPromptBox.classes";

/**
 * Cursor-style composer stop control: high-contrast circular button with a
 * filled square icon (replaces send while generation is active).
 *
 * @param {object} props
 * @param {() => void} props.onClick
 * @param {boolean} [props.disabled]
 * @param {"default" | "sm"} [props.size]
 * @param {string} [props.className]
 * @param {string} [props.tooltip]
 * @param {boolean} [props.showPulse]
 */
export function ComposerStopButton({
  onClick,
  disabled = false,
  size = "default",
  className,
  tooltip = "Stop generating",
  showPulse = true,
}) {
  const dim = size === "sm" ? "size-8" : "size-9";
  const square = size === "sm" ? "size-2" : "size-2.5";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={tooltip}
          onClick={onClick}
          className={cn(
            "relative shrink-0 border-0 p-0 shadow-none",
            PLATFORM_PROMPT_BOX_RADIUS,
            "bg-foreground text-background",
            "hover:bg-foreground/90 hover:text-background",
            "focus-visible:ring-foreground/30",
            "active:scale-95",
            "transition-transform duration-150",
            dim,
            className,
          )}
        >
          <span
            className={cn("relative z-10 block rounded-[2px] bg-background", square)}
            aria-hidden
          />
          {showPulse ? (
            <span
              className={cn(
                "pointer-events-none absolute inset-0 z-0 ring-2 ring-foreground/20 ring-offset-2 ring-offset-background",
                PLATFORM_PROMPT_BOX_RADIUS,
              )}
              aria-hidden
            />
          ) : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-medium">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Inline stop affordance for loading panels (e.g. release suggestions).
 *
 * @param {object} props
 * @param {() => void} props.onClick
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
export function ComposerStopTextButton({ onClick, disabled = false, className }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      aria-label="Stop generating"
      className={cn(
        "gap-2 rounded-full border-border bg-background px-4 font-medium shadow-sm",
        "hover:bg-muted/60",
        className,
      )}
    >
      <span className="block size-2.5 shrink-0 rounded-[2px] bg-foreground" aria-hidden />
      Stop
    </Button>
  );
}
