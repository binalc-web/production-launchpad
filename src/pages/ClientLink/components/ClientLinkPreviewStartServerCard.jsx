import React from "react";
import { Play, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLIENT_LINK_PREVIEW_RECOVERY } from "../clientLinkPreviewRecovery.constants";
import { ClientLinkPreviewStatusCardShell } from "./ClientLinkPreviewStatusCardShell";

/**
 * Empty state when the project preview server is not running.
 */
export function ClientLinkPreviewStartServerCard({
  title = "Preview server not running",
  message = "The preview server is not running. Start it to load this project.",
  onStart,
  disabled = false,
  className,
}) {
  return (
    <ClientLinkPreviewStatusCardShell
      title={title}
      message={message}
      tone="idle"
      className={className}
      icon={<Server className="size-5" strokeWidth={1.75} aria-hidden />}
      footer={
        <p className="text-xs leading-relaxed text-muted-foreground">
          {CLIENT_LINK_PREVIEW_RECOVERY.startServer.whenToUse}
        </p>
      }
    >
      <Button
        type="button"
        disabled={disabled}
        onClick={onStart}
        aria-label={CLIENT_LINK_PREVIEW_RECOVERY.startServer.ariaLabel}
        className="cursor-pointer gap-2 transition-colors duration-200"
      >
        <Play className="size-4 fill-current" aria-hidden />
        {CLIENT_LINK_PREVIEW_RECOVERY.startServer.shortLabel}
      </Button>
    </ClientLinkPreviewStatusCardShell>
  );
}
