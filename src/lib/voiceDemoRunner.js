import { canAccessIframeDocument } from "@/lib/previewElementAnchor.util";
import { previewRoutePathname, readIframeBrowsePath } from "@/lib/clientLinkEmbeddedPreviewSrc";
import { INTERACTIVE_SELECTOR, elementLabel, renderedRect } from "@/lib/previewScreenContext";

export { buildDemoCandidates, fallbackDemoSteps, orderDemoSteps } from "@/lib/voiceDemoRunner.util";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function currentRoute(iframe) {
  return previewRoutePathname(readIframeBrowsePath(iframe)) || "/";
}

async function waitForRoute(iframe, route, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (canAccessIframeDocument(iframe) && currentRoute(iframe) === route) {
      await sleep(700);
      return true;
    }
    await sleep(150);
  }
  return false;
}

const normLabel = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Re-resolve the step's element in the live DOM. The stored selector can point at a different node
 * once earlier steps changed the page, so the element's current label must still match.
 */
function findStepElement(doc, step) {
  const win = doc.defaultView;
  const want = normLabel(step.label);
  if (!want || step.tag === "page") return null;
  const usable = (el) => el && renderedRect(el, win);

  if (step.selector) {
    try {
      const el = doc.querySelector(step.selector);
      if (usable(el) && normLabel(elementLabel(el)) === want) return el;
    } catch {
      /* invalid selector */
    }
  }

  const pool = [
    ...doc.querySelectorAll(step.action === "click" ? INTERACTIVE_SELECTOR : step.tag || "*"),
  ].filter(usable);
  return (
    pool.find((el) => normLabel(elementLabel(el)) === want) ||
    pool.find((el) => normLabel(elementLabel(el)).startsWith(want.slice(0, 40))) ||
    null
  );
}

/** Window-fixed rect for an element inside the preview iframe. */
function fixedRect(iframe, el) {
  const fr = iframe.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  return {
    left: fr.left + iframe.clientLeft + er.left,
    top: fr.top + iframe.clientTop + er.top,
    width: er.width,
    height: er.height,
  };
}

async function waitForStableRect(el, timeoutMs = 1200) {
  let prev = el.getBoundingClientRect();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(120);
    const next = el.getBoundingClientRect();
    if (Math.abs(next.top - prev.top) < 1 && Math.abs(next.left - prev.left) < 1) return;
    prev = next;
  }
}

function watchDomChanges(doc) {
  let changed = false;
  const obs = new doc.defaultView.MutationObserver(() => {
    changed = true;
  });
  obs.observe(doc.body, { subtree: true, childList: true, attributes: true, characterData: true });
  return {
    changed: () => changed,
    stop: () => obs.disconnect(),
  };
}

const TOGGLE_SELECTOR = "input[type=checkbox],input[type=radio],[role=checkbox],[role=switch]";

/** "Mark X as done" often targets the row's text; the actual control is a sibling checkbox. */
function findToggleFallback(el) {
  const inner = el.querySelector(TOGGLE_SELECTOR);
  if (inner) return inner;
  const row = el.closest("li,tr,[role=listitem],[role=row],label");
  const sibling = row?.querySelector(TOGGLE_SELECTOR);
  return sibling && sibling !== el ? sibling : null;
}

/** Full pointer/mouse sequence so handlers bound to pointerdown/mousedown fire, not just onClick. */
function dispatchRealClick(el) {
  const win = el.ownerDocument.defaultView;
  const r = el.getBoundingClientRect();
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: win,
    clientX: r.left + r.width / 2,
    clientY: r.top + r.height / 2,
    button: 0,
  };
  const Pointer = win.PointerEvent || win.MouseEvent;
  el.focus?.({ preventScroll: true });
  el.dispatchEvent(
    new Pointer("pointerdown", {
      ...init,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      buttons: 1,
    }),
  );
  el.dispatchEvent(new win.MouseEvent("mousedown", { ...init, buttons: 1 }));
  el.dispatchEvent(
    new Pointer("pointerup", { ...init, pointerId: 1, pointerType: "mouse", isPrimary: true }),
  );
  el.dispatchEvent(new win.MouseEvent("mouseup", init));
  el.click();
}

/**
 * Navigate, find, scroll into view and move the virtual cursor onto the step's element.
 * Returns null when the element is not on the current page (the step should be skipped).
 * @param {{
 *   iframe: HTMLIFrameElement | null,
 *   step: { route: string, selector: string | null, label: string, tag?: string, action: "show" | "click" },
 *   navigate: (route: string) => boolean,
 *   setCursor: (cursor: object | null) => void,
 *   signal?: { cancelled: boolean },
 * }} opts
 */
export async function prepareDemoStep({ iframe, step, navigate, setCursor, signal }) {
  if (!canAccessIframeDocument(iframe)) return null;
  if (step.route && step.route !== currentRoute(iframe)) {
    if (!navigate(step.route) || !(await waitForRoute(iframe, step.route))) return null;
  }
  if (signal?.cancelled) return null;
  if (step.tag === "page") {
    setCursor(null);
    return { el: null, step };
  }

  const el = findStepElement(iframe.contentDocument, step);
  if (!el) return null;
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  await sleep(200);
  await waitForStableRect(el);
  if (signal?.cancelled || !el.isConnected) return null;
  setCursor({ ...fixedRect(iframe, el), label: step.label, clicking: false });
  await sleep(700);
  return { el, step };
}

/**
 * Click a prepared step (no-op for "show" steps). Re-resolves the element if the page re-rendered.
 * @returns {Promise<boolean>} whether a click was dispatched
 */
export async function performDemoClick({ iframe, prepared, setCursor, signal }) {
  if (!prepared?.el || prepared.step.action !== "click" || signal?.cancelled) return false;
  let el = prepared.el;
  if (!el.isConnected) {
    el = canAccessIframeDocument(iframe)
      ? findStepElement(iframe.contentDocument, prepared.step)
      : null;
    if (!el) return false;
  }
  const label = prepared.step.label;
  const clickWithCursor = async (target) => {
    setCursor({ ...fixedRect(iframe, target), label, clicking: true });
    await sleep(250);
    const watch = watchDomChanges(target.ownerDocument);
    dispatchRealClick(target);
    await sleep(700);
    watch.stop();
    return watch.changed();
  };

  let changed = await clickWithCursor(el);
  if (!changed && el.isConnected && !signal?.cancelled) {
    const toggle = findToggleFallback(el);
    if (toggle && renderedRect(toggle, toggle.ownerDocument.defaultView)) {
      changed = await clickWithCursor(toggle);
      el = toggle;
    }
  }
  await sleep(300);
  setCursor(el.isConnected ? { ...fixedRect(iframe, el), label, clicking: false } : null);
  return changed;
}
