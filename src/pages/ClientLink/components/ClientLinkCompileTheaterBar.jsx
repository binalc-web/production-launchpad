import React from "react";
import { cn } from "@/lib/utils";

/**
 * Thin determinate progress bar for compile theater (never invents 100%).
 * @param {{
 *   percent?: number | null,
 *   className?: string,
 * }} props
 */
export function ClientLinkCompileTheaterBar({ percent = null, className }) {
  if (percent == null || !Number.isFinite(percent) || percent <= 0) return null;
  const width = Math.min(99, Math.max(1, Math.round(percent)));

  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)} aria-hidden>
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
