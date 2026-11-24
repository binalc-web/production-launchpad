import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatQueuedDispatchingLabel,
  isDispatchingChatQueueItem,
  shouldRenderChatMessageQueuePanel,
} from "@/lib/chatMessageQueue.util";
import { ArrowDown, ArrowUp, Clock, Loader2, X } from "lucide-react";

/**
 * Waiting queue above the chat composer — reorder and cancel queued user messages.
 */
export function ChatMessageQueuePanel({
  items = [],
  mutating = false,
  onMoveUp,
  onMoveDown,
  onCancel,
  onSteer,
  className,
}) {
  if (!shouldRenderChatMessageQueuePanel(items)) return null;

  const sending = items.some(isDispatchingChatQueueItem);

  return (
    <div
      className={cn(
        "mb-3 rounded-lg border border-border/80 bg-background/80 px-3 py-2.5",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Clock className="size-3.5 shrink-0" aria-hidden />
        <span>Queued messages</span>
        {items.length > 0 ? (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {items.length}
          </Badge>
        ) : null}
      </div>

      {sending ? (
        <p className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
          {formatQueuedDispatchingLabel()}
        </p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item, index) => {
          const text =
            typeof item?.text === "string"
              ? item.text
              : typeof item?.content === "string"
                ? item.content
                : "";
          const preview = text.trim() || "Queued message";
          const dispatching = isDispatchingChatQueueItem(item);
          return (
            <li
              key={String(item.id)}
              className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-2"
            >
              <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">
                {dispatching ? "Sending" : `#${index + 1}`}
              </Badge>
              <p className="min-w-0 flex-1 text-xs leading-relaxed text-foreground line-clamp-2">
                {preview}
              </p>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={mutating || dispatching || index === 0}
                  onClick={() => onMoveUp?.(item.id)}
                  aria-label="Move up"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={mutating || dispatching || index === items.length - 1}
                  onClick={() => onMoveDown?.(item.id)}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                {typeof onSteer === "function" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    disabled={mutating || dispatching}
                    onClick={() => onSteer(item.id)}
                    aria-label="Steer into the running turn"
                    title="Send this message into the turn that is already running"
                  >
                    Steer
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  disabled={mutating || dispatching}
                  onClick={() => onCancel?.(item.id)}
                  aria-label="Remove from queue"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
