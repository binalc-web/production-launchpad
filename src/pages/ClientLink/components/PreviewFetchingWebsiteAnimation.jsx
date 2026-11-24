import React from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Decorative preview-only loader: browser frame with pulsing content bars.
 * Used while the embed iframe shell is loaded but app content is still hydrating.
 */
export function PreviewFetchingWebsiteAnimation({ className }) {
  return (
    <div
      className={cn(
        "relative mx-auto mb-4 flex h-[120px] w-full max-w-[220px] items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <div className="relative w-full rounded-lg border border-border bg-muted/30 p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive/70" />
          <span className="size-2 rounded-full bg-amber-500/70" />
          <span className="size-2 rounded-full bg-emerald-500/70" />
          <div className="ml-1 h-2 flex-1 rounded-sm bg-background/80" />
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-3/4 animate-pulse rounded-sm bg-primary/20 motion-safe:[animation-duration:1.2s]" />
          <div className="h-2 w-full animate-pulse rounded-sm bg-primary/15 motion-safe:[animation-delay:200ms] motion-safe:[animation-duration:1.2s]" />
          <div className="h-2 w-5/6 animate-pulse rounded-sm bg-primary/10 motion-safe:[animation-delay:400ms] motion-safe:[animation-duration:1.2s]" />
        </div>
      </div>
      <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center justify-center">
        <span className="relative flex size-8 items-center justify-center rounded-full border border-border bg-background shadow-sm">
          <Globe className="size-4 text-muted-foreground" />
        </span>
      </div>
    </div>
  );
}
