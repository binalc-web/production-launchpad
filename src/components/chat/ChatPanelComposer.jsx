import { Badge } from "@/components/ui/badge";
import { ChatComposerModeSelect } from "@/components/chat/ChatComposerModeSelect";
import {
  buildComposerModeCycleIds,
  handleComposerModeTabCycleKeyDown,
} from "@/components/chat/chatComposerModeSelect.util.js";
import { ChatAttachControl } from "@/components/chat/ChatAttachControl";
import { ChatAttachmentChips } from "@/components/chat/ChatAttachmentChips";
import { PlatformPromptBox } from "@/components/chat/PlatformPromptBox";
import { PlatformPromptSendButton } from "@/components/chat/PlatformPromptSendButton";
import {
  PLATFORM_PROMPT_BOX_FULLSCREEN_GUTTER,
  PLATFORM_PROMPT_BOX_OUTER_PANEL,
  PLATFORM_PROMPT_BOX_TEXTAREA_COMPACT,
  PLATFORM_PROMPT_BOX_TEXTAREA_FULLSCREEN,
  PLATFORM_PROMPT_BOX_TOOL_BTN,
} from "@/components/chat/platformPromptBox.classes";
import {
  chatPanelModalColumnClass,
  chatPanelPageColumnClass,
} from "@/components/chat/chatPanelLayout.constants";
import { chatComposerCanSend } from "@/lib/chatAttachments";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  DEV_IDE_REPO_PATH_MIME,
  readRepoPathDragData,
} from "@/pages/Project/ProjectDetails/components/devIde/devIdeDragPath.js";
import { useState } from "react";

/**
 * Chat composer — mode selector, prompt box, attach, and send/stop.
 */
