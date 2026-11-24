import {
  EMBED_OVERLAY_ROOT_ID,
  EMBED_SURFACE_CLASS,
  EMBED_WIDGET_ROOT_ID,
} from "./embedConstants.js";
import { findEmbedScriptElement, resolveEmbedStylesheetHref } from "./embedShadowHost.util.js";

/** In-memory handle for the singleton shadow embed host. */
let embedShadowState = null;

/** Remove pre-shadow embed nodes that lived directly on document.body. */
function removeLegacyEmbedDom() {
  const legacyOverlay = document.getElementById(EMBED_OVERLAY_ROOT_ID);
  if (legacyOverlay && legacyOverlay.getRootNode() === document) {
    legacyOverlay.remove();
  }
  const legacyHost = document.getElementById(EMBED_WIDGET_ROOT_ID);
  if (legacyHost && !legacyHost.shadowRoot) {
    legacyHost.remove();
  }
}

/** Host element styles — invisible to layout; pointer events flow through shadow children. */
function applyEmbedHostElementStyles(host) {
  Object.assign(host.style, {
    all: "initial",
    position: "fixed",
    inset: "0",
    width: "0",
    height: "0",
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "2147482999",
    border: "0",
    margin: "0",
    padding: "0",
    background: "transparent",
  });
}

/** Transparent positioning root — must not paint a full-screen background. */
function createEmbedSurfaceElement() {
  const surface = document.createElement("div");
  surface.setAttribute("data-launchpad-feedback-surface-root", "1");
  Object.assign(surface.style, {
    position: "fixed",
    inset: "0",
    width: "0",
    height: "0",
    overflow: "visible",
    pointerEvents: "none",
    border: "0",
    margin: "0",
    padding: "0",
    background: "transparent",
  });
  return surface;
}

/** Block host-page inherited styles at the shadow boundary. */
function ensureHostInheritanceReset(shadowRoot) {
  const marker = "data-launchpad-embed-host-reset";
  if (shadowRoot.querySelector(`style[${marker}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(marker, "1");
  style.textContent = `:host {
    all: initial;
    display: block;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: oklch(0.145 0 0);
  }`;
  shadowRoot.prepend(style);
}

/** Inject widget CSS into the shadow root (never on the host document). */
function ensureShadowStylesheet(shadowRoot, stylesheetHref) {
  ensureHostInheritanceReset(shadowRoot);

  const existing = shadowRoot.querySelector("link[data-launchpad-embed-styles]");
  if (existing) {
    if (existing.sheet) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load feedback widget styles.")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesheetHref;
    link.setAttribute("data-launchpad-embed-styles", "1");
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener(
      "error",
      () => reject(new Error("Could not load feedback widget styles.")),
      { once: true },
    );
    shadowRoot.insertBefore(link, shadowRoot.firstChild);
  });
}

/** Rehydrate shadow state from an already-mounted host (HMR / double-mount guard). */
function readShadowStateFromDom(host) {
  const shadowRoot = host.shadowRoot;
  if (!shadowRoot) return null;
  const surface = shadowRoot.querySelector("[data-launchpad-feedback-surface-root]");
  const mountEl = shadowRoot.querySelector("[data-launchpad-feedback-mount]");
  const overlayRoot = shadowRoot.getElementById(EMBED_OVERLAY_ROOT_ID);
  if (!surface || !mountEl || !overlayRoot) return null;
  return { host, shadowRoot, surface, mountEl, overlayRoot };
}

/**
 * Create (or return) the shadow-isolated embed host.
 * Widget CSS and DOM live inside shadowRoot so host-page styles cannot leak in.
 */
export function getOrCreateEmbedShadowHost({ stylesheetHref } = {}) {
  if (embedShadowState) return embedShadowState;

  removeLegacyEmbedDom();

  let host = document.getElementById(EMBED_WIDGET_ROOT_ID);
  if (host?.shadowRoot) {
    const existing = readShadowStateFromDom(host);
    if (existing) {
      embedShadowState = { ...existing, ready: Promise.resolve() };
      return embedShadowState;
    }
    host.remove();
    host = null;
  }

  if (!host) {
    host = document.createElement("div");
    host.id = EMBED_WIDGET_ROOT_ID;
    host.setAttribute("data-launchpad-feedback", "1");
    document.body.appendChild(host);
  }

  applyEmbedHostElementStyles(host);

  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const resolvedStylesheetHref = stylesheetHref ?? resolveEmbedStylesheetHref();

  ensureHostInheritanceReset(shadowRoot);
  const stylesheetReady = ensureShadowStylesheet(shadowRoot, resolvedStylesheetHref);

  const surface = createEmbedSurfaceElement();
  shadowRoot.appendChild(surface);

  const mountEl = document.createElement("div");
  mountEl.setAttribute("data-launchpad-feedback-mount", "1");
  mountEl.className = EMBED_SURFACE_CLASS;
  mountEl.style.pointerEvents = "none";
  mountEl.style.background = "transparent";
  surface.appendChild(mountEl);

  const overlayRoot = document.createElement("div");
  overlayRoot.id = EMBED_OVERLAY_ROOT_ID;
  overlayRoot.className = EMBED_SURFACE_CLASS;
  overlayRoot.setAttribute("data-launchpad-feedback-overlay-root", "1");
  Object.assign(overlayRoot.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "1",
    background: "transparent",
  });
  surface.appendChild(overlayRoot);

  embedShadowState = {
    host,
    shadowRoot,
    surface,
    mountEl,
    overlayRoot,
    ready: stylesheetReady,
  };

  return embedShadowState;
}

/** Await shadow stylesheet load before first paint when possible. */
export async function ensureEmbedShadowHostReady(options) {
  const state = getOrCreateEmbedShadowHost(options);
  await state.ready;
  return state;
}

/** Test-only reset for unit tests. */
export function resetEmbedShadowHostForTests() {
  embedShadowState = null;
}
