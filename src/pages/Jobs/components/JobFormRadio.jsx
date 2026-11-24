import React from "react";
import { cn } from "@/lib/utils";

/**
 * Ring + solid-dot radio (reference UI), using brand `--primary` green for ring and dot.
 * Native input is visually hidden but kept for a11y and forms.
 *
 * @param {{
 *   id: string,
 *   name: string,
 *   checked: boolean,
 *   onChange: () => void,
 *   children: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function JobFormRadio({
  id,
  name,
  checked,
  onChange,
  children,
  className,
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground",
        className,
      )}
    >
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        <input
          id={id}
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        {/* Outer ring — green when selected, neutral when not */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full border-2 bg-background transition-colors",
            "border-border peer-checked:border-primary",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          )}
        />
        {/* Inner dot */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none relative z-10 size-2.5 rounded-full bg-primary transition-all duration-150 ease-out",
            "scale-75 opacity-0 peer-checked:scale-100 peer-checked:opacity-100",
          )}
        />
      </span>
      {children}
    </label>
  );
}
