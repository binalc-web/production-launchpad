const MAX_PATH_LEN = 128;

function escapeRegexLiteral(segment) {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a RegExp for a restrict-path pattern.
 * Supports:
 * - exact: /login
 * - prefix: /admin (also matches /admin/users)
 * - wildcard suffix: /settings/*
 * - dynamic segment: /projects/:projectSlug
 */
export function pathPatternToRegExp(pattern) {
  let normalized = normalizeEmbedPathPattern(pattern);
  if (!normalized) return null;

  let prefixWildcard = false;
  if (normalized.endsWith("/*")) {
    prefixWildcard = true;
    normalized = normalized.slice(0, -2) || "/";
  }

  if (!normalized.includes(":") && prefixWildcard) {
    return new RegExp(`^${escapeRegexLiteral(normalized)}(?:$|/)`);
  }

  const segments = normalized.split("/").filter(Boolean);
  const reParts = segments.map((segment) => {
    if (segment.startsWith(":")) return "[^/]+";
    if (segment === "*") return "[^/]+";
    return escapeRegexLiteral(segment);
  });

  if (reParts.length === 0) {
    return prefixWildcard ? /^\/(?:.*)?$/ : /^\/$/;
  }

  const base = `^/${reParts.join("/")}`;
  return prefixWildcard ? new RegExp(`${base}(?:/|$)`) : new RegExp(`${base}(?:/)?$`);
}

export function normalizeEmbedPathPattern(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  if (!s.startsWith("/")) {
    s = `/${s}`;
  }
  if (s.length > MAX_PATH_LEN) return null;
  return s;
}

export function pathMatchesRestrictPattern(pathname, pattern) {
  const path = String(pathname || "/");
  const normalized = normalizeEmbedPathPattern(pattern);
  if (!normalized) return false;

  const rawPattern = String(pattern ?? "").trim();
  const dynamicOrWildcard =
    normalized.includes(":") || rawPattern.endsWith("*") || rawPattern.endsWith("/*");
  if (dynamicOrWildcard) {
    const re = pathPatternToRegExp(pattern);
    return re ? re.test(path) : false;
  }

  if (path === normalized || path.startsWith(`${normalized}/`)) {
    return true;
  }
  return false;
}

export function isPathRestricted(pathname, restrictPaths) {
  const list = Array.isArray(restrictPaths) ? restrictPaths : [];
  for (const raw of list) {
    if (pathMatchesRestrictPattern(pathname, raw)) return true;
  }
  return false;
}
