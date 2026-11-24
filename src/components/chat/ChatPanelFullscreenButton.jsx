import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  chatPanelHeaderActionBtnClass,
  chatPanelHeaderActionLabelClass,
} from "@/components/chat/chatPanelLayout.constants";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2 } from "lucide-react";

/** Fullscreen toggle for chat panel headers. */
export function ChatPanelFullscreenButton({ isFullscreen, onToggle }) {
  const label = isFullscreen ? "Exit full screen" : "Full screen";

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={cn(
            chatPanelHeaderActionBtnClass,
            "max-sm:px-2",
            isFullscreen && "bg-muted/50",
          )}
          aria-label={label}
        >
          {isFullscreen ? (
            <Minimize2 className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <Maximize2 className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className={chatPanelHeaderActionLabelClass}>{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
        {isFullscreen ? "Return to the side panel layout" : "Open chat in full screen"}
      </TooltipContent>
    </Tooltip>
  );
}
