import { cn } from "@/lib/utils";

/**
 * Chat panel title row with icon badge and header actions.
 * Use layout="stack" in narrow columns (e.g. Backend IDE chat) so title/description
 * stay full-width and actions sit on a second row instead of crushing the title.
 * Use layout="responsive" for full-width chat panels (stack below lg when description
 * is shown; compact fullscreen headers stay one row on all breakpoints).
 */
export function ChatPanelHeader({
  icon: Icon,
  title,
  description,
  actions,
  isFullscreen = false,
  /** Shorter header (full-page chat). */
  compact = false,
  layout = "row",
}) {
  const responsive = layout === "responsive";
  const stacked = layout === "stack";
  const iconSize = compact ? "size-8" : isFullscreen ? "size-11" : stacked ? "size-8" : "size-9";
  const glyphSize = compact ? "size-4" : isFullscreen ? "size-5" : "size-4";

  const titleBlock = (
    <div className={cn("min-w-0 flex-1", !compact && "space-y-0.5")}>
      <h2
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact
            ? "text-sm leading-none"
            : isFullscreen
              ? "text-lg"
              : stacked
                ? "truncate text-sm"
                : "text-base",
        )}
      >
        {title}
      </h2>
      {description && !compact ? (
        <p
          className={cn(
            "text-xs leading-relaxed text-muted-foreground",
            !stacked && "md:text-[13px]",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );

  const iconBadge = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
        iconSize,
      )}
    >
      <Icon className={glyphSize} aria-hidden />
    </div>
  );

  return (
    <div
      className={cn(
        "shrink-0 border-b border-border bg-gradient-to-r from-muted/50 to-muted/20",
        compact
          ? "px-4 py-2.5"
          : isFullscreen
            ? "px-6 py-4"
            : stacked
              ? "px-3 py-3"
              : "px-4 py-3.5",
      )}
    >
      {stacked ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className={cn("flex min-w-0 gap-2.5", compact ? "items-center" : "items-start")}>
            {iconBadge}
            {titleBlock}
          </div>
          {actions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">{actions}</div>
          ) : null}
        </div>
      ) : responsive && !compact ? (
        <div className="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
          <div className={cn("flex min-w-0 gap-3", compact ? "items-center" : "items-start")}>
            {iconBadge}
            {titleBlock}
          </div>
          {actions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:shrink-0 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={cn("flex justify-between gap-3", compact ? "items-center" : "items-start")}>
          <div className={cn("flex min-w-0 gap-3", compact ? "items-center" : "items-start")}>
            {iconBadge}
            {titleBlock}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
