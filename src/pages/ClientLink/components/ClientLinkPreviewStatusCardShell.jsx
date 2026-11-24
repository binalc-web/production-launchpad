import React from "react";
import { cn } from "@/lib/utils";

/**
 * Stripe-like status card for Client Link preview overlays.
 * @param {{
 *   title: string,
 *   message?: string | null,
 *   tone?: 'idle' | 'working' | 'loading' | 'error' | 'fetching',
 *   icon?: React.ReactNode,
 *   footer?: React.ReactNode,
 *   children?: React.ReactNode,
 *   className?: string,
 *   busy?: boolean,
 *   blocking?: boolean,
 * }} props
 */
export function ClientLinkPreviewStatusCardShell({
  title,
  message,
  tone = "loading",
  icon,
  footer,
  children,
  className,
  busy = false,
  blocking = true,
}) {
  const iconWrap =
    tone === "error"
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
      : tone === "idle"
        ? "bg-muted text-foreground"
        : "bg-muted text-primary";

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm",
        !blocking && "pointer-events-none",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={busy}
      aria-label={title}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-xl border border-border bg-card px-8 py-7 text-center shadow-sm",
          "animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none",
        )}
      >
        {icon ? (
          <div
            className={cn(
              "mx-auto mb-4 flex size-11 items-center justify-center rounded-full",
              iconWrap,
            )}
          >
            {icon}
          </div>
        ) : null}

        <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">{title}</h2>

        {message ? (
          <p className="mx-auto max-w-sm whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        ) : null}

        {children ? <div className="mt-5">{children}</div> : null}
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
    </div>
  );
}