export function ChatPanelComposer({
  mode,
  onModeChange,
  draft,
  onDraftChange,
  onKeyDown,
  onSend,
  composerDisabled,
  sending = false,
  hasActiveRun = false,
  runningBadgeLabel = "Running",
  sendingBadgeLabel = "Sending…",
  placeholderAsk,
  placeholderAgent,
  placeholderPlan = "Describe what to build — I'll ask questions if needed, then propose a plan.",
  composerPlaceholderOverride = null,
  onStop = null,
  stopping = false,
  isFullscreen = false,
  beforeComposer = null,
  onPathDrop = null,
  showPlanMode = false,
  attachEnabled = false,
  attachItems = [],
  attachUploading = false,
  onAttachFiles = null,
  onRemoveAttach = null,
  fullscreenLayout = "modal",
  toolbarExtra = null,
  composerFooter = null,
}) {
  const [pathDropActive, setPathDropActive] = useState(false);
  const placeholder =
    composerPlaceholderOverride ||
    (mode === "ask" ? placeholderAsk : mode === "plan" ? placeholderPlan : placeholderAgent);
  const canSend = chatComposerCanSend({
    draft,
    disabled: composerDisabled,
    attachEnabled,
    attachmentCount: Array.isArray(attachItems) ? attachItems.length : 0,
    uploading: attachUploading,
  });
  const pathDropEnabled = typeof onPathDrop === "function" && !composerDisabled;

  const handleDragOver = (event) => {
    if (!pathDropEnabled) return;
    const types = Array.from(event.dataTransfer?.types || []);
    if (!types.includes(DEV_IDE_REPO_PATH_MIME) && !types.includes("text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setPathDropActive(true);
  };

  const handleDragLeave = (event) => {
    if (!pathDropEnabled) return;
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setPathDropActive(false);
  };

  const handleDrop = (event) => {
    if (!pathDropEnabled) return;
    event.preventDefault();
    setPathDropActive(false);
    const path = readRepoPathDragData(event);
    if (path) onPathDrop(path);
  };

  const textareaPlaceholder = pathDropEnabled
    ? `${placeholder} Drop a file path here to reference it.`
    : placeholder;

  const handleTextareaKeyDown = (event) => {
    handleComposerModeTabCycleKeyDown(event, {
      currentMode: mode,
      orderedIds: buildComposerModeCycleIds(showPlanMode, false),
      onModeChange,
      disabled: composerDisabled,
    });
    onKeyDown?.(event);
  };

  const fullscreenColumnClass = isFullscreen
    ? fullscreenLayout === "page"
      ? chatPanelPageColumnClass
      : chatPanelModalColumnClass
    : null;
  const showRunStatus = hasActiveRun || sending;

  const runStatusBadge = showRunStatus ? (
    <Badge
      variant="secondary"
      title={hasActiveRun ? runningBadgeLabel : sendingBadgeLabel}
      className={cn(
        "w-fit max-w-full gap-1 overflow-visible whitespace-normal break-words",
        isFullscreen ? "text-xs" : "text-[10px]",
      )}
    >
      <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
      <span className="min-w-0">{hasActiveRun ? runningBadgeLabel : sendingBadgeLabel}</span>
    </Badge>
  ) : null;

  return (
    <div
      className={cn(
        isFullscreen ? PLATFORM_PROMPT_BOX_FULLSCREEN_GUTTER : PLATFORM_PROMPT_BOX_OUTER_PANEL,
        composerFooter && !isFullscreen && "min-[481px]:pb-2",
      )}
    >
      <div className={cn("w-full", fullscreenColumnClass)}>
        {beforeComposer}
        {toolbarExtra ? (
          <div className="mb-2 hidden w-full items-start justify-between gap-2 max-[480px]:flex">
            <div className="min-w-0 flex-1">{runStatusBadge}</div>
            <div className="shrink-0">{toolbarExtra}</div>
          </div>
        ) : null}
        {showRunStatus ? (
          <div className={cn("mb-2 self-start", toolbarExtra && "max-[480px]:hidden")}>
            {runStatusBadge}
          </div>
        ) : null}
        <div className={cn(toolbarExtra && "max-[480px]:w-full")}>
          <PlatformPromptBox
            className={cn(toolbarExtra && "min-w-0 max-[480px]:w-full")}
            pathDropActive={pathDropActive}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPasteFiles={
              attachEnabled && !attachUploading ? (files) => onAttachFiles?.(files) : null
            }
            staging={
              attachEnabled ? (
                <ChatAttachmentChips
                  items={attachItems}
                  onRemove={onRemoveAttach}
                  disabled={composerDisabled}
                />
              ) : null
            }
            value={draft}
            onChange={onDraftChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={textareaPlaceholder}
            rows={2}
            disabled={composerDisabled}
            textareaClassName={cn(
              isFullscreen
                ? PLATFORM_PROMPT_BOX_TEXTAREA_FULLSCREEN
                : PLATFORM_PROMPT_BOX_TEXTAREA_COMPACT,
            )}
            toolbarLeft={
              <>
                <ChatComposerModeSelect
                  value={mode}
                  onValueChange={onModeChange}
                  disabled={composerDisabled}
                  showPlan={showPlanMode}
                  compact
                />
                {attachEnabled ? (
                  <ChatAttachControl
                    disabled={composerDisabled}
                    uploading={attachUploading}
                    onFiles={(files) => onAttachFiles?.(files)}
                    buttonClassName={PLATFORM_PROMPT_BOX_TOOL_BTN}
                  />
                ) : null}
                {toolbarExtra ? (
                  <div className="hidden max-w-full min-w-0 min-[481px]:contents">
                    {toolbarExtra}
                  </div>
                ) : null}
              </>
            }
            toolbarRight={
              <PlatformPromptSendButton
                hasActiveRun={hasActiveRun}
                onSend={onSend}
                onStop={onStop}
                stopping={stopping}
                sending={sending && !hasActiveRun}
                disabled={composerDisabled}
                sendDisabled={!canSend}
              />
            }
            footer={
              composerFooter ? (
                typeof composerFooter === "string" ? (
                  <p className="mt-1.5 hidden text-center text-xs leading-snug text-muted-foreground min-[481px]:block">
                    {composerFooter}
                  </p>
                ) : (
                  composerFooter
                )
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
}
