/** @typedef {'agent' | 'ask' | 'plan' | 'voice'} ComposerModeId */

const BASE_MODE_IDS = ["agent", "plan", "ask"];

/**
 * @param {boolean} showPlan
 * @param {boolean} voiceEnabled Voice mode is allowed (API / project flag).
 * @param {boolean} [showVoiceInMenu] Show Voice in the menu even when not enabled (disabled row).
 * @returns {ComposerModeId[]}
 */
export function buildComposerModeIds(
  showPlan = true,
  voiceEnabled = false,
  showVoiceInMenu = false,
) {
  const list = showPlan ? [...BASE_MODE_IDS] : BASE_MODE_IDS.filter((id) => id !== "plan");
  if (voiceEnabled || showVoiceInMenu) list.push("voice");
  return list;
}

/** Tab-cycle order — only modes the user can actually select. */
export function buildComposerModeCycleIds(showPlan = true, voiceEnabled = false) {
  return buildComposerModeIds(showPlan, voiceEnabled, false);
}

/**
 * @param {ComposerModeId} current
 * @param {ComposerModeId[]} orderedIds
 * @param {'next' | 'prev'} direction
 * @returns {ComposerModeId}
 */
export function cycleComposerMode(current, orderedIds, direction) {
  if (!orderedIds.length) return current;
  const idx = orderedIds.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const delta = direction === "prev" ? -1 : 1;
  const next = (base + delta + orderedIds.length) % orderedIds.length;
  return orderedIds[next];
}

/**
 * @returns {boolean} true when the event was handled
 */
export function handleComposerModeTabCycleKeyDown(
  e,
  { currentMode, orderedIds, onModeChange, disabled },
) {
  if (disabled || !orderedIds.length) return false;
  if (e.key !== "Tab" || e.metaKey || e.ctrlKey || e.altKey) return false;
  if (e.nativeEvent?.isComposing) return false;

  e.preventDefault();
  const direction = e.shiftKey ? "prev" : "next";
  const next = cycleComposerMode(currentMode, orderedIds, direction);
  if (next !== currentMode) onModeChange(next);
  return true;
}
