import React from "react";
import { AlertCircle, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CLIENT_LINK_PREVIEW_RECOVERY,
  PREVIEW_CONTENT_LOAD_MESSAGES,
} from "../clientLinkPreviewRecovery.constants";
import { PreviewFetchingWebsiteAnimation } from "./PreviewFetchingWebsiteAnimation";
import { ClientLinkPreviewStartServerCard } from "./ClientLinkPreviewStartServerCard";
import { ClientLinkPreviewStatusCardShell } from "./ClientLinkPreviewStatusCardShell";
import { ClientLinkCompileTheaterBar } from "./ClientLinkCompileTheaterBar";

/**
 * Full-stage overlay while preview iframe is starting or compiling.
 * @param {{
 *   open?: boolean,
 *   title?: string,
 *   message?: string,
 *   showRetry?: boolean,
 *   retryDisabled?: boolean,
 *   retryDisabledReason?: string,
 *   onRetry?: () => void,
 *   recoveryMode?: boolean,
 *   recoveryActions?: Array<{ key: string, label: string, onClick: () => void, variant?: 'default' | 'outline' | 'secondary', hint?: string, disabled?: boolean }>,
 *   showFetchingAnimation?: boolean,
 *   compileTheater?: {
 *     title?: string,
 *     fileLine?: string,
 *     helper?: string,
 *     showBar?: boolean,
 *     percent?: number | null,
 *   } | null,
 *   diagnosis?: { kind?: string, summary?: string, detail?: string } | null,
 *   onSendDiagnosisToAgent?: () => void,
 *   onViewInPreview?: () => void,
 *   showViewInPreview?: boolean,
 *   showSendDiagnosisToAgent?: boolean,
 *   tone?: 'working' | 'loading' | 'error' | 'fetching',
 *   className?: string,
 * }} props
 */
export function ClientLinkPreviewLoaderOverlay({
  open,
  title = "Loading preview",
  message,
  showRetry = false,
  retryDisabled = false,
  retryDisabledReason = "",
  onRetry,
  recoveryMode = false,
  recoveryActions = [],
  showFetchingAnimation = false,
  compileTheater = null,
  diagnosis = null,
  onSendDiagnosisToAgent,
  onViewInPreview,
  showViewInPreview = false,
  showSendDiagnosisToAgent = false,
  tone: toneProp,
  className,
}) {
  if (!open) return null;

  const showRecoveryActions =
    recoveryMode && Array.isArray(recoveryActions) && recoveryActions.length > 0;
  const startServerAction =
    showRecoveryActions &&
    recoveryActions.length === 1 &&
    recoveryActions[0]?.key === "start-server"
      ? recoveryActions[0]
      : null;
  const showSingleRetry = showRetry && typeof onRetry === "function" && !showRecoveryActions;
  const detailText = String(diagnosis?.detail || "").trim();
  const summaryForDisplay = String(message || "").trim() || String(diagnosis?.summary || "").trim();
  const theater =
    compileTheater &&
    typeof compileTheater === "object" &&
    String(compileTheater.title || "").trim()
      ? compileTheater
      : null;
  const useTheater = Boolean(theater) && !recoveryMode && !showFetchingAnimation;

  if (startServerAction) {
    return (
      <ClientLinkPreviewStartServerCard
        title={title}
        message={summaryForDisplay}
        onStart={startServerAction.onClick}
        disabled={Boolean(startServerAction.disabled)}
        className={className}
      />
    );
  }

  const tone =
    toneProp || (recoveryMode ? "error" : showFetchingAnimation ? "fetching" : "loading");

  const icon =
    tone === "error" ? (
      <AlertCircle className="size-5" strokeWidth={1.75} aria-hidden />
    ) : tone === "working" ? (
      <Sparkles className="size-5" strokeWidth={1.75} aria-hidden />
    ) : tone === "fetching" ? null : (
      <Loader2
        className="size-5 motion-safe:animate-spin motion-reduce:animate-none"
        strokeWidth={1.75}
        aria-hidden
      />
    );

  const busy = !recoveryMode && !showSingleRetry;
  const overlayTitle = useTheater
    ? String(theater.title).trim()
    : showFetchingAnimation
      ? PREVIEW_CONTENT_LOAD_MESSAGES.fetching
      : title;
  const overlayMessage = useTheater
    ? null
    : showFetchingAnimation
      ? null
      : recoveryMode
        ? summaryForDisplay
        : message ||
          "Starting the dev server. This can take a few seconds on warm projects or longer on first install.";

  return (
    <ClientLinkPreviewStatusCardShell
      title={overlayTitle}
      message={overlayMessage}
      tone={tone}
      icon={icon}
      className={className}
      busy={busy}
    >
      {useTheater ? (
        <div className="space-y-3 text-center">
          {theater.fileLine ? (
            <p className="truncate font-mono text-xs text-muted-foreground">{theater.fileLine}</p>
          ) : null}
          {theater.showBar ? (
            <ClientLinkCompileTheaterBar percent={theater.percent} className="mx-auto max-w-xs" />
          ) : null}
          {theater.helper ? (
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
              {theater.helper}
            </p>
          ) : null}
        </div>
      ) : null}

      {showFetchingAnimation ? (
        <div className="mb-1">
          <PreviewFetchingWebsiteAnimation />
        </div>
      ) : null}

      {recoveryMode && detailText ? (
        <details className="rounded-md border border-border bg-muted/40 px-3 py-2 text-left">
          <summary className="cursor-pointer text-xs font-medium text-foreground">Details</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
            {detailText}
          </pre>
        </details>
      ) : null}

      {showSingleRetry ? (
        <div className="space-y-2">
          <Button
            type="button"
            disabled={retryDisabled}
            onClick={onRetry}
            className="cursor-pointer gap-2 transition-colors duration-200"
          >
            <RefreshCw className="size-4" aria-hidden />
            {CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.shortLabel}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {retryDisabled && retryDisabledReason
              ? retryDisabledReason
              : CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.whenToUse}
          </p>
        </div>
      ) : null}

      {showRecoveryActions ? (
        <div className="space-y-2 text-left">
          {recoveryActions.map((action) => (
            <div key={action.key} className="space-y-1">
              <Button
                type="button"
                variant={action.variant || "default"}
                className="w-full cursor-pointer transition-colors duration-200"
                disabled={Boolean(action.disabled)}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
              {action.hint ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{action.hint}</p>
              ) : null}
            </div>
          ))}
          {showSendDiagnosisToAgent && typeof onSendDiagnosisToAgent === "function" ? (
            <div className="space-y-1">
              <Button
                type="button"
                variant="secondary"
                className="w-full cursor-pointer"
                onClick={onSendDiagnosisToAgent}
              >
                {CLIENT_LINK_PREVIEW_RECOVERY.sendErrorToAgent.shortLabel}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {CLIENT_LINK_PREVIEW_RECOVERY.sendErrorToAgent.whenToUse}
              </p>
            </div>
          ) : null}
          {showViewInPreview && typeof onViewInPreview === "function" ? (
            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                className="w-full cursor-pointer"
                onClick={onViewInPreview}
              >
                {CLIENT_LINK_PREVIEW_RECOVERY.viewInPreview.shortLabel}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {CLIENT_LINK_PREVIEW_RECOVERY.viewInPreview.whenToUse}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </ClientLinkPreviewStatusCardShell>
  );
}
