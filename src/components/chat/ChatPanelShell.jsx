import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ChatPanelFullscreenPortal } from "@/components/chat/ChatPanelFullscreenPortal";
import {
  chatPanelFullscreenCardClass,
  chatPanelFullscreenOverlayClass,
  chatPanelFullscreenPageCardClass,
  chatPanelFullscreenPageOverlayClass,
  chatPanelFullscreenTransitionMs,
  chatPanelInlineShellClass,
} from "@/components/chat/chatPanelLayout.constants";
import { cn } from "@/lib/utils";

export {
  chatPanelBodyClass,
  chatPanelFullscreenPageCardClass,
  chatPanelFullscreenPageOverlayClass,
  chatPanelFullscreenCardClass,
  chatPanelFullscreenOverlayClass,
  chatPanelInlineMaxHeightClass,
  chatPanelInlineMinHeightClass,
  chatPanelInlineShellClass,
} from "@/components/chat/chatPanelLayout.constants";

/**
 * Chat panel layout shell — inline card or portaled fullscreen with uniform padding.
 */
/** @typedef {"modal" | "page"} ChatPanelFullscreenLayout */

export function ChatPanelShell({
  isFullscreen,
  /** @type {ChatPanelFullscreenLayout} */
  fullscreenLayout = "modal",
  className,
  children,
  dialog = null,
}) {
  const pageFullscreen = isFullscreen && fullscreenLayout === "page";
  const [portalMounted, setPortalMounted] = useState(false);
  const [enterReady, setEnterReady] = useState(false);
  const hadFullscreenRef = useRef(false);

  useEffect(() => {
    if (isFullscreen) {
      hadFullscreenRef.current = true;
      setPortalMounted(true);
      setEnterReady(false);
      let innerRaf = 0;
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => setEnterReady(true));
      });
      return () => {
        cancelAnimationFrame(outerRaf);
        cancelAnimationFrame(innerRaf);
      };
    }

    if (!hadFullscreenRef.current) return undefined;

    hadFullscreenRef.current = false;
    setEnterReady(false);
    const timeoutId = window.setTimeout(() => {
      setPortalMounted(false);
    }, chatPanelFullscreenTransitionMs);

    return () => window.clearTimeout(timeoutId);
  }, [isFullscreen]);

  const overlayVisible = isFullscreen && enterReady;

  const card = (
    <Card
      data-chat-surface
      className={cn(
        "flex flex-col gap-0 overflow-hidden rounded-xl border border-border py-0 shadow-sm",
        isFullscreen || portalMounted
          ? pageFullscreen
            ? cn(
                chatPanelFullscreenPageCardClass,
                overlayVisible ? "scale-100 opacity-100" : "scale-[0.985] opacity-0",
              )
            : cn(
                chatPanelFullscreenCardClass,
                "transition-[transform,opacity] duration-300 ease-out",
                overlayVisible ? "scale-100 opacity-100" : "scale-[0.98] opacity-0",
              )
          : chatPanelInlineShellClass,
        className,
      )}
    >
      {children}
    </Card>
  );

  if (!portalMounted) {
    return (
      <>
        {card}
        {dialog}
      </>
    );
  }

  const overlayClass = pageFullscreen
    ? chatPanelFullscreenPageOverlayClass
    : cn(chatPanelFullscreenOverlayClass, "transition-opacity duration-300 ease-in-out");

  return (
    <ChatPanelFullscreenPortal isFullscreen={portalMounted}>
      <div className={cn(overlayClass, overlayVisible ? "opacity-100" : "opacity-0")}>{card}</div>
      {dialog}
    </ChatPanelFullscreenPortal>
  );
}
