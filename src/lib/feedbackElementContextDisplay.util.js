import {
  formatPickedElementForPrompt,
  SELECTED_UI_ELEMENT_PREFIX,
  SELECTED_UI_ELEMENT_PREFIX_LEGACY,
  splitFollowupWithElementContext,
} from "@/pages/ClientLink/components/ClientLinkPreviewPicker";

/**
 * Resolve chip + user-facing text from a stored feedback description.
 * Never surface the raw `[Selected UI element…]` prompt block in UI.
 * @param {string} fullDescription
 * @param {object | null | undefined} pickedElement
 */
export function resolveFeedbackDescriptionDisplay(fullDescription, pickedElement) {
  const full = String(fullDescription || "").trim();
  const split = splitFollowupWithElementContext(full);
  const inspectorCtx = pickedElement || split?.inspectorCtx || null;
  const tag =
    inspectorCtx?.reactComponentStack?.[0] ||
    inspectorCtx?.componentHint ||
    inspectorCtx?.tag ||
    split?.tag ||
    "element";

  let userText = split?.userText ?? full;
  let contextBlock = split?.contextBlock || "";

  // Never show the selected-element prompt block as the card/description body.
  if (
    !split &&
    (full.startsWith(SELECTED_UI_ELEMENT_PREFIX) ||
      full.startsWith(SELECTED_UI_ELEMENT_PREFIX_LEGACY))
  ) {
    userText = "";
    contextBlock = full;
  } else if (
    userText.startsWith(SELECTED_UI_ELEMENT_PREFIX) ||
    userText.startsWith(SELECTED_UI_ELEMENT_PREFIX_LEGACY)
  ) {
    userText = "";
  }

  return {
    userText,
    inspectorCtx,
    tag,
    contextBlock,
    hasElementContext: Boolean(inspectorCtx || contextBlock || pickedElement),
  };
}

/**
 * Rebuild API description: keep selected-element prompt block when present.
 * @param {string} userText
 * @param {object | null | undefined} pickedElement
 * @param {string} [previousFullDescription]
 */
export function assembleFeedbackDescriptionWithElementContext(
  userText,
  pickedElement,
  previousFullDescription = "",
) {
  const body = String(userText || "").trim();
  if (pickedElement && typeof pickedElement === "object") {
    const block = formatPickedElementForPrompt(pickedElement);
    if (block) return body ? `${block}\n\n${body}` : block;
  }
  const split = splitFollowupWithElementContext(previousFullDescription);
  if (split?.contextBlock) {
    return body ? `${split.contextBlock}\n\n${body}` : split.contextBlock;
  }
  return body;
}
