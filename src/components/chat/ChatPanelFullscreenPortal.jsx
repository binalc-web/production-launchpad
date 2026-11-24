import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { chatPanelInlineShellClass } from "@/components/chat/chatPanelLayout.constants";

/**
 * Portals chat panel to document.body in fullscreen so it covers app/project nav.
 */
export function ChatPanelFullscreenPortal({
  isFullscreen,
  placeholderClassName = chatPanelInlineShellClass,
  children,
}) {
  if (!isFullscreen) return children;

  return (
    <>
      <div aria-hidden className={cn("pointer-events-none", placeholderClassName)} />
      {createPortal(children, document.body)}
    </>
  );
}
