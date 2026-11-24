import { EMBED_WIDGET_ROOT_ID } from "./embedConstants.js";

/** Selectors for feedback widget chrome that must not be pick targets. */
export const FEEDBACK_WIDGET_CHROME_SELECTOR =
  "[data-feedback-widget-button],[data-feedback-widget-record-button],[data-feedback-widget-pick-button],[data-feedback-widget-overlay],[data-feedback-widget-pick-overlay]";

/** True when the element is part of the feedback widget UI (not a host-page pick target). */
export function isFeedbackWidgetChrome(el) {
  if (!el || el.nodeType !== 1) return false;
  try {
    return Boolean(el.closest(FEEDBACK_WIDGET_CHROME_SELECTOR));
  } catch {
    return false;
  }
}

/** True when the node belongs to the embed shadow host (not a host-page pick target). */
export function isEmbedFeedbackHostElement(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.id === EMBED_WIDGET_ROOT_ID) return true;
  try {
    const root = el.getRootNode();
    if (root instanceof ShadowRoot && root.host?.id === EMBED_WIDGET_ROOT_ID) {
      return true;
    }
    return Boolean(el.closest(`#${EMBED_WIDGET_ROOT_ID}`));
  } catch {
    return false;
  }
}

function isPickableHostElement(el) {
  if (!el || el.nodeType !== 1) return false;
  if (isFeedbackWidgetChrome(el)) return false;
  if (isEmbedFeedbackHostElement(el)) return false;
  const top = el.tagName?.toUpperCase();
  if (top === "HTML" || top === "BODY") return false;
  return true;
}

/**
 * Resolve the first host-page element in a hit-test stack (skips embed widget layers).
 * @param {Element[]} stack
 * @param {{ refinePickTarget: (el: Element) => Element, resolveReplacementElement: (el: Element) => Element }} helpers
 */
export function resolvePickableHostElementFromStack(stack, helpers) {
  const { refinePickTarget, resolveReplacementElement } = helpers;
  for (const node of stack) {
    let el = node;
    while (el && el.nodeType !== 1) el = el.parentElement;
    if (!isPickableHostElement(el)) continue;
    el = refinePickTarget(el);
    el = resolveReplacementElement(el);
    if (!isPickableHostElement(el)) continue;
    return el;
  }
  return null;
}

/**
 * Pick a host-page element under the pointer (Code Snippet embed — no iframe).
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ refinePickTarget: (el: Element) => Element, resolveReplacementElement: (el: Element) => Element }} helpers
 */
export function pickHostElementAtClientPoint(clientX, clientY, helpers) {
  if (typeof document === "undefined") return null;
  const stack =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(Boolean);
  const el = resolvePickableHostElementFromStack(stack, helpers);
  if (!el) return null;
  return { el, win: window };
}
