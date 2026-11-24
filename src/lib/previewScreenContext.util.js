/** Pure helpers for voice-mode preview snapshots (no DOM access). */

export const SCREEN_SNAPSHOT_LIMITS = Object.freeze({
  ELEMENTS: 120,
  LABEL_CHARS: 120,
  TEXT_CHARS: 3000,
  SUMMARY_ELEMENTS: 40,
  NAVIGATE_TARGETS: 12,
  SCREENSHOT_WIDTH: 768,
  SCREENSHOT_MAX_DATA_URL: 220_000,
});

const L = SCREEN_SNAPSHOT_LIMITS;

export function clipScreenText(s, max) {
  const t = String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function hashKey(key) {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return `e${(h >>> 0).toString(36)}`;
}

/** Stable identity for diffing the same element across snapshots. */
export function screenElementKey(el) {
  return `${el.route || "/"}|${el.tag}|${el.kind}|${el.label}`;
}

/** @param {{ tag: string, kind: string, label: string, route?: string }} el */
export function withScreenElementId(el) {
  return { ...el, id: hashKey(screenElementKey(el)) };
}

/** Plain-text summary for the realtime model and Jev state. */
export function summarizeScreenSnapshot(snapshot, { maxElements = L.SUMMARY_ELEMENTS } = {}) {
  if (!snapshot) return "Preview not available.";
  const lines = [`Route: ${snapshot.route || "/"}`];
  if (snapshot.title) lines.push(`Title: ${snapshot.title}`);
  const elements = Array.isArray(snapshot.elements) ? snapshot.elements : [];
  const headings = elements.filter((e) => /^h[1-4]$/.test(e.tag)).slice(0, 10);
  if (headings.length) lines.push(`Headings: ${headings.map((h) => `"${h.label}"`).join(", ")}`);
  const clickable = elements
    .filter((e) => e.kind === "interactive" && e.inViewport)
    .slice(0, maxElements);
  if (clickable.length) {
    lines.push(
      `Visible controls: ${clickable
        .map((e) => `${e.role || e.tag} "${e.label}"${e.href ? ` -> ${e.href}` : ""}`)
        .join("; ")}`,
    );
  }
  if (snapshot.pickedElement) lines.push(`User picked element: ${snapshot.pickedElement}`);
  if (snapshot.text) lines.push(`Visible text: ${clipScreenText(snapshot.text, L.TEXT_CHARS)}`);
  return lines.join("\n");
}

/** In-app routes the user could ask to open (current route first). */
export function collectNavigateTargets(snapshot, max = L.NAVIGATE_TARGETS) {
  const out = [];
  const add = (r) => {
    if (typeof r === "string" && r.startsWith("/") && !r.startsWith("//") && !out.includes(r)) {
      out.push(r);
    }
  };
  add(snapshot?.route || "/");
  for (const e of snapshot?.elements || []) {
    if (out.length >= max) break;
    if (e.href) add(e.href);
  }
  return out.slice(0, max);
}
