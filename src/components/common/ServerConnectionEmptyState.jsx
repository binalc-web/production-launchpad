import { RefreshCw, Unplug } from "lucide-react";
import config from "@/config/index.js";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/**
 * Centered empty state when the LaunchPad API is unreachable.
 */
export function ServerConnectionEmptyState({ onRetry, retrying = false, className }) {
  const apiUrl = String(config.API_URL || "").replace(/\/$/, "");

  return (
    <Empty
      className={cn(
        "min-h-[min(70vh,640px)] w-full border-none bg-transparent px-6 py-12 md:py-16",
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <EmptyHeader className="max-w-md gap-3">
        <EmptyMedia
          variant="icon"
          className="mb-1 size-16 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 text-amber-700 dark:text-amber-400 [&_svg]:size-8"
        >
          <Unplug aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-semibold tracking-tight">
          Can&apos;t reach the server
        </EmptyTitle>
        <EmptyDescription className="max-w-sm text-base/relaxed">
          LaunchPad backend is not responding. Start the server and try again.
          {apiUrl ? (
            <>
              {" "}
              Expected at{" "}
              <span className="font-mono text-xs text-foreground/80">{apiUrl}</span>.
            </>
          ) : null}
        </EmptyDescription>
      </EmptyHeader>
      {onRetry ? (
        <EmptyContent>
          <Button type="button" onClick={onRetry} disabled={retrying}>
            <RefreshCw className={cn("size-4", retrying && "animate-spin")} aria-hidden />
            {retrying ? "Checking connection…" : "Try again"}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
