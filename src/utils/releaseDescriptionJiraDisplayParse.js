/**
 * Read-only parse of stored release description markdown for previews and scope dialogs.
 * Canonical shape for stored release description markdown (serialised from themes on the client).
 * Not used in the editing loop — structured state is the source of truth in the UI.
 */

const FEATURE_LINE_RE = /^(\s*)-\s*\*\*(.+?)\*\*\s*[—–\-]\s*(.*)$/;

/**
 * @param {string} text
 * @returns {{ ok: true, themes: Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }> } | { ok: false, reason: string, detail?: string }}
 */
export function parseReleaseDescriptionForJira(text) {
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, reason: "empty" };
  }

  const normalized = text.replace(/\r\n/g, "\n");
  const trimmed = normalized.trim();
  const firstThemeMatch = trimmed.match(/^### /m);
  if (!firstThemeMatch || firstThemeMatch.index == null) {
    return { ok: false, reason: "no_themes" };
  }
  if (
    firstThemeMatch.index > 0 &&
    trimmed.slice(0, firstThemeMatch.index).trim()
  ) {
    return { ok: false, reason: "preamble_before_theme" };
  }

  const lines = normalized.split("\n");
  const themes = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith("### ")) {
      i++;
      continue;
    }

    const title = line.slice(4).trim();
    if (!title) {
      return { ok: false, reason: "empty_theme_title" };
    }
    i++;

    const bodyLines = [];
    let foundFeatures = false;
    const features = [];

    while (i < lines.length) {
      const L = lines[i];
      if (L.startsWith("### ")) {
        break;
      }
      if (L.trim() === "**Features:**") {
        foundFeatures = true;
        i++;
        while (i < lines.length) {
          const L2 = lines[i];
          if (L2.startsWith("### ")) {
            break;
          }
          const fl = L2.trim();
          if (!fl) {
            i++;
            continue;
          }
          const fm = FEATURE_LINE_RE.exec(L2);
          if (!fm) {
            return {
              ok: false,
              reason: "invalid_feature_line",
              detail: L2.slice(0, 200),
            };
          }
          features.push({
            name: fm[2].trim(),
            bodyMarkdown: fm[3].trim(),
          });
          i++;
        }
        break;
      }
      bodyLines.push(L);
      i++;
    }

    if (!foundFeatures) {
      return { ok: false, reason: "missing_features_header", detail: title };
    }
    if (features.length === 0) {
      return { ok: false, reason: "no_features", detail: title };
    }

    themes.push({
      title,
      epicDescriptionMarkdown: bodyLines.join("\n").trim(),
      features,
    });
  }

  if (themes.length === 0) {
    return { ok: false, reason: "no_themes" };
  }

  return { ok: true, themes };
}
