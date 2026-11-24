import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Default collapsed preview height for user prompts (~6 lines at text-sm). */
export const CHAT_USER_COLLAPSED_MAX_HEIGHT = "9rem";

/** Default collapsed preview height for assistant replies. */
export const CHAT_ASSISTANT_COLLAPSED_MAX_HEIGHT = "12rem";

/** Toggle styles for read-more on solid primary user bubbles. */
export const CHAT_USER_PRIMARY_TOGGLE_CLASS =
  "text-primary-foreground/90 hover:text-primary-foreground underline decoration-primary-foreground/50";

/** Toggle styles for neutral / AI Home–style user bubbles. */
export const CHAT_USER_NEUTRAL_TOGGLE_CLASS =
  "text-foreground/80 hover:text-foreground underline decoration-foreground/45";

/**
 * Inline read-more for long chat message bodies.
 * Uses max-height collapse and only shows the toggle when content overflows.
 */
export function ChatExpandableContent({
  children,
  className,
  collapsedMaxHeight = CHAT_ASSISTANT_COLLAPSED_MAX_HEIGHT,
  expandLabel = "Read more",
  collapseLabel = "Show less",
  toggleClassName,
  disabled = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const contentRef = useRef(null);

  const scheduleOverflowMeasure = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      const next = el.scrollHeight > el.clientHeight + 1;
      setCanExpand((prev) => (prev === next ? prev : next));
    };

    requestAnimationFrame(measure);
  }, []);

  useLayoutEffect(() => {
    if (disabled || expanded) return;

    const el = contentRef.current;
    if (!el) return;

    scheduleOverflowMeasure();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      scheduleOverflowMeasure();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, disabled, expanded, collapsedMaxHeight, scheduleOverflowMeasure]);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  const showToggle = canExpand || expanded;

  return (
    <div className="min-w-0">
      <div
        ref={contentRef}
        className={cn(className, !expanded && "overflow-hidden")}
        style={!expanded ? { maxHeight: collapsedMaxHeight } : undefined}
      >
        {children}
      </div>
      {showToggle ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className={cn("mt-1 h-auto p-0 text-xs font-medium text-primary", toggleClassName)}
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? collapseLabel : expandLabel}
        </Button>
      ) : null}
    </div>
  );
}
