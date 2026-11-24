/** Below this width, preview + chat use stacked/full-screen chat instead of horizontal split. */
export const CLIENT_LINK_MOBILE_LAYOUT_MAX_WIDTH_PX = 1023;

/** Minimum chat column width (%) before we treat the panel as visibly open. */
export const CLIENT_LINK_CHAT_PANEL_MIN_VISIBLE_PCT = 28;

export const CLIENT_LINK_CHAT_PANEL_DEFAULT_SIZE = "30%";
export const CLIENT_LINK_PREVIEW_WITH_CHAT_DEFAULT_SIZE = "70%";

/**
 * Scratch onboarding uses a split layout when chat should be visible.
 * @param {boolean} scratchOnboardingChatActive
 * @param {boolean} chatOpen
 */
export function computeScratchChatLayoutActive(scratchOnboardingChatActive, chatOpen) {
  return Boolean(scratchOnboardingChatActive && chatOpen);
}

/**
 * Default ResizablePanel sizes for preview + chat columns.
 * @param {boolean} scratchChatLayoutActive
 */
export function computeScratchChatPanelDefaultSizes(scratchChatLayoutActive) {
  if (scratchChatLayoutActive) {
    return {
      chatPanelDefaultSize: CLIENT_LINK_CHAT_PANEL_DEFAULT_SIZE,
      previewPanelDefaultSize: CLIENT_LINK_PREVIEW_WITH_CHAT_DEFAULT_SIZE,
    };
  }
  return { chatPanelDefaultSize: "0%", previewPanelDefaultSize: "100%" };
}

/**
 * Toolbar AI Chat button: always available when chat is closed; during scratch also shown as recovery when chat is "open" but panel may be collapsed.
 * @param {boolean} showAiChatEntry
 * @param {boolean} chatOpen
 * @param {boolean} scratchOnboardingChatActive
 */
export function computeShowAiChatToolbarButton(
  showAiChatEntry,
  chatOpen,
  scratchOnboardingChatActive,
) {
  return Boolean(showAiChatEntry && (!chatOpen || scratchOnboardingChatActive));
}

/**
 * Scratch first-build still in progress (pending revision and/or agent running).
 * @param {boolean} activePendingScratchRevision
 * @param {{ previewReady?: boolean, agentRunning?: boolean, scratchPreviewBuilding?: boolean }} onboardLivePreview
 */
export function computeScratchBuildInProgress(
  isScratchOnboardingProject,
  activePendingScratchRevision,
  onboardLivePreview,
) {
  if (!isScratchOnboardingProject) return false;
  if (activePendingScratchRevision) {
    return !onboardLivePreview.previewReady || Boolean(onboardLivePreview.agentRunning);
  }
  return (
    Boolean(onboardLivePreview.agentRunning) || Boolean(onboardLivePreview.scratchPreviewBuilding)
  );
}

/**
 * Imperatively expand and size the chat ResizablePanel.
 * @param {import("react-resizable-panels").ImperativePanelHandle | null | undefined} panel
 * @param {string} [defaultSize]
 * @param {number} [minVisiblePct]
 * @returns {boolean} true when panel was adjusted
 */
export function ensureChatPanelExpanded(
  panel,
  defaultSize = CLIENT_LINK_CHAT_PANEL_DEFAULT_SIZE,
  minVisiblePct = CLIENT_LINK_CHAT_PANEL_MIN_VISIBLE_PCT,
) {
  if (!panel) return false;
  const wasCollapsed = panel.isCollapsed();
  if (wasCollapsed) {
    panel.expand();
  }
  const sizePct = panel.getSize().asPercentage;
  if (wasCollapsed || sizePct < minVisiblePct) {
    panel.resize(defaultSize);
  }
  return true;
}

const CHAT_PANEL_EXPAND_MAX_RAF_RETRIES = 3;

/**
 * Expand chat panel after split shell mounts; retries when panelRef is not attached yet.
 * @param {{ current: import("react-resizable-panels").ImperativePanelHandle | null }} panelRef
 * @param {{ defaultSize?: string, minVisiblePct?: number }} [options]
 * @param {number} [attempt]
 */
export function scheduleEnsureChatPanelExpanded(panelRef, options = {}, attempt = 0) {
  const {
    defaultSize = CLIENT_LINK_CHAT_PANEL_DEFAULT_SIZE,
    minVisiblePct = CLIENT_LINK_CHAT_PANEL_MIN_VISIBLE_PCT,
  } = options;
  const panel = panelRef?.current;
  if (panel) {
    ensureChatPanelExpanded(panel, defaultSize, minVisiblePct);
    return;
  }
  if (attempt >= CHAT_PANEL_EXPAND_MAX_RAF_RETRIES) return;
  if (typeof requestAnimationFrame !== "function") return;
  requestAnimationFrame(() => scheduleEnsureChatPanelExpanded(panelRef, options, attempt + 1));
}
