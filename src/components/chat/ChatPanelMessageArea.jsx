import {
  chatPanelModalColumnClass,
  chatPanelPageColumnClass,
  chatPanelPageGutterClass,
} from "@/components/chat/chatPanelLayout.constants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ChatMessagesSkeleton({ label }) {
  return (
    <div className="space-y-4 py-2" role="status" aria-busy="true" aria-label={label}>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-1/2 rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-2/5 rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/** Scrollable message list region with centered content in fullscreen. */
export function ChatPanelMessageArea({
  scrollRef,
  onScroll,
  isFullscreen = false,
  /** When fullscreen: "page" = AI Home–style narrow column (max-w-2xl). */
  fullscreenLayout = "modal",
  loading = false,
  loadingLabel = "",
  children,
}) {
  const label = typeof loadingLabel === "string" ? loadingLabel.trim() : "";
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        isFullscreen ? chatPanelPageGutterClass : "px-4 py-4",
      )}
      role="log"
      aria-live="polite"
    >
      <div
        className={cn(
          isFullscreen &&
            (fullscreenLayout === "page" ? chatPanelPageColumnClass : chatPanelModalColumnClass),
          !isFullscreen && "mx-auto w-full",
        )}
      >
        {loading ? <ChatMessagesSkeleton label={label || "Loading messages"} /> : children}
      </div>
    </div>
  );
}
