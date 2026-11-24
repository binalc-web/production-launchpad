import React from "react";
import { Bot, GitPullRequestArrow, Loader2, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CLIENT_LINK_PREVIEW_RECOVERY } from "../clientLinkPreviewRecovery.constants";
import { ClientLinkPreviewToolbarExpandableButton } from "./ClientLinkPreviewToolbarExpandableButton";

function RecoveryActionButton({
  icon,
  shortLabel,
  ariaLabel,
  title,
  whenToUse,
  busy,
  disabled,
  onClick,
  variant = "outline",
  className,
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex max-w-full">
          <ClientLinkPreviewToolbarExpandableButton
            icon={icon}
            label={shortLabel}
            ariaLabel={ariaLabel}
            variant={variant}
            disabled={disabled}
            busy={busy}
            busyIcon={Loader2}
            title={title}
            onClick={onClick}
            className={className}
            showTooltip={false}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[18rem] text-xs leading-relaxed">
        <p className="font-medium text-popover-foreground">{title}</p>
        <p className="mt-1 text-muted-foreground">{whenToUse}</p>
        {disabled ? (
          <p className="mt-1.5 text-amber-700 dark:text-amber-400">
            Currently unavailable for this project state.
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Preview recovery controls in the client-link header (reload preview + agent restart).
 */
export function ClientLinkPreviewRecoveryActions({
  showRestartAgent,
  showReloadDevServer,
  showUpdateFromGit = false,
  restartAgentBusy = false,
  reloadDevBusy = false,
  updateFromGitBusy = false,
  restartAgentDisabled = false,
  restartAgentDisabledReason = "",
  reloadDevServerDisabled = false,
  reloadDevServerDisabledReason = "",
  updateFromGitDisabled = false,
  updateFromGitDisabledReason = "",
  onRestartAgent,
  onReloadDevServer,
  onUpdateFromGit,
  className,
}) {
  const restartCopy = CLIENT_LINK_PREVIEW_RECOVERY.restartAgent;
  const reloadCopy = CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer;
  const updateCopy = CLIENT_LINK_PREVIEW_RECOVERY.updateFromGit;

  const restartWhen = restartAgentDisabledReason || restartCopy.whenToUse;
  const reloadWhen = reloadDevServerDisabledReason || reloadCopy.whenToUse;
  const updateWhen = updateFromGitDisabledReason || updateCopy.whenToUse;

  const anyVisible = showRestartAgent || showReloadDevServer || showUpdateFromGit;
  if (!anyVisible) return null;

  return (
    <div className={cn("flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5", className)}>
      {showUpdateFromGit ? (
        <RecoveryActionButton
          icon={GitPullRequestArrow}
          shortLabel={updateCopy.shortLabel}
          ariaLabel={updateCopy.ariaLabel}
          title={updateCopy.title}
          whenToUse={updateWhen}
          busy={updateFromGitBusy}
          disabled={updateFromGitDisabled}
          onClick={onUpdateFromGit}
          variant="secondary"
          className="border-sky-200 bg-sky-50/90 text-sky-950 hover:bg-sky-100/90"
        />
      ) : null}
      {showRestartAgent ? (
        <RecoveryActionButton
          icon={Bot}
          shortLabel={restartCopy.shortLabel}
          ariaLabel={restartCopy.ariaLabel}
          title={restartCopy.title}
          whenToUse={restartWhen}
          busy={restartAgentBusy}
          disabled={restartAgentDisabled}
          onClick={onRestartAgent}
          className="border-amber-200 bg-amber-50/80 text-amber-950 hover:bg-amber-100/90"
        />
      ) : null}
      {showReloadDevServer ? (
        <RecoveryActionButton
          icon={RefreshCw}
          shortLabel={reloadCopy.shortLabel}
          ariaLabel={reloadCopy.ariaLabel}
          title={reloadCopy.title}
          whenToUse={reloadWhen}
          busy={reloadDevBusy}
          disabled={reloadDevServerDisabled}
          onClick={onReloadDevServer}
        />
      ) : null}
    </div>
  );
}
