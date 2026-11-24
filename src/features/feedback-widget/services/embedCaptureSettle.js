/**
 * Wait for host-page overlays to finish open/close transitions before screenshot capture.
 * Avoids ghost images from semi-transparent closing modals/drawers.
 */

const HOST_OVERLAY_SELECTORS = [
  "[data-radix-dialog-overlay]",
  "[data-radix-sheet-overlay]",
  "[data-radix-drawer-overlay]",
  "[data-vaul-overlay]",
  "[data-vaul-drawer-wrapper]",
  '[role="dialog"][aria-modal="true"]',
  '[role="alertdialog"][aria-modal="true"]',
].join(", ");

const WIDGET_OVERLAY_SELECTOR = "[data-feedback-widget-overlay]";

function isElementVisible(el) {
  if (!(el instanceof Element)) return false;
  if (el.closest(WIDGET_OVERLAY_SELECTOR)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const opacity = Number.parseFloat(style.opacity);
  if (!Number.isNaN(opacity) && opacity < 0.08) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return false;
  return true;
}

function isAnimatingOut(el) {
  const style = window.getComputedStyle(el);
  const opacity = Number.parseFloat(style.opacity);
  if (!Number.isNaN(opacity) && opacity > 0.08 && opacity < 0.92) return true;
  const state = el.getAttribute("data-state");
  if (state === "closed" && isElementVisible(el)) return true;
  return false;
}

export function getVisibleHostOverlays() {
  if (typeof document === "undefined") return [];
  return [...document.querySelectorAll(HOST_OVERLAY_SELECTORS)].filter(isElementVisible);
}

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * @param {{ maxWaitMs?: number, pollMs?: number, postCloseDelayMs?: number }} [options]
 */
export async function waitForCaptureUiSettle(options = {}) {
  const maxWaitMs = options.maxWaitMs ?? 900;
  const pollMs = options.pollMs ?? 40;
  const postCloseDelayMs = options.postCloseDelayMs ?? 150;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const visible = getVisibleHostOverlays();
    if (visible.length === 0) {
      break;
    }

    const animating = visible.some(isAnimatingOut);
    const stableOpen = visible.every((el) => !isAnimatingOut(el));

    if (stableOpen && !animating) {
      // Fully open host overlay — capture now (user may be reporting a modal bug).
      await nextFrame();
      return;
    }

    await sleep(pollMs);
  }

  await sleep(postCloseDelayMs);
  await nextFrame();
}

export function stopHostOverlayDismissOnPointer(event) {
  event.stopPropagation();
}
