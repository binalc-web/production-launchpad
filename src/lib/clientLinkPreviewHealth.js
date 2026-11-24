import { auditPreviewPipeline } from "./previewPipelineAudit.js";
import { previewRoutePathname } from "./clientLinkEmbeddedPreviewSrc.js";
import {
  callPreviewBridge,
  getPreviewBridgeState,
  getPreviewConsoleLines,
  isPreviewBridgeFrame,
  isPreviewBridgeSrc,
} from "./previewBridge.js";

/** How long a white screen must last before it is a blank-app failure. */
export const PREVIEW_BLANK_SUSTAIN_MS = 8000;

/** Subdomain previews are token-gated by a host cookie, so cross-origin probes must send it. */
function probeCredentials(url) {
  return isPreviewBridgeSrc(url) ? "include" : "same-origin";
}

/**
 * Subdomain (cross-origin) preview: the bridge-pushed state, or null before the first push.
 * `undefined` for same-origin iframes (read the DOM directly).
 */
function bridgeState(iframe) {
  return isPreviewBridgeFrame(iframe) ? getPreviewBridgeState(iframe) : undefined;
}

function bridgeShowsError(s) {
  return Boolean(
    s && (s.errorOverlay || (s.overlayText && looksLikeDevCompileErrorText(s.overlayText))),
  );
}

/**
 * @param {unknown} lines
 * @returns {string[]}
 */
export function normalizePreviewConsoleLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .map((line) =>
      String(line || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400),
    )
    .filter(Boolean)
    .slice(-8);
}

const HARD_CRASH_PREFIX = /^(?:error|rejection|warn):/i;
const CONSOLE_CRASH_RE =
  /uncaught|unhandled|the above error occurred|not able to match the url|basename|failed to (?:load|fetch) dynamically imported|failed to load module script|failed to resolve import|chunkloaderror|loading chunk \d+|hydration failed|minified react error|cannot read propert|is not a function|is not defined/i;

/** @param {string} line */
export function consoleLineIsHardCrash(line) {
  const text = String(line || "");
  if (HARD_CRASH_PREFIX.test(text)) return true;
  return /^console:/i.test(text) && CONSOLE_CRASH_RE.test(text);
}

/**
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {unknown} [extra]
 * @returns {string[]}
 */
export function previewConsoleLinesFromIframe(iframe, extra) {
  if (Array.isArray(extra)) return normalizePreviewConsoleLines(extra);
  return normalizePreviewConsoleLines(getPreviewConsoleLines(iframe));
}

/**
 * Rendered body text. `innerText` is "" on a white page; falling back to `textContent`
 * there would count inline `<script>` payloads (e.g. Next `self.__next_f`) as content.
 * @param {HTMLElement | null | undefined} body
 */
function bodyRenderedText(body) {
  if (!body) return "";
  const text = typeof body.innerText === "string" ? body.innerText : body.textContent;
  return String(text || "").trim();
}

const VISIBLE_MEDIA_SELECTOR = "img, svg, canvas, video, picture, iframe";

