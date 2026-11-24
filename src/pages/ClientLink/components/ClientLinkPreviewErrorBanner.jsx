import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CLIENT_LINK_PREVIEW_RECOVERY } from "../clientLinkPreviewRecovery.constants";

/**
 * Non-blocking banner when the embed iframe is showing the exact preview-port error page
 * (or, with `message`, when LaunchPad's post-turn build check failed).
 * Does not cover the iframe — users see the same document as opening the port directly.
 */
export function ClientLinkPreviewErrorBanner({
  open = false,
  message = "Preview error from the app server — full response is shown in the preview below.",
  onReload,
  onSendToAgent,
  showSendToAgent = false,
  reloadDisabled = false,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-30 flex flex-wrap items-center gap-2 border-b border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur-sm",
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden />
      <p className="min-w-0 flex-1 text-xs leading-snug text-foreground sm:text-sm">{message}</p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {typeof onReload === "function" ? (
          <Button type="button" size="sm" disabled={reloadDisabled} onClick={onReload}>
            {CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.shortLabel}
          </Button>
        ) : null}
        {showSendToAgent && typeof onSendToAgent === "function" ? (
          <Button type="button" size="sm" variant="secondary" onClick={onSendToAgent}>
            {CLIENT_LINK_PREVIEW_RECOVERY.sendErrorToAgent.shortLabel}
          </Button>
        ) : null}
        {typeof onDismiss === "function" ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
            {dismissLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
