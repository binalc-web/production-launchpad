/** @param {string|null|undefined} jiraBaseUrl */
export function confluenceWikiUrlPrefix(jiraBaseUrl) {
  const raw = String(jiraBaseUrl || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return `${u.origin}/wiki/`;
  } catch {
    const host = raw.replace(/^https?:\/\//i, "").split("/")[0];
    return host ? `https://${host}/wiki/` : "";
  }
}

/**
 * Normalize user input to the path after `/wiki/` (or full URL if no prefix).
 * @param {string} input
 * @param {string} wikiPrefix — e.g. https://acme.atlassian.net/wiki/
 */
export function normalizeConfluencePagePath(input, wikiPrefix) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    if (wikiPrefix && trimmed.startsWith(wikiPrefix)) {
      return trimmed.slice(wikiPrefix.length).replace(/^\/+/, "");
    }
    try {
      const u = new URL(trimmed);
      const marker = "/wiki/";
      const idx = u.pathname.indexOf(marker);
      if (idx >= 0) {
        const path = u.pathname.slice(idx + marker.length) + u.search + u.hash;
        return path.replace(/^\/+/, "");
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  return trimmed.replace(/^\/+/, "");
}

/**
 * @param {string} wikiPrefix
 * @param {string} pagePath
 */
export function buildConfluencePageUrl(wikiPrefix, pagePath) {
  const prefix = String(wikiPrefix || "").trim();
  const path = normalizeConfluencePagePath(pagePath, prefix);
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!prefix) return path;
  return `${prefix}${path}`;
}
