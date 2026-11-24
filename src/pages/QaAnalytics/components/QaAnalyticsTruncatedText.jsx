import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Ellipsis-truncated text that shows the full string in a hover tooltip.
 * Matches Deployments SummaryCell / PresenceBar patterns (Radix tooltip).
 *
 * @param {{
 *   text?: string | number | null,
 *   className?: string,
 *   as?: keyof JSX.IntrinsicElements,
 *   side?: "top" | "right" | "bottom" | "left",
 *   lineClamp?: 1 | 2 | 3,
 * }} props
 */
export function QaAnalyticsTruncatedText({
  text,
  className,
  as: Comp = "span",
  side = "top",
  lineClamp = 1,
}) {
  const value = text == null ? "" : String(text);
  if (!value) return null;

  const clampClass =
    lineClamp === 2 ? "line-clamp-2" : lineClamp === 3 ? "line-clamp-3" : "truncate";

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Comp className={cn("min-w-0 max-w-full cursor-default", clampClass, className)}>
          {value}
        </Comp>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs whitespace-normal text-left">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Wrap a SelectTrigger (or similar control) so the truncated selected value
 * reveals its full label on hover.
 *
 * @param {{
 *   label?: string | null,
 *   children: React.ReactElement,
 *   side?: "top" | "right" | "bottom" | "left",
 * }} props
 */
export function QaAnalyticsTruncatingControl({ label, children, side = "top" }) {
  const value = label == null ? "" : String(label).trim();
  if (!value) return children;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs whitespace-normal text-left">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
