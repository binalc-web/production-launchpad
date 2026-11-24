/**
 * Patch React Router library default basename ("/") for LaunchPad embed previews.
 * Only rewrites the library default-arg pattern; never touches app BrowserRouter JSX.
 */

export const LAUNCHPAD_EMBED_BASENAME_EXPR =
  '(function(){try{var p=location.pathname;var m=p.match(/^\\/(embedded|iframe-preview)\\/(\\d{1,5})(?:\\/|$)/);if(m)return"/"+m[1]+"/"+m[2];var a=p.match(/^\\/apps\\/[^/]+/);if(a)return a[0]}catch(e){}return"/"})()';

const HELPER_EXPORT = "resolveLaunchpadRouterBasename";
const LIBRARY_BASENAME_DEFAULT_RE = /basename:\s*([a-zA-Z_$][\w$]*)\s*=\s*["']\/["']/g;

function contentHasOwnLaunchpadBasenameHelper(content) {
  return String(content || "").includes(HELPER_EXPORT);
}

function shouldSkipReactRouterBasenameRewrite(content) {
  const raw = String(content || "");
  if (contentHasOwnLaunchpadBasenameHelper(raw)) return true;
  return false;
}

function looksLikeReactRouterLibraryDefaultBasename(content) {
  const raw = String(content || "");
  LIBRARY_BASENAME_DEFAULT_RE.lastIndex = 0;
  return LIBRARY_BASENAME_DEFAULT_RE.test(raw);
}

export function rewriteReactRouterBasename(content, optionsOrAssetPath = {}) {
  const raw = String(content || "");
  if (!raw) return raw;
  if (shouldSkipReactRouterBasenameRewrite(raw)) return raw;
  if (!looksLikeReactRouterLibraryDefaultBasename(raw)) return raw;
  const basenameExpr = LAUNCHPAD_EMBED_BASENAME_EXPR;
  LIBRARY_BASENAME_DEFAULT_RE.lastIndex = 0;
  return raw.replace(LIBRARY_BASENAME_DEFAULT_RE, `basename:$1=${basenameExpr}`);
}
