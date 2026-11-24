/** Vite import query params that request transformed asset modules (not plain static files). */
const VITE_SPECIAL_IMPORT_PARAMS = new Set([
  "url",
  "raw",
  "inline",
  "worker",
  "sharedworker",
  "import",
]);

/**
 * Query suffixes whose exported/consumed URL must stay root-absolute so orphan
 * `/src/…` / `/node_modules/…` fetches (and `synthesizeViteUrlModule`) keep working.
 * Do **not** include `?import` / `?raw` / `?inline` — those are ES modules and must
 * stay under `/embedded/<port>/` (sandboxed iframe is origin `null` and needs CORS
 * from the embed proxy; nginx may also serve raw `/src/.../*.svg` without `?import`).
 */
const VITE_ROOT_ABSOLUTE_IMPORT_PARAMS = new Set(["url", "worker", "sharedworker"]);

/**
 * True when a path/URL uses a Vite special import suffix (?url, ?worker, ?raw, etc.).
 * Ignores cache-bust-only queries like ?t=123 or ?v=abc.
 * @param {string} pathOrUrl
 */
export function isViteSpecialImportPath(pathOrUrl) {
  return pathHasViteImportParam(pathOrUrl, VITE_SPECIAL_IMPORT_PARAMS);
}

/**
 * True when rewrite should leave the path root-absolute (no `/embedded/<port>/` prefix).
 * @param {string} pathOrUrl
 */
export function shouldKeepRootAbsoluteViteImportPath(pathOrUrl) {
  return pathHasViteImportParam(pathOrUrl, VITE_ROOT_ABSOLUTE_IMPORT_PARAMS);
}

/**
 * @param {string} pathOrUrl
 * @param {Set<string>} params
 */
function pathHasViteImportParam(pathOrUrl, params) {
  const raw = String(pathOrUrl ?? "");
  const qIdx = raw.indexOf("?");
  if (qIdx === -1) return false;
  try {
    const url = new URL(raw.slice(qIdx), "http://localhost");
    for (const key of url.searchParams.keys()) {
      if (params.has(key.toLowerCase())) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Remove /embedded/<port> prefix so synthesized asset URLs stay root-relative.
 * @param {string} pathname
 */
export function stripEmbedPortPrefix(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  const stripped = p.replace(/^\/embedded\/\d{1,5}(?=\/|$)/, "");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

/** True when body already looks like Vite's tiny URL virtual module. */
export function looksLikeEsmDefaultExport(body) {
  const trimmed = String(body ?? "").trimStart();
  return /export\s+default\s/m.test(trimmed) || /export\s*\{[^}]*\bdefault\b/.test(trimmed);
}

/**
 * Build a URL virtual module when upstream returned raw asset bytes for ?url / ?worker requests.
 * @param {string} requestPath — request path including query suffix
 */
export function synthesizeViteUrlModule(requestPath) {
  const pathname = stripEmbedPortPrefix(String(requestPath ?? "").split("?")[0] ?? "/");
  return `export default ${JSON.stringify(pathname)};\n`;
}

/** True for ?url imports (not ?raw / ?worker-only). */
export function isViteUrlImportPath(pathOrUrl) {
  const raw = String(pathOrUrl ?? "");
  if (!isViteSpecialImportPath(raw)) return false;
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
  try {
    const url = new URL(q, "http://localhost");
    return url.searchParams.has("url");
  } catch {
    return false;
  }
}

/** Upstream sent generic binary/plain instead of a JS module MIME (common via Docker relay). */
export function isIncorrectModuleContentType(contentType) {
  const ct = String(contentType ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ct) return true;
  return ct === "application/octet-stream" || ct === "binary/octet-stream" || ct === "text/plain";
}

/** Browser-safe Content-Type for ES module script responses. */
export function resolveModuleScriptContentType(requestPath) {
  const pathOnly = String(requestPath ?? "")
    .split("?")[0]
    .toLowerCase();
  if (pathOnly.endsWith(".ts") || pathOnly.endsWith(".tsx")) {
    return "text/javascript; charset=utf-8";
  }
  return "application/javascript; charset=utf-8";
}

/** True when the browser loads this embed URL as `type="module"`. */
export function isModuleScriptRequestPath(pathOrUrl) {
  const raw = String(pathOrUrl ?? "");
  // Vue/Svelte SFC style blocks — upstream is CSS; must not force JS MIME or JS rewrites.
  if (/[?&]type=style(?:&|$)/i.test(raw)) return false;
  const pathOnly = raw.split("?")[0].toLowerCase();
  if (isViteSpecialImportPath(raw)) return true;
  if (/\/@vite\/client|\/@react-refresh|\/@fs\/|\/@id\//.test(pathOnly)) return true;
  if (/\/node_modules\/\.vite\/deps\//.test(pathOnly)) return true;
  // Project + node_modules: .vue/.svelte SFC script blocks are ES modules (not ?type=style).
  return /\.(m?[jt]sx?|cjs|vue|svelte)(\?|$)/.test(pathOnly);
}

/**
 * Whether embed proxy should replace raw upstream JS with a synthesized URL module.
 * @param {string} requestPath
 * @param {string} contentType
 * @param {string} body
 */
export function shouldSynthesizeViteUrlModule(requestPath, contentType, body) {
  if (!isViteUrlImportPath(requestPath)) return false;
  if (looksLikeEsmDefaultExport(body)) return false;
  const ct = String(contentType ?? "").toLowerCase();
  if (ct.includes("javascript") || ct.includes("typescript")) return true;
  if (isIncorrectModuleContentType(contentType)) return true;
  return false;
}
