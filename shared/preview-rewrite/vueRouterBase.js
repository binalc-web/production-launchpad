/**
 * Patch Vue Router createWebHistory / createWebHashHistory and BASE_URL for embed previews.
 */

import { LAUNCHPAD_EMBED_BASENAME_EXPR } from "./reactRouterBasename.js";

function embedBaseUrlFromAssetPath(assetPath) {
  const raw = String(assetPath || "").trim();
  if (!raw) return "/";
  const withSlash = raw.endsWith("/") ? raw : `${raw}/`;
  return withSlash.startsWith("/") ? withSlash : `/${withSlash}`;
}

function shouldSkipVueRouterBaseRewrite(content) {
  const raw = String(content || "");
  if (!raw.includes(LAUNCHPAD_EMBED_BASENAME_EXPR)) return false;
  if (/\bcreateWebHistory\s*\(\s*["']\/["']\s*\)/.test(raw)) return false;
  if (/\bcreateWebHistory\s*\(\s*`\/`\s*\)/.test(raw)) return false;
  if (/\bcreateWebHistory\s*\(\s*\)/.test(raw)) return false;
  if (/\bcreateWebHistory\s*\(\s*void\s+0\s*\)/.test(raw)) return false;
  if (/\bcreateWebHistory\s*\(\s*import\.meta\.env\.BASE_URL\s*\)/.test(raw)) return false;
  if (/\bcreateWebHistory\s*\(\s*[\w.$]+\.BASE_URL\s*\)/.test(raw)) return false;
  if (/\bcreateWebHistory\s*\(\s*getAppBase\s*\(\s*\)\s*\)/.test(raw)) return false;
  if (/\bcreateWebHistory\s*\(\s*getBase\s*\(\s*\)\s*\)/.test(raw)) return false;
  if (/\bcreateWebHashHistory\s*\(\s*["']\/["']\s*\)/.test(raw)) return false;
  if (/\bcreateWebHashHistory\s*\(\s*`\/`\s*\)/.test(raw)) return false;
  if (/\bcreateWebHashHistory\s*\(\s*\)/.test(raw)) return false;
  if (/\bcreateWebHashHistory\s*\(\s*void\s+0\s*\)/.test(raw)) return false;
  if (/(["']BASE_URL["']\s*:\s*)["']\/["']/.test(raw) || /(\bBASE_URL\s*:\s*)["']\/["']/.test(raw)) {
    return false;
  }
  return true;
}

export function rewriteVueRouterBase(content, optionsOrAssetPath = {}) {
  const raw = String(content || "");
  if (!raw) return raw;
  if (shouldSkipVueRouterBaseRewrite(raw)) return raw;
  const options =
    typeof optionsOrAssetPath === "string"
      ? { assetPath: optionsOrAssetPath }
      : optionsOrAssetPath || {};
  const assetPath = options.assetPath || "";
  void options.requestPath;
  let out = raw;
  const historyCall = `createWebHistory(${LAUNCHPAD_EMBED_BASENAME_EXPR})`;
  const hashHistoryCall = `createWebHashHistory(${LAUNCHPAD_EMBED_BASENAME_EXPR})`;
  if (/\bcreateWebHistory\s*\(/.test(out)) {
    out = out.replace(/\bcreateWebHistory\s*\(\s*["']\/["']\s*\)/g, historyCall);
    out = out.replace(/\bcreateWebHistory\s*\(\s*`\/`\s*\)/g, historyCall);
    out = out.replace(/\bcreateWebHistory\s*\(\s*\)/g, historyCall);
    out = out.replace(/\bcreateWebHistory\s*\(\s*void\s+0\s*\)/g, historyCall);
    out = out.replace(/\bcreateWebHistory\s*\(\s*import\.meta\.env\.BASE_URL\s*\)/g, historyCall);
    out = out.replace(/\bcreateWebHistory\s*\(\s*[\w.$]+\.BASE_URL\s*\)/g, historyCall);
    out = out.replace(/\bcreateWebHistory\s*\(\s*getAppBase\s*\(\s*\)\s*\)/g, historyCall);
    out = out.replace(/\bcreateWebHistory\s*\(\s*getBase\s*\(\s*\)\s*\)/g, historyCall);
    const rootIds = new Set();
    for (const m of out.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["']\/["']\s*;?/g)) {
      rootIds.add(m[1]);
    }
    for (const id of rootIds) {
      const re = new RegExp(`\\bcreateWebHistory\\s*\\(\\s*${id}\\s*\\)`, "g");
      out = out.replace(re, historyCall);
    }
  }
  if (/\bcreateWebHashHistory\s*\(/.test(out)) {
    out = out.replace(/\bcreateWebHashHistory\s*\(\s*["']\/["']\s*\)/g, hashHistoryCall);
    out = out.replace(/\bcreateWebHashHistory\s*\(\s*`\/`\s*\)/g, hashHistoryCall);
    out = out.replace(/\bcreateWebHashHistory\s*\(\s*\)/g, hashHistoryCall);
    out = out.replace(/\bcreateWebHashHistory\s*\(\s*void\s+0\s*\)/g, hashHistoryCall);
    out = out.replace(
      /\bcreateWebHashHistory\s*\(\s*import\.meta\.env\.BASE_URL\s*\)/g,
      hashHistoryCall,
    );
    out = out.replace(/\bcreateWebHashHistory\s*\(\s*[\w.$]+\.BASE_URL\s*\)/g, hashHistoryCall);
    const rootIds = new Set();
    for (const m of out.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["']\/["']\s*;?/g)) {
      rootIds.add(m[1]);
    }
    for (const id of rootIds) {
      const re = new RegExp(`\\bcreateWebHashHistory\\s*\\(\\s*${id}\\s*\\)`, "g");
      out = out.replace(re, hashHistoryCall);
    }
  }
  if (assetPath && /BASE_URL/.test(out)) {
    const baseUrl = embedBaseUrlFromAssetPath(assetPath);
    const quoted = JSON.stringify(baseUrl);
    out = out.replace(/(["']BASE_URL["']\s*:\s*)["']\/["']/g, `$1${quoted}`);
    out = out.replace(/(\bBASE_URL\s*:\s*)["']\/["']/g, `$1${quoted}`);
  }
  return out;
}
