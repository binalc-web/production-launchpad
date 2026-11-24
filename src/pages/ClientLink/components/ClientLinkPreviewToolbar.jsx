import React from "react";
import { BotMessageSquare, Lock, PanelBottom, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT } from "@/lib/backendAgentStatus";
import { ClientLinkPreviewRecoveryActions } from "./ClientLinkPreviewRecoveryActions";
import { ClientLinkPreviewToolbarExpandableButton } from "./ClientLinkPreviewToolbarExpandableButton";

/**
 * Compact preview toolbar: recovery, tools-dock toggle, lock and AI chat. Devices, comments,
 * feedback and export live in the floating tools dock. `dockMounted` is false until the preview
 * frame is shown; Logs stays here meanwhile because the dock's "More" menu isn't reachable yet.
 */
export function ClientLinkPreviewToolbar({
  showControls,
  showRestartAgentRecovery,
  showReloadDevServerRecovery,
  showUpdateFromGitRecovery = false,
  restartAgentBusy,
  reloadDevBusy,
  updateFromGitBusy = false,
  restartAgentDisabled,
  restartAgentDisabledReason,
  reloadDevServerDisabled,
  reloadDevServerDisabledReason,
  updateFromGitDisabled = false,
  updateFromGitDisabledReason = "",
  onRestartAgent,
  onReloadDevServer,
  onUpdateFromGit,
  onOpenPreviewLogs,
  dockMounted = false,
  toolsDockVisible = true,
  onToggleToolsDock,
  hasActiveVersion,
  backendPlanAgentRunning,
  showLockAndFeedback,
  openPreviewCommentCount,
  isLocked,
  locking,
  onLock,
  showAiChatToolbarButton,
  releaseBackgroundAgentBlock,
  chatBlockedReason,
  scratchOnboardingChatActive,
  chatOpen,
  onOpenChat,
  releaseBackgroundAgentChatDisabledHint,
}) {
  const aiChatToolbarDisabled = Boolean(
    hasActiveVersion && (backendPlanAgentRunning || releaseBackgroundAgentBlock),
  );

  const aiChatToolbarTitle = aiChatToolbarDisabled
    ? backendPlanAgentRunning
      ? BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT
      : releaseBackgroundAgentBlock?.message?.trim() || releaseBackgroundAgentChatDisabledHint
    : chatBlockedReason
      ? "Open for guidance on starting the next release"
      : scratchOnboardingChatActive
        ? "Open or expand AI chat"
        : undefined;

  return (
    <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-1.5 xl:min-w-0 xl:flex-nowrap">
      {showControls &&
      (showRestartAgentRecovery || showReloadDevServerRecovery || showUpdateFromGitRecovery) ? (
        <ClientLinkPreviewRecoveryActions
          showRestartAgent={showRestartAgentRecovery}
          showReloadDevServer={showReloadDevServerRecovery}
          showUpdateFromGit={showUpdateFromGitRecovery}
          restartAgentBusy={restartAgentBusy}
          reloadDevBusy={reloadDevBusy}
          updateFromGitBusy={updateFromGitBusy}
          restartAgentDisabled={restartAgentDisabled}
          restartAgentDisabledReason={restartAgentDisabledReason}
          reloadDevServerDisabled={reloadDevServerDisabled}
          reloadDevServerDisabledReason={reloadDevServerDisabledReason}
          updateFromGitDisabled={updateFromGitDisabled}
          updateFromGitDisabledReason={updateFromGitDisabledReason}
          onRestartAgent={onRestartAgent}
          onReloadDevServer={onReloadDevServer}
          onUpdateFromGit={onUpdateFromGit}
        />
      ) : null}

      {showControls && onOpenPreviewLogs && !dockMounted ? (
        <ClientLinkPreviewToolbarExpandableButton
          icon={ScrollText}
          label="Logs"
          ariaLabel="View preview logs"
          onClick={onOpenPreviewLogs}
        />
      ) : null}

      {showControls && onToggleToolsDock ? (
        <ClientLinkPreviewToolbarExpandableButton
          icon={PanelBottom}
          label={toolsDockVisible ? "Hide tools" : "Show tools"}
          ariaLabel={toolsDockVisible ? "Hide preview tools" : "Show preview tools"}
          ariaPressed={toolsDockVisible}
          variant={toolsDockVisible ? "secondary" : "outline"}
          title="Devices, comments, feedback and export"
          badge={
            !toolsDockVisible && hasActiveVersion && openPreviewCommentCount > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground">
                {openPreviewCommentCount}
              </span>
            ) : null
          }
          onClick={onToggleToolsDock}
        />
      ) : null}

      {showLockAndFeedback ? (
        isLocked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <ClientLinkPreviewToolbarExpandableButton
                  icon={Lock}
                  label="Locked"
                  variant="secondary"
                  disabled
                  showTooltip={false}
                  className="cursor-not-allowed opacity-80"
                  ariaLabel="Release locked"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-center">
              You cannot unlock it from here. If you want to unlock it, contact the product manager.
            </TooltipContent>
          </Tooltip>
        ) : backendPlanAgentRunning ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <ClientLinkPreviewToolbarExpandableButton
                  icon={Lock}
                  label="Lock release"
                  variant="default"
                  disabled
                  showTooltip={false}
                  className="cursor-not-allowed opacity-80"
                  ariaLabel="Lock release"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-center">
              {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
            </TooltipContent>
          </Tooltip>
        ) : locking ? (
          <Button
            type="button"
            variant="default"
            size="icon-sm"
            disabled
            className="h-8 w-8 shrink-0"
            aria-label="Locking release"
          >
            <Spinner className="size-4" />
          </Button>
        ) : (
          <ClientLinkPreviewToolbarExpandableButton
            icon={Lock}
            label="Lock release"
            variant="default"
            ariaLabel="Lock release"
            onClick={onLock}
          />
        )
      ) : null}

      {showAiChatToolbarButton ? (
        <ClientLinkPreviewToolbarExpandableButton
          icon={BotMessageSquare}
          label="AI Chat"
          variant="default"
          ariaLabel="Open AI chat"
          ariaExpanded={chatOpen}
          disabled={aiChatToolbarDisabled}
          title={aiChatToolbarTitle}
          onClick={onOpenChat}
        />
      ) : null}
    </div>
  );
}
