/** Locate the feedback-embed bundle script for resolving asset URLs. */
export function findEmbedScriptElement(documentRef = globalThis.document) {
  if (!documentRef) return null;
  const current = documentRef.currentScript;
  if (current?.src?.includes("feedback-embed")) return current;
  const scripts = documentRef.getElementsByTagName("script");
  for (let index = scripts.length - 1; index >= 0; index -= 1) {
    const src = scripts[index].src || "";
    if (src.includes("feedback-embed.js")) return scripts[index];
  }
  return null;
}

/** Resolve the public feedback-embed.css URL next to the embed JS bundle. */
export function resolveEmbedStylesheetHref(scriptElement, windowRef = globalThis.window) {
  const configBase = String(windowRef?.launchpadFeedbackConfig?.widgetBaseUrl || "")
    .trim()
    .replace(/\/$/, "");
  if (configBase) return `${configBase}/embed/feedback-embed.css`;

  const script = scriptElement ?? findEmbedScriptElement(windowRef?.document);
  if (script?.src) {
    try {
      return new URL("feedback-embed.css", script.src).href;
    } catch {
      /* fall through */
    }
  }
  return "/embed/feedback-embed.css";
}
