import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function renderToolbarIcon(Icon, iconClassName) {
  if (!Icon) return null;
  if (React.isValidElement(Icon)) return Icon;
  return React.createElement(Icon, {
    className: cn("size-4 shrink-0", iconClassName),
    "aria-hidden": true,
  });
}

const labelExpandClassName = cn(
  "overflow-hidden whitespace-nowrap text-xs font-medium",
  "max-w-0 opacity-0",
  "transition-[max-width,opacity,margin] duration-200 ease-out",
  "motion-reduce:transition-none",
  "[@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:max-w-[11rem]",
  "[@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:mr-2.5",
  "[@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:opacity-100",
  "group-focus-visible/btn:max-w-[11rem] group-focus-visible/btn:mr-2.5 group-focus-visible/btn:opacity-100",
);

function ToolbarExpandableContent({
  icon: Icon,
  label,
  labelClassName,
  iconClassName,
  busy,
  busyIcon: BusyIcon,
  badge,
}) {
  const showBusy = busy && BusyIcon;

  return (
    <>
      <span className="relative flex size-8 shrink-0 items-center justify-center">
        {showBusy
          ? renderToolbarIcon(BusyIcon, cn("animate-spin", iconClassName))
          : renderToolbarIcon(Icon, iconClassName)}
        {badge ? <span className="absolute -top-0.5 -right-0.5">{badge}</span> : null}
      </span>
      {label ? <span className={cn(labelExpandClassName, labelClassName)}>{label}</span> : null}
    </>
  );
}

/**
 * Icon-first toolbar button that expands its label on hover/focus (fine pointer).
 * Icon stays in a fixed slot; only the label grows to the right.
 */
export function ClientLinkPreviewToolbarExpandableButton({
  icon: Icon,
  label,
  variant = "outline",
  active = false,
  disabled = false,
  busy = false,
  busyIcon: BusyIcon,
  title,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  badge,
  onClick,
  onPointerDown,
  className,
  iconClassName,
  labelClassName,
  showTooltip = true,
  href,
  target,
  rel,
}) {
  const resolvedAriaLabel = ariaLabel || label;
  const resolvedVariant = active ? "default" : variant;
  const isFilledVariant = resolvedVariant === "default" || resolvedVariant === "destructive";

  const sharedClassName = cn(
    "group/btn relative z-0 inline-flex h-8 shrink-0 items-center overflow-hidden p-0",
    "[@media(hover:hover)_and_(pointer:fine)]:hover:z-20 focus-visible:z-20",
    "[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-sm",
    !isFilledVariant &&
      "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-background [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground",
    className,
  );

  const contentProps = {
    icon: Icon,
    label,
    labelClassName,
    iconClassName,
    busy,
    busyIcon: BusyIcon,
    badge,
  };

  const control = href ? (
    <a
      href={disabled ? undefined : href}
      target={target}
      rel={rel}
      title={disabled ? undefined : title}
      aria-label={resolvedAriaLabel}
      onClick={disabled ? (e) => e.preventDefault() : onClick}
      className={cn(
        sharedClassName,
        "rounded-md border border-border bg-background text-foreground shadow-xs",
        "hover:bg-accent hover:text-accent-foreground",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:z-20 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-sm",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <ToolbarExpandableContent {...contentProps} />
    </a>
  ) : (
    <Button
      type="button"
      variant={active ? "default" : variant}
      size="sm"
      disabled={disabled || busy}
      onClick={onClick}
      onPointerDown={onPointerDown}
      title={disabled ? undefined : title}
      aria-label={resolvedAriaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      className={sharedClassName}
    >
      <ToolbarExpandableContent {...contentProps} />
    </Button>
  );

  /** Disabled controls ignore pointer events; wrap so hover shows the reason. */
  if (disabled && title && showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex max-w-full cursor-not-allowed">{control}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px] text-center text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!label || !showTooltip) {
    return control;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex max-w-full">{control}</span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="text-xs [@media(hover:hover)_and_(pointer:fine)]:hidden"
      >
        {title || label}
      </TooltipContent>
    </Tooltip>
  );
}
