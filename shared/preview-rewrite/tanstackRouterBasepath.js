/**
 * Patch TanStack Router createRouter({ basepath }) and library defaults for embed previews.
 */

import { LAUNCHPAD_EMBED_BASENAME_EXPR } from "./reactRouterBasename.js";

const CREATE_ROUTER_CALL_RE = /\bcreateRouter\s*\(/g;
const ROOT_PATH_LITERAL_RE = /^(?:["']\/["']|`\/`)/;

function shouldSkipTanstackRouterBasepathRewrite(content) {
  const raw = String(content || "");
  if (!raw.includes(LAUNCHPAD_EMBED_BASENAME_EXPR)) return false;
  if (hasUnpatchedCreateRouterCall(raw)) return false;
  if (hasUnpatchedLibraryBasepathFallback(raw)) return false;
  return true;
}

export function rewriteTanstackRouterBasepath(content, optionsOrAssetPath = {}) {
  const raw = String(content || "");
  if (!raw) return raw;
  if (shouldSkipTanstackRouterBasepathRewrite(raw)) return raw;
  let out = rewriteCreateRouterCalls(raw, LAUNCHPAD_EMBED_BASENAME_EXPR);
  if (looksLikeTanstackRouterLibrary(out)) {
    out = rewriteLibraryBasepathFallback(out, LAUNCHPAD_EMBED_BASENAME_EXPR);
  }
  return out;
}

function hasUnpatchedCreateRouterCall(raw) {
  CREATE_ROUTER_CALL_RE.lastIndex = 0;
  let m;
  while ((m = CREATE_ROUTER_CALL_RE.exec(raw))) {
    const obj = extractObjectArg(raw, m.index + m[0].length - 1);
    if (!obj) continue;
    if (!/\brouteTree\b/.test(obj.body)) continue;
    if (obj.body.includes(LAUNCHPAD_EMBED_BASENAME_EXPR)) continue;
    const key = findDepth1Key(obj.body, "basepath");
    if (!key) return true;
    const valueStart = skipWs(obj.body, key.colonEnd);
    if (ROOT_PATH_LITERAL_RE.test(obj.body.slice(valueStart))) return true;
  }
  return false;
}

function hasUnpatchedLibraryBasepathFallback(raw) {
  if (!looksLikeTanstackRouterLibrary(raw)) return false;
  const stmts = raw.match(/\bthis\.basepath\s*=\s*(?:`[^`]*`|[^\n;]+)/g) || [];
  return stmts.some(
    (s) => !s.includes(LAUNCHPAD_EMBED_BASENAME_EXPR) && /\?\?\s*(?:["']\/["']|["']["'])/.test(s),
  );
}

function looksLikeTanstackRouterLibrary(content) {
  const raw = String(content || "");
  if (/\bthis\.basepath\b/.test(raw) && /\btrimPath\b/.test(raw)) return true;
  if (/@tanstack\/(?:react-)?router/.test(raw) && /\bthis\.basepath\b/.test(raw)) return true;
  return false;
}

function rewriteCreateRouterCalls(src, expr) {
  CREATE_ROUTER_CALL_RE.lastIndex = 0;
  let out = "";
  let last = 0;
  let m;
  let changed = false;
  while ((m = CREATE_ROUTER_CALL_RE.exec(src))) {
    const obj = extractObjectArg(src, m.index + m[0].length - 1);
    if (!obj) continue;
    const rewritten = rewriteCreateRouterObject(obj.body, expr);
    if (rewritten === obj.body) continue;
    out += src.slice(last, obj.start) + rewritten;
    last = obj.end;
    changed = true;
  }
  if (!changed) return src;
  return out + src.slice(last);
}

function rewriteCreateRouterObject(obj, expr) {
  if (!/\brouteTree\b/.test(obj)) return obj;
  if (obj.includes(expr)) return obj;
  const key = findDepth1Key(obj, "basepath");
  if (!key) {
    return `{basepath:${expr},` + obj.slice(1);
  }
  const valueStart = skipWs(obj, key.colonEnd);
  const root = obj.slice(valueStart).match(ROOT_PATH_LITERAL_RE);
  if (!root) return obj;
  return obj.slice(0, valueStart) + expr + obj.slice(valueStart + root[0].length);
}

function rewriteLibraryBasepathFallback(src, expr) {
  return src.replace(/\bthis\.basepath\s*=\s*(?:`[^`]*`|[^\n;]+)/g, (stmt) => {
    if (stmt.includes(expr)) return stmt;
    return stmt.replace(/\?\?\s*["']\/["']/g, `??${expr}`).replace(/\?\?\s*["']["']/g, `??${expr}`);
  });
}

function extractObjectArg(src, openParenIdx) {
  const argStart = skipWs(src, openParenIdx + 1);
  if (src[argStart] !== "{") return null;
  const close = findMatchingBrace(src, argStart);
  if (close < 0) return null;
  return { start: argStart, end: close + 1, body: src.slice(argStart, close + 1) };
}

function findMatchingBrace(src, openIdx) {
  let depth = 0;
  let inStr = null;
  let escape = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      if (nl < 0) return -1;
      i = nl;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) return -1;
      i = end + 1;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findDepth1Key(obj, key) {
  const keyRe = new RegExp(`^(?:["']${key}["']|${key})\\s*:`);
  let depth = 0;
  let inStr = null;
  let escape = false;
  for (let i = 0; i < obj.length; i++) {
    const c = obj[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") {
      depth++;
      continue;
    }
    if (c === "}" || c === "]" || c === ")") {
      depth--;
      continue;
    }
    if (depth !== 1) continue;
    if (c !== "b" && c !== '"' && c !== "'") continue;
    const slice = obj.slice(i);
    const m = slice.match(keyRe);
    if (!m) continue;
    if (i > 0 && /[\w$]/.test(obj[i - 1])) continue;
    return { keyStart: i, colonEnd: i + m[0].length };
  }
  return null;
}

function skipWs(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}