/** True when the body paints images / SVG / canvas with a real size (no text needed). */
function bodyHasVisibleMedia(doc) {
  try {
    const nodes = doc?.body?.querySelectorAll?.(VISIBLE_MEDIA_SELECTOR) || [];
    const max = Math.min(nodes.length, 50);
    for (let i = 0; i < max; i += 1) {
      const r = nodes[i].getBoundingClientRect?.();
      if (r && r.width > 8 && r.height > 8) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Trimmed visible text length. Bridge `visibleTextLength` wins over `bodyTextLength`.
 * @param {HTMLIFrameElement | null | undefined} iframe
 */
export function iframeVisibleTextLength(iframe) {
  const bs = bridgeState(iframe);
  if (bs !== undefined) {
    if (!bs) return 0;
    if (typeof bs.visibleTextLength === "number") return bs.visibleTextLength;
    return Number(bs.bodyTextLength) || 0;
  }
  try {
    return bodyRenderedText(iframe?.contentDocument?.body).length;
  } catch {
    return 0;
  }
}

/**
 * True when the app shell is mounted but nothing visible was rendered.
 * A missing root is not blank until the document finished loading (may still be parsing);
 * apps that mount outside `#root` / `#__next` / `#app` are checked on the body.
 * @param {HTMLIFrameElement | null | undefined} iframe
 */
export function isIframePreviewVisuallyBlank(iframe) {
  if (!iframe) return false;
  const bs = bridgeState(iframe);
  if (bs !== undefined) {
    if (!bs?.hasBody) return false;
    if (!bs.hasRoot && bs.readyState !== "complete") return false;
    if (bridgeShowsError(bs)) return false;
    if (bs.hasMedia) return false;
    if (looksLikeAppAuthGateText(bs.bodyTextSample || "")) return false;
    return iframeVisibleTextLength(iframe) === 0;
  }
  try {
    const doc = iframe.contentDocument;
    if (!doc?.body) return false;
    const root =
      doc.getElementById("root") || doc.getElementById("__next") || doc.getElementById("app");
    if (!root && (doc.readyState !== "complete" || doc.URL === "about:blank")) return false;
    const text = bodyRenderedText(doc.body);
    if (looksLikeAppAuthGateText(text) || looksLikeDevCompileErrorText(text)) return false;
    if (text.length > 0) return false;
    return !bodyHasVisibleMedia(doc);
  } catch {
    return false;
  }
}

/** Vite `#root` with no children. Next's empty `#__next` is a separate, delayed check. */
function viteEmptyRoot(iframe) {
  try {
    const root = iframe?.contentDocument?.getElementById("root");
    return Boolean(root && root.childElementCount === 0 && !String(root.textContent || "").trim());
  } catch {
    return false;
  }
}

/** @param {string} html */
export function looksLikeDirectoryListingHtml(html) {
  const sample = String(html || "").slice(0, 16_000);
  if (/index of \//i.test(sample)) return true;
  if (/directory listing/i.test(sample)) return true;
  if (/<title>\s*files within/i.test(sample)) return true;
  if (sample.length < 80) return false;
  const linkHits = (sample.match(/<a\s+[^>]*href="/gi) || []).length;
  if (
    linkHits >= 6 &&
    /(?:href|src)="[^"]*\/node_modules\//i.test(sample) &&
    /(?:href|src)="[^"]*\/package\.json/i.test(sample)
  ) {
    return true;
  }
  return false;
}

/**
 * True when text looks like real Next/Vite compile/runtime failure copy
 * (not chrome CSS from a healthy Next.js `<nextjs-portal>` badge).
 * @param {string} text
 */
export function looksLikeDevCompileErrorText(text) {
  const sample = String(text || "");
  if (!sample) return false;
  // Ignore portal stylesheet noise (Bootstrap Reboot / :host resets).
  if (
    /Bootstrap Reboot|:host\s*\{|tap-highlight-color/i.test(sample) &&
    !/\bBuild Error\b|Failed to compile|Parsing ecmascript/i.test(sample)
  ) {
    return false;
  }
  if (
    /\bBuild Error\b/i.test(sample) &&
    /(?:Parsing ecmascript|Failed to compile|Module not found|Expected )/i.test(sample)
  ) {
    return true;
  }
  if (/Parsing ecmascript source code failed/i.test(sample)) return true;
  if (/Failed to compile/i.test(sample) && /(?:\.\/|Module not found|Expected )/i.test(sample)) {
    return true;
  }
  if (/Failed to resolve import/i.test(sample)) return true;
  if (/Module not found/i.test(sample) && /(?:Can't resolve|Cannot find module)/i.test(sample)) {
    return true;
  }
  if (/TurbopackError|__NEXT_ERROR_CODE/i.test(sample)) return true;
  if (/Application error: a (?:client|server)-side exception/i.test(sample)) return true;
  return false;
}

/**
 * Customer-app login / email-gate copy is a healthy page, not a LaunchPad compile error.
 * @param {string} htmlOrText
 */
export function looksLikeAppAuthGateText(htmlOrText) {
  const sample = String(htmlOrText || "");
  if (!sample) return false;
  if (looksLikeDevCompileErrorText(sample)) return false;
  if (/please enter your e-?mail to continue/i.test(sample)) return true;
  if (/enter your e-?mail/i.test(sample) && /(?:sign[\s-]?in|log[\s-]?in|continue)/i.test(sample)) {
    return true;
  }
  return false;
}

/**
 * Next.js / Vite compile-overlay HTML (often HTTP 500 while the port is still listening).
 * Framework-agnostic: never treat presence of `<nextjs-portal>` alone as failure —
 * healthy `next dev` always mounts that element (dev badge / overlay host).
 * @param {string} htmlOrText
 */
export function looksLikeDevCompileErrorHtml(htmlOrText) {
  const sample = String(htmlOrText || "");
  if (!sample) return false;
  // Vite mounts this custom element only for compile errors.
  if (/<vite-error-overlay\b/i.test(sample)) return true;
  if (looksLikeDevCompileErrorText(sample)) return true;
  return false;
}

/**
 * Collect visible text from Next.js / Vite error overlays (including shadow roots).
 * Skips empty / CSS-only nextjs-portal hosts (healthy pages).
 * @param {Document} doc
 */
function collectDevOverlayPlainText(doc) {
  const parts = [];
  try {
    const vite = doc.querySelector("vite-error-overlay");
    if (vite) {
      const shadowText = String(vite.shadowRoot?.textContent || "").trim();
      const lightText = String(vite.textContent || "").trim();
      if (shadowText) parts.push(shadowText);
      else if (lightText) parts.push(lightText);
    }
    const portal = doc.querySelector("nextjs-portal");
    if (portal) {
      const shadowText = String(portal.shadowRoot?.textContent || "").trim();
      const lightText = String(portal.textContent || "").trim();
      const candidate = shadowText || lightText;
      if (candidate && looksLikeDevCompileErrorText(candidate)) {
        parts.push(candidate);
      }
    }
  } catch {
    /* ignore */
  }
  const bodyText = String(doc.body?.innerText || doc.body?.textContent || "").trim();
  if (bodyText) parts.push(bodyText);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * True when the iframe document has a real Vite/Next compile overlay (not healthy Next badge).
 * @param {Document} doc
 */
function iframeHasDevCompileOverlay(doc) {
  try {
    if (doc.querySelector("vite-error-overlay")) return true;
    const portal = doc.querySelector("nextjs-portal");
    if (!portal) return false;
    const shadowText = String(portal.shadowRoot?.textContent || "").trim();
    const lightText = String(portal.textContent || "").trim();
    return looksLikeDevCompileErrorText(shadowText || lightText);
  } catch {
    return false;
  }
}

/**
 * True when HTTP status / body clearly means the embed proxy could not reach the port.
 * Does not treat compile overlays or app errors as "server down".
 * @param {{ httpStatus?: number, bodyText?: string }} opts
 */
export function isPortUnreachableSignal(opts = {}) {
  const httpStatus = Number(opts.httpStatus) || 0;
  const text = String(opts.bodyText || "");
  const lower = text.toLowerCase();
  if (httpStatus === 502) return true;
  if (/cannot reach preview|preview is not running on port|econnrefused/i.test(lower)) {
    return true;
  }
  if (text.length > 0 && text.length < 400 && /bad gateway|\b502\b/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * True when the iframe document is the embed-proxy "Cannot reach preview" / 502 page.
 * @param {HTMLIFrameElement | null} iframe
 */
export function isIframePortUnreachablePage(iframe) {
  if (!iframe) return false;
  if (bridgeState(iframe) !== undefined) return false;
  try {
    const doc = iframe.contentDocument;
    if (!doc?.body) return false;
    const html = doc.documentElement?.outerHTML || doc.body.innerHTML || "";
    if (looksLikeDevCompileErrorHtml(html)) return false;
    if (iframeHasDevCompileOverlay(doc)) return false;
    const text = collectDevOverlayPlainText(doc) || iframeDocPlainText(doc);
    return isPortUnreachableSignal({ bodyText: `${text}\n${html.slice(0, 2000)}` });
  } catch {
    return false;
  }
}

/**
 * Detect backend iframe-proxy "preview not ready" plain-text responses
 * and Next/Vite compile error overlays served as the document.
 * @param {HTMLIFrameElement | null} iframe
 */
export function isIframePreviewErrorPage(iframe) {
  if (!iframe) return false;
  const bs = bridgeState(iframe);
  if (bs !== undefined) return bridgeShowsError(bs);
  try {
    const doc = iframe.contentDocument;
    if (!doc?.body) return false;
    const html = doc.documentElement?.outerHTML || doc.body.innerHTML || "";
    if (looksLikeDirectoryListingHtml(html)) return true;
    if (looksLikeDevCompileErrorHtml(html)) return true;
    if (iframeHasDevCompileOverlay(doc)) return true;
    const text = collectDevOverlayPlainText(doc);
    if (isPortUnreachableSignal({ bodyText: text })) return true;
    if (looksLikeDevCompileErrorText(text)) return true;
  } catch {
    return false;
  }
  return false;
}

const PREVIEW_FAILURE_KINDS = [
  "port_unreachable",
  "boot_failed",
  "compile_error",
  "blank_app",
  "timeout",
];

/** Cap user-facing / agent-facing diagnosis text. */
const IFRAME_FAILURE_DETAIL_MAX = 600;
const DIAGNOSIS_DETAIL_UI_MAX = 800;

/**
 * Plain text from a same-origin iframe document body (scripts/styles stripped via innerText).
 * @param {Document | null | undefined} doc
 */
function iframeDocPlainText(doc) {
  if (!doc?.body) return "";
  return String(doc.body.innerText || doc.body.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract a human-readable failure message from the preview iframe DOM.
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @returns {string}
 */
export function extractIframePreviewFailureMessage(iframe) {
  if (!iframe) return "";
  const consoleDetail = previewConsoleLinesFromIframe(iframe)
    .filter(consoleLineIsHardCrash)
    .join("\n");
  const bs = bridgeState(iframe);
  if (bs !== undefined) {
    const overlay = bs?.overlayText
      ? formatDevCompileErrorSummary(bs.overlayText).slice(0, IFRAME_FAILURE_DETAIL_MAX)
      : "";
    return [overlay, consoleDetail].filter(Boolean).join("\n").slice(0, IFRAME_FAILURE_DETAIL_MAX);
  }
  try {
    const doc = iframe.contentDocument;
    if (!doc?.body) return "";

    const overlayText = collectDevOverlayPlainText(doc);
    if (
      looksLikeDevCompileErrorHtml(overlayText) ||
      /Failed to resolve import|Failed to load module/i.test(overlayText)
    ) {
      return formatDevCompileErrorSummary(overlayText).slice(0, IFRAME_FAILURE_DETAIL_MAX);
    }

    const html = doc.documentElement?.outerHTML || doc.body.innerHTML || "";
    if (looksLikeDevCompileErrorHtml(html)) {
      const fromCompile = extractEmbedPreviewErrorFromBody(html, 500);
      if (fromCompile) return fromCompile.slice(0, IFRAME_FAILURE_DETAIL_MAX);
    }

    const fromBody = extractEmbedPreviewErrorFromBody(html);
    if (fromBody) return fromBody.slice(0, IFRAME_FAILURE_DETAIL_MAX);

    const text = overlayText || iframeDocPlainText(doc);
    if (/Failed to resolve import/i.test(text)) {
      const m = text.match(/Failed to resolve import[^.!\n]{0,200}/i);
      return (m ? m[0] : text).slice(0, IFRAME_FAILURE_DETAIL_MAX);
    }
    if (/Failed to load module script/i.test(text)) {
      return text.slice(0, IFRAME_FAILURE_DETAIL_MAX);
    }
    if (/Expected a JavaScript-or-Wasm module script/i.test(text)) {
      return text.slice(0, IFRAME_FAILURE_DETAIL_MAX);
    }
    if (/Internal server error/i.test(text) && /vite|next/i.test(text)) {
      return text.slice(0, IFRAME_FAILURE_DETAIL_MAX);
    }
    if (/Build Error|Parsing ecmascript|application error|uncaught|hydration/i.test(text)) {
      return formatDevCompileErrorSummary(text).slice(0, IFRAME_FAILURE_DETAIL_MAX);
    }

    const root = doc.getElementById("root") || doc.getElementById("__next");
    if (root && root.childElementCount === 0 && !String(root.textContent || "").trim()) {
      if (iframeHasDevCompileOverlay(doc)) {
        return (
          formatDevCompileErrorSummary(overlayText) ||
          "Preview reported a compile error (see Details)."
        ).slice(0, IFRAME_FAILURE_DETAIL_MAX);
      }
      if (text.length > 0 && text.length < 400) return text;
      return "Preview shell loaded but the app root is empty.";
    }

    if (text.length > 0 && text.length < 400 && /error|failed|cannot|not running/i.test(text)) {
      return text.slice(0, IFRAME_FAILURE_DETAIL_MAX);
    }
  } catch {
    return "";
  }
  return "";
}

/**
 * Prefer the human-readable Next/Vite build error headline + location.
 * @param {string} text
 */
export function formatDevCompileErrorSummary(text) {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  const build = raw.match(
    /Build Error\s+(.{0,220}?)(?:\s+Import traces|\s+Call Stack|\s+Next\.js|\s*$)/i,
  );
  if (build) {
    const head = `Build Error — ${build[1].trim()}`;
    const loc = raw.match(/\.[\/\\][\w./\\-]+\.(?:ts|tsx|js|jsx|mjs|cjs):\d+:\d+/);
    return loc ? `${head} (${loc[0]})` : head;
  }
  const parse = raw.match(/Parsing ecmascript source code failed[^.]{0,120}/i);
  if (parse) {
    const loc = raw.match(/\.[\/\\][\w./\\-]+\.(?:ts|tsx|js|jsx|mjs|cjs):\d+:\d+/);
    return loc ? `${parse[0].trim()} (${loc[0]})` : parse[0].trim();
  }
  return raw.slice(0, IFRAME_FAILURE_DETAIL_MAX);
}

/**
 * Truncate diagnosis detail for UI / agent prompts (belt-and-suspenders after server sanitize).
 * @param {unknown} text
 * @param {number} [maxLen]
 */
export function truncatePreviewDiagnosisDetail(text, maxLen = DIAGNOSIS_DETAIL_UI_MAX) {
  const s = String(text ?? "").trim();
  if (!s) return "";
  const cap = Number(maxLen) > 0 ? Number(maxLen) : DIAGNOSIS_DETAIL_UI_MAX;
  return s.length > cap ? `${s.slice(0, cap - 1)}…` : s;
}

/**
 * Classify a preview failure for Client Link diagnosis UI.
 * @param {{
 *   httpStatus?: number,
 *   bodyText?: string,
 *   iframe?: HTMLIFrameElement | null,
 *   ensureStatus?: string | null,
 *   ensureError?: string | null,
 *   errorDetail?: string | null,
 *   timedOut?: boolean,
 *   source?: 'ensure'|'probe'|'iframe',
 * }} opts
 * @returns {{ kind: string, summary: string, detail: string, source: string } | null}
 */
export function classifyPreviewFailure(opts = {}) {
  const source =
    opts.source || (opts.ensureStatus === "failed" ? "ensure" : opts.iframe ? "iframe" : "probe");
  const ensureStatus = String(opts.ensureStatus || "").toLowerCase();
  const ensureError = String(opts.ensureError || "").trim();
  const errorDetail = truncatePreviewDiagnosisDetail(opts.errorDetail);
  const bodyText = String(opts.bodyText || "");
  const httpStatus = Number(opts.httpStatus) || 0;
  const consoleLines = previewConsoleLinesFromIframe(opts.iframe, opts.consoleLines);
  const hardCrashes = consoleLines.filter(consoleLineIsHardCrash);
  const iframeMsg = opts.iframe ? extractIframePreviewFailureMessage(opts.iframe) : "";
  const bodyExtract = bodyText
    ? extractEmbedPreviewErrorFromBody(bodyText, httpStatus || undefined)
    : "";

  if (opts.timedOut) {
    return {
      kind: "timeout",
      summary: "Preview timed out while loading.",
      detail: truncatePreviewDiagnosisDetail(
        iframeMsg || bodyExtract || ensureError || errorDetail,
      ),
      source,
    };
  }

  if (ensureStatus === "installing" || ensureStatus === "starting") {
    return null;
  }

  const combined = `${iframeMsg}\n${bodyExtract}\n${bodyText}\n${ensureError}`;
  const combinedLower = combined.toLowerCase();
  if (looksLikeAppAuthGateText(combined) && !looksLikeDevCompileErrorText(combined)) {
    return null;
  }
  const portUnreachable =
    isPortUnreachableSignal({ httpStatus, bodyText: combined }) ||
    (opts.iframe && isIframePortUnreachablePage(opts.iframe));

  if (portUnreachable) {
    return {
      kind: "port_unreachable",
      summary: "The preview server is not running. Start it to load this project.",
      // Keep detail empty — UI shows a Start Server action instead of raw 502 HTML.
      detail: "",
      source,
    };
  }

  const compileSignals =
    looksLikeDevCompileErrorHtml(combined) ||
    looksLikeDevCompileErrorText(combined) ||
    httpStatus >= 500 ||
    /failed to resolve import|failed to load module script|vite-error-overlay|expected a javascript-or-wasm|build error|parsing ecmascript/i.test(
      combinedLower,
    ) ||
    (opts.iframe &&
      (() => {
        try {
          const doc = opts.iframe.contentDocument;
          return Boolean(doc && iframeHasDevCompileOverlay(doc));
        } catch {
          return false;
        }
      })());

  if (compileSignals) {
    // Keep summary generic — the iframe shows the exact port document for end users.
    // Raw response text is kept in detail for "Send error to agent" only.
    const raw =
      iframeMsg ||
      bodyExtract ||
      (bodyText ? extractEmbedPreviewErrorFromBody(bodyText, httpStatus || undefined) : "") ||
      errorDetail ||
      ensureError;
    return {
      kind: "compile_error",
      summary:
        httpStatus >= 400
          ? `Preview returned HTTP ${httpStatus}. The exact error page is shown in the preview frame.`
          : "The preview app reported an error. The exact page is shown in the preview frame.",
      detail: truncatePreviewDiagnosisDetail(raw),
      source,
    };
  }

  const contentful = Boolean(opts.iframe) && iframeVisibleTextLength(opts.iframe) > 0;
  if (hardCrashes.length && !contentful) {
    return {
      kind: "blank_app",
      summary: "Preview loaded but the app did not render.",
      detail: truncatePreviewDiagnosisDetail(hardCrashes.join("\n")),
      consoleLines,
      blocking: true,
      source,
    };
  }
  if (consoleLines.length && contentful) {
    return {
      kind: "runtime_error",
      summary: "The preview reported a console error.",
      detail: truncatePreviewDiagnosisDetail(consoleLines.join("\n")),
      consoleLines,
      blocking: false,
      source,
    };
  }

  if (ensureStatus === "failed" || ensureError) {
    return {
      kind: "boot_failed",
      summary: truncatePreviewDiagnosisDetail(ensureError || "Preview failed to start.", 400),
      detail: errorDetail || truncatePreviewDiagnosisDetail(iframeMsg || bodyExtract),
      source: source === "probe" ? "ensure" : source,
    };
  }

  if (opts.iframe && isIframePreviewBlankOrBroken(opts.iframe)) {
    const sustained = opts.blankSustained === true || viteEmptyRoot(opts.iframe);
    if (sustained) {
      return {
        kind: "blank_app",
        summary: "Preview loaded but the app did not render.",
        detail: truncatePreviewDiagnosisDetail(
          consoleLines.join("\n") || iframeMsg || "App rendered no visible content.",
        ),
        consoleLines,
        blocking: true,
        source,
      };
    }
    if (isIframePortUnreachablePage(opts.iframe)) {
      return {
        kind: "port_unreachable",
        summary: "The preview server is not running. Start it to load this project.",
        detail: "",
        source,
      };
    }
  }

  const waitingOutBlank =
    Boolean(opts.iframe) &&
    isIframePreviewVisuallyBlank(opts.iframe) &&
    opts.blankSustained !== true &&
    !viteEmptyRoot(opts.iframe) &&
    hardCrashes.length === 0;
  if ((iframeMsg || bodyExtract || errorDetail) && !waitingOutBlank) {
    return {
      kind: "blank_app",
      summary: truncatePreviewDiagnosisDetail(
        iframeMsg || bodyExtract || "Preview is not displaying correctly.",
        400,
      ),
      detail: truncatePreviewDiagnosisDetail(errorDetail || iframeMsg || bodyExtract),
      consoleLines,
      source,
    };
  }

  return null;
}

/**
 * Decide whether a live preview watch should surface, clear, or keep waiting.
 * Hard crashes apply immediately. A white screen applies only after {@link PREVIEW_BLANK_SUSTAIN_MS}.
 * @param {{
 *   iframe?: HTMLIFrameElement | null,
 *   consoleLines?: string[],
 *   blankSince?: number,
 *   now?: number,
 *   previous?: { kind?: string, source?: string, blocking?: boolean } | null,
 *   previewWasReady?: boolean,
 * }} opts
 * @returns {{ type: "apply", diagnosis: NonNullable<ReturnType<typeof classifyPreviewFailure>>, blankSince?: number }
 *   | { type: "clear" }
 *   | { type: "wait", waitMs: number, blankSince: number }
 *   | { type: "idle" }}
 */
export function reconcilePreviewConsoleWatch(opts = {}) {
  const now = Number(opts.now) || Date.now();
  const lines = previewConsoleLinesFromIframe(opts.iframe, opts.consoleLines);
  const immediate = classifyPreviewFailure({
    iframe: opts.iframe,
    source: "iframe",
    consoleLines: lines,
    blankSustained: false,
  });
  const crashNow = Boolean(
    immediate && lines.some(consoleLineIsHardCrash) && !iframeVisibleTextLength(opts.iframe),
  );
  if (immediate && (immediate.blocking === false || immediate.kind !== "blank_app" || crashNow)) {
    return { type: "apply", diagnosis: immediate };
  }

  if (opts.iframe && isIframePreviewVisuallyBlank(opts.iframe)) {
    // Initial load stays with the content-ready poll. This timer is for a page that
    // already rendered and then went white.
    if (!opts.previewWasReady) return { type: "idle" };
    const since = Number(opts.blankSince) || now;
    const elapsed = now - since;
    if (elapsed >= PREVIEW_BLANK_SUSTAIN_MS) {
      const sustained = classifyPreviewFailure({
        iframe: opts.iframe,
        source: "iframe",
        consoleLines: lines,
        blankSustained: true,
      });
      if (sustained) return { type: "apply", diagnosis: sustained, blankSince: since };
    }
    return {
      type: "wait",
      waitMs: Math.max(250, PREVIEW_BLANK_SUSTAIN_MS - elapsed),
      blankSince: since,
    };
  }

  const previous = opts.previous;
  if (
    previous &&
    previous.source === "iframe" &&
    (previous.kind === "blank_app" || previous.kind === "runtime_error")
  ) {
    return { type: "clear" };
  }
  return { type: "idle" };
}

/** @type {readonly string[]} */
export const PREVIEW_FAILURE_KIND_LIST = PREVIEW_FAILURE_KINDS;

/**
 * True when the iframe shows proxy errors, Vite error overlay, or an empty app root.
 * @param {HTMLIFrameElement | null} iframe
 */
export function isIframePreviewBlankOrBroken(iframe) {
  if (!iframe) return true;
  const bs = bridgeState(iframe);
  if (bs !== undefined) {
    return (
      !bs?.hasBody ||
      bridgeShowsError(bs) ||
      Boolean(bs.hasRoot && bs.rootEmpty) ||
      isIframePreviewVisuallyBlank(iframe)
    );
  }
  if (isIframePreviewErrorPage(iframe)) return true;
  try {
    const doc = iframe.contentDocument;
    if (!doc?.body) return true;
    const html = doc.documentElement?.outerHTML || "";
    if (looksLikeDevCompileErrorHtml(html)) return true;
    if (iframeHasDevCompileOverlay(doc)) return true;
    const text = collectDevOverlayPlainText(doc).slice(0, 8000);
    if (/Failed to resolve import/i.test(text)) return true;
    if (/Failed to load module script/i.test(text)) return true;
    if (/Expected a JavaScript-or-Wasm module script/i.test(text)) return true;
    if (/Internal server error/i.test(text) && /vite|next/i.test(text)) return true;
    if (looksLikeDevCompileErrorText(text)) return true;
    const root = doc.getElementById("root") || doc.getElementById("__next");
    if (root && root.childElementCount === 0 && !String(root.textContent || "").trim()) {
      // Empty shell is only "broken" when there is also an error overlay — healthy Next
      // may briefly have an empty #__next while streaming; don't flag portal alone.
      if (iframeHasDevCompileOverlay(doc)) return true;
      // Vite empty #root before hydrate still counts as not-ready (caller uses ContentReady).
      if (doc.getElementById("root")) return true;
      // Next with rendered siblings / body text is fine even if #__next is empty briefly.
      const bodyText = String(doc.body?.innerText || "").trim();
      if (!bodyText) return true;
    }
    if (isIframePreviewVisuallyBlank(iframe)) return true;
  } catch {
    return false;
  }
  return false;
}

/** @param {HTMLIFrameElement | null} iframe */
export function isIframePreviewStaticAssetShell(iframe) {
  if (!iframe) return false;
  if (bridgeState(iframe) !== undefined) return false;
  try {
    const doc = iframe.contentDocument;
    if (!doc?.body) return false;
    const html = doc.documentElement?.outerHTML || "";
    return previewHtmlLooksLikeStaticSpa(html);
  } catch {
    return false;
  }
}

/**
 * True when iframe shows a real app shell (not proxy error) even if #root is still hydrating.
 * @param {HTMLIFrameElement | null} iframe
 */
export function isIframePreviewEmbedShellDisplayed(iframe) {
  if (!iframe) return false;
  if (isIframePreviewVisuallyBlank(iframe)) return false;
  const bs = bridgeState(iframe);
  if (bs !== undefined) return Boolean(bs?.hasBody) && !bridgeShowsError(bs);
  try {
    if (isIframePreviewErrorPage(iframe)) return false;
    const doc = iframe.contentDocument;
    if (!doc?.body) return false;
    const html = doc.documentElement?.outerHTML || "";
    return previewHtmlLooksLikeEmbedAppHtml(html);
  } catch {
    return false;
  }
}

/**
 * Whether the full-screen Client Link loader should block the preview stage.
 * Vite: once the embed gate is open and the iframe is reachable, clicks pass through
 * (compiling chip only). Next: a blank/compiling document stays covered — peeling
 * leaves a white iframe for 10–15s while webpack compiles the new route.
 * @param {{
 *   previewIframeReady: boolean,
 *   previewBootFailed: boolean,
 *   embedReachable?: boolean,
 *   iframeAccessible?: boolean,
 *   devEmbedGateOpen?: boolean,
 *   hasFailureDiagnosis?: boolean,
 *   isNextPreview?: boolean,
 *   nextInAppCompiling?: boolean,
 *   iframe: HTMLIFrameElement | null,
 * }} opts
 */
export function isClientLinkPreviewLoaderBlocking(opts) {
  if (opts.previewBootFailed) return true;
  if (opts.hasFailureDiagnosis) return true;
  if (opts.nextInAppCompiling) return true;
  if (opts.previewIframeReady) return false;

  const isNext = opts.isNextPreview === true || iframeLooksLikeNextDev(opts.iframe);
  if (isNext && isIframePreviewBlankOrBroken(opts.iframe)) {
    return true;
  }

  if (isIframePreviewReadyEnough(opts.iframe)) return false;
  if (isIframePreviewContentReady(opts.iframe)) return false;
  // Gate open + shell reachable: allow interaction while modules finish compiling.
  if (
    opts.devEmbedGateOpen &&
    (opts.embedReachable === true || opts.iframeAccessible === true) &&
    !isIframePreviewErrorPage(opts.iframe)
  ) {
    return false;
  }
  return true;
}

/** Same-origin iframe whose document looks like Next.js (dev or compiled shell). */
export function iframeLooksLikeNextDev(iframe) {
  if (!iframe) return false;
  // Next previews stay on path mode (basePath /embedded/<port>).
  if (bridgeState(iframe) !== undefined) return false;
  try {
    const html = iframe.contentDocument?.documentElement?.outerHTML || "";
    if (!html) return false;
    return previewHtmlLooksLikeNextDev(html, { allowBoot: true });
  } catch {
    return false;
  }
}

/**
 * True when a Next in-iframe route change should cover the stage (document blank / not ready).
 * @param {{
 *   isNextPreview?: boolean,
 *   previousPath?: string,
 *   nextPath?: string,
 *   iframe?: HTMLIFrameElement | null,
 * }} opts
 */
export function shouldMarkNextInAppCompile(opts = {}) {
  if (!opts.isNextPreview) return false;
  const prev = previewRoutePathname(opts.previousPath);
  const next = previewRoutePathname(opts.nextPath);
  if (!String(opts.previousPath || "").trim() || !String(opts.nextPath || "").trim()) {
    return false;
  }
  if (prev === next) return false;
  if (isIframePreviewContentReady(opts.iframe) && !isIframePreviewBlankOrBroken(opts.iframe)) {
    return false;
  }
  return true;
}

/** @param {HTMLIFrameElement | null} iframe */
export function isIframePreviewContentReady(iframe) {
  if (!iframe) return false;
  const bs = bridgeState(iframe);
  if (bs !== undefined) return Boolean(bs?.hasBody) && !isIframePreviewBlankOrBroken(iframe);
  try {
    if (!iframe.contentDocument?.body) return false;
  } catch {
    return false;
  }
  if (!isIframePreviewBlankOrBroken(iframe)) return true;
  if (!isIframePreviewStaticAssetShell(iframe)) return false;
  const root = iframe.contentDocument?.getElementById("root");
  if (!root) return false;
  if (root.childElementCount > 0 || String(root.textContent || "").trim()) {
    return true;
  }
  return false;
}

/** @param {string | null | undefined} src */
export function isDevIframePreviewSrc(src) {
  return (
    typeof src === "string" &&
    (/\/(?:embedded|iframe-preview)\/\d+/.test(src) || isPreviewBridgeSrc(src))
  );
}

/** Vite production / preview static build (no @vite/client). */
export function previewHtmlLooksLikeStaticSpa(html) {
  const sample = String(html || "");
  if (/preview is not running|cannot reach preview/i.test(sample)) return false;
  if (looksLikeDirectoryListingHtml(sample)) return false;
  if (/@vite\/client/i.test(sample)) return false;
  // Vite source entry (script src, inline import, or html-proxy) — not a production SPA.
  if (/\/src\/main\.(tsx|jsx|ts|js)/i.test(sample)) return false;
  if (/[?&]html-proxy\b/i.test(sample)) return false;
  // Require a real .js/.css extension — do not match `/assets/foo.json` via `.js` prefix.
  if (/\/assets\/[^"']+\.(?:js|css)(?![a-zA-Z])/i.test(sample)) return true;
  if (/\/static\/[^"']+\.js(?![a-zA-Z])/i.test(sample)) return true;
  if (/\/_next\/static\//i.test(sample)) return true;
  if (/__NEXT_DATA__/i.test(sample)) return true;
  if (/id=["'](?:root|__next|app)["']/i.test(sample) && /<script\b[^>]*\bsrc=/i.test(sample)) {
    if (/<script\b[^>]*\bsrc=["'][^"']*\/src\//i.test(sample)) return false;
    return true;
  }
  return false;
}

/** Any plausible SPA shell served through the embed proxy (dev or static). */
export function previewHtmlLooksLikeEmbedAppHtml(html) {
  const sample = String(html || "");
  if (looksLikeDevCompileErrorHtml(sample)) return false;
  if (looksLikeAppAuthGateText(sample)) return true;
  if (previewHtmlLooksLikeNextDev(html, { allowBoot: true })) return true;
  if (previewHtmlLooksLikeViteDev(html)) return true;
  if (previewHtmlLooksLikeStaticSpa(html)) return true;
  if (/preview is not running|cannot reach preview/i.test(sample)) return false;
  if (looksLikeDirectoryListingHtml(sample)) return false;
  if (!/<html[\s>]/i.test(sample) && sample.length < 40) return false;
  if (/id=["'](?:root|__next|app)["']/i.test(sample)) return true;
  if (/<script\b[^>]*\btype=["']module["']/i.test(sample)) return true;
  if (/<script\b[^>]*\bsrc=["'][^"']+\.js/i.test(sample)) return true;
  return false;
}

/** Vite index shell (app may still be compiling inside the iframe). */
export function previewHtmlLooksLikeViteDev(html) {
  const sample = String(html || "");
  if (/preview is not running|cannot reach preview/i.test(sample)) return false;
  if (looksLikeDirectoryListingHtml(sample)) return false;
  if (looksLikeDevCompileErrorHtml(sample)) return false;
  return /@vite\/client/i.test(sample);
}

/** @param {string} html @param {{ allowBoot?: boolean }} [opts] */
export function previewHtmlLooksLikeNextDev(html, opts = {}) {
  const sample = String(html || "");
  if (looksLikeDevCompileErrorHtml(sample)) return false;
  if (/__NEXT_DATA__/.test(sample) || /\/_next\//.test(sample) || /__next_f/.test(sample)) {
    return true;
  }
  if (!opts.allowBoot) return false;
  if (looksLikeDirectoryListingHtml(sample)) return false;
  if (/cannot reach preview|preview is not running/i.test(sample)) return false;
  if (/<html[\s>]/i.test(sample) && /id=["']__next["']/i.test(sample)) return true;
  if (/next dev|turbopack|__next/i.test(sample) && sample.length > 120) return true;
  return false;
}

/** @param {string} html @param {number} [httpStatus] */
export function extractEmbedPreviewErrorFromBody(html, httpStatus) {
  const sample = String(html || "").trim();
  if (!sample) {
    return httpStatus
      ? `HTTP ${httpStatus} — empty response from preview URL`
      : "Empty response from preview URL";
  }
  const plain = sample
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const text = plain.slice(0, 800) || sample.slice(0, 800);
  if (/^Preview is not running on port/i.test(plain)) {
    const m = plain.match(/Preview is not running on port \d+[^.]*/i);
    return m ? m[0] : text;
  }
  if (/cannot reach preview/i.test(plain)) return text.slice(0, 400);
  if (looksLikeDirectoryListingHtml(sample)) {
    return "Directory listing instead of app (dev server may not be running)";
  }
  if (looksLikeAppAuthGateText(sample) || looksLikeAppAuthGateText(plain)) {
    return "";
  }
  if (looksLikeDevCompileErrorHtml(sample) || looksLikeDevCompileErrorHtml(plain)) {
    const summary = formatDevCompileErrorSummary(plain || text);
    if (summary) return summary;
    if (httpStatus && httpStatus >= 400) return `HTTP ${httpStatus}: ${text.slice(0, 400)}`;
    return text.slice(0, 400);
  }
  if (httpStatus && httpStatus >= 400) {
    const summary = formatDevCompileErrorSummary(plain || text);
    return summary || `HTTP ${httpStatus}: ${text.slice(0, 400)}`;
  }
  if (!previewHtmlLooksLikeEmbedAppHtml(sample)) {
    if (/@vite\/client/i.test(sample) || /id=["']root["']/i.test(sample)) return "";
    return text || "Preview URL did not return a ready app";
  }
  return "";
}

/** @param {number} status @param {string} [framework] */
export function embedPreviewHttpStatusLooksReady(status, framework) {
  const code = Number(status);
  if (code >= 200 && code < 300) return true;
  if (String(framework || "").toLowerCase() === "next" && code >= 300 && code < 400) {
    return true;
  }
  return false;
}

/**
 * GET probe with structured result (for refresh / error UI).
 * @param {string} src
 * @param {{ signal?: AbortSignal, requireAppHtml?: boolean, allowPartialShell?: boolean, timeoutMs?: number }} [opts]
 * @returns {Promise<{ ok: boolean, src: string, httpStatus?: number, error?: string, bodySnippet?: string, timedOut?: boolean }>}
 */
export async function inspectDevIframePreviewSrc(src, opts = {}) {
  if (!isDevIframePreviewSrc(src)) {
    return { ok: true, src };
  }
  const requireAppHtml = opts.requireAppHtml !== false;
  const allowPartialShell = opts.allowPartialShell !== false;
  const timeoutMs =
    Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : requireAppHtml ? 120_000 : 15_000;
  auditPreviewPipeline("health-probe", `inspect GET ${src} timeout=${timeoutMs}ms`, {
    src,
    pending: true,
  });
  const signal =
    opts?.signal ??
    (typeof AbortSignal !== "undefined" && AbortSignal.timeout
      ? AbortSignal.timeout(timeoutMs)
      : undefined);
  try {
    const res = await fetch(src, {
      method: "GET",
      credentials: probeCredentials(src),
      signal,
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml,*/*" },
    });
    const httpStatus = res.status;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (httpStatus >= 300 && httpStatus < 400) {
      if (embedPreviewHttpStatusLooksReady(httpStatus, "next") || /\/embedded\/\d+/.test(src)) {
        auditPreviewPipeline("health-probe", `inspect GET ${src} → redirect ready`, {
          src,
          ok: true,
        });
        return { ok: true, src, httpStatus };
      }
      const error = `HTTP ${httpStatus} redirect`;
      auditPreviewPipeline("health-probe", `inspect GET ${src} → ${error}`, { src, ok: false });
      return { ok: false, src, httpStatus, error };
    }
    const body = await res.text();
    // Capture a large slice on failures so Client Link can show the exact port response.
    const bodySnippet = body.slice(
      0,
      !res.ok || looksLikeDevCompileErrorHtml(body) ? 100_000 : 800,
    );

    if (!res.ok) {
      const error = extractEmbedPreviewErrorFromBody(body, httpStatus) || `HTTP ${httpStatus}`;
      auditPreviewPipeline("health-probe", `inspect GET ${src} → ${error}`, { src, ok: false });
      return { ok: false, src, httpStatus, error, bodySnippet, body };
    }
    if (!ct.includes("text/html") && !ct.includes("text/plain")) {
      if (!requireAppHtml) return { ok: true, src, httpStatus };
      return {
        ok: false,
        src,
        httpStatus,
        error: `Unexpected content-type: ${ct || "unknown"}`,
        bodySnippet,
      };
    }
    if (/preview is not running|cannot reach preview/i.test(body)) {
      const error = extractEmbedPreviewErrorFromBody(body, httpStatus);
      auditPreviewPipeline("health-probe", `inspect GET ${src} → ${error}`, { src, ok: false });
      return { ok: false, src, httpStatus, error, bodySnippet };
    }
    if (looksLikeDevCompileErrorHtml(body)) {
      const error =
        extractEmbedPreviewErrorFromBody(body, httpStatus || 500) ||
        "Preview reported a compile error";
      auditPreviewPipeline("health-probe", `inspect GET ${src} → ${error}`, { src, ok: false });
      return {
        ok: false,
        src,
        httpStatus: httpStatus || 500,
        error,
        bodySnippet,
        body,
      };
    }
    if (looksLikeDirectoryListingHtml(body)) {
      const error = extractEmbedPreviewErrorFromBody(body, httpStatus);
      return { ok: false, src, httpStatus, error, bodySnippet };
    }
    if (requireAppHtml && !previewHtmlLooksLikeEmbedAppHtml(body)) {
      if (allowPartialShell && (/@vite\/client/i.test(body) || /id=["']root["']/i.test(body))) {
        auditPreviewPipeline("health-probe", `inspect GET ${src} → partial shell`, {
          src,
          ok: true,
        });
        return { ok: true, src, httpStatus };
      }
      const error = extractEmbedPreviewErrorFromBody(body, httpStatus);
      auditPreviewPipeline("health-probe", `inspect GET ${src} → ${error}`, { src, ok: false });
      return { ok: false, src, httpStatus, error, bodySnippet };
    }
    auditPreviewPipeline("health-probe", `inspect GET ${src} → ready`, { src, ok: true });
    return { ok: true, src, httpStatus };
  } catch (err) {
    if (err?.name === "AbortError") {
      auditPreviewPipeline("health-probe", `inspect GET ${src} → timeout`, { src, ok: false });
      return { ok: false, src, error: "Preview URL timed out", timedOut: true };
    }
    const error = err?.message || String(err);
    auditPreviewPipeline("health-probe", `inspect GET ${src} → ${error}`, { src, ok: false });
    return { ok: false, src, error };
  }
}

/**
 * GET probe: dev server behind /embedded/<port>/ is reachable and serving app HTML.
 * @param {string} src
 * @param {{ signal?: AbortSignal, requireAppHtml?: boolean }} [opts]
 */
export async function probeDevIframePreviewSrc(src, opts = {}) {
  const result = await inspectDevIframePreviewSrc(src, opts);
  if (result.timedOut) {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  }
  return result.ok;
}

function previewPollDelayMs(attempt) {
  if (attempt <= 4) return 500;
  if (attempt <= 15) return 1500;
  return 2500;
}

/** True when iframe shows a usable preview (content or at least a Vite app shell). */
export function isIframePreviewReadyEnough(iframe) {
  return isIframePreviewContentReady(iframe) || isIframePreviewEmbedShellDisplayed(iframe);
}

/** @param {string} embedDocSrc */
export function resolveEmbedViteClientProbeUrl(embedDocSrc) {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(String(embedDocSrc || "/"), base);
    if (isPreviewBridgeSrc(u.href)) return `${u.origin}/@vite/client`;
    const prefix = u.pathname.match(/^(\/(?:embedded|iframe-preview)\/\d{1,5})/);
    if (!prefix) return null;
    return `${u.origin}${prefix[1]}/@vite/client`;
  } catch {
    return null;
  }
}

/**
 * Only Vite-dev shells need /@vite/client. Next/static/other apps 404 that path forever.
 * @param {string} html
 */
export function embedHtmlNeedsViteClientProbe(html) {
  const sample = String(html || "");
  if (!sample.trim()) return false;
  if (/@vite\/client/i.test(sample)) return true;
  return previewHtmlLooksLikeViteDev(sample);
}

/**
 * Poll until Vite serves transformed JS for /@vite/client (avoids remount while only HTML shell is up).
 * Skips the probe when embed HTML is a non-Vite app (Next, static SPA, etc.).
 * @param {string} embedDocSrc
 * @param {{ maxAttempts?: number, perAttemptTimeoutMs?: number, onAttempt?: (attempt: number) => void, quiet?: boolean, signal?: AbortSignal }} [opts]
 */
function responseLooksLikeViteClientModule(res, body) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const trimmed = String(body || "").trimStart();
  if (!res.ok || trimmed.startsWith("<!") || /^<html[\s>]/i.test(trimmed)) {
    return false;
  }
  if (/application\/octet-stream/i.test(ct)) return false;
  if (body.includes("createHotContext") || body.includes("__vite")) return true;
  return /javascript|ecmascript/i.test(ct);
}

async function fetchEmbedHtmlForViteProbe(embedDocSrc, opts = {}) {
  const perAttemptTimeoutMs =
    Number(opts.perAttemptTimeoutMs) > 0 ? Number(opts.perAttemptTimeoutMs) : 8000;
  const signal =
    opts.signal ??
    (typeof AbortSignal !== "undefined" && AbortSignal.timeout
      ? AbortSignal.timeout(perAttemptTimeoutMs)
      : undefined);
  try {
    const res = await fetch(embedDocSrc, {
      method: "GET",
      credentials: probeCredentials(embedDocSrc),
      signal,
      headers: { Accept: "text/html,application/xhtml+xml,*/*" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function pollUntilEmbedViteModulesReady(embedDocSrc, opts = {}) {
  const probeUrl = resolveEmbedViteClientProbeUrl(embedDocSrc);
  if (!probeUrl) {
    return { ok: true, src: embedDocSrc };
  }

  const html = await fetchEmbedHtmlForViteProbe(embedDocSrc, opts);
  if (html != null && !embedHtmlNeedsViteClientProbe(html)) {
    if (!opts.quiet) {
      auditPreviewPipeline(
        "health-probe",
        `skip vite client probe (non-Vite embed) ${embedDocSrc}`,
        {
          src: embedDocSrc,
          ok: true,
        },
      );
    }
    return { ok: true, src: embedDocSrc };
  }

  const maxAttempts = Number(opts.maxAttempts) > 0 ? Number(opts.maxAttempts) : 120;
  const perAttemptTimeoutMs =
    Number(opts.perAttemptTimeoutMs) > 0 ? Number(opts.perAttemptTimeoutMs) : 8000;
  const quiet = opts.quiet === true;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    opts.onAttempt?.(attempt);
    const signal =
      opts.signal ??
      (typeof AbortSignal !== "undefined" && AbortSignal.timeout
        ? AbortSignal.timeout(perAttemptTimeoutMs)
        : undefined);
    try {
      const res = await fetch(probeUrl, {
        method: "GET",
        credentials: probeCredentials(probeUrl),
        signal,
        headers: { Accept: "text/javascript, application/javascript, */*" },
      });
      const body = await res.text();
      if (responseLooksLikeViteClientModule(res, body)) {
        if (!quiet) {
          auditPreviewPipeline("health-probe", `vite client ready ${probeUrl}`, {
            src: probeUrl,
            ok: true,
          });
        }
        return { ok: true, src: embedDocSrc };
      }
      // Upstream may be Next/webpack even if the first HTML peek missed it — stop hammering 404s.
      if (res.status === 404 && attempt % 4 === 0) {
        const latestHtml = await fetchEmbedHtmlForViteProbe(embedDocSrc, {
          ...opts,
          perAttemptTimeoutMs,
        });
        if (latestHtml != null && !embedHtmlNeedsViteClientProbe(latestHtml)) {
          if (!quiet) {
            auditPreviewPipeline(
              "health-probe",
              `skip vite client probe after 404 (non-Vite embed) ${embedDocSrc}`,
              { src: embedDocSrc, ok: true },
            );
          }
          return { ok: true, src: embedDocSrc };
        }
      }
      if (!quiet && (attempt === maxAttempts || attempt % 20 === 0)) {
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        auditPreviewPipeline(
          "health-probe",
          `vite client not ready ${probeUrl} status=${res.status} ct=${ct || "?"}`,
          { src: probeUrl, pending: true },
        );
      }
    } catch (err) {
      if (!quiet && (attempt === maxAttempts || attempt % 20 === 0)) {
        auditPreviewPipeline(
          "health-probe",
          `vite client probe error ${probeUrl}: ${err?.message || err}`,
          { src: probeUrl, pending: true },
        );
      }
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, previewPollDelayMs(attempt)));
    }
  }
  return {
    ok: false,
    src: embedDocSrc,
    error: "Vite dev server is not serving modules yet",
  };
}

/**
 * Poll GET until embed URL serves app HTML.
 * @param {string} src
 * @param {{ maxAttempts?: number, perAttemptTimeoutMs?: number, allowPartialShell?: boolean, onAttempt?: (attempt: number) => void, signal?: AbortSignal }} [opts]
 */
export async function pollUntilDevPreviewSrcReady(src, opts = {}) {
  if (!isDevIframePreviewSrc(src)) {
    return { ok: true, src };
  }
  const maxAttempts = Number(opts.maxAttempts) > 0 ? Number(opts.maxAttempts) : 120;
  const perAttemptTimeoutMs =
    Number(opts.perAttemptTimeoutMs) > 0 ? Number(opts.perAttemptTimeoutMs) : 8000;
  const allowPartialShell = opts.allowPartialShell === true;
  const quiet = opts.quiet === true;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (opts.signal?.aborted) {
      return { ok: false, src, error: "Aborted" };
    }
    opts.onAttempt?.(attempt);
    const result = await inspectDevIframePreviewSrc(src, {
      timeoutMs: perAttemptTimeoutMs,
      signal: opts.signal,
      allowPartialShell,
    });
    if (result.ok) return result;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, previewPollDelayMs(attempt)));
    }
  }
  if (!quiet) {
    auditPreviewPipeline("health-probe", `embed HTML not ready ${src}`, {
      src,
      ok: false,
    });
  }
  return {
    ok: false,
    src,
    error: "Preview did not become ready in time",
  };
}

/**
 * Poll until embed HTML and Vite module pipeline are both ready (used before iframe remount).
 * @param {string} embedDocSrc
 * @param {{ maxAttempts?: number, perAttemptTimeoutMs?: number, onAttempt?: (attempt: number) => void }} [opts]
 */
export async function pollUntilEmbedPreviewFullyReady(embedDocSrc, opts = {}) {
  const pollOpts = { ...opts, allowPartialShell: false, quiet: opts.quiet === true };
  const htmlReady = await pollUntilDevPreviewSrcReady(embedDocSrc, pollOpts);
  if (!htmlReady.ok) return htmlReady;

  const modulesReady = await pollUntilEmbedViteModulesReady(embedDocSrc, pollOpts);
  if (!modulesReady.ok) return modulesReady;

  return { ok: true, src: embedDocSrc };
}

/** Soft reload: same iframe URL, no cache-bust nonce bump (less visual flash). */
export function reloadEmbedPreviewIframeInPlace(getIframe) {
  const iframe = getIframe?.();
  if (!iframe?.src) return false;
  if (isPreviewBridgeFrame(iframe)) {
    void callPreviewBridge(iframe, "reload").catch(() => {});
    return true;
  }
  try {
    iframe.contentWindow?.location.reload();
    return true;
  } catch {
    return false;
  }
}

/**
 * Poll until the mounted iframe shows real preview content (same-origin embed only).
 * @param {() => HTMLIFrameElement | null | undefined} getIframe
 * @param {{ maxAttempts?: number, intervalMs?: number, onAttempt?: (attempt: number) => void }} [opts]
 */
export async function pollUntilIframePreviewContentReady(getIframe, opts = {}) {
  const maxAttempts = Number(opts.maxAttempts) > 0 ? Number(opts.maxAttempts) : 120;
  const intervalMs = Number(opts.intervalMs) > 0 ? Number(opts.intervalMs) : 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    opts.onAttempt?.(attempt);
    const iframe = getIframe();
    if (iframe && isIframePreviewContentReady(iframe)) {
      return true;
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return false;
}

/** True when src has exactly one cache-bust `_pv` token matching `expectedNonce`. */
export function iframeSrcHasSinglePreviewNonce(src, expectedNonce) {
  const s = String(src ?? "");
  const token = `_pv=${Number(expectedNonce)}`;
  if (!s.includes(token)) return false;
  const matches = s.match(/_pv=\d+/g) || [];
  return matches.length === 1 && matches[0] === `_pv=${Number(expectedNonce)}`;
}

/**
 * Wait until iframe `src` reflects the post-bump cache nonce (React commit + attribute update).
 * @param {() => HTMLIFrameElement | null | undefined} getIframe
 * @param {number} expectedNonce
 * @param {{ maxMs?: number }} [opts]
 */
export async function waitForIframePreviewNonce(getIframe, expectedNonce, opts = {}) {
  const maxMs = Number(opts.maxMs) > 0 ? Number(opts.maxMs) : 60_000;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const iframe = getIframe();
    if (iframe && iframeSrcHasSinglePreviewNonce(iframe.src, expectedNonce)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

/**
 * Wait for iframe `load` (or already-complete) after src change.
 * @param {() => HTMLIFrameElement | null | undefined} getIframe
 * @param {{ maxMs?: number }} [opts]
 */
export async function waitForIframeLoadEvent(getIframe, opts = {}) {
  const maxMs = Number(opts.maxMs) > 0 ? Number(opts.maxMs) : 120_000;
  const start = Date.now();

  while (Date.now() - start < maxMs) {
    const iframe = getIframe();
    if (!iframe) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      continue;
    }

    const readyState = isPreviewBridgeFrame(iframe)
      ? getPreviewBridgeState(iframe)?.readyState
      : iframe.contentDocument?.readyState;
    if (readyState === "complete") {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return true;
    }

    const loaded = await new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        iframe.removeEventListener("load", onLoad);
        iframe.removeEventListener("error", onError);
        resolve(ok);
      };
      const onLoad = () => finish(true);
      const onError = () => finish(false);
      iframe.addEventListener("load", onLoad, { once: true });
      iframe.addEventListener("error", onError, { once: true });
      window.setTimeout(() => finish(false), Math.max(500, maxMs - (Date.now() - start)));
    });
    if (loaded) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}
