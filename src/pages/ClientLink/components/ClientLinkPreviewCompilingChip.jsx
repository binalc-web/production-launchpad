import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientLinkCompileTheaterBar } from "./ClientLinkCompileTheaterBar";

/**
 * Non-blocking status chip while the embed shell is interactive but still compiling.
 * @param {{
 *   open?: boolean,
 *   message?: string,
 *   file?: string,
 *   helper?: string,
 *   showBar?: boolean,
 *   percent?: number | null,
 *   quiet?: boolean,
 *   className?: string,
 * }} props
 */
export function ClientLinkPreviewCompilingChip({
  open = false,
  message = "Compiling preview…",
  file = "",
  helper = "",
  showBar = false,
  percent = null,
  quiet = false,
  className,
}) {
  if (!open) return null;

  const fileLine = String(file || "").trim();
  const helperLine = String(helper || "").trim();
  const expanded = Boolean(showBar || fileLine || helperLine) && !quiet;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          "inline-flex max-w-[min(100%,28rem)] items-center gap-2 border border-border bg-card/95 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm",
          expanded ? "flex-col items-stretch rounded-xl px-3 py-2" : "rounded-full px-3 py-1.5",
        )}
      >
        <div className="flex items-center gap-2">
          <Loader2
            className="size-3.5 shrink-0 motion-safe:animate-spin motion-reduce:animate-none"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="min-w-0 truncate">{message}</span>
        </div>
        {expanded && fileLine && !String(message || "").includes(fileLine) ? (
          <span className="truncate pl-5 text-[11px] text-muted-foreground/90">{fileLine}</span>
        ) : null}
        {expanded && showBar ? (
          <ClientLinkCompileTheaterBar percent={percent} className="mt-0.5" />
        ) : null}
        {expanded && helperLine ? (
          <span className="pl-5 text-[11px] leading-snug text-muted-foreground/80">
            {helperLine}
          </span>
        ) : null}
      </div>
    </div>
  );
}
