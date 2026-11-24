import { useState } from "react";
import { Check, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatChatThreadLabel } from "@/lib/formatChatThreadLabel";
import { cn } from "@/lib/utils";

/**
 * Clock-style history dropdown for older chat threads.
 */
export function OlderChatThreadsMenu({
  threads = [],
  loading = false,
  disabled = false,
  activeThreadId = null,
  onSelectThread,
  className,
  /** When true, always render the history button (disabled if no threads). */
  alwaysShow = true,
  /** Copy overrides so other chat panels (e.g. QA Chat) can reuse the menu as-is. */
  label = "Older chats",
  emptyLabel = "No older chats",
  emptyListLabel = "No older chats yet.",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasThreads = Array.isArray(threads) && threads.length > 0;
  if (!alwaysShow && !hasThreads && !loading) return null;

  const menuDisabled = disabled || loading || !hasThreads;

  const handleSelectThread = (threadId) => {
    onSelectThread?.(threadId);
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <Tooltip open={menuOpen ? false : undefined}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={menuDisabled}
              className={cn(
                "h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
                className,
              )}
              aria-label={label}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <History className="size-4" aria-hidden />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
          {hasThreads ? label : emptyLabel}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-72 max-h-64 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
        {hasThreads ? (
          threads.map((thread) => {
            const isActive = activeThreadId != null && String(activeThreadId) === String(thread.id);
            return (
              <DropdownMenuItem
                key={thread.id}
                className={cn(
                  "cursor-pointer flex flex-col items-start gap-0.5 py-2",
                  isActive && "bg-accent",
                )}
                onSelect={() => handleSelectThread(thread.id)}
              >
                <span
                  className={cn(
                    "flex w-full items-start gap-1.5 text-xs leading-snug text-foreground",
                    isActive && "font-semibold",
                  )}
                >
                  {isActive ? (
                    <Check className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
                  ) : null}
                  <span className="min-w-0 flex-1">{formatChatThreadLabel(thread)}</span>
                </span>
                {thread.messageCount != null ? (
                  <span className="text-[10px] text-muted-foreground pl-0">
                    {thread.messageCount} message{thread.messageCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </DropdownMenuItem>
            );
          })
        ) : (
          <div className="px-2 py-3 text-xs text-muted-foreground">{emptyListLabel}</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
