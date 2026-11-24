// vite.config.js
import path from "path";
import tailwindcss from "file:///Users/vraj.g/Desktop/lab/YORK%20IE%20LaunchPad/project-management-platform/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///Users/vraj.g/Desktop/lab/YORK%20IE%20LaunchPad/project-management-platform/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { defineConfig } from "file:///Users/vraj.g/Desktop/lab/YORK%20IE%20LaunchPad/project-management-platform/frontend/node_modules/vite/dist/node/index.js";

// iframe-preview/middleware.js
import { createProxyMiddleware } from "file:///Users/vraj.g/Desktop/lab/YORK%20IE%20LaunchPad/project-management-platform/frontend/node_modules/http-proxy-middleware/dist/index.js";

// iframe-preview/embedUpstream.js
var DEFAULT_PROJECT_PORT_START = 8001;
var DEFAULT_PROJECT_PORT_END = 8100;
function isPreviewEmbedHmrEnabled() {
  const flag = String(process.env.PREVIEW_EMBED_HMR ?? "1").trim().toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "no";
}
function isBackendProjectPort(port, start, end) {
  return Number.isInteger(port) && port >= start && port <= end;
}
function createEmbedUpstreamResolver({
  upstreamHost = "localhost",
  hostDevUpstreamHost = null,
  projectPortStart = DEFAULT_PROJECT_PORT_START,
  projectPortEnd = DEFAULT_PROJECT_PORT_END
} = {}) {
  const backendHost = String(upstreamHost || "localhost").trim() || "localhost";
  const devHost = hostDevUpstreamHost ? String(hostDevUpstreamHost).trim() || null : null;
  const start = Number(projectPortStart) || DEFAULT_PROJECT_PORT_START;
  const end = Number(projectPortEnd) || DEFAULT_PROJECT_PORT_END;
  return (port) => {
    if (devHost && isBackendProjectPort(port, start, end)) {
      return backendHost;
    }
    if (devHost) {
      return devHost;
    }
    return backendHost;
  };
}
function resolveEmbedUpstreamOptionsFromEnv() {
  const hostDev = process.env.EMBED_HOST_DEV_UPSTREAM_HOST?.trim();
  return {
    upstreamHost: process.env.EMBED_UPSTREAM_HOST || "localhost",
    hostDevUpstreamHost: hostDev || null,
    projectPortStart: process.env.PROJECT_PORT_START,
    projectPortEnd: process.env.PROJECT_PORT_END
  };
}
function normalizeEmbedUpstreamResolver(options = {}) {
  if (typeof options.resolveUpstreamHost === "function") {
    return options.resolveUpstreamHost;
  }
  return createEmbedUpstreamResolver(options);
}
function upstreamViteHostHeader(port) {
  return `localhost:${port}`;
}
function upstreamViteOrigin(port) {
  return `http://localhost:${port}`;
}
function resolveEmbedBackendApiPort() {
  const n = Number(process.env.EMBED_BACKEND_API_PORT || process.env.PORT || 5e3);
  return Number.isInteger(n) && n > 0 && n <= 65535 ? n : 5e3;
}
function resolveEmbeddedWsUpstreamTarget(upstreamHost, port) {
  const host = String(upstreamHost || "localhost").trim() || "localhost";
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return null;
  return `http://${host}:${n}`;
}
function shouldRelayEmbedViaBackendApi(upstreamHost, port, opts = {}) {
  const flag = String(process.env.EMBED_RELAY_VIA_BACKEND_API ?? "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  const host = String(upstreamHost || "").trim().toLowerCase();
  if (host !== "backend") return false;
  const start = Number(opts.projectPortStart) || DEFAULT_PROJECT_PORT_START;
  const end = Number(opts.projectPortEnd) || DEFAULT_PROJECT_PORT_END;
  return isBackendProjectPort(port, start, end);
}

// iframe-preview/constants.js
var EMBED_FRAME_PARAM = "embed_frame";
function isEmbedInfrastructurePath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  if (!p.startsWith("/")) return false;
  if (p === "/api" || p.startsWith("/api/")) return true;
  if (p === "/embedded" || p.startsWith("/embedded/")) return true;
  if (p === "/iframe-preview" || p.startsWith("/iframe-preview/")) return true;
  return false;
}

// iframe-preview/embedHmrWs.js
var EMBED_HMR_WS_MESSAGE_TYPE = "launchpad:embed-hmr-ws";
var EMBED_HMR_WS_FAIL_STREAK = 3;
var EMBED_SESSION_RESTORE_LS_PREFIX = "launchpad:embed-session-restore:";
function buildEmbedSessionRestoreScript() {
  const prefix = EMBED_SESSION_RESTORE_LS_PREFIX;
  return `<script data-embed-session-restore>(function(){try{var m=location.pathname.match(/^\\/embedded\\/(\\d{1,5})/);if(!m)return;var key="${prefix}"+m[1],raw=localStorage.getItem(key);if(!raw)return;localStorage.removeItem(key);var snap=JSON.parse(raw);if(!snap||typeof snap!=="object")return;var sk="__lpSession",lk="__lpLocal",ck="__lpCookies",cp="/embedded/"+m[1]+"/";if(snap[sk]||snap[lk]||snap[ck]){var s=snap[sk],l=snap[lk],c=snap[ck];if(s&&typeof s==="object")for(var k in s){if(Object.prototype.hasOwnProperty.call(s,k))sessionStorage.setItem(k,s[k])}if(l&&typeof l==="object")for(var k2 in l){if(Object.prototype.hasOwnProperty.call(l,k2))localStorage.setItem(k2,l[k2])}if(typeof c==="string"&&c){for(var p=c.split(/;\\s*/),i=0;i<p.length;i++){var part=p[i].trim();if(!part||part.indexOf("=")<0)continue;var nv=part.split(";")[0].trim();if(nv)document.cookie=nv+"; path="+cp+"; SameSite=Lax"}}}else{for(var k3 in snap){if(Object.prototype.hasOwnProperty.call(snap,k3))sessionStorage.setItem(k3,snap[k3])}}}catch(e){}})();</script>`;
}
function buildEmbedBootstrapScript() {
  const type = EMBED_HMR_WS_MESSAGE_TYPE;
  const streakLimit = EMBED_HMR_WS_FAIL_STREAK;
  return `${buildEmbedSessionRestoreScript()}<script data-embed-bootstrap>(function(){var m=location.pathname.match(/^\\/embedded\\/(\\d{1,5})/);var port=m?m[1]:null;if(!port){try{var cm=document.cookie.match(/(?:^|;\\s*)embed_port=(\\d{1,5})(?:;|$)/);if(cm)port=cm[1]}catch(eC){}}if(!port)return;var p="/embedded/"+port+"/",cp="/embedded/"+port+"/";["user","roles","refresh_token"].forEach(function(n){document.cookie=n+"=;path=/;Max-Age=0"});try{var desc=Object.getOwnPropertyDescriptor(Document.prototype,"cookie")||Object.getOwnPropertyDescriptor(HTMLDocument.prototype,"cookie");if(desc&&desc.set){Object.defineProperty(document,"cookie",{configurable:true,enumerable:true,get:function(){return desc.get.call(document)},set:function(v){var s=String(v),nv=s.split(";")[0].trim();if(/^embed_port=/i.test(nv)){desc.set.call(document,s);return}if(/;\\s*path\\s*=/i.test(s)){s=s.replace(/;\\s*path\\s*=[^;]*/i,"; path="+cp)}else{s=s+"; path="+cp}desc.set.call(document,s)}})}}catch(e0){}document.cookie="embed_port="+port+";path=/;SameSite=Lax";try{var F=window.fetch;if(typeof F==="function"){window.fetch=function(input,init){var opts=init?Object.assign({},init):{};if(opts.credentials==null)opts.credentials="same-origin";return F.call(this,input,opts)}}}catch(eF){}var MSG="${type}",failStreak=0,everOpen=false,lastFullReloadAt=0,lastHmrUpdateAt=0;function notify(status,extra){try{if(window.parent&&window.parent!==window){var payload={type:MSG,status:status,port:Number(port)};if(extra){for(var k in extra){if(Object.prototype.hasOwnProperty.call(extra,k))payload[k]=extra[k]}}window.parent.postMessage(payload,location.origin)}}catch(e){}}function isHmrUrl(u){if(typeof u!=="string")return false;try{var x=new URL(u,location.href);return x.host===location.host&&(x.pathname===p||x.pathname===p.slice(0,-1)||x.pathname.startsWith(p))}catch(e){return false}}function rewriteUrl(u){if(typeof u!=="string")return u;try{var x=new URL(u,location.href);if(x.host===location.host&&!x.pathname.startsWith(p)){if(x.pathname==="/"||x.pathname==="")x.pathname=p;else if(!x.pathname.startsWith("/embedded/"+port))x.pathname="/embedded/"+port+x.pathname}x.protocol=location.protocol==="https:"?"wss:":"ws:";if(location.protocol==="https:"&&x.port==="80")return"wss://"+x.hostname+x.pathname+x.search+x.hash;if(location.protocol!=="https:"&&x.port==="443")return"ws://"+x.hostname+x.pathname+x.search+x.hash;return x.href}catch(e){return u}}var W=WebSocket;WebSocket=function(u,pr){var url=rewriteUrl(u);var ws=pr!==undefined?new W(url,pr):new W(url);if(isHmrUrl(url)){var opened=false;ws.addEventListener("open",function(){opened=true;everOpen=true;failStreak=0;notify("open")});ws.addEventListener("close",function(){if(opened)return;failStreak+=1;if(failStreak>=${streakLimit})notify("failed",{failStreak:failStreak})});ws.addEventListener("message",function(ev){try{var d=typeof ev.data==="string"?ev.data:"";if(!d)return;var msg=JSON.parse(d);if(!msg||!msg.type)return;if(msg.type==="full-reload"){var now=Date.now();if(now-lastFullReloadAt<800)return;lastFullReloadAt=now;notify("full-reload",{path:msg.path||null});return}if(msg.type==="update"){var now2=Date.now();if(now2-lastHmrUpdateAt<300)return;lastHmrUpdateAt=now2;notify("hmr-update",{updates:Array.isArray(msg.updates)?msg.updates.length:0})}}catch(e3){}})}return ws};WebSocket.prototype=W.prototype;WebSocket.CONNECTING=W.CONNECTING;WebSocket.OPEN=W.OPEN;WebSocket.CLOSING=W.CLOSING;WebSocket.CLOSED=W.CLOSED})();</script>`;
}

// iframe-preview/viteSpecialImport.util.js
var VITE_SPECIAL_IMPORT_PARAMS = /* @__PURE__ */ new Set([
  "url",
  "raw",
  "inline",
  "worker",
  "sharedworker",
  "import"
]);
function isViteSpecialImportPath(pathOrUrl) {
  const raw = String(pathOrUrl ?? "");
  const qIdx = raw.indexOf("?");
  if (qIdx === -1) return false;
  try {
    const url = new URL(raw.slice(qIdx), "http://localhost");
    for (const key of url.searchParams.keys()) {
      if (VITE_SPECIAL_IMPORT_PARAMS.has(key.toLowerCase())) return true;
    }
  } catch {
    return false;
  }
  return false;
}
function stripEmbedPortPrefix(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  const stripped = p.replace(/^\/embedded\/\d{1,5}(?=\/|$)/, "");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}
function looksLikeEsmDefaultExport(body) {
  const trimmed = String(body ?? "").trimStart();
  return /export\s+default\s/m.test(trimmed) || /export\s*\{[^}]*\bdefault\b/.test(trimmed);
}
function synthesizeViteUrlModule(requestPath) {
  const pathname = stripEmbedPortPrefix(String(requestPath ?? "").split("?")[0] ?? "/");
  return `export default ${JSON.stringify(pathname)};
`;
}
function isViteUrlImportPath(pathOrUrl) {
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
function isIncorrectModuleContentType(contentType) {
  const ct = String(contentType ?? "").split(";")[0].trim().toLowerCase();
  if (!ct) return true;
  return ct === "application/octet-stream" || ct === "binary/octet-stream" || ct === "text/plain";
}
function resolveModuleScriptContentType(requestPath) {
  const pathOnly = String(requestPath ?? "").split("?")[0].toLowerCase();
  if (pathOnly.endsWith(".ts") || pathOnly.endsWith(".tsx")) {
    return "text/javascript; charset=utf-8";
  }
  return "application/javascript; charset=utf-8";
}
function isModuleScriptRequestPath(pathOrUrl) {
  const raw = String(pathOrUrl ?? "");
  if (/[?&]type=style(?:&|$)/i.test(raw)) return false;
  const pathOnly = raw.split("?")[0].toLowerCase();
  if (isViteSpecialImportPath(raw)) return true;
  if (/\/@vite\/client|\/@react-refresh|\/@fs\/|\/@id\//.test(pathOnly)) return true;
  if (/\/node_modules\/\.vite\/deps\//.test(pathOnly)) return true;
  return /\.(m?[jt]sx?|cjs|vue|svelte)(\?|$)/.test(pathOnly);
}
function shouldSynthesizeViteUrlModule(requestPath, contentType, body) {
  if (!isViteUrlImportPath(requestPath)) return false;
  if (looksLikeEsmDefaultExport(body)) return false;
  const ct = String(contentType ?? "").toLowerCase();
  if (ct.includes("javascript") || ct.includes("typescript")) return true;
  if (isIncorrectModuleContentType(contentType)) return true;
  return false;
}

// ../shared/preview-rewrite/reactRouterBasename.js
var LAUNCHPAD_EMBED_BASENAME_EXPR = '(function(){try{var p=location.pathname;var m=p.match(/^\\/(embedded|iframe-preview)\\/(\\d{1,5})(?:\\/|$)/);if(m)return"/"+m[1]+"/"+m[2];var a=p.match(/^\\/apps\\/[^/]+/);if(a)return a[0]}catch(e){}return"/"})()';
var HELPER_EXPORT = "resolveLaunchpadRouterBasename";
var LIBRARY_BASENAME_DEFAULT_RE = /basename:\s*([a-zA-Z_$][\w$]*)\s*=\s*["']\/["']/g;
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
function rewriteReactRouterBasename(content, optionsOrAssetPath = {}) {
  const raw = String(content || "");
  if (!raw) return raw;
  if (shouldSkipReactRouterBasenameRewrite(raw)) return raw;
  if (!looksLikeReactRouterLibraryDefaultBasename(raw)) return raw;
  const basenameExpr = LAUNCHPAD_EMBED_BASENAME_EXPR;
  LIBRARY_BASENAME_DEFAULT_RE.lastIndex = 0;
  return raw.replace(LIBRARY_BASENAME_DEFAULT_RE, `basename:$1=${basenameExpr}`);
}

// ../shared/preview-rewrite/vueRouterBase.js
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
function rewriteVueRouterBase(content, optionsOrAssetPath = {}) {
  const raw = String(content || "");
  if (!raw) return raw;
  if (shouldSkipVueRouterBaseRewrite(raw)) return raw;
  const options = typeof optionsOrAssetPath === "string" ? { assetPath: optionsOrAssetPath } : optionsOrAssetPath || {};
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
    const rootIds = /* @__PURE__ */ new Set();
    for (const m of out.matchAll(
      /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["']\/["']\s*;?/g
    )) {
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
      hashHistoryCall
    );
    out = out.replace(/\bcreateWebHashHistory\s*\(\s*[\w.$]+\.BASE_URL\s*\)/g, hashHistoryCall);
    const rootIds = /* @__PURE__ */ new Set();
    for (const m of out.matchAll(
      /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["']\/["']\s*;?/g
    )) {
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

// ../shared/preview-rewrite/tanstackRouterBasepath.js
var CREATE_ROUTER_CALL_RE = /\bcreateRouter\s*\(/g;
var ROOT_PATH_LITERAL_RE = /^(?:["']\/["']|`\/`)/;
function shouldSkipTanstackRouterBasepathRewrite(content) {
  const raw = String(content || "");
  if (!raw.includes(LAUNCHPAD_EMBED_BASENAME_EXPR)) return false;
  if (hasUnpatchedCreateRouterCall(raw)) return false;
  if (hasUnpatchedLibraryBasepathFallback(raw)) return false;
  return true;
}
function rewriteTanstackRouterBasepath(content, optionsOrAssetPath = {}) {
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
  while (m = CREATE_ROUTER_CALL_RE.exec(raw)) {
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
    (s) => !s.includes(LAUNCHPAD_EMBED_BASENAME_EXPR) && /\?\?\s*(?:["']\/["']|["']["'])/.test(s)
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
  while (m = CREATE_ROUTER_CALL_RE.exec(src)) {
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

// iframe-preview/rewritePaths.js
var EMBED_PUBLIC_PATH_PREFIXES = [
  "brand",
  "icons",
  "assets",
  "images",
  "static",
  "public",
  "media",
  "fonts"
];
var UPSTREAM_ROOT_PREFIX = new RegExp(
  `^\\/(?:@vite|@react-refresh|@fs|@id|node_modules|src|${[...EMBED_PUBLIC_PATH_PREFIXES].join("|")})(?:\\/|$)`
);
var VITE_DEV_MODULE_EXT = "tsx?|jsx?|mjs|cjs|vue|svelte|css|scss|sass|less";
var VITE_DEV_MODULE_PATH_RE = new RegExp(`\\.(${VITE_DEV_MODULE_EXT})(?:\\?.*)?$`, "i");
var LAUNCHPAD_ROOT_SEGMENTS = /* @__PURE__ */ new Set([
  "projects",
  "api",
  "auth",
  "admin",
  "embedded",
  "iframe-preview",
  "login",
  "register",
  "signup",
  "settings",
  "releases",
  "workspace",
  "client-link"
]);
function isViteDevModulePath(pathname) {
  const raw = String(pathname ?? "");
  const p = raw.split("?")[0] ?? "";
  if (!p.startsWith("/") || p.startsWith("/embedded/")) return false;
  if (!VITE_DEV_MODULE_PATH_RE.test(p)) return false;
  const segments = p.split("/").filter(Boolean);
  if (!segments.length) return false;
  const first = segments[0].toLowerCase();
  if (LAUNCHPAD_ROOT_SEGMENTS.has(first)) return false;
  return true;
}
function isUpstreamBundlerPath(pathname) {
  const p = (pathname ?? "").split("?")[0] ?? "";
  if (!p.startsWith("/")) return false;
  if (UPSTREAM_ROOT_PREFIX.test(p)) return true;
  if (isViteDevModulePath(p)) return true;
  if (/^\/_next(?:\/|$)/.test(p)) return true;
  if (/^\/node_modules_[^/]+$/.test(p)) return true;
  if (/^\/turbopack-[^/]+$/.test(p)) return true;
  if (/^\/webpack-hmr$/.test(p)) return true;
  if (/^\/__webpack_hmr$/.test(p)) return true;
  if (/^\/turbopack-hmr$/.test(p)) return true;
  if (/^\/src_[^/]+$/.test(p)) return true;
  if (/^\/_[a-f0-9]+\._\.[^/]+$/i.test(p)) return true;
  if (/^\/__nextjs_/.test(p)) return true;
  return false;
}
function parseEmbedTarget(url) {
  const trimmed = String(url || "").replace(/\/$/, "");
  try {
    const parsed = new URL(trimmed);
    const basePath = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return { url: trimmed, origin: parsed.origin, basePath };
  } catch {
    return { url: trimmed, origin: trimmed, basePath: "" };
  }
}
function joinAppPath(prefix, suffix) {
  const base = prefix.replace(/\/$/, "");
  if (!suffix || suffix === "/") return `${base}/`;
  const path2 = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${base}${path2}`;
}
function isProxiedPath(path2, basePath, assetPath) {
  if (path2.startsWith(`${assetPath}/`) || path2 === assetPath) return true;
  if (basePath && (path2.startsWith(`${basePath}/`) || path2 === basePath)) return true;
  return false;
}
function stripEmbedFrameParam(rawUrl) {
  const qIdx = String(rawUrl ?? "").indexOf("?");
  if (qIdx === -1) return rawUrl;
  const pathname = rawUrl.slice(0, qIdx);
  const query = rawUrl.slice(qIdx + 1);
  if (!query) return rawUrl;
  const parts = query.split("&").filter((part) => {
    if (!part) return false;
    const eq = part.indexOf("=");
    const key = (eq === -1 ? part : part.slice(0, eq)).trim();
    return key !== EMBED_FRAME_PARAM;
  });
  const qs = parts.join("&");
  return qs ? `${pathname}?${qs}` : pathname;
}
function rewriteRedirectLocation(location, proxyTarget, assetPath) {
  const { url, origin, basePath } = parseEmbedTarget(proxyTarget);
  const trimmed = location.trim();
  if (!trimmed) return trimmed;
  const mapUpstreamPath = (path2) => {
    if (isUpstreamBundlerPath(path2)) return joinAppPath(assetPath, path2);
    if (basePath && (path2 === basePath || path2.startsWith(`${basePath}/`))) {
      return joinAppPath(assetPath, path2);
    }
    if (basePath) return joinAppPath(assetPath, joinAppPath(basePath, path2));
    return joinAppPath(assetPath, path2);
  };
  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.startsWith(`${url}/`) || trimmed === url) {
      const suffix = trimmed.slice(url.length) || "/";
      const path2 = suffix.startsWith("/") ? suffix : `/${suffix}`;
      return mapUpstreamPath(path2);
    }
    if (trimmed.startsWith(`${origin}/`) || trimmed === origin) {
      const suffix = trimmed.slice(origin.length) || "/";
      const path2 = suffix.startsWith("/") ? suffix : `/${suffix}`;
      return mapUpstreamPath(path2);
    }
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    if (isProxiedPath(trimmed, basePath, assetPath)) return trimmed;
    return mapUpstreamPath(trimmed);
  }
  return trimmed;
}
function rewriteRefreshHeader(refresh, proxyTarget, assetPath) {
  return refresh.replace(
    /url=\s*(\S+)/i,
    (_match, url) => `url=${rewriteRedirectLocation(url, proxyTarget, assetPath)}`
  );
}
function rewriteSetCookiePathForEmbed(setCookieValue, assetPath) {
  const raw = String(setCookieValue ?? "");
  if (!raw) return raw;
  const prefix = assetPath.endsWith("/") ? assetPath : `${assetPath}/`;
  if (/;\s*path\s*=/i.test(raw)) {
    return raw.replace(/;\s*path\s*=[^;]*/i, `; Path=${prefix}`);
  }
  return `${raw}; Path=${prefix}`;
}
function applyProxyResponseHeaders(headers, proxyTarget, assetPath) {
  const out = { ...headers };
  const location = out.location ?? out.Location;
  if (typeof location === "string") {
    out.location = rewriteRedirectLocation(location, proxyTarget, assetPath);
    delete out.Location;
  }
  const refresh = out.refresh ?? out.Refresh;
  if (typeof refresh === "string") {
    out.refresh = rewriteRefreshHeader(refresh, proxyTarget, assetPath);
    delete out.Refresh;
  }
  const setCookie = out["set-cookie"] ?? out["Set-Cookie"];
  if (setCookie != null) {
    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    out["set-cookie"] = list.map((v) => rewriteSetCookiePathForEmbed(String(v), assetPath));
    delete out["Set-Cookie"];
  }
  return out;
}
function rewriteHtmlMetaRefresh(html, proxyTarget, assetPath) {
  return html.replace(
    /(<meta\s[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^"']*url=)([^"';]+)/gi,
    (_match, prefix, url) => `${prefix}${rewriteRedirectLocation(url.trim(), proxyTarget, assetPath)}`
  );
}
function embedPrefix(embedPath) {
  const base = embedPath.endsWith("/") ? embedPath.slice(0, -1) : embedPath;
  return `${base}/`;
}
function resolveEmbedDocumentBase(assetPath, upstreamBasePath = "") {
  const base = upstreamBasePath.replace(/\/$/, "");
  if (!base) return assetPath.endsWith("/") ? assetPath : `${assetPath}/`;
  const embed = assetPath.replace(/\/$/, "");
  return `${embed}${base}/`;
}
var ASSET_PATH_NAMES = [
  "@vite",
  "@react-refresh",
  "@fs",
  "@id",
  "node_modules",
  "src",
  "_next",
  ...EMBED_PUBLIC_PATH_PREFIXES,
  "favicon.ico",
  "favicon.svg"
].join("|");
var QUOTED_URL_SEGMENT = "[^\"'\\`\\)/]+";
var NEXT_DEV_ROOT_PATH = `(?:_next(?:\\/${QUOTED_URL_SEGMENT})?|__nextjs_${QUOTED_URL_SEGMENT}|node_modules_${QUOTED_URL_SEGMENT}|turbopack-${QUOTED_URL_SEGMENT}|turbopack-hmr|webpack-hmr|__webpack_hmr|src_${QUOTED_URL_SEGMENT})`;
var NEXT_DEV_QUOTED_PATH_RE = new RegExp(
  `(?<=["'\`(]|url\\(\\s*["']?)\\/(?!\\/|embedded\\/)(${NEXT_DEV_ROOT_PATH})`,
  "gi"
);
var TURBOPACK_HASH_CHUNK_RE = /(?<=["'\`(])\/(?!\/|embedded\/)(_[a-f0-9]+\._\.\w+)/gi;
var NEXT_FETCH_PATH_RE = /(\bfetch\s*\(\s*["'])\/(?!\/|embedded\/)(__nextjs_[^"']+)/gi;
function rewriteNextDevPaths(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  let out = content.replace(NEXT_DEV_QUOTED_PATH_RE, `${prefix}/$1`);
  out = out.replace(TURBOPACK_HASH_CHUNK_RE, `${prefix}/$1`);
  out = out.replace(NEXT_FETCH_PATH_RE, `$1${prefix}/$2`);
  return out;
}
var PUBLIC_ASSET_ROOTS = [...EMBED_PUBLIC_PATH_PREFIXES, "favicon\\.ico", "favicon\\.svg"].join(
  "|"
);
var ASSET_PATH_PATTERN = `(?:${ASSET_PATH_NAMES})(?:\\/[^"'\\\`\\)\\s]*)?`;
var PUBLIC_STATIC_EXT = "svg|png|jpe?g|gif|webp|ico|avif|woff2?|ttf|eot|otf|mp4|webm|mp3|pdf|json|xml|txt|csv|map";
var PUBLIC_ROOT_FILE = `[^/"'\\\`\\)\\s?#]+\\.(${PUBLIC_STATIC_EXT})(?:\\?[^"'\\)\\s]*)?`;
function isPublicRootFilePath(pathname) {
  const seg = (pathname ?? "").split("?")[0]?.slice(1) ?? "";
  if (!seg || seg.includes("/")) return false;
  return new RegExp(`^[^/"'\\\`\\)\\s?#]+\\.(${PUBLIC_STATIC_EXT})(?:\\?[^"'\\)\\s]*)?$`, "i").test(
    seg
  );
}
function rewritePublicRootFiles(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  return content.replace(
    new RegExp(`(?<=["'\`(]|url\\(\\s*["']?)\\/(?!\\/|embedded\\/)(${PUBLIC_ROOT_FILE})`, "gi"),
    `${prefix}/$1`
  );
}
function rewriteRootPaths(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  const pattern = new RegExp(`(?<=["'\`(])\\/(${ASSET_PATH_PATTERN})`, "g");
  return content.replace(pattern, (match, pathPart) => {
    if (isViteSpecialImportPath(`/${pathPart}`)) return match;
    return `${prefix}/${pathPart}`;
  });
}
function rewriteHtmlAssetAttributes(html, embedPath) {
  const prefix = embedPrefix(embedPath);
  let out = html.replace(
    /(\s)(src|href|poster|data-src|xlink:href)\s*=\s*(["'])\/(?!\/|embedded\/)(@vite|@react-refresh|@fs|@id|node_modules|src|_next|__nextjs)(\/[^"']*)?/gi,
    (match, sp, attr, q, root, rest = "") => {
      const pathPart = `${root}${rest ?? ""}`;
      if (isViteSpecialImportPath(`/${pathPart}`)) return match;
      return `${sp}${attr}=${q}${prefix}${root}${rest}`;
    }
  );
  out = out.replace(
    new RegExp(`(\\s(?:src|href)\\s*=\\s*["'])\\/(?!\\/|embedded\\/)(${PUBLIC_ROOT_FILE})`, "gi"),
    `$1${prefix}$2`
  );
  return out;
}
function rewriteHtmlPreloadLinks(html, embedPath) {
  const prefix = embedPrefix(embedPath);
  return html.replace(
    /(<link\s[^>]*\bhref\s*=\s*)(["'])\/(?!\/|embedded\/)(_next\/[^"']+)/gi,
    `$1$2${prefix}$3`
  );
}
function rewriteNextImageUrls(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  return content.replace(/(["'])\/(?!\/|embedded\/)(_next\/image\?[^"']+)/gi, `$1${prefix}/$2`);
}
var QUOTED_SOURCE_MODULE_PATH = "[^\"'\\`\\)\\s]+\\.(" + VITE_DEV_MODULE_EXT + ")(?:\\?[^\"'\\`\\)\\s]*)?";
function prefixQuotedSourceModulePath(match, lead, quote, pathPart, embedPath) {
  if (isViteSpecialImportPath(`/${pathPart}`)) return match;
  const pathname = `/${String(pathPart).split("?")[0]}`;
  if (!isViteDevModulePath(pathname)) return match;
  const prefix = embedPrefix(embedPath);
  return `${lead}${quote}${prefix}${pathPart}`;
}
function rewriteJsSourceModulePaths(content, embedPath) {
  let out = content;
  const patterns = [
    new RegExp(`(\\bfrom\\s+)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`, "g"),
    new RegExp(`(\\bimport\\s+)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`, "g"),
    new RegExp(
      `(\\bimport\\s*\\(\\s*)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`,
      "g"
    ),
    new RegExp(
      `(\\bnew\\s+URL\\s*\\(\\s*)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`,
      "g"
    )
  ];
  for (const re of patterns) {
    out = out.replace(
      re,
      (match, lead, quote, pathPart) => prefixQuotedSourceModulePath(match, lead, quote, pathPart, embedPath)
    );
  }
  return out;
}
function rewriteHtmlSourceModuleAttributes(html, embedPath) {
  const re = new RegExp(
    `(\\s(?:src|href)\\s*=\\s*)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`,
    "gi"
  );
  return html.replace(
    re,
    (match, lead, quote, pathPart) => prefixQuotedSourceModulePath(match, lead, quote, pathPart, embedPath)
  );
}
function rewriteJsModulePaths(content, embedPath) {
  const prefix = embedPrefix(embedPath);
  const asset = ASSET_PATH_PATTERN;
  function prefixImportMatch(match, lead, quote, pathPart) {
    if (isViteSpecialImportPath(`/${pathPart}`)) return match;
    return `${lead}${quote}${prefix}${pathPart}`;
  }
  let out = content;
  out = out.replace(
    new RegExp(`\\bfrom\\s+(["'])\\/(${asset})`, "g"),
    (match, q, pathPart) => prefixImportMatch(match, "from ", q, pathPart)
  );
  out = out.replace(
    new RegExp(`\\bimport\\s+(["'])\\/(${asset})`, "g"),
    (match, q, pathPart) => prefixImportMatch(match, "import ", q, pathPart)
  );
  out = out.replace(
    new RegExp(`\\bimport\\s*\\(\\s*(["'])\\/(${asset})`, "g"),
    (match, q, pathPart) => prefixImportMatch(match, "import(", q, pathPart)
  );
  out = out.replace(
    new RegExp(`\\bnew\\s+URL\\s*\\(\\s*(["'])\\/(${asset})`, "g"),
    (match, q, pathPart) => prefixImportMatch(match, "new URL(", q, pathPart)
  );
  return out;
}
function rewriteJsPublicAssetPaths(content, embedPath) {
  const prefix = embedPrefix(embedPath);
  let out = content;
  out = out.replace(
    new RegExp(`(["'])\\/(?!\\/|embedded\\/)(${PUBLIC_ASSET_ROOTS})(\\/[^"']*)?`, "g"),
    `$1${prefix}$2$3`
  );
  out = out.replace(
    new RegExp(`\\bsrc:\\s*(["'])\\/(?!\\/|embedded\\/)(${PUBLIC_ROOT_FILE})`, "gi"),
    `src: $1${prefix}$2`
  );
  return out;
}
function rewriteCssUrls(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  let out = content.replace(
    new RegExp(`url\\(\\s*(["']?)\\/(${ASSET_PATH_PATTERN})`, "g"),
    `url($1${prefix}/$2`
  );
  out = rewritePublicRootFiles(out, embedPath);
  return rewriteNextDevPaths(out, embedPath);
}
function rewriteTargetOrigin(content, proxyTarget, assetPath) {
  const { url, origin, basePath } = parseEmbedTarget(proxyTarget);
  const assetPrefix = embedPrefix(assetPath);
  let out = content;
  if (basePath) {
    out = out.replaceAll(`${url}/`, `${basePath}/`);
    out = out.replaceAll(url, basePath);
    out = out.replaceAll(`${origin}/`, assetPrefix);
  } else {
    out = out.replaceAll(`${url}/`, "/");
    out = out.replaceAll(`${origin}/`, assetPrefix);
  }
  return out;
}
function buildHmrContext(req, assetPath) {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] ?? "").split(",")[0].trim().toLowerCase();
  const forwardedHost = String(req?.headers?.["x-forwarded-host"] ?? "").split(",")[0].trim();
  const hostHeader = String(req?.headers?.host ?? "localhost:5173").split(",")[0].trim();
  const browserHostRaw = forwardedHost || hostHeader;
  const proto = forwardedProto || (req?.socket?.encrypted ? "https" : "http");
  let hostname = "localhost";
  let port = proto === "https" ? "443" : "80";
  try {
    const u = new URL(`http://${browserHostRaw}`);
    hostname = u.hostname;
    if (u.port) port = u.port;
  } catch {
    const idx = browserHostRaw.lastIndexOf(":");
    if (idx > 0) {
      hostname = browserHostRaw.slice(0, idx);
      port = browserHostRaw.slice(idx + 1);
    } else {
      hostname = browserHostRaw;
    }
  }
  const basePath = assetPath.endsWith("/") ? assetPath : `${assetPath}/`;
  const portNum = Number(port);
  const defaultPort = proto === "https" ? 443 : 80;
  const publicPortSuffix = Number.isFinite(portNum) && portNum > 0 && portNum !== defaultPort ? `:${port}` : "";
  const publicHost = `${hostname}${publicPortSuffix}`;
  const socketTarget = `${publicHost}${basePath}`;
  const serverHostValue = `${proto}://${publicHost}${basePath}`;
  return {
    browserHost: publicHost,
    hostname,
    port,
    proto,
    basePath,
    socketTarget,
    serverHostValue,
    hmrPort: Number(port) || defaultPort
  };
}
function rewriteViteHmrClient(content, hmrContext) {
  if (!content.includes("serverHost") && !content.includes("__HMR_") && !content.includes("hmrPort") && !content.includes("setupWebSocket")) {
    return content;
  }
  const { socketTarget, serverHostValue, hmrPort, basePath } = hmrContext;
  let out = content;
  out = out.replace(
    /const serverHost = ("[^"]*"|__SERVER_HOST__)/,
    `const serverHost = "${serverHostValue}"`
  );
  out = out.replace(
    /const directSocketHost = ("[^"]*"|__HMR_DIRECT_TARGET__)/,
    `const directSocketHost = "${socketTarget}"`
  );
  out = out.replace(/const hmrPort = ([^;\n]+)/, `const hmrPort = ${hmrPort}`);
  out = out.replace(/const socketHost = `[^`]+`/s, `const socketHost = \`${socketTarget}\``);
  out = out.replace(/const base = (__BASE__[^;]+|["'][^"']*["'])/, `const base = "${basePath}"`);
  out = out.replace(
    /`\$\{socketProtocol\}:\/\/\$\{socketHost\}\?token=\$\{wsToken\}`/g,
    `\`\${socketProtocol}://${socketTarget}?token=\${wsToken}\``
  );
  return out;
}
var EMBED_BOOTSTRAP_SCRIPT = buildEmbedBootstrapScript();
function injectEmbedBootstrapScripts(html) {
  if (html.includes("data-embed-bootstrap")) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${EMBED_BOOTSTRAP_SCRIPT}`);
  }
  return `${EMBED_BOOTSTRAP_SCRIPT}${html}`;
}
function rewriteHtmlLinkTargets(html) {
  return html.replace(/\btarget\s*=\s*["']_top["']/gi, 'target="_self"').replace(/\btarget\s*=\s*["']_parent["']/gi, 'target="_self"');
}
var EMBED_ROUTE_REPORTER = `function embedPrefix(){try{var m=location.pathname.match(/^\\/embedded\\/(\\d{1,5})/);if(m)return"/embedded/"+m[1];var cm=document.cookie.match(/(?:^|;\\s*)embed_port=(\\d{1,5})(?:;|$)/);return cm?"/embedded/"+cm[1]:null}catch(e){return null}}function toEmbedUrl(url){var prefix=embedPrefix();if(!prefix||url==null)return url;try{var abs,rest="";if(typeof url!=="string"){if(typeof URL!=="undefined"&&url instanceof URL){if(url.origin!==location.origin)return url;abs=url.pathname;rest=url.search+url.hash}else return url}else{if(!url||url.charAt(0)==="#")return url;if(/^https?:\\/\\//i.test(url)||url.slice(0,2)==="//"){var x=new URL(url,location.href);if(x.origin!==location.origin)return url;abs=x.pathname;rest=x.search+x.hash}else if(url.charAt(0)!=="/"){return url}else{var qi=url.indexOf("?"),hi=url.indexOf("#"),cut=url.length;if(qi>=0)cut=Math.min(cut,qi);if(hi>=0)cut=Math.min(cut,hi);abs=url.slice(0,cut);rest=url.slice(cut)}}if(abs===prefix||abs.indexOf(prefix+"/")===0)return abs+rest;return prefix+(abs==="/"? "/":abs)+rest}catch(e2){return url}}function reportEmbedRoute(){try{if(window.self===window.top)return;var path=location.pathname,search=location.search,hash=location.hash,m=path.match(/^\\/embedded\\/(\\d{1,5})(\\/.*)?$/),port=m?Number(m[1]):null,app=m?(m[2]||"/"):path;if(!port){try{var cm=document.cookie.match(/(?:^|;\\s*)embed_port=(\\d{1,5})(?:;|$)/);if(cm)port=Number(cm[1])}catch(eC){}}if(!app.startsWith("/"))app="/"+app;window.parent.postMessage({type:"launchpad:embed-route",port:port,path:app+search+hash},location.origin)}catch(e){}}reportEmbedRoute();window.addEventListener("popstate",reportEmbedRoute);window.addEventListener("hashchange",reportEmbedRoute);var _ps=history.pushState,_rs=history.replaceState;history.pushState=function(state,title,url){var r=_ps.call(this,state,title,url!=null?toEmbedUrl(url):url);reportEmbedRoute();return r};history.replaceState=function(state,title,url){var r=_rs.call(this,state,title,url!=null?toEmbedUrl(url):url);reportEmbedRoute();return r};`;
var IFRAME_NAV_GUARD = `<script data-embed-guard>(function(){var u=new URL(location.href);var ch=false;if(u.searchParams.has("embed_frame")){u.searchParams.delete("embed_frame");ch=true}if(u.searchParams.has("embed_port")){u.searchParams.delete("embed_port");ch=true}if(ch){var q=u.searchParams.toString();history.replaceState(null,"",u.pathname+(q?"?"+q:"")+u.hash)}if(window.self===window.top)return;${EMBED_ROUTE_REPORTER}var p=Location.prototype,r=p.replace,a=p.assign;p.replace=function(u){var next=toEmbedUrl(u);if(this===window.top.location){window.self.location.replace(next);return}return r.call(this,next)};p.assign=function(u){var next=toEmbedUrl(u);if(this===window.top.location){window.self.location.assign(next);return}return a.call(this,next)};try{Object.defineProperty(window.top,"location",{set:function(v){window.self.location=toEmbedUrl(v)},get:function(){return window.self.location},configurable:true})}catch(e){}document.addEventListener("click",function(e){var n=e.target&&e.target.closest?e.target.closest("a"):null;if(!n)return;var t=(n.getAttribute("target")||"").toLowerCase();if(t==="_top"||t==="_parent"){e.preventDefault();n.setAttribute("target","_self");window.self.location=toEmbedUrl(n.href);return}var href=n.getAttribute("href");if(!href||href.charAt(0)==="#"||/^https?:/i.test(href))return;var prefix=embedPrefix();if(!prefix||href.charAt(0)!=="/")return;try{var qi=href.indexOf("?"),hi=href.indexOf("#"),cut=href.length;if(qi>=0)cut=Math.min(cut,qi);if(hi>=0)cut=Math.min(cut,hi);var abs=href.slice(0,cut);if(abs===prefix||abs.indexOf(prefix+"/")===0)return;e.preventDefault();window.self.location=toEmbedUrl(href)}catch(e2){}},true)})();</script>`;
function injectIframeNavigationGuard(html) {
  if (html.includes("data-embed-guard")) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${IFRAME_NAV_GUARD}`);
  }
  return `${IFRAME_NAV_GUARD}${html}`;
}
function injectBaseHref(html, baseHref) {
  const href = baseHref.endsWith("/") ? baseHref : `${baseHref}/`;
  const tag = `<base href="${href}">`;
  if (/<base\b[^>]*>/i.test(html)) {
    return html.replace(/<base\b[^>]*>/gi, tag);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
  }
  return `${tag}${html}`;
}
function isVitePrebundledDepPath(pathname) {
  const pathOnly = String(pathname ?? "").split("?")[0];
  return /\/node_modules\/\.vite\/deps(?:_temp)?\//.test(pathOnly);
}
function resolveRewriteRequestPath(req, assetPath) {
  const rawUrl = req?.url ?? "";
  if (rawUrl) {
    const parsed = parseEmbeddedPortRequest(rawUrl);
    if (parsed?.upstreamPath) return parsed.upstreamPath;
    return rawUrl.split("?")[0] ?? "";
  }
  return assetPath ?? "";
}
function rewriteEmbeddedBody(body, contentType, proxyTarget, assetPath, req) {
  const requestPath = resolveRewriteRequestPath(req, assetPath);
  if (contentType.includes("text/html")) {
    const { basePath } = parseEmbedTarget(proxyTarget);
    const appBase = resolveEmbedDocumentBase(assetPath, basePath);
    let out = rewriteTargetOrigin(body, proxyTarget, assetPath);
    out = rewriteHtmlAssetAttributes(out, assetPath);
    out = rewriteHtmlSourceModuleAttributes(out, assetPath);
    out = rewriteHtmlPreloadLinks(out, assetPath);
    out = rewriteRootPaths(out, assetPath);
    out = rewritePublicRootFiles(out, assetPath);
    out = rewriteNextDevPaths(out, assetPath);
    out = rewriteNextImageUrls(out, assetPath);
    out = rewriteHtmlMetaRefresh(out, proxyTarget, assetPath);
    out = rewriteHtmlLinkTargets(out);
    out = injectEmbedBootstrapScripts(out);
    out = injectIframeNavigationGuard(out);
    out = injectBaseHref(out, appBase);
    return out;
  }
  if (contentType.includes("text/css")) {
    return rewriteCssUrls(rewriteTargetOrigin(body, proxyTarget, assetPath), assetPath);
  }
  if (isRewritableScriptContentType(contentType, requestPath)) {
    if (isVitePrebundledDepPath(requestPath)) {
      let out2 = rewriteTargetOrigin(body, proxyTarget, assetPath);
      out2 = rewriteJsModulePaths(out2, assetPath);
      out2 = rewriteReactRouterBasename(out2, { requestPath });
      out2 = rewriteVueRouterBase(out2, { assetPath, requestPath });
      out2 = rewriteTanstackRouterBasepath(out2, { assetPath, requestPath });
      return out2;
    }
    let out = rewriteTargetOrigin(body, proxyTarget, assetPath);
    out = rewriteJsModulePaths(out, assetPath);
    out = rewriteJsSourceModulePaths(out, assetPath);
    out = rewriteJsPublicAssetPaths(out, assetPath);
    out = rewritePublicRootFiles(out, assetPath);
    out = rewriteNextDevPaths(out, assetPath);
    out = rewriteNextImageUrls(out, assetPath);
    out = rewriteReactRouterBasename(out, { requestPath });
    out = rewriteVueRouterBase(out, { assetPath, requestPath });
    out = rewriteTanstackRouterBasepath(out, { assetPath, requestPath });
    if (req) {
      out = rewriteViteHmrClient(out, buildHmrContext(req, assetPath));
    }
    return out;
  }
  return body;
}
function isRewritableScriptContentType(contentType, requestPath) {
  const ct = String(contentType ?? "").toLowerCase();
  if (ct.includes("javascript") || ct.includes("typescript") || ct.includes("text/x-typescript")) {
    return true;
  }
  if (requestPath && isModuleScriptRequestPath(requestPath) && isIncorrectModuleContentType(contentType)) {
    return true;
  }
  return false;
}
function shouldRewriteResponse(contentType, contentEncoding, requestPath) {
  if (requestPath && isViteSpecialImportPath(requestPath)) {
    return false;
  }
  if (contentEncoding && /^(gzip|br|deflate)/i.test(contentEncoding.trim())) {
    return false;
  }
  const isBundledAssetPath = requestPath && /\/(?:static|assets)\//.test(requestPath) && !/\/_next\//.test(requestPath);
  if (isBundledAssetPath) {
    return isRewritableScriptContentType(contentType, requestPath);
  }
  return contentType.includes("text/html") || isRewritableScriptContentType(contentType, requestPath) || contentType.includes("text/css") || contentType.includes("application/json");
}
function parseEmbeddedPortRequest(rawUrl) {
  const pathname = (rawUrl || "/").split("?")[0] ?? "/";
  const match = pathname.match(/^\/embedded\/(\d{1,5})(\/.*)?$/);
  if (!match) return null;
  const port = Number(match[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const rest = match[2] ?? "/";
  const upstreamPath = rest === "/" || rest === "" ? "/" : rest.startsWith("/") ? rest : `/${rest}`;
  return { port, assetPath: `/embedded/${port}`, upstreamPath };
}

// iframe-preview/embedProxyHandler.js
import http from "node:http";

// ../shared/preview-rewrite/embedUpstreamPath.js
function shouldForwardUnstrippedEmbedPath(framework) {
  return String(framework || "").toLowerCase() === "next";
}
function buildEmbedUpstreamConnectPath({ port, upstreamTail, forwardUnstripped = false }) {
  const n = Number(port);
  const raw = String(upstreamTail ?? "");
  const empty = raw === "";
  const tail = empty ? "" : raw.startsWith("/") ? raw : `/${raw}`;
  if (!forwardUnstripped || !Number.isInteger(n) || n < 1 || n > 65535) {
    return tail || "/";
  }
  const prefix = `/embedded/${n}`;
  if (tail === prefix || tail.startsWith(`${prefix}/`)) return tail;
  if (empty || tail === "/") return prefix;
  return `${prefix}${tail}`;
}

// iframe-preview/embedProxyHandler.js
function applyEmbedModuleContentType(headers, requestPath) {
  if (!isModuleScriptRequestPath(requestPath)) return headers;
  const ct = headers["content-type"] ?? headers["Content-Type"];
  if (!isIncorrectModuleContentType(ct)) return headers;
  const out = { ...headers };
  delete out["Content-Type"];
  out["content-type"] = resolveModuleScriptContentType(requestPath);
  return out;
}
function handleEmbedProxyResponse(upstream, req, out, proxyTarget, assetPath) {
  const requestPath = req.url ?? "";
  delete upstream.headers["x-frame-options"];
  delete upstream.headers["content-security-policy"];
  delete upstream.headers["content-security-policy-report-only"];
  const contentType = String(upstream.headers["content-type"] ?? "");
  const contentEncoding = String(upstream.headers["content-encoding"] ?? "");
  const rewriteResponse = shouldRewriteResponse(contentType, contentEncoding, requestPath);
  const chunks = [];
  upstream.on("data", (chunk) => chunks.push(chunk));
  upstream.on("end", () => {
    const raw = Buffer.concat(chunks);
    let headers = applyProxyResponseHeaders(upstream.headers, proxyTarget, assetPath);
    headers = applyEmbedModuleContentType(headers, requestPath);
    let bodyText = raw.toString("utf8");
    if (shouldSynthesizeViteUrlModule(requestPath, contentType, bodyText)) {
      bodyText = synthesizeViteUrlModule(requestPath);
      delete headers["content-length"];
      delete headers["content-encoding"];
      out.writeHead(upstream.statusCode ?? 200, headers);
      out.end(Buffer.from(bodyText, "utf8"));
      return;
    }
    if (rewriteResponse) {
      const effectiveType = headers["content-type"] ?? contentType;
      const text = rewriteEmbeddedBody(bodyText, effectiveType, proxyTarget, assetPath, req);
      const body = Buffer.from(text, "utf8");
      delete headers["content-length"];
      delete headers["content-encoding"];
      out.writeHead(upstream.statusCode ?? 200, headers);
      out.end(body);
    } else {
      out.writeHead(upstream.statusCode ?? 200, headers);
      out.end(raw);
    }
  });
  upstream.on("error", () => {
    if (!out.headersSent) {
      out.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      out.end("Upstream preview error");
    }
  });
}
function proxyErrorHtml(proxyTarget) {
  const hostHint = proxyTarget.includes("host.docker.internal") ? "<p>On your Mac, run the dev server with <code>vite --host</code> (or <code>server.host: true</code>) so Docker can reach it via <code>host.docker.internal</code>.</p>" : proxyTarget.includes("://backend:") ? "<p>The platform is starting the preview dev server. Wait a moment, then reload this page.</p>" : `<p>Start the project dev server on <code>${proxyTarget}</code>, then reload.</p>`;
  return `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px">
    <h1>Cannot reach preview</h1>
    ${hostHint}
  </body></html>`;
}
function proxyEmbeddedRequestInner(req, res, ctx, attempt = 0) {
  const {
    upstreamHost,
    port,
    assetPath,
    upstreamPath,
    relayViaBackendApi = false,
    backendApiPort = 5e3,
    framework = null
  } = ctx;
  const proxyTarget = upstreamViteOrigin(port);
  const host = req.headers.host ?? "localhost:5173";
  const rawUrl = req.url ?? "/";
  const query = rawUrl.includes("?") ? rawUrl.slice(rawUrl.indexOf("?")) : "";
  const pathWithQuery = stripEmbedFrameParam(upstreamPath + query);
  const pathOnly = pathWithQuery.split("?")[0] || "/";
  const queryOnly = pathWithQuery.includes("?") ? pathWithQuery.slice(pathWithQuery.indexOf("?")) : "";
  const upstreamTail = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  const forwardUnstripped = shouldForwardUnstrippedEmbedPath(framework);
  const connectHostname = upstreamHost;
  const connectPort = relayViaBackendApi ? backendApiPort : port;
  const connectPath = relayViaBackendApi ? `/embedded/${port}${upstreamTail === "/" ? "/" : upstreamTail}${queryOnly}` : `${buildEmbedUpstreamConnectPath({
    port,
    upstreamTail,
    forwardUnstripped
  })}${queryOnly}`;
  const connectTarget = `http://${connectHostname}:${connectPort}${connectPath}`;
  const transport = http;
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.connection;
  delete forwardHeaders["proxy-connection"];
  delete forwardHeaders["transfer-encoding"];
  delete forwardHeaders.host;
  const proxyReq = transport.request(
    {
      hostname: connectHostname,
      port: connectPort,
      path: connectPath,
      method: req.method,
      headers: {
        ...forwardHeaders,
        host: upstreamViteHostHeader(port),
        origin: `http://${host}`,
        "accept-encoding": "identity",
        "x-forwarded-prefix": assetPath,
        "x-forwarded-host": host,
        "x-forwarded-proto": "http"
      }
    },
    (proxyRes) => {
      handleEmbedProxyResponse(proxyRes, req, res, proxyTarget, assetPath);
    }
  );
  proxyReq.on("error", () => {
    if (!res.headersSent && attempt < 2) {
      setTimeout(() => proxyEmbeddedRequestInner(req, res, ctx, attempt + 1), 400);
      return;
    }
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/html; charset=utf-8" });
      res.end(proxyErrorHtml(connectTarget));
    }
  });
  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}
function proxyEmbeddedRequest(req, res, ctx) {
  proxyEmbeddedRequestInner(req, res, ctx, 0);
}

// iframe-preview/embedPort.js
var EMBED_PORT_PARAM = "embed_port";
var EMBED_PORT_COOKIE = "embed_port";
function parsePortFromEmbeddedPath(pathname) {
  const m = String(pathname ?? "").match(/^\/embedded\/(\d{1,5})(?:\/|$)/);
  if (!m) return null;
  const port = Number(m[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}
function isClientLinkShellPath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  return /^\/projects\/(?!details(?:\/|$)|onboarding(?:\/|$)|roadmap(?:\/|$))[^/]+\/?$/.test(p);
}
function isLaunchpadHostVitePath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  if (/^\/@(?:vite|react-refresh|fs|id)(?:\/|$)/.test(p)) return true;
  if (/^\/src\//.test(p)) return true;
  if (/^\/node_modules\/vite(?:\/|$)/.test(p)) return true;
  if (/^\/node_modules\/\.vite(?:\/|$)/.test(p)) return true;
  if (/^\/node_modules(?:\/|$)/.test(p)) return true;
  if (/^\/@id\//.test(p)) return true;
  if (/^\/fevicon\.png$/i.test(p) || /^\/favicon\.ico$/i.test(p)) return true;
  return false;
}
function isHostNodeModulesPath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  return /^\/node_modules(?:\/|$)/.test(p);
}
function isLaunchpadProjectsHostPath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  if (p === "/projects" || p === "/projects/") return true;
  return /^\/projects\/(details|onboarding|roadmap)(?:\/|$)/.test(p);
}
function isLaunchpadHostAppPath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  if (!p.startsWith("/") || p === "/") return false;
  if (isLaunchpadProjectsHostPath(p)) return true;
  const first = p.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  return first === "auth" || first === "integrations" || first === "settings" || first === "jobs" || first === "deployments" || first === "prompt-management" || first === "cost-analytics" || first === "model-router" || first === "q" || first === "admin" || first === "releases" || first === "workspace" || first === "client-link";
}
function parsePortFromCookie(header) {
  if (!header) return null;
  const match = String(header).match(
    new RegExp(`(?:^|;\\s*)${EMBED_PORT_COOKIE}=(\\d{1,5})(?:;|$)`)
  );
  if (!match) return null;
  const port = Number(match[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}
function parsePortFromReferer(referer) {
  if (!referer) return null;
  try {
    const { pathname } = new URL(referer);
    return parsePortFromEmbeddedPath(pathname);
  } catch {
    return null;
  }
}
function headerValue(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === lower) return String(value ?? "");
  }
  return "";
}
function isTopLevelDocumentNavigation(req) {
  const dest = headerValue(req?.headers, "sec-fetch-dest").toLowerCase();
  const mode = headerValue(req?.headers, "sec-fetch-mode").toLowerCase();
  if (dest && dest !== "document") return false;
  if (mode && mode !== "navigate" && mode !== "nested-navigate") return false;
  if (!dest && !mode) return false;
  return dest === "document";
}
function requestPathname(req) {
  const rawUrl = req?.url ?? "/";
  try {
    return new URL(rawUrl, "http://localhost").pathname;
  } catch {
    return String(rawUrl).split("?")[0] || "/";
  }
}
function resolveEmbedPortFromRequest(req) {
  const rawUrl = req?.url ?? "/";
  let pathname = "/";
  try {
    const url = new URL(rawUrl, "http://localhost");
    pathname = url.pathname;
    const fromPath = parsePortFromEmbeddedPath(url.pathname);
    if (fromPath) return fromPath;
    const fromQuery = url.searchParams.get(EMBED_PORT_PARAM);
    if (fromQuery && /^\d{1,5}$/.test(fromQuery)) {
      const port = Number(fromQuery);
      if (port >= 1 && port <= 65535) return port;
    }
  } catch {
    pathname = requestPathname(req);
  }
  const referer = req?.headers?.referer;
  const fromReferer = parsePortFromReferer(referer);
  if (fromReferer) return fromReferer;
  if (isHostNodeModulesPath(pathname)) {
    return null;
  }
  const fromCookie = parsePortFromCookie(req?.headers?.cookie);
  if (!fromCookie) return null;
  if (isLaunchpadHostVitePath(pathname) || isPublicRootFilePath(pathname)) {
    return null;
  }
  if (isLaunchpadHostAppPath(pathname)) {
    return null;
  }
  const site = headerValue(req?.headers, "sec-fetch-site").toLowerCase();
  const topLevelDoc = isTopLevelDocumentNavigation(req);
  if (topLevelDoc && (!referer || site === "none" || site === "cross-site")) {
    return null;
  }
  if (isClientLinkShellPath(pathname) && topLevelDoc) {
    if (!referer || site === "none" || site === "cross-site") return null;
    try {
      const refPath = new URL(referer).pathname;
      if (isClientLinkShellPath(refPath) || refPath.startsWith("/projects/details") || refPath.startsWith("/projects/onboarding") || refPath.startsWith("/projects/roadmap")) {
        return null;
      }
    } catch {
      return null;
    }
  }
  if (!referer) {
    return fromCookie;
  }
  const refPort = parsePortFromReferer(referer);
  if (refPort === fromCookie) return fromCookie;
  if (refPort != null) return null;
  try {
    const refPath = new URL(referer).pathname;
    if (isEmbedInfrastructurePath(refPath) && !parsePortFromEmbeddedPath(refPath)) {
      return null;
    }
    if (isClientLinkShellPath(refPath)) return null;
    if (isLaunchpadHostAppPath(refPath)) return null;
    return fromCookie;
  } catch {
    return null;
  }
}

// iframe-preview/rootAssetMiddleware.js
function isOrphanEmbeddedAssetPath(pathname) {
  const p = (pathname ?? "").split("?")[0] ?? "";
  if (!p.startsWith("/") || p.startsWith("/embedded/") || p.startsWith("/iframe-preview/")) {
    return false;
  }
  if (isUpstreamBundlerPath(p)) return true;
  if (EMBED_PUBLIC_PATH_PREFIXES.some((prefix) => p === `/${prefix}` || p.startsWith(`/${prefix}/`))) {
    return true;
  }
  if (isPublicRootFilePath(p)) return true;
  return false;
}
function isOrphanEmbeddedAppPath(pathname) {
  const p = (pathname ?? "").split("?")[0] ?? "";
  if (!p.startsWith("/") || p === "/") return false;
  if (isEmbedInfrastructurePath(p)) return false;
  if (isOrphanEmbeddedAssetPath(p)) return false;
  return true;
}
function isOrphanEmbeddedProxyPath(pathname) {
  return isOrphanEmbeddedAssetPath(pathname) || isOrphanEmbeddedAppPath(pathname);
}
function createEmbeddedRootAssetMiddleware(options = {}) {
  const resolveUpstreamHost = normalizeEmbedUpstreamResolver(options);
  return (req, res, next) => {
    const rawUrl = req.url ?? "/";
    const pathname = rawUrl.split("?")[0] ?? "/";
    if (!isOrphanEmbeddedProxyPath(pathname)) {
      next();
      return;
    }
    const port = resolveEmbedPortFromRequest(req);
    if (!port) {
      next();
      return;
    }
    proxyEmbeddedRequest(req, res, {
      upstreamHost: resolveUpstreamHost(port),
      port,
      assetPath: `/embedded/${port}`,
      upstreamPath: pathname
    });
  };
}

// iframe-preview/middleware.js
function pathRewriteForEmbedded(path2, req) {
  const rawUrl = req?.url ?? path2 ?? "/";
  const parsed = parseEmbeddedPortRequest(rawUrl);
  if (!parsed) return path2 ?? rawUrl;
  const query = rawUrl.includes("?") ? rawUrl.slice(rawUrl.indexOf("?")) : "";
  const up = parsed.upstreamPath || "/";
  const nextHmr = /^\/_next(?:\/|$)/.test(up) || /webpack-hmr|turbopack-hmr|__nextjs_/i.test(up);
  if (nextHmr) {
    return stripEmbedFrameParam(
      `${buildEmbedUpstreamConnectPath({
        port: parsed.port,
        upstreamTail: up,
        forwardUnstripped: true
      })}${query}`
    );
  }
  return stripEmbedFrameParam(up + query);
}
function createEmbeddedProxyMiddleware(options = {}) {
  const resolveUpstreamHost = normalizeEmbedUpstreamResolver(options);
  const rootAssetProxy = createEmbeddedRootAssetMiddleware({ resolveUpstreamHost });
  const backendApiPort = resolveEmbedBackendApiPort();
  const applyWsUpstreamHeaders = (proxyReq, req) => {
    const parsed = parseEmbeddedPortRequest(req.url ?? "/");
    if (!parsed) return;
    const host = upstreamViteHostHeader(parsed.port);
    const origin = `http://${host}`;
    proxyReq.setHeader("host", host);
    proxyReq.setHeader("origin", origin);
  };
  const wsProxy = createProxyMiddleware({
    target: "http://127.0.0.1:1",
    router: (req) => {
      const parsed = parseEmbeddedPortRequest(req.url ?? "/");
      if (!parsed) return void 0;
      const upstreamHost = resolveUpstreamHost(parsed.port);
      return resolveEmbeddedWsUpstreamTarget(upstreamHost, parsed.port);
    },
    changeOrigin: false,
    ws: true,
    xfwd: true,
    pathRewrite: pathRewriteForEmbedded,
    on: {
      proxyReq: (proxyReq, req) => {
        applyWsUpstreamHeaders(proxyReq, req);
      },
      proxyReqWs: (proxyReq, req) => {
        applyWsUpstreamHeaders(proxyReq, req);
      },
      error: (err, req, socket) => {
        if (socket && !socket.destroyed) {
          socket.destroy();
        }
        console.warn(
          `[embed-hmr] WebSocket proxy error ${req?.url ?? "?"}: ${err?.message || err}`
        );
      }
    }
  });
  const middleware = (req, res, next) => {
    const parsed = parseEmbeddedPortRequest(req.url ?? "/");
    if (!parsed) {
      rootAssetProxy(req, res, next);
      return;
    }
    const upstreamHost = resolveUpstreamHost(parsed.port);
    proxyEmbeddedRequest(req, res, {
      upstreamHost,
      port: parsed.port,
      assetPath: parsed.assetPath,
      upstreamPath: parsed.upstreamPath,
      relayViaBackendApi: shouldRelayEmbedViaBackendApi(upstreamHost, parsed.port, options),
      backendApiPort
    });
  };
  middleware.upgrade = wsProxy.upgrade?.bind(wsProxy);
  return middleware;
}
var EMBED_UPGRADE_PREFIX_RE = /^\/(?:embedded|iframe-preview)\//;
var embedUpgradeResolver = createEmbedUpstreamResolver(resolveEmbedUpstreamOptionsFromEnv());
function attachEmbeddedUpgrade(server, embeddedProxy) {
  if (!server?.prependListener) return;
  server.prependListener("upgrade", (req, socket, head) => {
    const raw = req.url ?? "";
    if (!EMBED_UPGRADE_PREFIX_RE.test(raw)) return;
    if (!isPreviewEmbedHmrEnabled()) {
      socket.destroy();
      return;
    }
    const parsed = parseEmbeddedPortRequest(raw);
    if (!parsed || !embeddedProxy?.upgrade) {
      socket.destroy();
      return;
    }
    const upstreamHost = embedUpgradeResolver(parsed.port);
    const target = resolveEmbeddedWsUpstreamTarget(upstreamHost, parsed.port);
    console.log(`[embed-hmr] upgrade ${raw} \u2192 ${target ?? "?"}`);
    embeddedProxy.upgrade(req, socket, head);
  });
}

// vite.config.js
var __vite_injected_original_dirname = "/Users/vraj.g/Desktop/lab/YORK IE LaunchPad/project-management-platform/frontend";
var embedProxyReadyLogged = false;
function attachEmbeddedProxy(server) {
  const embeddedProxy = createEmbeddedProxyMiddleware(resolveEmbedUpstreamOptionsFromEnv());
  server.middlewares.use(embeddedProxy);
  attachEmbeddedUpgrade(server.httpServer, embeddedProxy);
  if (!embedProxyReadyLogged) {
    embedProxyReadyLogged = true;
    console.log("[embed] preview proxy ready \u2014 /embedded/<port>/");
  }
}
function embeddedProxyPlugin() {
  return {
    name: "launchpad-embedded-proxy",
    enforce: "pre",
    configureServer(server) {
      attachEmbeddedProxy(server);
    },
    configurePreviewServer(server) {
      attachEmbeddedProxy(server);
    }
  };
}
var vite_config_default = defineConfig({
  server: {
    port: 5173,
    allowedHosts: [".localhost", "localhost", "127.0.0.1", "backend", "host.docker.internal"]
  },
  preview: {
    port: 5173,
    allowedHosts: [".localhost", "localhost", "127.0.0.1", "backend", "host.docker.internal"]
  },
  plugins: [react(), tailwindcss(), embeddedProxyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Isolate mermaid (heavy transitive graph) to lower peak memory during Docker builds.
        manualChunks(id) {
          if (!id.includes("node_modules")) return void 0;
          if (id.includes("mermaid")) return "mermaid";
          if (id.includes("cytoscape") || id.includes("elkjs") || id.includes("/elk.") || id.includes("katex")) {
            return "mermaid-vendor";
          }
          return void 0;
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAiaWZyYW1lLXByZXZpZXcvbWlkZGxld2FyZS5qcyIsICJpZnJhbWUtcHJldmlldy9lbWJlZFVwc3RyZWFtLmpzIiwgImlmcmFtZS1wcmV2aWV3L2NvbnN0YW50cy5qcyIsICJpZnJhbWUtcHJldmlldy9lbWJlZEhtcldzLmpzIiwgImlmcmFtZS1wcmV2aWV3L3ZpdGVTcGVjaWFsSW1wb3J0LnV0aWwuanMiLCAiLi4vc2hhcmVkL3ByZXZpZXctcmV3cml0ZS9yZWFjdFJvdXRlckJhc2VuYW1lLmpzIiwgIi4uL3NoYXJlZC9wcmV2aWV3LXJld3JpdGUvdnVlUm91dGVyQmFzZS5qcyIsICIuLi9zaGFyZWQvcHJldmlldy1yZXdyaXRlL3RhbnN0YWNrUm91dGVyQmFzZXBhdGguanMiLCAiaWZyYW1lLXByZXZpZXcvcmV3cml0ZVBhdGhzLmpzIiwgImlmcmFtZS1wcmV2aWV3L2VtYmVkUHJveHlIYW5kbGVyLmpzIiwgIi4uL3NoYXJlZC9wcmV2aWV3LXJld3JpdGUvZW1iZWRVcHN0cmVhbVBhdGguanMiLCAiaWZyYW1lLXByZXZpZXcvZW1iZWRQb3J0LmpzIiwgImlmcmFtZS1wcmV2aWV3L3Jvb3RBc3NldE1pZGRsZXdhcmUuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUksgSUUgTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLJTIwSUUlMjBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQge1xuICBhdHRhY2hFbWJlZGRlZFVwZ3JhZGUsXG4gIGNyZWF0ZUVtYmVkZGVkUHJveHlNaWRkbGV3YXJlLFxufSBmcm9tIFwiLi9pZnJhbWUtcHJldmlldy9taWRkbGV3YXJlLmpzXCI7XG5pbXBvcnQgeyByZXNvbHZlRW1iZWRVcHN0cmVhbU9wdGlvbnNGcm9tRW52IH0gZnJvbSBcIi4vaWZyYW1lLXByZXZpZXcvZW1iZWRVcHN0cmVhbS5qc1wiO1xuXG5sZXQgZW1iZWRQcm94eVJlYWR5TG9nZ2VkID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGF0dGFjaEVtYmVkZGVkUHJveHkoc2VydmVyKSB7XG4gIGNvbnN0IGVtYmVkZGVkUHJveHkgPSBjcmVhdGVFbWJlZGRlZFByb3h5TWlkZGxld2FyZShyZXNvbHZlRW1iZWRVcHN0cmVhbU9wdGlvbnNGcm9tRW52KCkpO1xuICAvLyBSb290IG9ycGhhbiBhc3NldHMgZmlyc3QgKHJlZmVyZXIvY29va2llIFx1MjE5MiBwb3J0KSwgdGhlbiAvZW1iZWRkZWQvPHBvcnQ+L1x1MjAyNlxuICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGVtYmVkZGVkUHJveHkpO1xuICBhdHRhY2hFbWJlZGRlZFVwZ3JhZGUoc2VydmVyLmh0dHBTZXJ2ZXIsIGVtYmVkZGVkUHJveHkpO1xuICBpZiAoIWVtYmVkUHJveHlSZWFkeUxvZ2dlZCkge1xuICAgIGVtYmVkUHJveHlSZWFkeUxvZ2dlZCA9IHRydWU7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGUgLS0gc2luZ2xlIGVtYmVkIHByb3h5IHJlYWR5IHNpZ25hbFxuICAgIGNvbnNvbGUubG9nKFwiW2VtYmVkXSBwcmV2aWV3IHByb3h5IHJlYWR5IFx1MjAxNCAvZW1iZWRkZWQvPHBvcnQ+L1wiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbWJlZGRlZFByb3h5UGx1Z2luKCkge1xuICByZXR1cm4ge1xuICAgIG5hbWU6IFwibGF1bmNocGFkLWVtYmVkZGVkLXByb3h5XCIsXG4gICAgZW5mb3JjZTogXCJwcmVcIixcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBhdHRhY2hFbWJlZGRlZFByb3h5KHNlcnZlcik7XG4gICAgfSxcbiAgICBjb25maWd1cmVQcmV2aWV3U2VydmVyKHNlcnZlcikge1xuICAgICAgYXR0YWNoRW1iZWRkZWRQcm94eShzZXJ2ZXIpO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgYWxsb3dlZEhvc3RzOiBbXCIubG9jYWxob3N0XCIsIFwibG9jYWxob3N0XCIsIFwiMTI3LjAuMC4xXCIsIFwiYmFja2VuZFwiLCBcImhvc3QuZG9ja2VyLmludGVybmFsXCJdLFxuICB9LFxuICBwcmV2aWV3OiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBhbGxvd2VkSG9zdHM6IFtcIi5sb2NhbGhvc3RcIiwgXCJsb2NhbGhvc3RcIiwgXCIxMjcuMC4wLjFcIiwgXCJiYWNrZW5kXCIsIFwiaG9zdC5kb2NrZXIuaW50ZXJuYWxcIl0sXG4gIH0sXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpLCBlbWJlZGRlZFByb3h5UGx1Z2luKCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIC8vIElzb2xhdGUgbWVybWFpZCAoaGVhdnkgdHJhbnNpdGl2ZSBncmFwaCkgdG8gbG93ZXIgcGVhayBtZW1vcnkgZHVyaW5nIERvY2tlciBidWlsZHMuXG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibWVybWFpZFwiKSkgcmV0dXJuIFwibWVybWFpZFwiO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiY3l0b3NjYXBlXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcImVsa2pzXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9lbGsuXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcImthdGV4XCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJtZXJtYWlkLXZlbmRvclwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyBJRSBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUksgSUUgTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9mcm9udGVuZC9pZnJhbWUtcHJldmlldy9taWRkbGV3YXJlLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyUyMElFJTIwTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9mcm9udGVuZC9pZnJhbWUtcHJldmlldy9taWRkbGV3YXJlLmpzXCI7aW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIH0gZnJvbSBcImh0dHAtcHJveHktbWlkZGxld2FyZVwiO1xuaW1wb3J0IHtcbiAgY3JlYXRlRW1iZWRVcHN0cmVhbVJlc29sdmVyLFxuICBub3JtYWxpemVFbWJlZFVwc3RyZWFtUmVzb2x2ZXIsXG4gIGlzUHJldmlld0VtYmVkSG1yRW5hYmxlZCxcbiAgcmVzb2x2ZUVtYmVkQmFja2VuZEFwaVBvcnQsXG4gIHJlc29sdmVFbWJlZGRlZFdzVXBzdHJlYW1UYXJnZXQsXG4gIHJlc29sdmVFbWJlZFVwc3RyZWFtT3B0aW9uc0Zyb21FbnYsXG4gIHNob3VsZFJlbGF5RW1iZWRWaWFCYWNrZW5kQXBpLFxuICB1cHN0cmVhbVZpdGVIb3N0SGVhZGVyLFxufSBmcm9tIFwiLi9lbWJlZFVwc3RyZWFtLmpzXCI7XG5pbXBvcnQgeyBwYXJzZUVtYmVkZGVkUG9ydFJlcXVlc3QsIHN0cmlwRW1iZWRGcmFtZVBhcmFtIH0gZnJvbSBcIi4vcmV3cml0ZVBhdGhzLmpzXCI7XG5pbXBvcnQgeyBwcm94eUVtYmVkZGVkUmVxdWVzdCB9IGZyb20gXCIuL2VtYmVkUHJveHlIYW5kbGVyLmpzXCI7XG5pbXBvcnQgeyBjcmVhdGVFbWJlZGRlZFJvb3RBc3NldE1pZGRsZXdhcmUgfSBmcm9tIFwiLi9yb290QXNzZXRNaWRkbGV3YXJlLmpzXCI7XG5pbXBvcnQgeyBidWlsZEVtYmVkVXBzdHJlYW1Db25uZWN0UGF0aCB9IGZyb20gXCIuLi8uLi9zaGFyZWQvcHJldmlldy1yZXdyaXRlL2VtYmVkVXBzdHJlYW1QYXRoLmpzXCI7XG5cbi8qKiBIUE0gY2FsbHMgcGF0aFJld3JpdGUocGF0aCwgcmVxKSBcdTIwMTQgcGF0aCBpcyB0aGUgcmVxdWVzdCBwYXRobmFtZS4gKi9cbmZ1bmN0aW9uIHBhdGhSZXdyaXRlRm9yRW1iZWRkZWQocGF0aCwgcmVxKSB7XG4gIGNvbnN0IHJhd1VybCA9IHJlcT8udXJsID8/IHBhdGggPz8gXCIvXCI7XG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlRW1iZWRkZWRQb3J0UmVxdWVzdChyYXdVcmwpO1xuICBpZiAoIXBhcnNlZCkgcmV0dXJuIHBhdGggPz8gcmF3VXJsO1xuICBjb25zdCBxdWVyeSA9IHJhd1VybC5pbmNsdWRlcyhcIj9cIikgPyByYXdVcmwuc2xpY2UocmF3VXJsLmluZGV4T2YoXCI/XCIpKSA6IFwiXCI7XG4gIGNvbnN0IHVwID0gcGFyc2VkLnVwc3RyZWFtUGF0aCB8fCBcIi9cIjtcbiAgLy8gTmV4dCB3aXRoIGJhc2VQYXRoIHNlcnZlcyBITVIgdW5kZXIgL2VtYmVkZGVkLzxwb3J0Pi9fbmV4dC9cdTIwMjYgXHUyMDE0IGtlZXAgcHJlZml4IGZvciB0aG9zZS5cbiAgY29uc3QgbmV4dEhtciA9IC9eXFwvX25leHQoPzpcXC98JCkvLnRlc3QodXApIHx8IC93ZWJwYWNrLWhtcnx0dXJib3BhY2staG1yfF9fbmV4dGpzXy9pLnRlc3QodXApO1xuICBpZiAobmV4dEhtcikge1xuICAgIHJldHVybiBzdHJpcEVtYmVkRnJhbWVQYXJhbShcbiAgICAgIGAke2J1aWxkRW1iZWRVcHN0cmVhbUNvbm5lY3RQYXRoKHtcbiAgICAgICAgcG9ydDogcGFyc2VkLnBvcnQsXG4gICAgICAgIHVwc3RyZWFtVGFpbDogdXAsXG4gICAgICAgIGZvcndhcmRVbnN0cmlwcGVkOiB0cnVlLFxuICAgICAgfSl9JHtxdWVyeX1gLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHN0cmlwRW1iZWRGcmFtZVBhcmFtKHVwICsgcXVlcnkpO1xufVxuXG4vKipcbiAqIEhUVFA6IGRpcmVjdCBwcm94eSArIGJvZHkgcmV3cml0ZSAocmVsaWFibGUgSFRNTCB0cmFuc2Zvcm0pLlxuICogV2ViU29ja2V0OiBodHRwLXByb3h5LW1pZGRsZXdhcmUgdXBncmFkZSB0byB1cHN0cmVhbSBkZXYgc2VydmVyIHBvcnQgKG5vdCBBUEkgcmVsYXkpLlxuICogQHBhcmFtIHt7IHVwc3RyZWFtSG9zdD86IHN0cmluZywgcmVzb2x2ZVVwc3RyZWFtSG9zdD86IChwb3J0OiBudW1iZXIpID0+IHN0cmluZyB9fSBbb3B0aW9uc11cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtYmVkZGVkUHJveHlNaWRkbGV3YXJlKG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCByZXNvbHZlVXBzdHJlYW1Ib3N0ID0gbm9ybWFsaXplRW1iZWRVcHN0cmVhbVJlc29sdmVyKG9wdGlvbnMpO1xuICBjb25zdCByb290QXNzZXRQcm94eSA9IGNyZWF0ZUVtYmVkZGVkUm9vdEFzc2V0TWlkZGxld2FyZSh7IHJlc29sdmVVcHN0cmVhbUhvc3QgfSk7XG4gIGNvbnN0IGJhY2tlbmRBcGlQb3J0ID0gcmVzb2x2ZUVtYmVkQmFja2VuZEFwaVBvcnQoKTtcblxuICBjb25zdCBhcHBseVdzVXBzdHJlYW1IZWFkZXJzID0gKHByb3h5UmVxLCByZXEpID0+IHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUVtYmVkZGVkUG9ydFJlcXVlc3QocmVxLnVybCA/PyBcIi9cIik7XG4gICAgaWYgKCFwYXJzZWQpIHJldHVybjtcbiAgICBjb25zdCBob3N0ID0gdXBzdHJlYW1WaXRlSG9zdEhlYWRlcihwYXJzZWQucG9ydCk7XG4gICAgY29uc3Qgb3JpZ2luID0gYGh0dHA6Ly8ke2hvc3R9YDtcbiAgICBwcm94eVJlcS5zZXRIZWFkZXIoXCJob3N0XCIsIGhvc3QpO1xuICAgIHByb3h5UmVxLnNldEhlYWRlcihcIm9yaWdpblwiLCBvcmlnaW4pO1xuICB9O1xuXG4gIGNvbnN0IHdzUHJveHkgPSBjcmVhdGVQcm94eU1pZGRsZXdhcmUoe1xuICAgIHRhcmdldDogXCJodHRwOi8vMTI3LjAuMC4xOjFcIixcbiAgICByb3V0ZXI6IChyZXEpID0+IHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlRW1iZWRkZWRQb3J0UmVxdWVzdChyZXEudXJsID8/IFwiL1wiKTtcbiAgICAgIGlmICghcGFyc2VkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgY29uc3QgdXBzdHJlYW1Ib3N0ID0gcmVzb2x2ZVVwc3RyZWFtSG9zdChwYXJzZWQucG9ydCk7XG4gICAgICByZXR1cm4gcmVzb2x2ZUVtYmVkZGVkV3NVcHN0cmVhbVRhcmdldCh1cHN0cmVhbUhvc3QsIHBhcnNlZC5wb3J0KTtcbiAgICB9LFxuICAgIGNoYW5nZU9yaWdpbjogZmFsc2UsXG4gICAgd3M6IHRydWUsXG4gICAgeGZ3ZDogdHJ1ZSxcbiAgICBwYXRoUmV3cml0ZTogcGF0aFJld3JpdGVGb3JFbWJlZGRlZCxcbiAgICBvbjoge1xuICAgICAgcHJveHlSZXE6IChwcm94eVJlcSwgcmVxKSA9PiB7XG4gICAgICAgIGFwcGx5V3NVcHN0cmVhbUhlYWRlcnMocHJveHlSZXEsIHJlcSk7XG4gICAgICB9LFxuICAgICAgcHJveHlSZXFXczogKHByb3h5UmVxLCByZXEpID0+IHtcbiAgICAgICAgYXBwbHlXc1Vwc3RyZWFtSGVhZGVycyhwcm94eVJlcSwgcmVxKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogKGVyciwgcmVxLCBzb2NrZXQpID0+IHtcbiAgICAgICAgaWYgKHNvY2tldCAmJiAhc29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGUgLS0gZW1iZWQgSE1SIGRpYWdub3N0aWNzXG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgW2VtYmVkLWhtcl0gV2ViU29ja2V0IHByb3h5IGVycm9yICR7cmVxPy51cmwgPz8gXCI/XCJ9OiAke2Vycj8ubWVzc2FnZSB8fCBlcnJ9YCxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbiAgY29uc3QgbWlkZGxld2FyZSA9IChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlRW1iZWRkZWRQb3J0UmVxdWVzdChyZXEudXJsID8/IFwiL1wiKTtcbiAgICBpZiAoIXBhcnNlZCkge1xuICAgICAgcm9vdEFzc2V0UHJveHkocmVxLCByZXMsIG5leHQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHVwc3RyZWFtSG9zdCA9IHJlc29sdmVVcHN0cmVhbUhvc3QocGFyc2VkLnBvcnQpO1xuICAgIHByb3h5RW1iZWRkZWRSZXF1ZXN0KHJlcSwgcmVzLCB7XG4gICAgICB1cHN0cmVhbUhvc3QsXG4gICAgICBwb3J0OiBwYXJzZWQucG9ydCxcbiAgICAgIGFzc2V0UGF0aDogcGFyc2VkLmFzc2V0UGF0aCxcbiAgICAgIHVwc3RyZWFtUGF0aDogcGFyc2VkLnVwc3RyZWFtUGF0aCxcbiAgICAgIHJlbGF5VmlhQmFja2VuZEFwaTogc2hvdWxkUmVsYXlFbWJlZFZpYUJhY2tlbmRBcGkodXBzdHJlYW1Ib3N0LCBwYXJzZWQucG9ydCwgb3B0aW9ucyksXG4gICAgICBiYWNrZW5kQXBpUG9ydCxcbiAgICB9KTtcbiAgfTtcblxuICBtaWRkbGV3YXJlLnVwZ3JhZGUgPSB3c1Byb3h5LnVwZ3JhZGU/LmJpbmQod3NQcm94eSk7XG4gIHJldHVybiBtaWRkbGV3YXJlO1xufVxuXG5jb25zdCBFTUJFRF9VUEdSQURFX1BSRUZJWF9SRSA9IC9eXFwvKD86ZW1iZWRkZWR8aWZyYW1lLXByZXZpZXcpXFwvLztcbmNvbnN0IGVtYmVkVXBncmFkZVJlc29sdmVyID0gY3JlYXRlRW1iZWRVcHN0cmVhbVJlc29sdmVyKHJlc29sdmVFbWJlZFVwc3RyZWFtT3B0aW9uc0Zyb21FbnYoKSk7XG5cbi8qKlxuICogRm9yd2FyZCBXZWJTb2NrZXQgdXBncmFkZXMgZm9yIGVtYmVkIEhNUiwgb3IgZGVzdHJveSB3aGVuIGRpc2FibGVkIC8gaW52YWxpZC5cbiAqIEBwYXJhbSB7aW1wb3J0KCdodHRwJykuU2VydmVyfSBzZXJ2ZXJcbiAqIEBwYXJhbSB7UmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlRW1iZWRkZWRQcm94eU1pZGRsZXdhcmU+fSBbZW1iZWRkZWRQcm94eV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGF0dGFjaEVtYmVkZGVkVXBncmFkZShzZXJ2ZXIsIGVtYmVkZGVkUHJveHkpIHtcbiAgaWYgKCFzZXJ2ZXI/LnByZXBlbmRMaXN0ZW5lcikgcmV0dXJuO1xuICBzZXJ2ZXIucHJlcGVuZExpc3RlbmVyKFwidXBncmFkZVwiLCAocmVxLCBzb2NrZXQsIGhlYWQpID0+IHtcbiAgICBjb25zdCByYXcgPSByZXEudXJsID8/IFwiXCI7XG4gICAgaWYgKCFFTUJFRF9VUEdSQURFX1BSRUZJWF9SRS50ZXN0KHJhdykpIHJldHVybjtcblxuICAgIGlmICghaXNQcmV2aWV3RW1iZWRIbXJFbmFibGVkKCkpIHtcbiAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VFbWJlZGRlZFBvcnRSZXF1ZXN0KHJhdyk7XG4gICAgaWYgKCFwYXJzZWQgfHwgIWVtYmVkZGVkUHJveHk/LnVwZ3JhZGUpIHtcbiAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdXBzdHJlYW1Ib3N0ID0gZW1iZWRVcGdyYWRlUmVzb2x2ZXIocGFyc2VkLnBvcnQpO1xuICAgIGNvbnN0IHRhcmdldCA9IHJlc29sdmVFbWJlZGRlZFdzVXBzdHJlYW1UYXJnZXQodXBzdHJlYW1Ib3N0LCBwYXJzZWQucG9ydCk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGUgLS0gZW1iZWQgSE1SIGRpYWdub3N0aWNzIChkb2NrZXIgbG9ncylcbiAgICBjb25zb2xlLmxvZyhgW2VtYmVkLWhtcl0gdXBncmFkZSAke3Jhd30gXHUyMTkyICR7dGFyZ2V0ID8/IFwiP1wifWApO1xuICAgIGVtYmVkZGVkUHJveHkudXBncmFkZShyZXEsIHNvY2tldCwgaGVhZCk7XG4gIH0pO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUksgSUUgTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9mcm9udGVuZC9pZnJhbWUtcHJldmlld1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXcvZW1iZWRVcHN0cmVhbS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUkslMjBJRSUyMExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXcvZW1iZWRVcHN0cmVhbS5qc1wiOy8qKiBAdHlwZWRlZiB7eyB1cHN0cmVhbUhvc3Q/OiBzdHJpbmcsIGhvc3REZXZVcHN0cmVhbUhvc3Q/OiBzdHJpbmcgfCBudWxsLCBwcm9qZWN0UG9ydFN0YXJ0PzogbnVtYmVyIHwgc3RyaW5nLCBwcm9qZWN0UG9ydEVuZD86IG51bWJlciB8IHN0cmluZywgcmVzb2x2ZVVwc3RyZWFtSG9zdD86IChwb3J0OiBudW1iZXIpID0+IHN0cmluZyB9fSBFbWJlZFVwc3RyZWFtT3B0aW9ucyAqL1xuXG5jb25zdCBERUZBVUxUX1BST0pFQ1RfUE9SVF9TVEFSVCA9IDgwMDE7XG5jb25zdCBERUZBVUxUX1BST0pFQ1RfUE9SVF9FTkQgPSA4MTAwO1xuXG4vKiogV2hlbiBmYWxzZSwgZW1iZWQgcHJveHkgZHJvcHMgV2ViU29ja2V0IHVwZ3JhZGVzIGFuZCBiYWNrZW5kIGRpc2FibGVzIEhNUiBlbnYuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmV2aWV3RW1iZWRIbXJFbmFibGVkKCkge1xuICBjb25zdCBmbGFnID0gU3RyaW5nKHByb2Nlc3MuZW52LlBSRVZJRVdfRU1CRURfSE1SID8/IFwiMVwiKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIGZsYWcgIT09IFwiMFwiICYmIGZsYWcgIT09IFwiZmFsc2VcIiAmJiBmbGFnICE9PSBcIm5vXCI7XG59XG5cbi8qKiBOZ2lueCAvIGluLWNvbnRhaW5lciBwcm9qZWN0IHByZXZpZXdzIChiYWNrZW5kIGNvbnRhaW5lcikuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCYWNrZW5kUHJvamVjdFBvcnQocG9ydCwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcihwb3J0KSAmJiBwb3J0ID49IHN0YXJ0ICYmIHBvcnQgPD0gZW5kO1xufVxuXG4vKipcbiAqIFBpY2sgdXBzdHJlYW0gaG9zdG5hbWUgZm9yIC9lbWJlZGRlZC88cG9ydD4vIChEb2NrZXIgdnMgbG9jYWwgVml0ZSkuXG4gKiBXaGVuIGBob3N0RGV2VXBzdHJlYW1Ib3N0YCBpcyBzZXQgKERvY2tlciksIHBvcnRzIGluIFtzdGFydCxlbmRdIFx1MjE5MiBiYWNrZW5kOyBvdGhlcnMgXHUyMTkyIGhvc3QgZGV2LlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1iZWRVcHN0cmVhbVJlc29sdmVyKHtcbiAgdXBzdHJlYW1Ib3N0ID0gXCJsb2NhbGhvc3RcIixcbiAgaG9zdERldlVwc3RyZWFtSG9zdCA9IG51bGwsXG4gIHByb2plY3RQb3J0U3RhcnQgPSBERUZBVUxUX1BST0pFQ1RfUE9SVF9TVEFSVCxcbiAgcHJvamVjdFBvcnRFbmQgPSBERUZBVUxUX1BST0pFQ1RfUE9SVF9FTkQsXG59ID0ge30pIHtcbiAgY29uc3QgYmFja2VuZEhvc3QgPSBTdHJpbmcodXBzdHJlYW1Ib3N0IHx8IFwibG9jYWxob3N0XCIpLnRyaW0oKSB8fCBcImxvY2FsaG9zdFwiO1xuICBjb25zdCBkZXZIb3N0ID0gaG9zdERldlVwc3RyZWFtSG9zdFxuICAgID8gU3RyaW5nKGhvc3REZXZVcHN0cmVhbUhvc3QpLnRyaW0oKSB8fCBudWxsXG4gICAgOiBudWxsO1xuICBjb25zdCBzdGFydCA9IE51bWJlcihwcm9qZWN0UG9ydFN0YXJ0KSB8fCBERUZBVUxUX1BST0pFQ1RfUE9SVF9TVEFSVDtcbiAgY29uc3QgZW5kID0gTnVtYmVyKHByb2plY3RQb3J0RW5kKSB8fCBERUZBVUxUX1BST0pFQ1RfUE9SVF9FTkQ7XG5cbiAgcmV0dXJuIChwb3J0KSA9PiB7XG4gICAgaWYgKGRldkhvc3QgJiYgaXNCYWNrZW5kUHJvamVjdFBvcnQocG9ydCwgc3RhcnQsIGVuZCkpIHtcbiAgICAgIHJldHVybiBiYWNrZW5kSG9zdDtcbiAgICB9XG4gICAgaWYgKGRldkhvc3QpIHtcbiAgICAgIHJldHVybiBkZXZIb3N0O1xuICAgIH1cbiAgICByZXR1cm4gYmFja2VuZEhvc3Q7XG4gIH07XG59XG5cbi8qKiBAcmV0dXJucyB7RW1iZWRVcHN0cmVhbU9wdGlvbnN9ICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUVtYmVkVXBzdHJlYW1PcHRpb25zRnJvbUVudigpIHtcbiAgY29uc3QgaG9zdERldiA9IHByb2Nlc3MuZW52LkVNQkVEX0hPU1RfREVWX1VQU1RSRUFNX0hPU1Q/LnRyaW0oKTtcbiAgcmV0dXJuIHtcbiAgICB1cHN0cmVhbUhvc3Q6IHByb2Nlc3MuZW52LkVNQkVEX1VQU1RSRUFNX0hPU1QgfHwgXCJsb2NhbGhvc3RcIixcbiAgICBob3N0RGV2VXBzdHJlYW1Ib3N0OiBob3N0RGV2IHx8IG51bGwsXG4gICAgcHJvamVjdFBvcnRTdGFydDogcHJvY2Vzcy5lbnYuUFJPSkVDVF9QT1JUX1NUQVJULFxuICAgIHByb2plY3RQb3J0RW5kOiBwcm9jZXNzLmVudi5QUk9KRUNUX1BPUlRfRU5ELFxuICB9O1xufVxuXG4vKiogQHBhcmFtIHtFbWJlZFVwc3RyZWFtT3B0aW9uc30gW29wdGlvbnNdICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplRW1iZWRVcHN0cmVhbVJlc29sdmVyKG9wdGlvbnMgPSB7fSkge1xuICBpZiAodHlwZW9mIG9wdGlvbnMucmVzb2x2ZVVwc3RyZWFtSG9zdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMucmVzb2x2ZVVwc3RyZWFtSG9zdDtcbiAgfVxuICByZXR1cm4gY3JlYXRlRW1iZWRVcHN0cmVhbVJlc29sdmVyKG9wdGlvbnMpO1xufVxuXG4vKiogVml0ZSBgSG9zdGAgaGVhZGVyIFx1MjAxNCBuZXZlciBzZW5kIERvY2tlciBzZXJ2aWNlIG5hbWVzIChiYWNrZW5kLCBob3N0LmRvY2tlci5pbnRlcm5hbCkuICovXG5leHBvcnQgZnVuY3Rpb24gdXBzdHJlYW1WaXRlSG9zdEhlYWRlcihwb3J0KSB7XG4gIHJldHVybiBgbG9jYWxob3N0OiR7cG9ydH1gO1xufVxuXG4vKiogTG9naWNhbCB1cHN0cmVhbSBvcmlnaW4gZm9yIGJvZHkvVVJMIHJld3JpdGUgKG1hdGNoZXMgd2hhdCB0aGUgZGV2IHNlcnZlciBzZXJ2ZXMpLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwc3RyZWFtVml0ZU9yaWdpbihwb3J0KSB7XG4gIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9YDtcbn1cblxuLyoqIEJhY2tlbmQgQVBJIHBvcnQgZm9yIGluLWNvbnRhaW5lciBlbWJlZCByZWxheSAoRG9ja2VyOiBmcm9udGVuZCBcdTIxOTIgYmFja2VuZDo1MDAwL2VtYmVkZGVkLzpwb3J0KS4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRW1iZWRCYWNrZW5kQXBpUG9ydCgpIHtcbiAgY29uc3QgbiA9IE51bWJlcihwcm9jZXNzLmVudi5FTUJFRF9CQUNLRU5EX0FQSV9QT1JUIHx8IHByb2Nlc3MuZW52LlBPUlQgfHwgNTAwMCk7XG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKG4pICYmIG4gPiAwICYmIG4gPD0gNjU1MzUgPyBuIDogNTAwMDtcbn1cblxuLyoqXG4gKiBSb3V0ZSBwcm9qZWN0IHByZXZpZXdzIHRocm91Z2ggYmFja2VuZCBFeHByZXNzIGAvZW1iZWRkZWQvOnBvcnRgICgxMjcuMC4wLjEgaW5zaWRlIGJhY2tlbmQpLlxuICogQXZvaWRzIDUwMiB3aGVuIHByZXZpZXcgbGlzdGVucyBvbmx5IG9uIGxvb3BiYWNrIG9yIHByZXZpZXcgcG9ydHMgYXJlIG5vdCBvbiB0aGUgRG9ja2VyIGJyaWRnZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB1cHN0cmVhbUhvc3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3J0XG4gKiBAcGFyYW0ge0VtYmVkVXBzdHJlYW1PcHRpb25zfSBbb3B0c11cbiAqL1xuLyoqIFdlYlNvY2tldCBwcm94eSB0YXJnZXQ6IHByb2plY3QgZGV2IHBvcnQgKG5vdCBFeHByZXNzIC9lbWJlZGRlZCByZWxheSBvbiA6NTAwMCkuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUVtYmVkZGVkV3NVcHN0cmVhbVRhcmdldCh1cHN0cmVhbUhvc3QsIHBvcnQpIHtcbiAgY29uc3QgaG9zdCA9IFN0cmluZyh1cHN0cmVhbUhvc3QgfHwgXCJsb2NhbGhvc3RcIikudHJpbSgpIHx8IFwibG9jYWxob3N0XCI7XG4gIGNvbnN0IG4gPSBOdW1iZXIocG9ydCk7XG4gIGlmICghTnVtYmVyLmlzSW50ZWdlcihuKSB8fCBuIDwgMSB8fCBuID4gNjU1MzUpIHJldHVybiBudWxsO1xuICByZXR1cm4gYGh0dHA6Ly8ke2hvc3R9OiR7bn1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hvdWxkUmVsYXlFbWJlZFZpYUJhY2tlbmRBcGkodXBzdHJlYW1Ib3N0LCBwb3J0LCBvcHRzID0ge30pIHtcbiAgY29uc3QgZmxhZyA9IFN0cmluZyhwcm9jZXNzLmVudi5FTUJFRF9SRUxBWV9WSUFfQkFDS0VORF9BUEkgPz8gXCJcIilcbiAgICAudHJpbSgpXG4gICAgLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChmbGFnID09PSBcIjBcIiB8fCBmbGFnID09PSBcImZhbHNlXCIgfHwgZmxhZyA9PT0gXCJub1wiKSByZXR1cm4gZmFsc2U7XG4gIGlmIChmbGFnID09PSBcIjFcIiB8fCBmbGFnID09PSBcInRydWVcIiB8fCBmbGFnID09PSBcInllc1wiKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgaG9zdCA9IFN0cmluZyh1cHN0cmVhbUhvc3QgfHwgXCJcIilcbiAgICAudHJpbSgpXG4gICAgLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChob3N0ICE9PSBcImJhY2tlbmRcIikgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBzdGFydCA9XG4gICAgTnVtYmVyKG9wdHMucHJvamVjdFBvcnRTdGFydCkgfHwgREVGQVVMVF9QUk9KRUNUX1BPUlRfU1RBUlQ7XG4gIGNvbnN0IGVuZCA9IE51bWJlcihvcHRzLnByb2plY3RQb3J0RW5kKSB8fCBERUZBVUxUX1BST0pFQ1RfUE9SVF9FTkQ7XG4gIHJldHVybiBpc0JhY2tlbmRQcm9qZWN0UG9ydChwb3J0LCBzdGFydCwgZW5kKTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXdcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyBJRSBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L2NvbnN0YW50cy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUkslMjBJRSUyMExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXcvY29uc3RhbnRzLmpzXCI7LyoqIFF1ZXJ5IHBhcmFtIG9uIHRoZSBpZnJhbWUgZW50cnkgVVJMIFx1MjAxNCBzdHJpcHBlZCBiZWZvcmUgUmVhY3QgUm91dGVyIGJvb3RzLiAqL1xuZXhwb3J0IGNvbnN0IEVNQkVEX0ZSQU1FX1BBUkFNID0gXCJlbWJlZF9mcmFtZVwiO1xuXG4vKiogVVJMIHByZWZpeCBwYXR0ZXJuOiAvZW1iZWRkZWQvPHBvcnQ+ICovXG5leHBvcnQgY29uc3QgRU1CRURERURfUEFUSF9QUkVGSVggPSBcIi9lbWJlZGRlZFwiO1xuXG4vKipcbiAqIEluZnJhc3RydWN0dXJlIHByZWZpeGVzIHRoYXQgbXVzdCBuZXZlciBiZSBvcnBoYW4tcHJveGllZCB0byBhIHByb2plY3QgcHJldmlldy5cbiAqIE5vdCBhIHByb2R1Y3Qtcm91dGUgZGVueWxpc3QgXHUyMDE0IGFwcHMgbWF5IHVzZSAvbG9naW4sIC9wcm9qZWN0cywgL3NldHRpbmdzLCBldGMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VtYmVkSW5mcmFzdHJ1Y3R1cmVQYXRoKHBhdGhuYW1lKSB7XG4gIGNvbnN0IHAgPSBTdHJpbmcocGF0aG5hbWUgPz8gXCJcIikuc3BsaXQoXCI/XCIpWzBdID8/IFwiXCI7XG4gIGlmICghcC5zdGFydHNXaXRoKFwiL1wiKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAocCA9PT0gXCIvYXBpXCIgfHwgcC5zdGFydHNXaXRoKFwiL2FwaS9cIikpIHJldHVybiB0cnVlO1xuICBpZiAocCA9PT0gXCIvZW1iZWRkZWRcIiB8fCBwLnN0YXJ0c1dpdGgoXCIvZW1iZWRkZWQvXCIpKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKHAgPT09IFwiL2lmcmFtZS1wcmV2aWV3XCIgfHwgcC5zdGFydHNXaXRoKFwiL2lmcmFtZS1wcmV2aWV3L1wiKSkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXdcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyBJRSBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L2VtYmVkSG1yV3MuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLJTIwSUUlMjBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L2VtYmVkSG1yV3MuanNcIjsvKiogcG9zdE1lc3NhZ2UgdHlwZSBmcm9tIGVtYmVkIGlmcmFtZSBcdTIxOTIgQ2xpZW50IExpbmsgcGFyZW50IHdoZW4gVml0ZS9OZXh0IEhNUiBXZWJTb2NrZXQgZmFpbHMuICovXG5leHBvcnQgY29uc3QgRU1CRURfSE1SX1dTX01FU1NBR0VfVFlQRSA9IFwibGF1bmNocGFkOmVtYmVkLWhtci13c1wiO1xuXG4vKiogQ29uc2VjdXRpdmUgSE1SIHNvY2tldCBmYWlsdXJlcyBpbnNpZGUgaWZyYW1lIGJlZm9yZSBub3RpZnlpbmcgcGFyZW50LiAqL1xuZXhwb3J0IGNvbnN0IEVNQkVEX0hNUl9XU19GQUlMX1NUUkVBSyA9IDM7XG5cbi8qKiBsb2NhbFN0b3JhZ2Uga2V5IHByZWZpeCBcdTIwMTQgbXVzdCBtYXRjaCBjbGllbnRMaW5rUHJldmlld1Nlc3Npb25TbmFwc2hvdC51dGlsLmpzICovXG5leHBvcnQgY29uc3QgRU1CRURfU0VTU0lPTl9SRVNUT1JFX0xTX1BSRUZJWCA9IFwibGF1bmNocGFkOmVtYmVkLXNlc3Npb24tcmVzdG9yZTpcIjtcblxuLyoqXG4gKiBSdW5zIGZpcnN0IGluIHByb3hpZWQgcHJldmlldyBIVE1MOiByZXN0b3JlIHN0YWdlZCBzZXNzaW9uU3RvcmFnZSBiZWZvcmUgUmVhY3QgYm9vdHMuXG4gKiBQYXJlbnQgc3RhZ2VzIHZpYSBzdGFnZUlmcmFtZVNlc3Npb25SZXN0b3JlKCkgYmVmb3JlIGlmcmFtZSBuYXZpZ2F0aW9ucyAvIFZpdGUgcmVsb2Fkcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRW1iZWRTZXNzaW9uUmVzdG9yZVNjcmlwdCgpIHtcbiAgY29uc3QgcHJlZml4ID0gRU1CRURfU0VTU0lPTl9SRVNUT1JFX0xTX1BSRUZJWDtcbiAgLy8gUmVzdG9yZSBjb29raWVzIHVuZGVyIFBhdGg9L2VtYmVkZGVkLzxwb3J0Pi8gb25seSAobmV2ZXIgUGF0aD0vIFx1MjAxNCBhdm9pZHMgbmdpbnggQ29va2llIFRvbyBMYXJnZSkuXG4gIHJldHVybiBgPHNjcmlwdCBkYXRhLWVtYmVkLXNlc3Npb24tcmVzdG9yZT4oZnVuY3Rpb24oKXt0cnl7dmFyIG09bG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL15cXFxcL2VtYmVkZGVkXFxcXC8oXFxcXGR7MSw1fSkvKTtpZighbSlyZXR1cm47dmFyIGtleT1cIiR7cHJlZml4fVwiK21bMV0scmF3PWxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7aWYoIXJhdylyZXR1cm47bG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KTt2YXIgc25hcD1KU09OLnBhcnNlKHJhdyk7aWYoIXNuYXB8fHR5cGVvZiBzbmFwIT09XCJvYmplY3RcIilyZXR1cm47dmFyIHNrPVwiX19scFNlc3Npb25cIixsaz1cIl9fbHBMb2NhbFwiLGNrPVwiX19scENvb2tpZXNcIixjcD1cIi9lbWJlZGRlZC9cIittWzFdK1wiL1wiO2lmKHNuYXBbc2tdfHxzbmFwW2xrXXx8c25hcFtja10pe3ZhciBzPXNuYXBbc2tdLGw9c25hcFtsa10sYz1zbmFwW2NrXTtpZihzJiZ0eXBlb2Ygcz09PVwib2JqZWN0XCIpZm9yKHZhciBrIGluIHMpe2lmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLGspKXNlc3Npb25TdG9yYWdlLnNldEl0ZW0oayxzW2tdKX1pZihsJiZ0eXBlb2YgbD09PVwib2JqZWN0XCIpZm9yKHZhciBrMiBpbiBsKXtpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobCxrMikpbG9jYWxTdG9yYWdlLnNldEl0ZW0oazIsbFtrMl0pfWlmKHR5cGVvZiBjPT09XCJzdHJpbmdcIiYmYyl7Zm9yKHZhciBwPWMuc3BsaXQoLztcXFxccyovKSxpPTA7aTxwLmxlbmd0aDtpKyspe3ZhciBwYXJ0PXBbaV0udHJpbSgpO2lmKCFwYXJ0fHxwYXJ0LmluZGV4T2YoXCI9XCIpPDApY29udGludWU7dmFyIG52PXBhcnQuc3BsaXQoXCI7XCIpWzBdLnRyaW0oKTtpZihudilkb2N1bWVudC5jb29raWU9bnYrXCI7IHBhdGg9XCIrY3ArXCI7IFNhbWVTaXRlPUxheFwifX19ZWxzZXtmb3IodmFyIGszIGluIHNuYXApe2lmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzbmFwLGszKSlzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGszLHNuYXBbazNdKX19fWNhdGNoKGUpe319KSgpOzwvc2NyaXB0PmA7XG59XG5cbi8qKlxuICogSW5saW5lIGJvb3RzdHJhcDogcmV3cml0ZSBXUyBVUkxzIHVuZGVyIC9lbWJlZGRlZC88cG9ydD4vIGFuZCByZXBvcnQgSE1SIGNvbm5lY3Rpdml0eS5cbiAqIEluamVjdGVkIGludG8gcHJveGllZCBwcmV2aWV3IEhUTUwgKHNlZSByZXdyaXRlUGF0aHMuaW5qZWN0RW1iZWRCb290c3RyYXBTY3JpcHRzKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRW1iZWRCb290c3RyYXBTY3JpcHQoKSB7XG4gIGNvbnN0IHR5cGUgPSBFTUJFRF9ITVJfV1NfTUVTU0FHRV9UWVBFO1xuICBjb25zdCBzdHJlYWtMaW1pdCA9IEVNQkVEX0hNUl9XU19GQUlMX1NUUkVBSztcbiAgLy8gQ2xlYXIgUGF0aD0vIHByZXZpZXcgYXV0aCBsZWZ0b3ZlcnMsIGZvcmNlIGZ1dHVyZSBkb2N1bWVudC5jb29raWUgUGF0aCB1bmRlciAvZW1iZWRkZWQvPHBvcnQ+LyxcbiAgLy8ga2VlcCBlbWJlZF9wb3J0IG9uIFBhdGg9LyBmb3Igcm9vdCBvcnBoYW4tYXNzZXQgcm91dGluZy5cbiAgLy8gQWZ0ZXIgTmV4dCBjbGllbnQtbmF2IGJyZWFrb3V0ICgvbG9naW4gZXRjLiksIHJlc29sdmUgcG9ydCBmcm9tIGNvb2tpZSBzbyBSU0Mgc3RpbGwgc2VuZHMgaXQuXG4gIHJldHVybiBgJHtidWlsZEVtYmVkU2Vzc2lvblJlc3RvcmVTY3JpcHQoKX08c2NyaXB0IGRhdGEtZW1iZWQtYm9vdHN0cmFwPihmdW5jdGlvbigpe3ZhciBtPWxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9eXFxcXC9lbWJlZGRlZFxcXFwvKFxcXFxkezEsNX0pLyk7dmFyIHBvcnQ9bT9tWzFdOm51bGw7aWYoIXBvcnQpe3RyeXt2YXIgY209ZG9jdW1lbnQuY29va2llLm1hdGNoKC8oPzpefDtcXFxccyopZW1iZWRfcG9ydD0oXFxcXGR7MSw1fSkoPzo7fCQpLyk7aWYoY20pcG9ydD1jbVsxXX1jYXRjaChlQyl7fX1pZighcG9ydClyZXR1cm47dmFyIHA9XCIvZW1iZWRkZWQvXCIrcG9ydCtcIi9cIixjcD1cIi9lbWJlZGRlZC9cIitwb3J0K1wiL1wiO1tcInVzZXJcIixcInJvbGVzXCIsXCJyZWZyZXNoX3Rva2VuXCJdLmZvckVhY2goZnVuY3Rpb24obil7ZG9jdW1lbnQuY29va2llPW4rXCI9O3BhdGg9LztNYXgtQWdlPTBcIn0pO3RyeXt2YXIgZGVzYz1PYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKERvY3VtZW50LnByb3RvdHlwZSxcImNvb2tpZVwiKXx8T2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihIVE1MRG9jdW1lbnQucHJvdG90eXBlLFwiY29va2llXCIpO2lmKGRlc2MmJmRlc2Muc2V0KXtPYmplY3QuZGVmaW5lUHJvcGVydHkoZG9jdW1lbnQsXCJjb29raWVcIix7Y29uZmlndXJhYmxlOnRydWUsZW51bWVyYWJsZTp0cnVlLGdldDpmdW5jdGlvbigpe3JldHVybiBkZXNjLmdldC5jYWxsKGRvY3VtZW50KX0sc2V0OmZ1bmN0aW9uKHYpe3ZhciBzPVN0cmluZyh2KSxudj1zLnNwbGl0KFwiO1wiKVswXS50cmltKCk7aWYoL15lbWJlZF9wb3J0PS9pLnRlc3QobnYpKXtkZXNjLnNldC5jYWxsKGRvY3VtZW50LHMpO3JldHVybn1pZigvO1xcXFxzKnBhdGhcXFxccyo9L2kudGVzdChzKSl7cz1zLnJlcGxhY2UoLztcXFxccypwYXRoXFxcXHMqPVteO10qL2ksXCI7IHBhdGg9XCIrY3ApfWVsc2V7cz1zK1wiOyBwYXRoPVwiK2NwfWRlc2Muc2V0LmNhbGwoZG9jdW1lbnQscyl9fSl9fWNhdGNoKGUwKXt9ZG9jdW1lbnQuY29va2llPVwiZW1iZWRfcG9ydD1cIitwb3J0K1wiO3BhdGg9LztTYW1lU2l0ZT1MYXhcIjt0cnl7dmFyIEY9d2luZG93LmZldGNoO2lmKHR5cGVvZiBGPT09XCJmdW5jdGlvblwiKXt3aW5kb3cuZmV0Y2g9ZnVuY3Rpb24oaW5wdXQsaW5pdCl7dmFyIG9wdHM9aW5pdD9PYmplY3QuYXNzaWduKHt9LGluaXQpOnt9O2lmKG9wdHMuY3JlZGVudGlhbHM9PW51bGwpb3B0cy5jcmVkZW50aWFscz1cInNhbWUtb3JpZ2luXCI7cmV0dXJuIEYuY2FsbCh0aGlzLGlucHV0LG9wdHMpfX19Y2F0Y2goZUYpe312YXIgTVNHPVwiJHt0eXBlfVwiLGZhaWxTdHJlYWs9MCxldmVyT3Blbj1mYWxzZSxsYXN0RnVsbFJlbG9hZEF0PTAsbGFzdEhtclVwZGF0ZUF0PTA7ZnVuY3Rpb24gbm90aWZ5KHN0YXR1cyxleHRyYSl7dHJ5e2lmKHdpbmRvdy5wYXJlbnQmJndpbmRvdy5wYXJlbnQhPT13aW5kb3cpe3ZhciBwYXlsb2FkPXt0eXBlOk1TRyxzdGF0dXM6c3RhdHVzLHBvcnQ6TnVtYmVyKHBvcnQpfTtpZihleHRyYSl7Zm9yKHZhciBrIGluIGV4dHJhKXtpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZXh0cmEsaykpcGF5bG9hZFtrXT1leHRyYVtrXX19d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZShwYXlsb2FkLGxvY2F0aW9uLm9yaWdpbil9fWNhdGNoKGUpe319ZnVuY3Rpb24gaXNIbXJVcmwodSl7aWYodHlwZW9mIHUhPT1cInN0cmluZ1wiKXJldHVybiBmYWxzZTt0cnl7dmFyIHg9bmV3IFVSTCh1LGxvY2F0aW9uLmhyZWYpO3JldHVybiB4Lmhvc3Q9PT1sb2NhdGlvbi5ob3N0JiYoeC5wYXRobmFtZT09PXB8fHgucGF0aG5hbWU9PT1wLnNsaWNlKDAsLTEpfHx4LnBhdGhuYW1lLnN0YXJ0c1dpdGgocCkpfWNhdGNoKGUpe3JldHVybiBmYWxzZX19ZnVuY3Rpb24gcmV3cml0ZVVybCh1KXtpZih0eXBlb2YgdSE9PVwic3RyaW5nXCIpcmV0dXJuIHU7dHJ5e3ZhciB4PW5ldyBVUkwodSxsb2NhdGlvbi5ocmVmKTtpZih4Lmhvc3Q9PT1sb2NhdGlvbi5ob3N0JiYheC5wYXRobmFtZS5zdGFydHNXaXRoKHApKXtpZih4LnBhdGhuYW1lPT09XCIvXCJ8fHgucGF0aG5hbWU9PT1cIlwiKXgucGF0aG5hbWU9cDtlbHNlIGlmKCF4LnBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvZW1iZWRkZWQvXCIrcG9ydCkpeC5wYXRobmFtZT1cIi9lbWJlZGRlZC9cIitwb3J0K3gucGF0aG5hbWV9eC5wcm90b2NvbD1sb2NhdGlvbi5wcm90b2NvbD09PVwiaHR0cHM6XCI/XCJ3c3M6XCI6XCJ3czpcIjtpZihsb2NhdGlvbi5wcm90b2NvbD09PVwiaHR0cHM6XCImJngucG9ydD09PVwiODBcIilyZXR1cm5cIndzczovL1wiK3guaG9zdG5hbWUreC5wYXRobmFtZSt4LnNlYXJjaCt4Lmhhc2g7aWYobG9jYXRpb24ucHJvdG9jb2whPT1cImh0dHBzOlwiJiZ4LnBvcnQ9PT1cIjQ0M1wiKXJldHVyblwid3M6Ly9cIit4Lmhvc3RuYW1lK3gucGF0aG5hbWUreC5zZWFyY2greC5oYXNoO3JldHVybiB4LmhyZWZ9Y2F0Y2goZSl7cmV0dXJuIHV9fXZhciBXPVdlYlNvY2tldDtXZWJTb2NrZXQ9ZnVuY3Rpb24odSxwcil7dmFyIHVybD1yZXdyaXRlVXJsKHUpO3ZhciB3cz1wciE9PXVuZGVmaW5lZD9uZXcgVyh1cmwscHIpOm5ldyBXKHVybCk7aWYoaXNIbXJVcmwodXJsKSl7dmFyIG9wZW5lZD1mYWxzZTt3cy5hZGRFdmVudExpc3RlbmVyKFwib3BlblwiLGZ1bmN0aW9uKCl7b3BlbmVkPXRydWU7ZXZlck9wZW49dHJ1ZTtmYWlsU3RyZWFrPTA7bm90aWZ5KFwib3BlblwiKX0pO3dzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLGZ1bmN0aW9uKCl7aWYob3BlbmVkKXJldHVybjtmYWlsU3RyZWFrKz0xO2lmKGZhaWxTdHJlYWs+PSR7c3RyZWFrTGltaXR9KW5vdGlmeShcImZhaWxlZFwiLHtmYWlsU3RyZWFrOmZhaWxTdHJlYWt9KX0pO3dzLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsZnVuY3Rpb24oZXYpe3RyeXt2YXIgZD10eXBlb2YgZXYuZGF0YT09PVwic3RyaW5nXCI/ZXYuZGF0YTpcIlwiO2lmKCFkKXJldHVybjt2YXIgbXNnPUpTT04ucGFyc2UoZCk7aWYoIW1zZ3x8IW1zZy50eXBlKXJldHVybjtpZihtc2cudHlwZT09PVwiZnVsbC1yZWxvYWRcIil7dmFyIG5vdz1EYXRlLm5vdygpO2lmKG5vdy1sYXN0RnVsbFJlbG9hZEF0PDgwMClyZXR1cm47bGFzdEZ1bGxSZWxvYWRBdD1ub3c7bm90aWZ5KFwiZnVsbC1yZWxvYWRcIix7cGF0aDptc2cucGF0aHx8bnVsbH0pO3JldHVybn1pZihtc2cudHlwZT09PVwidXBkYXRlXCIpe3ZhciBub3cyPURhdGUubm93KCk7aWYobm93Mi1sYXN0SG1yVXBkYXRlQXQ8MzAwKXJldHVybjtsYXN0SG1yVXBkYXRlQXQ9bm93Mjtub3RpZnkoXCJobXItdXBkYXRlXCIse3VwZGF0ZXM6QXJyYXkuaXNBcnJheShtc2cudXBkYXRlcyk/bXNnLnVwZGF0ZXMubGVuZ3RoOjB9KX19Y2F0Y2goZTMpe319KX1yZXR1cm4gd3N9O1dlYlNvY2tldC5wcm90b3R5cGU9Vy5wcm90b3R5cGU7V2ViU29ja2V0LkNPTk5FQ1RJTkc9Vy5DT05ORUNUSU5HO1dlYlNvY2tldC5PUEVOPVcuT1BFTjtXZWJTb2NrZXQuQ0xPU0lORz1XLkNMT1NJTkc7V2ViU29ja2V0LkNMT1NFRD1XLkNMT1NFRH0pKCk7PC9zY3JpcHQ+YDtcbn1cblxuLyoqIEBwYXJhbSB7dW5rbm93bn0gZGF0YSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1iZWRIbXJXc01lc3NhZ2UoZGF0YSkge1xuICByZXR1cm4gKFxuICAgIGRhdGEgIT0gbnVsbCAmJlxuICAgIHR5cGVvZiBkYXRhID09PSBcIm9iamVjdFwiICYmXG4gICAgZGF0YS50eXBlID09PSBFTUJFRF9ITVJfV1NfTUVTU0FHRV9UWVBFICYmXG4gICAgKGRhdGEuc3RhdHVzID09PSBcIm9wZW5cIiB8fFxuICAgICAgZGF0YS5zdGF0dXMgPT09IFwiZmFpbGVkXCIgfHxcbiAgICAgIGRhdGEuc3RhdHVzID09PSBcImZ1bGwtcmVsb2FkXCIgfHxcbiAgICAgIGRhdGEuc3RhdHVzID09PSBcImhtci11cGRhdGVcIilcbiAgKTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXdcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyBJRSBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L3ZpdGVTcGVjaWFsSW1wb3J0LnV0aWwuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLJTIwSUUlMjBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L3ZpdGVTcGVjaWFsSW1wb3J0LnV0aWwuanNcIjsvKiogVml0ZSBpbXBvcnQgcXVlcnkgcGFyYW1zIHRoYXQgcmVxdWVzdCB0cmFuc2Zvcm1lZCBhc3NldCBtb2R1bGVzIChub3QgcGxhaW4gc3RhdGljIGZpbGVzKS4gKi9cbmNvbnN0IFZJVEVfU1BFQ0lBTF9JTVBPUlRfUEFSQU1TID0gbmV3IFNldChbXG4gIFwidXJsXCIsXG4gIFwicmF3XCIsXG4gIFwiaW5saW5lXCIsXG4gIFwid29ya2VyXCIsXG4gIFwic2hhcmVkd29ya2VyXCIsXG4gIFwiaW1wb3J0XCIsXG5dKTtcblxuLyoqXG4gKiBUcnVlIHdoZW4gYSBwYXRoL1VSTCB1c2VzIGEgVml0ZSBzcGVjaWFsIGltcG9ydCBzdWZmaXggKD91cmwsID93b3JrZXIsID9yYXcsIGV0Yy4pLlxuICogSWdub3JlcyBjYWNoZS1idXN0LW9ubHkgcXVlcmllcyBsaWtlID90PTEyMyBvciA/dj1hYmMuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aE9yVXJsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ZpdGVTcGVjaWFsSW1wb3J0UGF0aChwYXRoT3JVcmwpIHtcbiAgY29uc3QgcmF3ID0gU3RyaW5nKHBhdGhPclVybCA/PyBcIlwiKTtcbiAgY29uc3QgcUlkeCA9IHJhdy5pbmRleE9mKFwiP1wiKTtcbiAgaWYgKHFJZHggPT09IC0xKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChyYXcuc2xpY2UocUlkeCksIFwiaHR0cDovL2xvY2FsaG9zdFwiKTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiB1cmwuc2VhcmNoUGFyYW1zLmtleXMoKSkge1xuICAgICAgaWYgKFZJVEVfU1BFQ0lBTF9JTVBPUlRfUEFSQU1TLmhhcyhrZXkudG9Mb3dlckNhc2UoKSkpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBSZW1vdmUgL2VtYmVkZGVkLzxwb3J0PiBwcmVmaXggc28gc3ludGhlc2l6ZWQgYXNzZXQgVVJMcyBzdGF5IHJvb3QtcmVsYXRpdmUuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aG5hbWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwRW1iZWRQb3J0UHJlZml4KHBhdGhuYW1lKSB7XG4gIGNvbnN0IHAgPSBTdHJpbmcocGF0aG5hbWUgPz8gXCJcIikuc3BsaXQoXCI/XCIpWzBdID8/IFwiXCI7XG4gIGNvbnN0IHN0cmlwcGVkID0gcC5yZXBsYWNlKC9eXFwvZW1iZWRkZWRcXC9cXGR7MSw1fSg/PVxcL3wkKS8sIFwiXCIpO1xuICByZXR1cm4gc3RyaXBwZWQuc3RhcnRzV2l0aChcIi9cIikgPyBzdHJpcHBlZCA6IGAvJHtzdHJpcHBlZH1gO1xufVxuXG4vKiogVHJ1ZSB3aGVuIGJvZHkgYWxyZWFkeSBsb29rcyBsaWtlIFZpdGUncyB0aW55IFVSTCB2aXJ0dWFsIG1vZHVsZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb29rc0xpa2VFc21EZWZhdWx0RXhwb3J0KGJvZHkpIHtcbiAgY29uc3QgdHJpbW1lZCA9IFN0cmluZyhib2R5ID8/IFwiXCIpLnRyaW1TdGFydCgpO1xuICByZXR1cm4gL2V4cG9ydFxccytkZWZhdWx0XFxzL20udGVzdCh0cmltbWVkKSB8fCAvZXhwb3J0XFxzKlxce1tefV0qXFxiZGVmYXVsdFxcYi8udGVzdCh0cmltbWVkKTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIFVSTCB2aXJ0dWFsIG1vZHVsZSB3aGVuIHVwc3RyZWFtIHJldHVybmVkIHJhdyBhc3NldCBieXRlcyBmb3IgP3VybCAvID93b3JrZXIgcmVxdWVzdHMuXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVxdWVzdFBhdGggXHUyMDE0IHJlcXVlc3QgcGF0aCBpbmNsdWRpbmcgcXVlcnkgc3VmZml4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzeW50aGVzaXplVml0ZVVybE1vZHVsZShyZXF1ZXN0UGF0aCkge1xuICBjb25zdCBwYXRobmFtZSA9IHN0cmlwRW1iZWRQb3J0UHJlZml4KFN0cmluZyhyZXF1ZXN0UGF0aCA/PyBcIlwiKS5zcGxpdChcIj9cIilbMF0gPz8gXCIvXCIpO1xuICByZXR1cm4gYGV4cG9ydCBkZWZhdWx0ICR7SlNPTi5zdHJpbmdpZnkocGF0aG5hbWUpfTtcXG5gO1xufVxuXG4vKiogVHJ1ZSBmb3IgP3VybCBpbXBvcnRzIChub3QgP3JhdyAvID93b3JrZXItb25seSkuICovXG5leHBvcnQgZnVuY3Rpb24gaXNWaXRlVXJsSW1wb3J0UGF0aChwYXRoT3JVcmwpIHtcbiAgY29uc3QgcmF3ID0gU3RyaW5nKHBhdGhPclVybCA/PyBcIlwiKTtcbiAgaWYgKCFpc1ZpdGVTcGVjaWFsSW1wb3J0UGF0aChyYXcpKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IHEgPSByYXcuaW5jbHVkZXMoXCI/XCIpID8gcmF3LnNsaWNlKHJhdy5pbmRleE9mKFwiP1wiKSkgOiBcIlwiO1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocSwgXCJodHRwOi8vbG9jYWxob3N0XCIpO1xuICAgIHJldHVybiB1cmwuc2VhcmNoUGFyYW1zLmhhcyhcInVybFwiKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKiBVcHN0cmVhbSBzZW50IGdlbmVyaWMgYmluYXJ5L3BsYWluIGluc3RlYWQgb2YgYSBKUyBtb2R1bGUgTUlNRSAoY29tbW9uIHZpYSBEb2NrZXIgcmVsYXkpLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSW5jb3JyZWN0TW9kdWxlQ29udGVudFR5cGUoY29udGVudFR5cGUpIHtcbiAgY29uc3QgY3QgPSBTdHJpbmcoY29udGVudFR5cGUgPz8gXCJcIilcbiAgICAuc3BsaXQoXCI7XCIpWzBdXG4gICAgLnRyaW0oKVxuICAgIC50b0xvd2VyQ2FzZSgpO1xuICBpZiAoIWN0KSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGN0ID09PSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiIHx8IGN0ID09PSBcImJpbmFyeS9vY3RldC1zdHJlYW1cIiB8fCBjdCA9PT0gXCJ0ZXh0L3BsYWluXCI7XG59XG5cbi8qKiBCcm93c2VyLXNhZmUgQ29udGVudC1UeXBlIGZvciBFUyBtb2R1bGUgc2NyaXB0IHJlc3BvbnNlcy4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTW9kdWxlU2NyaXB0Q29udGVudFR5cGUocmVxdWVzdFBhdGgpIHtcbiAgY29uc3QgcGF0aE9ubHkgPSBTdHJpbmcocmVxdWVzdFBhdGggPz8gXCJcIilcbiAgICAuc3BsaXQoXCI/XCIpWzBdXG4gICAgLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChwYXRoT25seS5lbmRzV2l0aChcIi50c1wiKSB8fCBwYXRoT25seS5lbmRzV2l0aChcIi50c3hcIikpIHtcbiAgICByZXR1cm4gXCJ0ZXh0L2phdmFzY3JpcHQ7IGNoYXJzZXQ9dXRmLThcIjtcbiAgfVxuICByZXR1cm4gXCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0OyBjaGFyc2V0PXV0Zi04XCI7XG59XG5cbi8qKiBUcnVlIHdoZW4gdGhlIGJyb3dzZXIgbG9hZHMgdGhpcyBlbWJlZCBVUkwgYXMgYHR5cGU9XCJtb2R1bGVcImAuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNb2R1bGVTY3JpcHRSZXF1ZXN0UGF0aChwYXRoT3JVcmwpIHtcbiAgY29uc3QgcmF3ID0gU3RyaW5nKHBhdGhPclVybCA/PyBcIlwiKTtcbiAgLy8gVnVlL1N2ZWx0ZSBTRkMgc3R5bGUgYmxvY2tzIFx1MjAxNCB1cHN0cmVhbSBpcyBDU1M7IG11c3Qgbm90IGZvcmNlIEpTIE1JTUUgb3IgSlMgcmV3cml0ZXMuXG4gIGlmICgvWz8mXXR5cGU9c3R5bGUoPzomfCQpL2kudGVzdChyYXcpKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IHBhdGhPbmx5ID0gcmF3LnNwbGl0KFwiP1wiKVswXS50b0xvd2VyQ2FzZSgpO1xuICBpZiAoaXNWaXRlU3BlY2lhbEltcG9ydFBhdGgocmF3KSkgcmV0dXJuIHRydWU7XG4gIGlmICgvXFwvQHZpdGVcXC9jbGllbnR8XFwvQHJlYWN0LXJlZnJlc2h8XFwvQGZzXFwvfFxcL0BpZFxcLy8udGVzdChwYXRoT25seSkpIHJldHVybiB0cnVlO1xuICBpZiAoL1xcL25vZGVfbW9kdWxlc1xcL1xcLnZpdGVcXC9kZXBzXFwvLy50ZXN0KHBhdGhPbmx5KSkgcmV0dXJuIHRydWU7XG4gIC8vIFByb2plY3QgKyBub2RlX21vZHVsZXM6IC52dWUvLnN2ZWx0ZSBTRkMgc2NyaXB0IGJsb2NrcyBhcmUgRVMgbW9kdWxlcyAobm90ID90eXBlPXN0eWxlKS5cbiAgcmV0dXJuIC9cXC4obT9banRdc3g/fGNqc3x2dWV8c3ZlbHRlKShcXD98JCkvLnRlc3QocGF0aE9ubHkpO1xufVxuXG4vKipcbiAqIFdoZXRoZXIgZW1iZWQgcHJveHkgc2hvdWxkIHJlcGxhY2UgcmF3IHVwc3RyZWFtIEpTIHdpdGggYSBzeW50aGVzaXplZCBVUkwgbW9kdWxlLlxuICogQHBhcmFtIHtzdHJpbmd9IHJlcXVlc3RQYXRoXG4gKiBAcGFyYW0ge3N0cmluZ30gY29udGVudFR5cGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBib2R5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaG91bGRTeW50aGVzaXplVml0ZVVybE1vZHVsZShyZXF1ZXN0UGF0aCwgY29udGVudFR5cGUsIGJvZHkpIHtcbiAgaWYgKCFpc1ZpdGVVcmxJbXBvcnRQYXRoKHJlcXVlc3RQYXRoKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAobG9va3NMaWtlRXNtRGVmYXVsdEV4cG9ydChib2R5KSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBjdCA9IFN0cmluZyhjb250ZW50VHlwZSA/PyBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICBpZiAoY3QuaW5jbHVkZXMoXCJqYXZhc2NyaXB0XCIpIHx8IGN0LmluY2x1ZGVzKFwidHlwZXNjcmlwdFwiKSkgcmV0dXJuIHRydWU7XG4gIGlmIChpc0luY29ycmVjdE1vZHVsZUNvbnRlbnRUeXBlKGNvbnRlbnRUeXBlKSkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vc2hhcmVkL3ByZXZpZXctcmV3cml0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vc2hhcmVkL3ByZXZpZXctcmV3cml0ZS9yZWFjdFJvdXRlckJhc2VuYW1lLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyUyMElFJTIwTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9zaGFyZWQvcHJldmlldy1yZXdyaXRlL3JlYWN0Um91dGVyQmFzZW5hbWUuanNcIjsvKipcbiAqIFByb3h5LW9ubHkgUmVhY3QgUm91dGVyIGVtYmVkIHN1cHBvcnQuXG4gKlxuICogTmV2ZXIgcmV3cml0ZXMgdXNlciBwcm9qZWN0IHNvdXJjZSAoQXBwLnRzeCAvIG1haW4udHN4IEJyb3dzZXJSb3V0ZXIgLyBjcmVhdGVCcm93c2VyUm91dGVyKS5cbiAqIE9ubHkgcmV3cml0ZXMgcmVhY3Qtcm91dGVyJ3Mgb3duIGRlZmF1bHQgYGJhc2VuYW1lOlx1MjAyNj1cIi9cImAgKGFuZCBlcXVpdmFsZW50KVxuICogaW5zaWRlIGxpYnJhcnkgYnVuZGxlcyBzbyByb3V0ZXJzIHdpdGhvdXQgYW4gZXhwbGljaXQgYmFzZW5hbWUgd29yayB1bmRlciAvZW1iZWRkZWQvPHBvcnQ+Ly5cbiAqL1xuXG4vKiogUnVudGltZSBiYXNlbmFtZTogL2VtYmVkZGVkfGlmcmFtZS1wcmV2aWV3Lzxwb3J0PiwgL2FwcHMvPHNsdWc+LCBvciBcIi9cIi4gKi9cbmV4cG9ydCBjb25zdCBMQVVOQ0hQQURfRU1CRURfQkFTRU5BTUVfRVhQUiA9XG4gICcoZnVuY3Rpb24oKXt0cnl7dmFyIHA9bG9jYXRpb24ucGF0aG5hbWU7dmFyIG09cC5tYXRjaCgvXlxcXFwvKGVtYmVkZGVkfGlmcmFtZS1wcmV2aWV3KVxcXFwvKFxcXFxkezEsNX0pKD86XFxcXC98JCkvKTtpZihtKXJldHVyblwiL1wiK21bMV0rXCIvXCIrbVsyXTt2YXIgYT1wLm1hdGNoKC9eXFxcXC9hcHBzXFxcXC9bXi9dKy8pO2lmKGEpcmV0dXJuIGFbMF19Y2F0Y2goZSl7fXJldHVyblwiL1wifSkoKSc7XG5cbmNvbnN0IEhFTFBFUl9FWFBPUlQgPSBcInJlc29sdmVMYXVuY2hwYWRSb3V0ZXJCYXNlbmFtZVwiO1xuXG4vKipcbiAqIExpYnJhcnkgZGVmYXVsdC1wYXJhbSBmb3JtcyAobWluaWZpZWQgb3IgcHJldHR5KTpcbiAqICAgYmFzZW5hbWU6aT1cIi9cIlxuICogICBiYXNlbmFtZTogYmFzZW5hbWVQcm9wID0gXCIvXCJcbiAqL1xuY29uc3QgTElCUkFSWV9CQVNFTkFNRV9ERUZBVUxUX1JFID0gL2Jhc2VuYW1lOlxccyooW2EtekEtWl8kXVtcXHckXSopXFxzKj1cXHMqW1wiJ11cXC9bXCInXS9nO1xuXG4vKiogVHJ1ZSB3aGVuIHByb2plY3QgYWxyZWFkeSBzaGlwcyBpdHMgb3duIGVtYmVkIGJhc2VuYW1lIGhlbHBlci4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb250ZW50SGFzT3duTGF1bmNocGFkQmFzZW5hbWVIZWxwZXIoY29udGVudCkge1xuICByZXR1cm4gU3RyaW5nKGNvbnRlbnQgfHwgXCJcIikuaW5jbHVkZXMoSEVMUEVSX0VYUE9SVCk7XG59XG5cbi8qKlxuICogU2tpcCB3aGVuIHRoZSBtb2R1bGUgYWxyZWFkeSBjb25maWd1cmVzIGJhc2VuYW1lIGV4cGxpY2l0bHkgKHVzZXIgb3IgaGVscGVyKS5cbiAqIFVzZXIgQXBwIHNvdXJjZSBpcyBuZXZlciByZXdyaXR0ZW4gZWl0aGVyIHdheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3VsZFNraXBSZWFjdFJvdXRlckJhc2VuYW1lUmV3cml0ZShjb250ZW50KSB7XG4gIGNvbnN0IHJhdyA9IFN0cmluZyhjb250ZW50IHx8IFwiXCIpO1xuICBpZiAoY29udGVudEhhc093bkxhdW5jaHBhZEJhc2VuYW1lSGVscGVyKHJhdykpIHJldHVybiB0cnVlO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBUcnVlIGZvciBhcHAgVFMvSlNYIHNvdXJjZSBcdTIwMTQgbXVzdCBuZXZlciBiZSByZXdyaXR0ZW4uICovXG5leHBvcnQgZnVuY3Rpb24gbG9va3NMaWtlSnN4U291cmNlTW9kdWxlKGNvbnRlbnQpIHtcbiAgY29uc3QgcmF3ID0gU3RyaW5nKGNvbnRlbnQgfHwgXCJcIik7XG4gIGlmICgvPEJyb3dzZXJSb3V0ZXJbXFxzLz5dLy50ZXN0KHJhdykpIHJldHVybiB0cnVlO1xuICAvLyBWaXRlLXRyYW5zZm9ybWVkIGFwcCBtb2R1bGVzIHVzZSBqc3hERVY7IHJlYWN0LXJvdXRlciBidW5kbGVzIHVzZSBjcmVhdGVFbGVtZW50ICsgYGZ1bmN0aW9uIFJvdXRlcih7YC5cbiAgaWYgKC9cXGJqc3hERVZcXHMqXFwoLy50ZXN0KHJhdykgJiYgIS9mdW5jdGlvblxccytSb3V0ZXJcXHMqXFwoLy50ZXN0KHJhdykpIHJldHVybiB0cnVlO1xuICAvLyBSYXcgVFNYOiBpbXBvcnQgKyBDYXBpdGFsaXplZCBKU1ggdGFnLiBFeGNsdWRlIHJlYWN0LXJvdXRlciAoZGVmaW5lcyBgZnVuY3Rpb24gUm91dGVyKHtgKS5cbiAgLy8gRG8gbm90IHVzZSBiYXJlIC88W0EtWmEtel0vIFx1MjAxNCBSUiBlcnJvciBzdHJpbmdzIGNvbnRhaW4gYDxSb3V0ZXI+YCwgYDxMaW5rPmAsIGV0Yy5cbiAgaWYgKFxuICAgIC9cXGJpbXBvcnRcXHMrLy50ZXN0KHJhdykgJiZcbiAgICAvPFtBLVpdW0EtWmEtejAtOV0qW1xccy8+XS8udGVzdChyYXcpICYmXG4gICAgIS9mdW5jdGlvblxccytSb3V0ZXJcXHMqXFwoXFxzKlxcey8udGVzdChyYXcpXG4gICkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBUcnVlIGZvciByZWFjdC1yb3V0ZXIgbGlicmFyeSBjaHVua3MgdGhhdCBkZWNsYXJlIHRoZSBkZWZhdWx0IGJhc2VuYW1lIHBhcmFtIGFzIFwiL1wiLlxuICogRXhhbXBsZTogZnVuY3Rpb24gaHkoe2Jhc2VuYW1lOmk9XCIvXCIsXHUyMDI2IG9yIGZ1bmN0aW9uIFJvdXRlcih7IGJhc2VuYW1lOiBiYXNlbmFtZVByb3AgPSBcIi9cIixcdTIwMjZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvb2tzTGlrZVJlYWN0Um91dGVyTGlicmFyeURlZmF1bHRCYXNlbmFtZShjb250ZW50KSB7XG4gIGNvbnN0IHJhdyA9IFN0cmluZyhjb250ZW50IHx8IFwiXCIpO1xuICBMSUJSQVJZX0JBU0VOQU1FX0RFRkFVTFRfUkUubGFzdEluZGV4ID0gMDtcbiAgcmV0dXJuIExJQlJBUllfQkFTRU5BTUVfREVGQVVMVF9SRS50ZXN0KHJhdyk7XG59XG5cbi8qKlxuICogUGF0Y2ggb25seSByZWFjdC1yb3V0ZXIgbGlicmFyeSBkZWZhdWx0IGJhc2VuYW1lIChcIi9cIikgXHUyMTkyIGVtYmVkLWF3YXJlIHJ1bnRpbWUgZXhwcmVzc2lvbi5cbiAqIERvZXMgTk9UIGFkZCBiYXNlbmFtZT0gdG8gdXNlciA8QnJvd3NlclJvdXRlcj4gb3IgY3JlYXRlQnJvd3NlclJvdXRlciguLi4pIGNhbGxzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50XG4gKiBAcGFyYW0ge3sgYXNzZXRQYXRoPzogc3RyaW5nLCByZXF1ZXN0UGF0aD86IHN0cmluZyB9IHwgc3RyaW5nfSBbb3B0aW9uc09yQXNzZXRQYXRoXVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZVJlYWN0Um91dGVyQmFzZW5hbWUoY29udGVudCwgb3B0aW9uc09yQXNzZXRQYXRoID0ge30pIHtcbiAgdm9pZCBvcHRpb25zT3JBc3NldFBhdGg7XG4gIGNvbnN0IHJhdyA9IFN0cmluZyhjb250ZW50IHx8IFwiXCIpO1xuICBpZiAoIXJhdykgcmV0dXJuIHJhdztcbiAgaWYgKHNob3VsZFNraXBSZWFjdFJvdXRlckJhc2VuYW1lUmV3cml0ZShyYXcpKSByZXR1cm4gcmF3O1xuXG4gIC8vIEdhdGUgb24gbGlicmFyeSBkZWZhdWx0LXBhcmFtIGZvcm0gb25seSBcdTIwMTQgdXNlciBBcHAgbmV2ZXIgaGFzIGBiYXNlbmFtZTpmb289XCIvXCJgLlxuICAvLyAoRG8gbm90IHVzZSBsb29rc0xpa2VKc3hTb3VyY2VNb2R1bGUgaGVyZTogUlIgYnVuZGxlcyBjb250YWluIGA8Um91dGVyPmAgaW4gZXJyb3Igc3RyaW5ncy4pXG4gIGlmICghbG9va3NMaWtlUmVhY3RSb3V0ZXJMaWJyYXJ5RGVmYXVsdEJhc2VuYW1lKHJhdykpIHJldHVybiByYXc7XG5cbiAgY29uc3QgYmFzZW5hbWVFeHByID0gTEFVTkNIUEFEX0VNQkVEX0JBU0VOQU1FX0VYUFI7XG4gIExJQlJBUllfQkFTRU5BTUVfREVGQVVMVF9SRS5sYXN0SW5kZXggPSAwO1xuICByZXR1cm4gcmF3LnJlcGxhY2UoTElCUkFSWV9CQVNFTkFNRV9ERUZBVUxUX1JFLCBgYmFzZW5hbWU6JDE9JHtiYXNlbmFtZUV4cHJ9YCk7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyBJRSBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL3NoYXJlZC9wcmV2aWV3LXJld3JpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyBJRSBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL3NoYXJlZC9wcmV2aWV3LXJld3JpdGUvdnVlUm91dGVyQmFzZS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUkslMjBJRSUyMExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vc2hhcmVkL3ByZXZpZXctcmV3cml0ZS92dWVSb3V0ZXJCYXNlLmpzXCI7LyoqXG4gKiBQcm94eS1vbmx5IFZ1ZSBSb3V0ZXIgZW1iZWQgc3VwcG9ydC5cbiAqXG4gKiBOZXZlciB3cml0ZXMgdXNlciBwcm9qZWN0IHNvdXJjZSBvbiBkaXNrLlxuICogUmV3cml0ZXMgY3JlYXRlV2ViSGlzdG9yeShcIi9cIikgLyBjcmVhdGVXZWJIYXNoSGlzdG9yeSBhbmQgVml0ZS1pbmxpbmVkIEJBU0VfVVJMOlwiL1wiXG4gKiBpbiByZXNwb25zZSBib2RpZXMgc28gVnVlICsgVml0ZSBhcHBzIHJlc29sdmUgdW5kZXIgL2VtYmVkZGVkLzxwb3J0Pi8uXG4gKi9cblxuaW1wb3J0IHsgTEFVTkNIUEFEX0VNQkVEX0JBU0VOQU1FX0VYUFIgfSBmcm9tIFwiLi9yZWFjdFJvdXRlckJhc2VuYW1lLmpzXCI7XG5cbmV4cG9ydCB7IExBVU5DSFBBRF9FTUJFRF9CQVNFTkFNRV9FWFBSIH07XG5cbi8qKiBAcGFyYW0ge3N0cmluZ30gYXNzZXRQYXRoIGUuZy4gL2VtYmVkZGVkLzgwMzAgKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWJlZEJhc2VVcmxGcm9tQXNzZXRQYXRoKGFzc2V0UGF0aCkge1xuICBjb25zdCByYXcgPSBTdHJpbmcoYXNzZXRQYXRoIHx8IFwiXCIpLnRyaW0oKTtcbiAgaWYgKCFyYXcpIHJldHVybiBcIi9cIjtcbiAgY29uc3Qgd2l0aFNsYXNoID0gcmF3LmVuZHNXaXRoKFwiL1wiKSA/IHJhdyA6IGAke3Jhd30vYDtcbiAgcmV0dXJuIHdpdGhTbGFzaC5zdGFydHNXaXRoKFwiL1wiKSA/IHdpdGhTbGFzaCA6IGAvJHt3aXRoU2xhc2h9YDtcbn1cblxuLyoqXG4gKiBUcnVlIHdoZW4gY3JlYXRlV2ViSGlzdG9yeSAvIGhhc2ggaGlzdG9yeSBhbHJlYWR5IHVzZXMgdGhlIExhdW5jaFBhZCBiYXNlbmFtZSBleHByZXNzaW9uXG4gKiBhbmQgdGhlcmUgaXMgbm90aGluZyBsZWZ0IHRvIHBhdGNoLlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbnRlbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3VsZFNraXBWdWVSb3V0ZXJCYXNlUmV3cml0ZShjb250ZW50KSB7XG4gIGNvbnN0IHJhdyA9IFN0cmluZyhjb250ZW50IHx8IFwiXCIpO1xuICBpZiAoIXJhdy5pbmNsdWRlcyhMQVVOQ0hQQURfRU1CRURfQkFTRU5BTUVfRVhQUikpIHJldHVybiBmYWxzZTtcbiAgaWYgKC9cXGJjcmVhdGVXZWJIaXN0b3J5XFxzKlxcKFxccypbXCInXVxcL1tcIiddXFxzKlxcKS8udGVzdChyYXcpKSByZXR1cm4gZmFsc2U7XG4gIGlmICgvXFxiY3JlYXRlV2ViSGlzdG9yeVxccypcXChcXHMqYFxcL2BcXHMqXFwpLy50ZXN0KHJhdykpIHJldHVybiBmYWxzZTtcbiAgaWYgKC9cXGJjcmVhdGVXZWJIaXN0b3J5XFxzKlxcKFxccypcXCkvLnRlc3QocmF3KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoL1xcYmNyZWF0ZVdlYkhpc3RvcnlcXHMqXFwoXFxzKnZvaWRcXHMrMFxccypcXCkvLnRlc3QocmF3KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoL1xcYmNyZWF0ZVdlYkhpc3RvcnlcXHMqXFwoXFxzKmltcG9ydFxcLm1ldGFcXC5lbnZcXC5CQVNFX1VSTFxccypcXCkvLnRlc3QocmF3KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoL1xcYmNyZWF0ZVdlYkhpc3RvcnlcXHMqXFwoXFxzKltcXHcuJF0rXFwuQkFTRV9VUkxcXHMqXFwpLy50ZXN0KHJhdykpIHJldHVybiBmYWxzZTtcbiAgLy8gQXBwcyBsaWtlIENvYWNobWV0cml4OiBjcmVhdGVXZWJIaXN0b3J5KGdldEFwcEJhc2UoKSkgXHUyMDE0IHN0aWxsIG5lZWRzIGxpdmUgZW1iZWQgZXhwci5cbiAgaWYgKC9cXGJjcmVhdGVXZWJIaXN0b3J5XFxzKlxcKFxccypnZXRBcHBCYXNlXFxzKlxcKFxccypcXClcXHMqXFwpLy50ZXN0KHJhdykpIHJldHVybiBmYWxzZTtcbiAgaWYgKC9cXGJjcmVhdGVXZWJIaXN0b3J5XFxzKlxcKFxccypnZXRCYXNlXFxzKlxcKFxccypcXClcXHMqXFwpLy50ZXN0KHJhdykpIHJldHVybiBmYWxzZTtcbiAgaWYgKC9cXGJjcmVhdGVXZWJIYXNoSGlzdG9yeVxccypcXChcXHMqW1wiJ11cXC9bXCInXVxccypcXCkvLnRlc3QocmF3KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoL1xcYmNyZWF0ZVdlYkhhc2hIaXN0b3J5XFxzKlxcKFxccypgXFwvYFxccypcXCkvLnRlc3QocmF3KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoL1xcYmNyZWF0ZVdlYkhhc2hIaXN0b3J5XFxzKlxcKFxccypcXCkvLnRlc3QocmF3KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoL1xcYmNyZWF0ZVdlYkhhc2hIaXN0b3J5XFxzKlxcKFxccyp2b2lkXFxzKzBcXHMqXFwpLy50ZXN0KHJhdykpIHJldHVybiBmYWxzZTtcbiAgaWYgKC8oW1wiJ11CQVNFX1VSTFtcIiddXFxzKjpcXHMqKVtcIiddXFwvW1wiJ10vLnRlc3QocmF3KSB8fCAvKFxcYkJBU0VfVVJMXFxzKjpcXHMqKVtcIiddXFwvW1wiJ10vLnRlc3QocmF3KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBQYXRjaCBjcmVhdGVXZWJIaXN0b3J5IC8gY3JlYXRlV2ViSGFzaEhpc3Rvcnkgcm9vdCBiYXNlcyBhbmQgVml0ZSBCQVNFX1VSTDpcIi9cIiBmb3IgZW1iZWQgcHJlZml4LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50XG4gKiBAcGFyYW0ge3sgYXNzZXRQYXRoPzogc3RyaW5nLCByZXF1ZXN0UGF0aD86IHN0cmluZyB9IHwgc3RyaW5nfSBbb3B0aW9uc09yQXNzZXRQYXRoXVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZVZ1ZVJvdXRlckJhc2UoY29udGVudCwgb3B0aW9uc09yQXNzZXRQYXRoID0ge30pIHtcbiAgY29uc3QgcmF3ID0gU3RyaW5nKGNvbnRlbnQgfHwgXCJcIik7XG4gIGlmICghcmF3KSByZXR1cm4gcmF3O1xuICBpZiAoc2hvdWxkU2tpcFZ1ZVJvdXRlckJhc2VSZXdyaXRlKHJhdykpIHJldHVybiByYXc7XG5cbiAgY29uc3Qgb3B0aW9ucyA9XG4gICAgdHlwZW9mIG9wdGlvbnNPckFzc2V0UGF0aCA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyB7IGFzc2V0UGF0aDogb3B0aW9uc09yQXNzZXRQYXRoIH1cbiAgICAgIDogb3B0aW9uc09yQXNzZXRQYXRoIHx8IHt9O1xuICBjb25zdCBhc3NldFBhdGggPSBvcHRpb25zLmFzc2V0UGF0aCB8fCBcIlwiO1xuICB2b2lkIG9wdGlvbnMucmVxdWVzdFBhdGg7XG5cbiAgbGV0IG91dCA9IHJhdztcbiAgY29uc3QgaGlzdG9yeUNhbGwgPSBgY3JlYXRlV2ViSGlzdG9yeSgke0xBVU5DSFBBRF9FTUJFRF9CQVNFTkFNRV9FWFBSfSlgO1xuICBjb25zdCBoYXNoSGlzdG9yeUNhbGwgPSBgY3JlYXRlV2ViSGFzaEhpc3RvcnkoJHtMQVVOQ0hQQURfRU1CRURfQkFTRU5BTUVfRVhQUn0pYDtcblxuICBpZiAoL1xcYmNyZWF0ZVdlYkhpc3RvcnlcXHMqXFwoLy50ZXN0KG91dCkpIHtcbiAgICAvLyBjcmVhdGVXZWJIaXN0b3J5KFwiL1wiKSBcdTIwMTQgVml0ZSBpbmxpbmVzIGltcG9ydC5tZXRhLmVudi5CQVNFX1VSTCBhcyBcIi9cIlxuICAgIG91dCA9IG91dC5yZXBsYWNlKC9cXGJjcmVhdGVXZWJIaXN0b3J5XFxzKlxcKFxccypbXCInXVxcL1tcIiddXFxzKlxcKS9nLCBoaXN0b3J5Q2FsbCk7XG4gICAgLy8gY3JlYXRlV2ViSGlzdG9yeShgL2ApXG4gICAgb3V0ID0gb3V0LnJlcGxhY2UoL1xcYmNyZWF0ZVdlYkhpc3RvcnlcXHMqXFwoXFxzKmBcXC9gXFxzKlxcKS9nLCBoaXN0b3J5Q2FsbCk7XG4gICAgLy8gY3JlYXRlV2ViSGlzdG9yeSgpIC8gY3JlYXRlV2ViSGlzdG9yeSh2b2lkIDApIFx1MjAxNCB3b3VsZCBvdGhlcndpc2UgcmVhZCA8YmFzZSBocmVmPVwiL1wiPlxuICAgIG91dCA9IG91dC5yZXBsYWNlKC9cXGJjcmVhdGVXZWJIaXN0b3J5XFxzKlxcKFxccypcXCkvZywgaGlzdG9yeUNhbGwpO1xuICAgIG91dCA9IG91dC5yZXBsYWNlKC9cXGJjcmVhdGVXZWJIaXN0b3J5XFxzKlxcKFxccyp2b2lkXFxzKzBcXHMqXFwpL2csIGhpc3RvcnlDYWxsKTtcbiAgICAvLyBjcmVhdGVXZWJIaXN0b3J5KGltcG9ydC5tZXRhLmVudi5CQVNFX1VSTCkgd2hlbiBub3QgeWV0IGlubGluZWRcbiAgICBvdXQgPSBvdXQucmVwbGFjZSgvXFxiY3JlYXRlV2ViSGlzdG9yeVxccypcXChcXHMqaW1wb3J0XFwubWV0YVxcLmVudlxcLkJBU0VfVVJMXFxzKlxcKS9nLCBoaXN0b3J5Q2FsbCk7XG4gICAgLy8gY3JlYXRlV2ViSGlzdG9yeShlbnYuQkFTRV9VUkwpIC8gY3JlYXRlV2ViSGlzdG9yeShmb28uQkFTRV9VUkwpXG4gICAgb3V0ID0gb3V0LnJlcGxhY2UoL1xcYmNyZWF0ZVdlYkhpc3RvcnlcXHMqXFwoXFxzKltcXHcuJF0rXFwuQkFTRV9VUkxcXHMqXFwpL2csIGhpc3RvcnlDYWxsKTtcbiAgICAvLyBjcmVhdGVXZWJIaXN0b3J5KGdldEFwcEJhc2UoKSkgLyBnZXRCYXNlKCkgXHUyMDE0IHJ1bnRpbWUgaGVscGVycyAoQ29hY2htZXRyaXgtc3R5bGUpXG4gICAgb3V0ID0gb3V0LnJlcGxhY2UoL1xcYmNyZWF0ZVdlYkhpc3RvcnlcXHMqXFwoXFxzKmdldEFwcEJhc2VcXHMqXFwoXFxzKlxcKVxccypcXCkvZywgaGlzdG9yeUNhbGwpO1xuICAgIG91dCA9IG91dC5yZXBsYWNlKC9cXGJjcmVhdGVXZWJIaXN0b3J5XFxzKlxcKFxccypnZXRCYXNlXFxzKlxcKFxccypcXClcXHMqXFwpL2csIGhpc3RvcnlDYWxsKTtcblxuICAgIC8vIGNvbnN0IGJhc2UgPSBcIi9cIjsgY3JlYXRlV2ViSGlzdG9yeShiYXNlKSBcdTIwMTQgVml0ZSBkZWZpbmUgbGVmdG92ZXJcbiAgICBjb25zdCByb290SWRzID0gbmV3IFNldCgpO1xuICAgIGZvciAoY29uc3QgbSBvZiBvdXQubWF0Y2hBbGwoXG4gICAgICAvXFxiKD86Y29uc3R8bGV0fHZhcilcXHMrKFtBLVphLXpfJF1bXFx3JF0qKVxccyo9XFxzKltcIiddXFwvW1wiJ11cXHMqOz8vZyxcbiAgICApKSB7XG4gICAgICByb290SWRzLmFkZChtWzFdKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBpZCBvZiByb290SWRzKSB7XG4gICAgICBjb25zdCByZSA9IG5ldyBSZWdFeHAoYFxcXFxiY3JlYXRlV2ViSGlzdG9yeVxcXFxzKlxcXFwoXFxcXHMqJHtpZH1cXFxccypcXFxcKWAsIFwiZ1wiKTtcbiAgICAgIG91dCA9IG91dC5yZXBsYWNlKHJlLCBoaXN0b3J5Q2FsbCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKC9cXGJjcmVhdGVXZWJIYXNoSGlzdG9yeVxccypcXCgvLnRlc3Qob3V0KSkge1xuICAgIG91dCA9IG91dC5yZXBsYWNlKC9cXGJjcmVhdGVXZWJIYXNoSGlzdG9yeVxccypcXChcXHMqW1wiJ11cXC9bXCInXVxccypcXCkvZywgaGFzaEhpc3RvcnlDYWxsKTtcbiAgICBvdXQgPSBvdXQucmVwbGFjZSgvXFxiY3JlYXRlV2ViSGFzaEhpc3RvcnlcXHMqXFwoXFxzKmBcXC9gXFxzKlxcKS9nLCBoYXNoSGlzdG9yeUNhbGwpO1xuICAgIG91dCA9IG91dC5yZXBsYWNlKC9cXGJjcmVhdGVXZWJIYXNoSGlzdG9yeVxccypcXChcXHMqXFwpL2csIGhhc2hIaXN0b3J5Q2FsbCk7XG4gICAgb3V0ID0gb3V0LnJlcGxhY2UoL1xcYmNyZWF0ZVdlYkhhc2hIaXN0b3J5XFxzKlxcKFxccyp2b2lkXFxzKzBcXHMqXFwpL2csIGhhc2hIaXN0b3J5Q2FsbCk7XG4gICAgb3V0ID0gb3V0LnJlcGxhY2UoXG4gICAgICAvXFxiY3JlYXRlV2ViSGFzaEhpc3RvcnlcXHMqXFwoXFxzKmltcG9ydFxcLm1ldGFcXC5lbnZcXC5CQVNFX1VSTFxccypcXCkvZyxcbiAgICAgIGhhc2hIaXN0b3J5Q2FsbCxcbiAgICApO1xuICAgIG91dCA9IG91dC5yZXBsYWNlKC9cXGJjcmVhdGVXZWJIYXNoSGlzdG9yeVxccypcXChcXHMqW1xcdy4kXStcXC5CQVNFX1VSTFxccypcXCkvZywgaGFzaEhpc3RvcnlDYWxsKTtcblxuICAgIGNvbnN0IHJvb3RJZHMgPSBuZXcgU2V0KCk7XG4gICAgZm9yIChjb25zdCBtIG9mIG91dC5tYXRjaEFsbChcbiAgICAgIC9cXGIoPzpjb25zdHxsZXR8dmFyKVxccysoW0EtWmEtel8kXVtcXHckXSopXFxzKj1cXHMqW1wiJ11cXC9bXCInXVxccyo7Py9nLFxuICAgICkpIHtcbiAgICAgIHJvb3RJZHMuYWRkKG1bMV0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGlkIG9mIHJvb3RJZHMpIHtcbiAgICAgIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChgXFxcXGJjcmVhdGVXZWJIYXNoSGlzdG9yeVxcXFxzKlxcXFwoXFxcXHMqJHtpZH1cXFxccypcXFxcKWAsIFwiZ1wiKTtcbiAgICAgIG91dCA9IG91dC5yZXBsYWNlKHJlLCBoYXNoSGlzdG9yeUNhbGwpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChhc3NldFBhdGggJiYgL0JBU0VfVVJMLy50ZXN0KG91dCkpIHtcbiAgICBjb25zdCBiYXNlVXJsID0gZW1iZWRCYXNlVXJsRnJvbUFzc2V0UGF0aChhc3NldFBhdGgpO1xuICAgIGNvbnN0IHF1b3RlZCA9IEpTT04uc3RyaW5naWZ5KGJhc2VVcmwpO1xuICAgIG91dCA9IG91dC5yZXBsYWNlKC8oW1wiJ11CQVNFX1VSTFtcIiddXFxzKjpcXHMqKVtcIiddXFwvW1wiJ10vZywgYCQxJHtxdW90ZWR9YCk7XG4gICAgb3V0ID0gb3V0LnJlcGxhY2UoLyhcXGJCQVNFX1VSTFxccyo6XFxzKilbXCInXVxcL1tcIiddL2csIGAkMSR7cXVvdGVkfWApO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vc2hhcmVkL3ByZXZpZXctcmV3cml0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vc2hhcmVkL3ByZXZpZXctcmV3cml0ZS90YW5zdGFja1JvdXRlckJhc2VwYXRoLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyUyMElFJTIwTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9zaGFyZWQvcHJldmlldy1yZXdyaXRlL3RhbnN0YWNrUm91dGVyQmFzZXBhdGguanNcIjsvKipcbiAqIFByb3h5LW9ubHkgVGFuU3RhY2sgUm91dGVyIGVtYmVkIHN1cHBvcnQuXG4gKlxuICogTmV2ZXIgd3JpdGVzIHVzZXIgcHJvamVjdCBzb3VyY2Ugb24gZGlzay5cbiAqIFJld3JpdGVzIGNyZWF0ZVJvdXRlcih7IHJvdXRlVHJlZSwgLi4uIH0pIHdpdGhvdXQgYmFzZXBhdGggKGFuZCBsaWJyYXJ5XG4gKiB0aGlzLmJhc2VwYXRoID8/IFwiXCIgZmFsbGJhY2tzKSBzbyBWaXRlICsgVGFuU3RhY2sgYXBwcyByZXNvbHZlIHVuZGVyIC9lbWJlZGRlZC88cG9ydD4vLlxuICovXG5cbmltcG9ydCB7IExBVU5DSFBBRF9FTUJFRF9CQVNFTkFNRV9FWFBSIH0gZnJvbSBcIi4vcmVhY3RSb3V0ZXJCYXNlbmFtZS5qc1wiO1xuXG5leHBvcnQgeyBMQVVOQ0hQQURfRU1CRURfQkFTRU5BTUVfRVhQUiB9O1xuXG5jb25zdCBDUkVBVEVfUk9VVEVSX0NBTExfUkUgPSAvXFxiY3JlYXRlUm91dGVyXFxzKlxcKC9nO1xuY29uc3QgUk9PVF9QQVRIX0xJVEVSQUxfUkUgPSAvXig/OltcIiddXFwvW1wiJ118YFxcL2ApLztcblxuLyoqXG4gKiBUcnVlIHdoZW4gY3JlYXRlUm91dGVyIC8gdGhpcy5iYXNlcGF0aCBhbHJlYWR5IHVzZXMgdGhlIExhdW5jaFBhZCBiYXNlbmFtZSBleHByZXNzaW9uXG4gKiBhbmQgdGhlcmUgaXMgbm90aGluZyBsZWZ0IHRvIHBhdGNoLlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbnRlbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3VsZFNraXBUYW5zdGFja1JvdXRlckJhc2VwYXRoUmV3cml0ZShjb250ZW50KSB7XG4gIGNvbnN0IHJhdyA9IFN0cmluZyhjb250ZW50IHx8IFwiXCIpO1xuICBpZiAoIXJhdy5pbmNsdWRlcyhMQVVOQ0hQQURfRU1CRURfQkFTRU5BTUVfRVhQUikpIHJldHVybiBmYWxzZTtcbiAgaWYgKGhhc1VucGF0Y2hlZENyZWF0ZVJvdXRlckNhbGwocmF3KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoaGFzVW5wYXRjaGVkTGlicmFyeUJhc2VwYXRoRmFsbGJhY2socmF3KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBQYXRjaCBUYW5TdGFjayBjcmVhdGVSb3V0ZXIoeyByb3V0ZVRyZWUgfSkgYW5kIHJvdXRlci1jb3JlIHRoaXMuYmFzZXBhdGggZmFsbGJhY2tzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50XG4gKiBAcGFyYW0ge3sgYXNzZXRQYXRoPzogc3RyaW5nLCByZXF1ZXN0UGF0aD86IHN0cmluZyB9IHwgc3RyaW5nfSBbb3B0aW9uc09yQXNzZXRQYXRoXVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZVRhbnN0YWNrUm91dGVyQmFzZXBhdGgoY29udGVudCwgb3B0aW9uc09yQXNzZXRQYXRoID0ge30pIHtcbiAgdm9pZCBvcHRpb25zT3JBc3NldFBhdGg7XG4gIGNvbnN0IHJhdyA9IFN0cmluZyhjb250ZW50IHx8IFwiXCIpO1xuICBpZiAoIXJhdykgcmV0dXJuIHJhdztcbiAgaWYgKHNob3VsZFNraXBUYW5zdGFja1JvdXRlckJhc2VwYXRoUmV3cml0ZShyYXcpKSByZXR1cm4gcmF3O1xuXG4gIGxldCBvdXQgPSByZXdyaXRlQ3JlYXRlUm91dGVyQ2FsbHMocmF3LCBMQVVOQ0hQQURfRU1CRURfQkFTRU5BTUVfRVhQUik7XG4gIGlmIChsb29rc0xpa2VUYW5zdGFja1JvdXRlckxpYnJhcnkob3V0KSkge1xuICAgIG91dCA9IHJld3JpdGVMaWJyYXJ5QmFzZXBhdGhGYWxsYmFjayhvdXQsIExBVU5DSFBBRF9FTUJFRF9CQVNFTkFNRV9FWFBSKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBoYXNVbnBhdGNoZWRDcmVhdGVSb3V0ZXJDYWxsKHJhdykge1xuICBDUkVBVEVfUk9VVEVSX0NBTExfUkUubGFzdEluZGV4ID0gMDtcbiAgbGV0IG07XG4gIHdoaWxlICgobSA9IENSRUFURV9ST1VURVJfQ0FMTF9SRS5leGVjKHJhdykpKSB7XG4gICAgY29uc3Qgb2JqID0gZXh0cmFjdE9iamVjdEFyZyhyYXcsIG0uaW5kZXggKyBtWzBdLmxlbmd0aCAtIDEpO1xuICAgIGlmICghb2JqKSBjb250aW51ZTtcbiAgICBpZiAoIS9cXGJyb3V0ZVRyZWVcXGIvLnRlc3Qob2JqLmJvZHkpKSBjb250aW51ZTtcbiAgICBpZiAob2JqLmJvZHkuaW5jbHVkZXMoTEFVTkNIUEFEX0VNQkVEX0JBU0VOQU1FX0VYUFIpKSBjb250aW51ZTtcbiAgICBjb25zdCBrZXkgPSBmaW5kRGVwdGgxS2V5KG9iai5ib2R5LCBcImJhc2VwYXRoXCIpO1xuICAgIGlmICgha2V5KSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB2YWx1ZVN0YXJ0ID0gc2tpcFdzKG9iai5ib2R5LCBrZXkuY29sb25FbmQpO1xuICAgIGlmIChST09UX1BBVEhfTElURVJBTF9SRS50ZXN0KG9iai5ib2R5LnNsaWNlKHZhbHVlU3RhcnQpKSkgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBoYXNVbnBhdGNoZWRMaWJyYXJ5QmFzZXBhdGhGYWxsYmFjayhyYXcpIHtcbiAgaWYgKCFsb29rc0xpa2VUYW5zdGFja1JvdXRlckxpYnJhcnkocmF3KSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBzdG10cyA9IHJhdy5tYXRjaCgvXFxidGhpc1xcLmJhc2VwYXRoXFxzKj1cXHMqKD86YFteYF0qYHxbXlxcbjtdKykvZykgfHwgW107XG4gIHJldHVybiBzdG10cy5zb21lKFxuICAgIChzKSA9PlxuICAgICAgIXMuaW5jbHVkZXMoTEFVTkNIUEFEX0VNQkVEX0JBU0VOQU1FX0VYUFIpICYmXG4gICAgICAvXFw/XFw/XFxzKig/OltcIiddXFwvW1wiJ118W1wiJ11bXCInXSkvLnRlc3QocyksXG4gICk7XG59XG5cbmZ1bmN0aW9uIGxvb2tzTGlrZVRhbnN0YWNrUm91dGVyTGlicmFyeShjb250ZW50KSB7XG4gIGNvbnN0IHJhdyA9IFN0cmluZyhjb250ZW50IHx8IFwiXCIpO1xuICBpZiAoL1xcYnRoaXNcXC5iYXNlcGF0aFxcYi8udGVzdChyYXcpICYmIC9cXGJ0cmltUGF0aFxcYi8udGVzdChyYXcpKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKC9AdGFuc3RhY2tcXC8oPzpyZWFjdC0pP3JvdXRlci8udGVzdChyYXcpICYmIC9cXGJ0aGlzXFwuYmFzZXBhdGhcXGIvLnRlc3QocmF3KSkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmV3cml0ZUNyZWF0ZVJvdXRlckNhbGxzKHNyYywgZXhwcikge1xuICBDUkVBVEVfUk9VVEVSX0NBTExfUkUubGFzdEluZGV4ID0gMDtcbiAgbGV0IG91dCA9IFwiXCI7XG4gIGxldCBsYXN0ID0gMDtcbiAgbGV0IG07XG4gIGxldCBjaGFuZ2VkID0gZmFsc2U7XG4gIHdoaWxlICgobSA9IENSRUFURV9ST1VURVJfQ0FMTF9SRS5leGVjKHNyYykpKSB7XG4gICAgY29uc3Qgb2JqID0gZXh0cmFjdE9iamVjdEFyZyhzcmMsIG0uaW5kZXggKyBtWzBdLmxlbmd0aCAtIDEpO1xuICAgIGlmICghb2JqKSBjb250aW51ZTtcbiAgICBjb25zdCByZXdyaXR0ZW4gPSByZXdyaXRlQ3JlYXRlUm91dGVyT2JqZWN0KG9iai5ib2R5LCBleHByKTtcbiAgICBpZiAocmV3cml0dGVuID09PSBvYmouYm9keSkgY29udGludWU7XG4gICAgb3V0ICs9IHNyYy5zbGljZShsYXN0LCBvYmouc3RhcnQpICsgcmV3cml0dGVuO1xuICAgIGxhc3QgPSBvYmouZW5kO1xuICAgIGNoYW5nZWQgPSB0cnVlO1xuICB9XG4gIGlmICghY2hhbmdlZCkgcmV0dXJuIHNyYztcbiAgcmV0dXJuIG91dCArIHNyYy5zbGljZShsYXN0KTtcbn1cblxuZnVuY3Rpb24gcmV3cml0ZUNyZWF0ZVJvdXRlck9iamVjdChvYmosIGV4cHIpIHtcbiAgaWYgKCEvXFxicm91dGVUcmVlXFxiLy50ZXN0KG9iaikpIHJldHVybiBvYmo7XG4gIGlmIChvYmouaW5jbHVkZXMoZXhwcikpIHJldHVybiBvYmo7XG4gIGNvbnN0IGtleSA9IGZpbmREZXB0aDFLZXkob2JqLCBcImJhc2VwYXRoXCIpO1xuICBpZiAoIWtleSkge1xuICAgIHJldHVybiBge2Jhc2VwYXRoOiR7ZXhwcn0sYCArIG9iai5zbGljZSgxKTtcbiAgfVxuICBjb25zdCB2YWx1ZVN0YXJ0ID0gc2tpcFdzKG9iaiwga2V5LmNvbG9uRW5kKTtcbiAgY29uc3Qgcm9vdCA9IG9iai5zbGljZSh2YWx1ZVN0YXJ0KS5tYXRjaChST09UX1BBVEhfTElURVJBTF9SRSk7XG4gIGlmICghcm9vdCkgcmV0dXJuIG9iajtcbiAgcmV0dXJuIG9iai5zbGljZSgwLCB2YWx1ZVN0YXJ0KSArIGV4cHIgKyBvYmouc2xpY2UodmFsdWVTdGFydCArIHJvb3RbMF0ubGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gcmV3cml0ZUxpYnJhcnlCYXNlcGF0aEZhbGxiYWNrKHNyYywgZXhwcikge1xuICByZXR1cm4gc3JjLnJlcGxhY2UoL1xcYnRoaXNcXC5iYXNlcGF0aFxccyo9XFxzKig/OmBbXmBdKmB8W15cXG47XSspL2csIChzdG10KSA9PiB7XG4gICAgaWYgKHN0bXQuaW5jbHVkZXMoZXhwcikpIHJldHVybiBzdG10O1xuICAgIHJldHVybiBzdG10XG4gICAgICAucmVwbGFjZSgvXFw/XFw/XFxzKltcIiddXFwvW1wiJ10vZywgYD8/JHtleHByfWApXG4gICAgICAucmVwbGFjZSgvXFw/XFw/XFxzKltcIiddW1wiJ10vZywgYD8/JHtleHByfWApO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdE9iamVjdEFyZyhzcmMsIG9wZW5QYXJlbklkeCkge1xuICBjb25zdCBhcmdTdGFydCA9IHNraXBXcyhzcmMsIG9wZW5QYXJlbklkeCArIDEpO1xuICBpZiAoc3JjW2FyZ1N0YXJ0XSAhPT0gXCJ7XCIpIHJldHVybiBudWxsO1xuICBjb25zdCBjbG9zZSA9IGZpbmRNYXRjaGluZ0JyYWNlKHNyYywgYXJnU3RhcnQpO1xuICBpZiAoY2xvc2UgPCAwKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgc3RhcnQ6IGFyZ1N0YXJ0LCBlbmQ6IGNsb3NlICsgMSwgYm9keTogc3JjLnNsaWNlKGFyZ1N0YXJ0LCBjbG9zZSArIDEpIH07XG59XG5cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ0JyYWNlKHNyYywgb3BlbklkeCkge1xuICBsZXQgZGVwdGggPSAwO1xuICBsZXQgaW5TdHIgPSBudWxsO1xuICBsZXQgZXNjYXBlID0gZmFsc2U7XG4gIGZvciAobGV0IGkgPSBvcGVuSWR4OyBpIDwgc3JjLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgYyA9IHNyY1tpXTtcbiAgICBpZiAoaW5TdHIpIHtcbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgZXNjYXBlID0gZmFsc2U7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGMgPT09IFwiXFxcXFwiKSB7XG4gICAgICAgIGVzY2FwZSA9IHRydWU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGMgPT09IGluU3RyKSBpblN0ciA9IG51bGw7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGMgPT09ICdcIicgfHwgYyA9PT0gXCInXCIgfHwgYyA9PT0gXCJgXCIpIHtcbiAgICAgIGluU3RyID0gYztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoYyA9PT0gXCIvXCIgJiYgc3JjW2kgKyAxXSA9PT0gXCIvXCIpIHtcbiAgICAgIGNvbnN0IG5sID0gc3JjLmluZGV4T2YoXCJcXG5cIiwgaSk7XG4gICAgICBpZiAobmwgPCAwKSByZXR1cm4gLTE7XG4gICAgICBpID0gbmw7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGMgPT09IFwiL1wiICYmIHNyY1tpICsgMV0gPT09IFwiKlwiKSB7XG4gICAgICBjb25zdCBlbmQgPSBzcmMuaW5kZXhPZihcIiovXCIsIGkgKyAyKTtcbiAgICAgIGlmIChlbmQgPCAwKSByZXR1cm4gLTE7XG4gICAgICBpID0gZW5kICsgMTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoYyA9PT0gXCJ7XCIpIGRlcHRoKys7XG4gICAgZWxzZSBpZiAoYyA9PT0gXCJ9XCIpIHtcbiAgICAgIGRlcHRoLS07XG4gICAgICBpZiAoZGVwdGggPT09IDApIHJldHVybiBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGZpbmREZXB0aDFLZXkob2JqLCBrZXkpIHtcbiAgY29uc3Qga2V5UmUgPSBuZXcgUmVnRXhwKGBeKD86W1wiJ10ke2tleX1bXCInXXwke2tleX0pXFxcXHMqOmApO1xuICBsZXQgZGVwdGggPSAwO1xuICBsZXQgaW5TdHIgPSBudWxsO1xuICBsZXQgZXNjYXBlID0gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgYyA9IG9ialtpXTtcbiAgICBpZiAoaW5TdHIpIHtcbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgZXNjYXBlID0gZmFsc2U7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGMgPT09IFwiXFxcXFwiKSB7XG4gICAgICAgIGVzY2FwZSA9IHRydWU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGMgPT09IGluU3RyKSBpblN0ciA9IG51bGw7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGMgPT09ICdcIicgfHwgYyA9PT0gXCInXCIgfHwgYyA9PT0gXCJgXCIpIHtcbiAgICAgIGluU3RyID0gYztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoYyA9PT0gXCJ7XCIgfHwgYyA9PT0gXCJbXCIgfHwgYyA9PT0gXCIoXCIpIHtcbiAgICAgIGRlcHRoKys7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGMgPT09IFwifVwiIHx8IGMgPT09IFwiXVwiIHx8IGMgPT09IFwiKVwiKSB7XG4gICAgICBkZXB0aC0tO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChkZXB0aCAhPT0gMSkgY29udGludWU7XG4gICAgaWYgKGMgIT09IFwiYlwiICYmIGMgIT09ICdcIicgJiYgYyAhPT0gXCInXCIpIGNvbnRpbnVlO1xuICAgIGNvbnN0IHNsaWNlID0gb2JqLnNsaWNlKGkpO1xuICAgIGNvbnN0IG0gPSBzbGljZS5tYXRjaChrZXlSZSk7XG4gICAgaWYgKCFtKSBjb250aW51ZTtcbiAgICBpZiAoaSA+IDAgJiYgL1tcXHckXS8udGVzdChvYmpbaSAtIDFdKSkgY29udGludWU7XG4gICAgcmV0dXJuIHsga2V5U3RhcnQ6IGksIGNvbG9uRW5kOiBpICsgbVswXS5sZW5ndGggfTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2tpcFdzKHMsIGkpIHtcbiAgd2hpbGUgKGkgPCBzLmxlbmd0aCAmJiAvXFxzLy50ZXN0KHNbaV0pKSBpKys7XG4gIHJldHVybiBpO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUksgSUUgTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9mcm9udGVuZC9pZnJhbWUtcHJldmlld1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXcvcmV3cml0ZVBhdGhzLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyUyMElFJTIwTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9mcm9udGVuZC9pZnJhbWUtcHJldmlldy9yZXdyaXRlUGF0aHMuanNcIjtpbXBvcnQgeyBFTUJFRF9GUkFNRV9QQVJBTSwgRU1CRURERURfUEFUSF9QUkVGSVggfSBmcm9tIFwiLi9jb25zdGFudHMuanNcIjtcbmltcG9ydCB7IGJ1aWxkRW1iZWRCb290c3RyYXBTY3JpcHQgfSBmcm9tIFwiLi9lbWJlZEhtcldzLmpzXCI7XG5pbXBvcnQge1xuICBpc0luY29ycmVjdE1vZHVsZUNvbnRlbnRUeXBlLFxuICBpc01vZHVsZVNjcmlwdFJlcXVlc3RQYXRoLFxuICBpc1ZpdGVTcGVjaWFsSW1wb3J0UGF0aCxcbn0gZnJvbSBcIi4vdml0ZVNwZWNpYWxJbXBvcnQudXRpbC5qc1wiO1xuaW1wb3J0IHtcbiAgTEFVTkNIUEFEX0VNQkVEX0JBU0VOQU1FX0VYUFIsXG4gIHJld3JpdGVSZWFjdFJvdXRlckJhc2VuYW1lLFxufSBmcm9tIFwiLi4vLi4vc2hhcmVkL3ByZXZpZXctcmV3cml0ZS9yZWFjdFJvdXRlckJhc2VuYW1lLmpzXCI7XG5pbXBvcnQgeyByZXdyaXRlVnVlUm91dGVyQmFzZSB9IGZyb20gXCIuLi8uLi9zaGFyZWQvcHJldmlldy1yZXdyaXRlL3Z1ZVJvdXRlckJhc2UuanNcIjtcbmltcG9ydCB7IHJld3JpdGVUYW5zdGFja1JvdXRlckJhc2VwYXRoIH0gZnJvbSBcIi4uLy4uL3NoYXJlZC9wcmV2aWV3LXJld3JpdGUvdGFuc3RhY2tSb3V0ZXJCYXNlcGF0aC5qc1wiO1xuXG5leHBvcnQge1xuICBMQVVOQ0hQQURfRU1CRURfQkFTRU5BTUVfRVhQUixcbiAgcmV3cml0ZVJlYWN0Um91dGVyQmFzZW5hbWUsXG4gIHJld3JpdGVWdWVSb3V0ZXJCYXNlLFxuICByZXdyaXRlVGFuc3RhY2tSb3V0ZXJCYXNlcGF0aCxcbn07XG5cbi8qKiBQdWJsaWMvc3RhdGljIGRpcnMgb24gdGhlIGVtYmVkIGFwcCAobm90IFZpdGUgbW9kdWxlIHBhdGhzIGxpa2UgL3NyYyBvciAvbm9kZV9tb2R1bGVzKS4gKi9cbmV4cG9ydCBjb25zdCBFTUJFRF9QVUJMSUNfUEFUSF9QUkVGSVhFUyA9IFtcbiAgXCJicmFuZFwiLFxuICBcImljb25zXCIsXG4gIFwiYXNzZXRzXCIsXG4gIFwiaW1hZ2VzXCIsXG4gIFwic3RhdGljXCIsXG4gIFwicHVibGljXCIsXG4gIFwibWVkaWFcIixcbiAgXCJmb250c1wiLFxuXTtcblxuLyoqIFBhdGhzIHNlcnZlZCBmcm9tIHVwc3RyZWFtIG9yaWdpbiByb290IChub3QgdW5kZXIgYXBwIGJhc2VQYXRoKS4gKi9cbmNvbnN0IFVQU1RSRUFNX1JPT1RfUFJFRklYID0gbmV3IFJlZ0V4cChcbiAgYF5cXFxcLyg/OkB2aXRlfEByZWFjdC1yZWZyZXNofEBmc3xAaWR8bm9kZV9tb2R1bGVzfHNyY3wke1suLi5FTUJFRF9QVUJMSUNfUEFUSF9QUkVGSVhFU10uam9pbihcInxcIil9KSg/OlxcXFwvfCQpYCxcbik7XG5cbi8qKiBWaXRlIGRldiBtb2R1bGUgLyBzdHlsZXNoZWV0IGV4dGVuc2lvbnMgKGFueSByb290LWxldmVsIGZvbGRlciwgbm90IG9ubHkgL3NyYykuICovXG5leHBvcnQgY29uc3QgVklURV9ERVZfTU9EVUxFX0VYVCA9IFwidHN4P3xqc3g/fG1qc3xjanN8dnVlfHN2ZWx0ZXxjc3N8c2Nzc3xzYXNzfGxlc3NcIjtcblxuY29uc3QgVklURV9ERVZfTU9EVUxFX1BBVEhfUkUgPSBuZXcgUmVnRXhwKGBcXFxcLigke1ZJVEVfREVWX01PRFVMRV9FWFR9KSg/OlxcXFw/LiopPyRgLCBcImlcIik7XG5cbi8qKiBMYXVuY2hwYWQgU1BBL0FQSSBmaXJzdCBzZWdtZW50cyBcdTIwMTQgbmV2ZXIgdHJlYXQgYXMgdXBzdHJlYW0gcHJvamVjdCBtb2R1bGVzLiAqL1xuY29uc3QgTEFVTkNIUEFEX1JPT1RfU0VHTUVOVFMgPSBuZXcgU2V0KFtcbiAgXCJwcm9qZWN0c1wiLFxuICBcImFwaVwiLFxuICBcImF1dGhcIixcbiAgXCJhZG1pblwiLFxuICBcImVtYmVkZGVkXCIsXG4gIFwiaWZyYW1lLXByZXZpZXdcIixcbiAgXCJsb2dpblwiLFxuICBcInJlZ2lzdGVyXCIsXG4gIFwic2lnbnVwXCIsXG4gIFwic2V0dGluZ3NcIixcbiAgXCJyZWxlYXNlc1wiLFxuICBcIndvcmtzcGFjZVwiLFxuICBcImNsaWVudC1saW5rXCIsXG5dKTtcblxuLyoqXG4gKiBUcnVlIGZvciByb290LWFic29sdXRlIFZpdGUgZGV2IG1vZHVsZSBVUkxzIChlLmcuIC9saWIvZm9vLnRzeCwgL2NvbXBvbmVudHMvdWkveC50c3gpLlxuICogV29ya3MgZm9yIGFueSBmb2xkZXIgd2hlbiBgQGAgYWxpYXMgcG9pbnRzIGF0IHByb2plY3Qgcm9vdCwgbm90IG9ubHkgL3NyYy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRobmFtZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNWaXRlRGV2TW9kdWxlUGF0aChwYXRobmFtZSkge1xuICBjb25zdCByYXcgPSBTdHJpbmcocGF0aG5hbWUgPz8gXCJcIik7XG4gIGNvbnN0IHAgPSByYXcuc3BsaXQoXCI/XCIpWzBdID8/IFwiXCI7XG4gIGlmICghcC5zdGFydHNXaXRoKFwiL1wiKSB8fCBwLnN0YXJ0c1dpdGgoXCIvZW1iZWRkZWQvXCIpKSByZXR1cm4gZmFsc2U7XG4gIGlmICghVklURV9ERVZfTU9EVUxFX1BBVEhfUkUudGVzdChwKSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBzZWdtZW50cyA9IHAuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKTtcbiAgaWYgKCFzZWdtZW50cy5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgZmlyc3QgPSBzZWdtZW50c1swXS50b0xvd2VyQ2FzZSgpO1xuICBpZiAoTEFVTkNIUEFEX1JPT1RfU0VHTUVOVFMuaGFzKGZpcnN0KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqIFZpdGUgZGV2IHBhdGhzICsgTmV4dC5qcyBgL19uZXh0L2AgKyBUdXJib3BhY2sgcm9vdCBjaHVua3MgKGAvbm9kZV9tb2R1bGVzXypgLCBgL3NyY18qYCwgXHUyMDI2KS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Vwc3RyZWFtQnVuZGxlclBhdGgocGF0aG5hbWUpIHtcbiAgY29uc3QgcCA9IChwYXRobmFtZSA/PyBcIlwiKS5zcGxpdChcIj9cIilbMF0gPz8gXCJcIjtcbiAgaWYgKCFwLnN0YXJ0c1dpdGgoXCIvXCIpKSByZXR1cm4gZmFsc2U7XG4gIGlmIChVUFNUUkVBTV9ST09UX1BSRUZJWC50ZXN0KHApKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGlzVml0ZURldk1vZHVsZVBhdGgocCkpIHJldHVybiB0cnVlO1xuICBpZiAoL15cXC9fbmV4dCg/OlxcL3wkKS8udGVzdChwKSkgcmV0dXJuIHRydWU7XG4gIGlmICgvXlxcL25vZGVfbW9kdWxlc19bXi9dKyQvLnRlc3QocCkpIHJldHVybiB0cnVlO1xuICBpZiAoL15cXC90dXJib3BhY2stW14vXSskLy50ZXN0KHApKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKC9eXFwvd2VicGFjay1obXIkLy50ZXN0KHApKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKC9eXFwvX193ZWJwYWNrX2htciQvLnRlc3QocCkpIHJldHVybiB0cnVlO1xuICBpZiAoL15cXC90dXJib3BhY2staG1yJC8udGVzdChwKSkgcmV0dXJuIHRydWU7XG4gIGlmICgvXlxcL3NyY19bXi9dKyQvLnRlc3QocCkpIHJldHVybiB0cnVlO1xuICBpZiAoL15cXC9fW2EtZjAtOV0rXFwuX1xcLlteL10rJC9pLnRlc3QocCkpIHJldHVybiB0cnVlO1xuICBpZiAoL15cXC9fX25leHRqc18vLnRlc3QocCkpIHJldHVybiB0cnVlO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBTcGxpdCBwcm94eSB0YXJnZXQgVVJMIGludG8gb3JpZ2luICsgb3B0aW9uYWwgYXBwIGJhc2UgcGF0aC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUVtYmVkVGFyZ2V0KHVybCkge1xuICBjb25zdCB0cmltbWVkID0gU3RyaW5nKHVybCB8fCBcIlwiKS5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh0cmltbWVkKTtcbiAgICBjb25zdCBiYXNlUGF0aCA9IHBhcnNlZC5wYXRobmFtZSA9PT0gXCIvXCIgPyBcIlwiIDogcGFyc2VkLnBhdGhuYW1lLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgICByZXR1cm4geyB1cmw6IHRyaW1tZWQsIG9yaWdpbjogcGFyc2VkLm9yaWdpbiwgYmFzZVBhdGggfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHsgdXJsOiB0cmltbWVkLCBvcmlnaW46IHRyaW1tZWQsIGJhc2VQYXRoOiBcIlwiIH07XG4gIH1cbn1cblxuLyoqXG4gKiBNYXAgL2VtYmVkZGVkLzxwb3J0Pi8uLi4gcmVxdWVzdHMgdG8gdGhlIGNvcnJlY3QgdXBzdHJlYW0gcGF0aC5cbiAqIFBhZ2UgSFRNTCB1c2VzIGJhc2VQYXRoOyBWaXRlIGRldiBtb2R1bGVzIHVzZSB0aGUgc2VydmVyIHJvb3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXdyaXRlRW1iZWRQcm94eVBhdGgocGF0aCwgZW1iZWRCYXNlUGF0aCwgZW1iZWRQYXRoUHJlZml4KSB7XG4gIGNvbnN0IGVzY2FwZWQgPSBlbWJlZFBhdGhQcmVmaXgucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICBjb25zdCBzdHJpcHBlZCA9IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKGBeJHtlc2NhcGVkfS8/YCksIFwiL1wiKSB8fCBcIi9cIjtcblxuICBpZiAoaXNVcHN0cmVhbUJ1bmRsZXJQYXRoKHN0cmlwcGVkKSkge1xuICAgIHJldHVybiBzdHJpcHBlZDtcbiAgfVxuXG4gIGlmICghZW1iZWRCYXNlUGF0aCkge1xuICAgIHJldHVybiBzdHJpcHBlZDtcbiAgfVxuXG4gIGlmIChzdHJpcHBlZCA9PT0gXCIvXCIpIHtcbiAgICByZXR1cm4gYCR7ZW1iZWRCYXNlUGF0aH0vYDtcbiAgfVxuXG4gIHJldHVybiBgJHtlbWJlZEJhc2VQYXRofSR7c3RyaXBwZWR9YDtcbn1cblxuZnVuY3Rpb24gam9pbkFwcFBhdGgocHJlZml4LCBzdWZmaXgpIHtcbiAgY29uc3QgYmFzZSA9IHByZWZpeC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gIGlmICghc3VmZml4IHx8IHN1ZmZpeCA9PT0gXCIvXCIpIHJldHVybiBgJHtiYXNlfS9gO1xuICBjb25zdCBwYXRoID0gc3VmZml4LnN0YXJ0c1dpdGgoXCIvXCIpID8gc3VmZml4IDogYC8ke3N1ZmZpeH1gO1xuICByZXR1cm4gYCR7YmFzZX0ke3BhdGh9YDtcbn1cblxuZnVuY3Rpb24gaXNQcm94aWVkUGF0aChwYXRoLCBiYXNlUGF0aCwgYXNzZXRQYXRoKSB7XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoYCR7YXNzZXRQYXRofS9gKSB8fCBwYXRoID09PSBhc3NldFBhdGgpIHJldHVybiB0cnVlO1xuICBpZiAoYmFzZVBhdGggJiYgKHBhdGguc3RhcnRzV2l0aChgJHtiYXNlUGF0aH0vYCkgfHwgcGF0aCA9PT0gYmFzZVBhdGgpKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKiogUmVtb3ZlIGludGVybmFsIHByb3h5IHBhcmFtcyBiZWZvcmUgZm9yd2FyZGluZyB0byB1cHN0cmVhbS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcEVtYmVkRnJhbWVQYXJhbShyYXdVcmwpIHtcbiAgY29uc3QgcUlkeCA9IFN0cmluZyhyYXdVcmwgPz8gXCJcIikuaW5kZXhPZihcIj9cIik7XG4gIGlmIChxSWR4ID09PSAtMSkgcmV0dXJuIHJhd1VybDtcbiAgY29uc3QgcGF0aG5hbWUgPSByYXdVcmwuc2xpY2UoMCwgcUlkeCk7XG4gIGNvbnN0IHF1ZXJ5ID0gcmF3VXJsLnNsaWNlKHFJZHggKyAxKTtcbiAgaWYgKCFxdWVyeSkgcmV0dXJuIHJhd1VybDtcbiAgLy8gRG8gbm90IHVzZSBVUkxTZWFyY2hQYXJhbXMgXHUyMDE0IGl0IHR1cm5zIFZpdGUgZmxhZyBwYXJhbXMgbGlrZSBgP3Z1ZSZ0eXBlPXN0eWxlYFxuICAvLyBpbnRvIGA/dnVlPSZ0eXBlPXN0eWxlYCwgYW5kIHVwc3RyZWFtIHRoZW4gcmV0dXJucyByYXcgQ1NTIGluc3RlYWQgb2YgdGhlIEpTIG1vZHVsZS5cbiAgY29uc3QgcGFydHMgPSBxdWVyeS5zcGxpdChcIiZcIikuZmlsdGVyKChwYXJ0KSA9PiB7XG4gICAgaWYgKCFwYXJ0KSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgZXEgPSBwYXJ0LmluZGV4T2YoXCI9XCIpO1xuICAgIGNvbnN0IGtleSA9IChlcSA9PT0gLTEgPyBwYXJ0IDogcGFydC5zbGljZSgwLCBlcSkpLnRyaW0oKTtcbiAgICByZXR1cm4ga2V5ICE9PSBFTUJFRF9GUkFNRV9QQVJBTTtcbiAgfSk7XG4gIGNvbnN0IHFzID0gcGFydHMuam9pbihcIiZcIik7XG4gIHJldHVybiBxcyA/IGAke3BhdGhuYW1lfT8ke3FzfWAgOiBwYXRobmFtZTtcbn1cblxuLyoqIFJld3JpdGUgdXBzdHJlYW0gcmVkaXJlY3QgdGFyZ2V0cyBzbyBuYXZpZ2F0aW9uIHN0YXlzIG9uIHRoZSBob3N0IChpZnJhbWUgc2FtZS1vcmlnaW4pLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVSZWRpcmVjdExvY2F0aW9uKGxvY2F0aW9uLCBwcm94eVRhcmdldCwgYXNzZXRQYXRoKSB7XG4gIGNvbnN0IHsgdXJsLCBvcmlnaW4sIGJhc2VQYXRoIH0gPSBwYXJzZUVtYmVkVGFyZ2V0KHByb3h5VGFyZ2V0KTtcbiAgY29uc3QgdHJpbW1lZCA9IGxvY2F0aW9uLnRyaW0oKTtcbiAgaWYgKCF0cmltbWVkKSByZXR1cm4gdHJpbW1lZDtcblxuICBjb25zdCBtYXBVcHN0cmVhbVBhdGggPSAocGF0aCkgPT4ge1xuICAgIC8vIEFsd2F5cyBrZWVwIHJlZGlyZWN0cyB1bmRlciAvZW1iZWRkZWQvPHBvcnQ+LyBzbyBOZXh0IHJlZGlyZWN0KFwiL2Rhc2hib2FyZFwiKVxuICAgIC8vIGRvZXMgbm90IGJyZWFrIG91dCB0byB0aGUgTGF1bmNoUGFkIGhvc3Qgcm9vdC5cbiAgICBpZiAoaXNVcHN0cmVhbUJ1bmRsZXJQYXRoKHBhdGgpKSByZXR1cm4gam9pbkFwcFBhdGgoYXNzZXRQYXRoLCBwYXRoKTtcbiAgICBpZiAoYmFzZVBhdGggJiYgKHBhdGggPT09IGJhc2VQYXRoIHx8IHBhdGguc3RhcnRzV2l0aChgJHtiYXNlUGF0aH0vYCkpKSB7XG4gICAgICByZXR1cm4gam9pbkFwcFBhdGgoYXNzZXRQYXRoLCBwYXRoKTtcbiAgICB9XG4gICAgaWYgKGJhc2VQYXRoKSByZXR1cm4gam9pbkFwcFBhdGgoYXNzZXRQYXRoLCBqb2luQXBwUGF0aChiYXNlUGF0aCwgcGF0aCkpO1xuICAgIHJldHVybiBqb2luQXBwUGF0aChhc3NldFBhdGgsIHBhdGgpO1xuICB9O1xuXG4gIGlmICgvXmh0dHBzPzpcXC9cXC8vaS50ZXN0KHRyaW1tZWQpKSB7XG4gICAgaWYgKHRyaW1tZWQuc3RhcnRzV2l0aChgJHt1cmx9L2ApIHx8IHRyaW1tZWQgPT09IHVybCkge1xuICAgICAgY29uc3Qgc3VmZml4ID0gdHJpbW1lZC5zbGljZSh1cmwubGVuZ3RoKSB8fCBcIi9cIjtcbiAgICAgIGNvbnN0IHBhdGggPSBzdWZmaXguc3RhcnRzV2l0aChcIi9cIikgPyBzdWZmaXggOiBgLyR7c3VmZml4fWA7XG4gICAgICByZXR1cm4gbWFwVXBzdHJlYW1QYXRoKHBhdGgpO1xuICAgIH1cbiAgICBpZiAodHJpbW1lZC5zdGFydHNXaXRoKGAke29yaWdpbn0vYCkgfHwgdHJpbW1lZCA9PT0gb3JpZ2luKSB7XG4gICAgICBjb25zdCBzdWZmaXggPSB0cmltbWVkLnNsaWNlKG9yaWdpbi5sZW5ndGgpIHx8IFwiL1wiO1xuICAgICAgY29uc3QgcGF0aCA9IHN1ZmZpeC5zdGFydHNXaXRoKFwiL1wiKSA/IHN1ZmZpeCA6IGAvJHtzdWZmaXh9YDtcbiAgICAgIHJldHVybiBtYXBVcHN0cmVhbVBhdGgocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0cmltbWVkO1xuICB9XG5cbiAgaWYgKHRyaW1tZWQuc3RhcnRzV2l0aChcIi8vXCIpKSB7XG4gICAgcmV0dXJuIHRyaW1tZWQ7XG4gIH1cblxuICBpZiAodHJpbW1lZC5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgIGlmIChpc1Byb3hpZWRQYXRoKHRyaW1tZWQsIGJhc2VQYXRoLCBhc3NldFBhdGgpKSByZXR1cm4gdHJpbW1lZDtcbiAgICByZXR1cm4gbWFwVXBzdHJlYW1QYXRoKHRyaW1tZWQpO1xuICB9XG5cbiAgcmV0dXJuIHRyaW1tZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXdyaXRlUmVmcmVzaEhlYWRlcihyZWZyZXNoLCBwcm94eVRhcmdldCwgYXNzZXRQYXRoKSB7XG4gIHJldHVybiByZWZyZXNoLnJlcGxhY2UoXG4gICAgL3VybD1cXHMqKFxcUyspL2ksXG4gICAgKF9tYXRjaCwgdXJsKSA9PiBgdXJsPSR7cmV3cml0ZVJlZGlyZWN0TG9jYXRpb24odXJsLCBwcm94eVRhcmdldCwgYXNzZXRQYXRoKX1gLFxuICApO1xufVxuXG4vKipcbiAqIFNjb3BlIFNldC1Db29raWUgUGF0aCB1bmRlciAvZW1iZWRkZWQvPHBvcnQ+LyBzbyBwcmV2aWV3IGF1dGggY29va2llc1xuICogZG8gbm90IHVzZSBQYXRoPS8gb24gdGhlIExhdW5jaFBhZCBob3N0IChDb29raWUgaGVhZGVyIFx1MjE5MiBuZ2lueCA0MDApLlxuICogQHBhcmFtIHtzdHJpbmd9IHNldENvb2tpZVZhbHVlXG4gKiBAcGFyYW0ge3N0cmluZ30gYXNzZXRQYXRoIGUuZy4gL2VtYmVkZGVkLzgwMTNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVTZXRDb29raWVQYXRoRm9yRW1iZWQoc2V0Q29va2llVmFsdWUsIGFzc2V0UGF0aCkge1xuICBjb25zdCByYXcgPSBTdHJpbmcoc2V0Q29va2llVmFsdWUgPz8gXCJcIik7XG4gIGlmICghcmF3KSByZXR1cm4gcmF3O1xuICBjb25zdCBwcmVmaXggPSBhc3NldFBhdGguZW5kc1dpdGgoXCIvXCIpID8gYXNzZXRQYXRoIDogYCR7YXNzZXRQYXRofS9gO1xuICBpZiAoLztcXHMqcGF0aFxccyo9L2kudGVzdChyYXcpKSB7XG4gICAgcmV0dXJuIHJhdy5yZXBsYWNlKC87XFxzKnBhdGhcXHMqPVteO10qL2ksIGA7IFBhdGg9JHtwcmVmaXh9YCk7XG4gIH1cbiAgcmV0dXJuIGAke3Jhd307IFBhdGg9JHtwcmVmaXh9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UHJveHlSZXNwb25zZUhlYWRlcnMoaGVhZGVycywgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCkge1xuICBjb25zdCBvdXQgPSB7IC4uLmhlYWRlcnMgfTtcblxuICBjb25zdCBsb2NhdGlvbiA9IG91dC5sb2NhdGlvbiA/PyBvdXQuTG9jYXRpb247XG4gIGlmICh0eXBlb2YgbG9jYXRpb24gPT09IFwic3RyaW5nXCIpIHtcbiAgICBvdXQubG9jYXRpb24gPSByZXdyaXRlUmVkaXJlY3RMb2NhdGlvbihsb2NhdGlvbiwgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCk7XG4gICAgZGVsZXRlIG91dC5Mb2NhdGlvbjtcbiAgfVxuXG4gIGNvbnN0IHJlZnJlc2ggPSBvdXQucmVmcmVzaCA/PyBvdXQuUmVmcmVzaDtcbiAgaWYgKHR5cGVvZiByZWZyZXNoID09PSBcInN0cmluZ1wiKSB7XG4gICAgb3V0LnJlZnJlc2ggPSByZXdyaXRlUmVmcmVzaEhlYWRlcihyZWZyZXNoLCBwcm94eVRhcmdldCwgYXNzZXRQYXRoKTtcbiAgICBkZWxldGUgb3V0LlJlZnJlc2g7XG4gIH1cblxuICBjb25zdCBzZXRDb29raWUgPSBvdXRbXCJzZXQtY29va2llXCJdID8/IG91dFtcIlNldC1Db29raWVcIl07XG4gIGlmIChzZXRDb29raWUgIT0gbnVsbCkge1xuICAgIGNvbnN0IGxpc3QgPSBBcnJheS5pc0FycmF5KHNldENvb2tpZSkgPyBzZXRDb29raWUgOiBbc2V0Q29va2llXTtcbiAgICBvdXRbXCJzZXQtY29va2llXCJdID0gbGlzdC5tYXAoKHYpID0+IHJld3JpdGVTZXRDb29raWVQYXRoRm9yRW1iZWQoU3RyaW5nKHYpLCBhc3NldFBhdGgpKTtcbiAgICBkZWxldGUgb3V0W1wiU2V0LUNvb2tpZVwiXTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHJld3JpdGVIdG1sTWV0YVJlZnJlc2goaHRtbCwgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCkge1xuICByZXR1cm4gaHRtbC5yZXBsYWNlKFxuICAgIC8oPG1ldGFcXHNbXj5dKmh0dHAtZXF1aXZcXHMqPVxccypbXCInXXJlZnJlc2hbXCInXVtePl0qY29udGVudFxccyo9XFxzKltcIiddW15cIiddKnVybD0pKFteXCInO10rKS9naSxcbiAgICAoX21hdGNoLCBwcmVmaXgsIHVybCkgPT5cbiAgICAgIGAke3ByZWZpeH0ke3Jld3JpdGVSZWRpcmVjdExvY2F0aW9uKHVybC50cmltKCksIHByb3h5VGFyZ2V0LCBhc3NldFBhdGgpfWAsXG4gICk7XG59XG5cbmZ1bmN0aW9uIGVtYmVkUHJlZml4KGVtYmVkUGF0aCkge1xuICBjb25zdCBiYXNlID0gZW1iZWRQYXRoLmVuZHNXaXRoKFwiL1wiKSA/IGVtYmVkUGF0aC5zbGljZSgwLCAtMSkgOiBlbWJlZFBhdGg7XG4gIHJldHVybiBgJHtiYXNlfS9gO1xufVxuXG4vKiogPGJhc2UgaHJlZj4gZm9yIGlmcmFtZSBkb2N1bWVudHMgXHUyMDE0IGFsd2F5cyB1bmRlciAvZW1iZWRkZWQvPHBvcnQ+LyAoKyB1cHN0cmVhbSBiYXNlUGF0aCkuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUVtYmVkRG9jdW1lbnRCYXNlKGFzc2V0UGF0aCwgdXBzdHJlYW1CYXNlUGF0aCA9IFwiXCIpIHtcbiAgY29uc3QgYmFzZSA9IHVwc3RyZWFtQmFzZVBhdGgucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICBpZiAoIWJhc2UpIHJldHVybiBhc3NldFBhdGguZW5kc1dpdGgoXCIvXCIpID8gYXNzZXRQYXRoIDogYCR7YXNzZXRQYXRofS9gO1xuICBjb25zdCBlbWJlZCA9IGFzc2V0UGF0aC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gIHJldHVybiBgJHtlbWJlZH0ke2Jhc2V9L2A7XG59XG5cbmNvbnN0IEFTU0VUX1BBVEhfTkFNRVMgPSBbXG4gIFwiQHZpdGVcIixcbiAgXCJAcmVhY3QtcmVmcmVzaFwiLFxuICBcIkBmc1wiLFxuICBcIkBpZFwiLFxuICBcIm5vZGVfbW9kdWxlc1wiLFxuICBcInNyY1wiLFxuICBcIl9uZXh0XCIsXG4gIC4uLkVNQkVEX1BVQkxJQ19QQVRIX1BSRUZJWEVTLFxuICBcImZhdmljb24uaWNvXCIsXG4gIFwiZmF2aWNvbi5zdmdcIixcbl0uam9pbihcInxcIik7XG5cbi8qKiBDaGFycyBpbiBhIHF1b3RlZCByb290LWFic29sdXRlIHBhdGggKG5vIHdoaXRlc3BhY2UgXHUyMDE0IGF2b2lkcyBgXFxcXHNgIFx1MjE5MiBsaXRlcmFsIGBzYCBpbiBgW15cdTIwMjZdYCkuICovXG5jb25zdCBRVU9URURfVVJMX1NFR01FTlQgPSBcIlteXFxcIidcXFxcYFxcXFwpL10rXCI7XG5cbi8qKiBOZXh0LmpzIGRldjogL19uZXh0L1x1MjAyNiwgVHVyYm9wYWNrIGNodW5rcywgYW5kIEhNUiB3ZWJzb2NrZXQgcGF0aHMgKHNpbmdsZSBwYXRoIHNlZ21lbnQpLiAqL1xuY29uc3QgTkVYVF9ERVZfUk9PVF9QQVRIID0gYCg/Ol9uZXh0KD86XFxcXC8ke1FVT1RFRF9VUkxfU0VHTUVOVH0pP3xfX25leHRqc18ke1FVT1RFRF9VUkxfU0VHTUVOVH18bm9kZV9tb2R1bGVzXyR7UVVPVEVEX1VSTF9TRUdNRU5UfXx0dXJib3BhY2stJHtRVU9URURfVVJMX1NFR01FTlR9fHR1cmJvcGFjay1obXJ8d2VicGFjay1obXJ8X193ZWJwYWNrX2htcnxzcmNfJHtRVU9URURfVVJMX1NFR01FTlR9KWA7XG5cbmNvbnN0IE5FWFRfREVWX1FVT1RFRF9QQVRIX1JFID0gbmV3IFJlZ0V4cChcbiAgYCg/PD1bXCInXFxgKF18dXJsXFxcXChcXFxccypbXCInXT8pXFxcXC8oPyFcXFxcL3xlbWJlZGRlZFxcXFwvKSgke05FWFRfREVWX1JPT1RfUEFUSH0pYCxcbiAgXCJnaVwiLFxuKTtcblxuY29uc3QgVFVSQk9QQUNLX0hBU0hfQ0hVTktfUkUgPSAvKD88PVtcIidcXGAoXSlcXC8oPyFcXC98ZW1iZWRkZWRcXC8pKF9bYS1mMC05XStcXC5fXFwuXFx3KykvZ2k7XG5cbi8qKiBQcmVmaXggTmV4dC5qcyAvIFR1cmJvcGFjayBkZXYgYXNzZXQgVVJMcyBzbyB0aGV5IHN0YXkgdW5kZXIgL2VtYmVkZGVkLzxwb3J0Pi8uICovXG5jb25zdCBORVhUX0ZFVENIX1BBVEhfUkUgPSAvKFxcYmZldGNoXFxzKlxcKFxccypbXCInXSlcXC8oPyFcXC98ZW1iZWRkZWRcXC8pKF9fbmV4dGpzX1teXCInXSspL2dpO1xuXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZU5leHREZXZQYXRocyhjb250ZW50LCBlbWJlZFBhdGgpIHtcbiAgY29uc3QgcHJlZml4ID0gZW1iZWRQcmVmaXgoZW1iZWRQYXRoKS5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gIGxldCBvdXQgPSBjb250ZW50LnJlcGxhY2UoTkVYVF9ERVZfUVVPVEVEX1BBVEhfUkUsIGAke3ByZWZpeH0vJDFgKTtcbiAgb3V0ID0gb3V0LnJlcGxhY2UoVFVSQk9QQUNLX0hBU0hfQ0hVTktfUkUsIGAke3ByZWZpeH0vJDFgKTtcbiAgb3V0ID0gb3V0LnJlcGxhY2UoTkVYVF9GRVRDSF9QQVRIX1JFLCBgJDEke3ByZWZpeH0vJDJgKTtcbiAgcmV0dXJuIG91dDtcbn1cblxuY29uc3QgUFVCTElDX0FTU0VUX1JPT1RTID0gWy4uLkVNQkVEX1BVQkxJQ19QQVRIX1BSRUZJWEVTLCBcImZhdmljb25cXFxcLmljb1wiLCBcImZhdmljb25cXFxcLnN2Z1wiXS5qb2luKFxuICBcInxcIixcbik7XG5jb25zdCBBU1NFVF9QQVRIX1BBVFRFUk4gPSBgKD86JHtBU1NFVF9QQVRIX05BTUVTfSkoPzpcXFxcL1teXCInXFxcXFxcYFxcXFwpXFxcXHNdKik/YDtcblxuLyoqIFZpdGUgYHB1YmxpYy9gIGZpbGVzIGF0IHNlcnZlciByb290OiAvQlNQLnN2ZywgL2xvZ28ucG5nIChub3QgU1BBIHJvdXRlcyBsaWtlIC9sb2dpbikuICovXG5jb25zdCBQVUJMSUNfU1RBVElDX0VYVCA9XG4gIFwic3ZnfHBuZ3xqcGU/Z3xnaWZ8d2VicHxpY298YXZpZnx3b2ZmMj98dHRmfGVvdHxvdGZ8bXA0fHdlYm18bXAzfHBkZnxqc29ufHhtbHx0eHR8Y3N2fG1hcFwiO1xuY29uc3QgUFVCTElDX1JPT1RfRklMRSA9IGBbXi9cIidcXFxcXFxgXFxcXClcXFxccz8jXStcXFxcLigke1BVQkxJQ19TVEFUSUNfRVhUfSkoPzpcXFxcP1teXCInXFxcXClcXFxcc10qKT9gO1xuXG4vKiogU2luZ2xlIHBhdGggc2VnbWVudCBwdWJsaWMgZmlsZSBhdCBzZXJ2ZXIgcm9vdCAoZS5nLiBsb2dvLnBuZykuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQdWJsaWNSb290RmlsZVBhdGgocGF0aG5hbWUpIHtcbiAgY29uc3Qgc2VnID0gKHBhdGhuYW1lID8/IFwiXCIpLnNwbGl0KFwiP1wiKVswXT8uc2xpY2UoMSkgPz8gXCJcIjtcbiAgaWYgKCFzZWcgfHwgc2VnLmluY2x1ZGVzKFwiL1wiKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gbmV3IFJlZ0V4cChgXlteL1wiJ1xcXFxcXGBcXFxcKVxcXFxzPyNdK1xcXFwuKCR7UFVCTElDX1NUQVRJQ19FWFR9KSg/OlxcXFw/W15cIidcXFxcKVxcXFxzXSopPyRgLCBcImlcIikudGVzdChcbiAgICBzZWcsXG4gICk7XG59XG5cbi8qKlxuICogUHJlZml4IHJvb3QtbGV2ZWwgcHVibGljIGZpbGVzIChzaW5nbGUgc2VnbWVudCArIGV4dGVuc2lvbikuXG4gKiBTa2lwcyBhcHAgcm91dGVzICgvbG9naW4pIGFuZCBwYXRocyBhbHJlYWR5IHVuZGVyIC9lbWJlZGRlZC8uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXdyaXRlUHVibGljUm9vdEZpbGVzKGNvbnRlbnQsIGVtYmVkUGF0aCkge1xuICBjb25zdCBwcmVmaXggPSBlbWJlZFByZWZpeChlbWJlZFBhdGgpLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgcmV0dXJuIGNvbnRlbnQucmVwbGFjZShcbiAgICBuZXcgUmVnRXhwKGAoPzw9W1wiJ1xcYChdfHVybFxcXFwoXFxcXHMqW1wiJ10/KVxcXFwvKD8hXFxcXC98ZW1iZWRkZWRcXFxcLykoJHtQVUJMSUNfUk9PVF9GSUxFfSlgLCBcImdpXCIpLFxuICAgIGAke3ByZWZpeH0vJDFgLFxuICApO1xufVxuXG4vKiogUHJlZml4IFZpdGUvcHVibGljIGFzc2V0IFVSTHMgaW4gSFRNTCBcdTIwMTQgbGVhdmVzIGFwcCByb3V0ZXMgdW50b3VjaGVkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVSb290UGF0aHMoY29udGVudCwgZW1iZWRQYXRoKSB7XG4gIGNvbnN0IHByZWZpeCA9IGVtYmVkUHJlZml4KGVtYmVkUGF0aCkucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICBjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChgKD88PVtcIidcXGAoXSlcXFxcLygke0FTU0VUX1BBVEhfUEFUVEVSTn0pYCwgXCJnXCIpO1xuICByZXR1cm4gY29udGVudC5yZXBsYWNlKHBhdHRlcm4sIChtYXRjaCwgcGF0aFBhcnQpID0+IHtcbiAgICBpZiAoaXNWaXRlU3BlY2lhbEltcG9ydFBhdGgoYC8ke3BhdGhQYXJ0fWApKSByZXR1cm4gbWF0Y2g7XG4gICAgcmV0dXJuIGAke3ByZWZpeH0vJHtwYXRoUGFydH1gO1xuICB9KTtcbn1cblxuLyoqIFJld3JpdGUgcm9vdC1hYnNvbHV0ZSBzcmMvaHJlZiBvbiBkZXYgYXNzZXRzIGluIEhUTUwgKDxiYXNlPiBkb2VzIG5vdCBhcHBseSB0byAvcGF0aHMpLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVIdG1sQXNzZXRBdHRyaWJ1dGVzKGh0bWwsIGVtYmVkUGF0aCkge1xuICBjb25zdCBwcmVmaXggPSBlbWJlZFByZWZpeChlbWJlZFBhdGgpO1xuICBsZXQgb3V0ID0gaHRtbC5yZXBsYWNlKFxuICAgIC8oXFxzKShzcmN8aHJlZnxwb3N0ZXJ8ZGF0YS1zcmN8eGxpbms6aHJlZilcXHMqPVxccyooW1wiJ10pXFwvKD8hXFwvfGVtYmVkZGVkXFwvKShAdml0ZXxAcmVhY3QtcmVmcmVzaHxAZnN8QGlkfG5vZGVfbW9kdWxlc3xzcmN8X25leHR8X19uZXh0anMpKFxcL1teXCInXSopPy9naSxcbiAgICAobWF0Y2gsIHNwLCBhdHRyLCBxLCByb290LCByZXN0ID0gXCJcIikgPT4ge1xuICAgICAgY29uc3QgcGF0aFBhcnQgPSBgJHtyb290fSR7cmVzdCA/PyBcIlwifWA7XG4gICAgICBpZiAoaXNWaXRlU3BlY2lhbEltcG9ydFBhdGgoYC8ke3BhdGhQYXJ0fWApKSByZXR1cm4gbWF0Y2g7XG4gICAgICByZXR1cm4gYCR7c3B9JHthdHRyfT0ke3F9JHtwcmVmaXh9JHtyb290fSR7cmVzdH1gO1xuICAgIH0sXG4gICk7XG5cbiAgb3V0ID0gb3V0LnJlcGxhY2UoXG4gICAgbmV3IFJlZ0V4cChgKFxcXFxzKD86c3JjfGhyZWYpXFxcXHMqPVxcXFxzKltcIiddKVxcXFwvKD8hXFxcXC98ZW1iZWRkZWRcXFxcLykoJHtQVUJMSUNfUk9PVF9GSUxFfSlgLCBcImdpXCIpLFxuICAgIGAkMSR7cHJlZml4fSQyYCxcbiAgKTtcblxuICByZXR1cm4gb3V0O1xufVxuXG4vKiogPGxpbmsgcmVsPVwicHJlbG9hZFwiIGhyZWY9XCIvX25leHQvc3RhdGljL1x1MjAyNlwiPiBhbmQgc2ltaWxhci4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXdyaXRlSHRtbFByZWxvYWRMaW5rcyhodG1sLCBlbWJlZFBhdGgpIHtcbiAgY29uc3QgcHJlZml4ID0gZW1iZWRQcmVmaXgoZW1iZWRQYXRoKTtcbiAgcmV0dXJuIGh0bWwucmVwbGFjZShcbiAgICAvKDxsaW5rXFxzW14+XSpcXGJocmVmXFxzKj1cXHMqKShbXCInXSlcXC8oPyFcXC98ZW1iZWRkZWRcXC8pKF9uZXh0XFwvW15cIiddKykvZ2ksXG4gICAgYCQxJDIke3ByZWZpeH0kM2AsXG4gICk7XG59XG5cbi8qKiBOZXh0LmpzIGltYWdlIG9wdGltaXplciBVUkxzIGluIEhUTUwvSlMuICovXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZU5leHRJbWFnZVVybHMoY29udGVudCwgZW1iZWRQYXRoKSB7XG4gIGNvbnN0IHByZWZpeCA9IGVtYmVkUHJlZml4KGVtYmVkUGF0aCkucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICByZXR1cm4gY29udGVudC5yZXBsYWNlKC8oW1wiJ10pXFwvKD8hXFwvfGVtYmVkZGVkXFwvKShfbmV4dFxcL2ltYWdlXFw/W15cIiddKykvZ2ksIGAkMSR7cHJlZml4fS8kMmApO1xufVxuXG5jb25zdCBRVU9URURfU09VUkNFX01PRFVMRV9QQVRIID1cbiAgXCJbXlxcXCInXFxcXGBcXFxcKVxcXFxzXStcXFxcLihcIiArIFZJVEVfREVWX01PRFVMRV9FWFQgKyBcIikoPzpcXFxcP1teXFxcIidcXFxcYFxcXFwpXFxcXHNdKik/XCI7XG5cbmZ1bmN0aW9uIHByZWZpeFF1b3RlZFNvdXJjZU1vZHVsZVBhdGgobWF0Y2gsIGxlYWQsIHF1b3RlLCBwYXRoUGFydCwgZW1iZWRQYXRoKSB7XG4gIGlmIChpc1ZpdGVTcGVjaWFsSW1wb3J0UGF0aChgLyR7cGF0aFBhcnR9YCkpIHJldHVybiBtYXRjaDtcbiAgY29uc3QgcGF0aG5hbWUgPSBgLyR7U3RyaW5nKHBhdGhQYXJ0KS5zcGxpdChcIj9cIilbMF19YDtcbiAgaWYgKCFpc1ZpdGVEZXZNb2R1bGVQYXRoKHBhdGhuYW1lKSkgcmV0dXJuIG1hdGNoO1xuICBjb25zdCBwcmVmaXggPSBlbWJlZFByZWZpeChlbWJlZFBhdGgpO1xuICByZXR1cm4gYCR7bGVhZH0ke3F1b3RlfSR7cHJlZml4fSR7cGF0aFBhcnR9YDtcbn1cblxuLyoqIFByZWZpeCByb290LWFic29sdXRlIFZpdGUgZGV2IG1vZHVsZSBpbXBvcnRzIG91dHNpZGUgdGhlIGxlZ2FjeSBmb2xkZXIgYWxsb3dsaXN0LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVKc1NvdXJjZU1vZHVsZVBhdGhzKGNvbnRlbnQsIGVtYmVkUGF0aCkge1xuICBsZXQgb3V0ID0gY29udGVudDtcbiAgY29uc3QgcGF0dGVybnMgPSBbXG4gICAgbmV3IFJlZ0V4cChgKFxcXFxiZnJvbVxcXFxzKykoW1wiJ10pXFxcXC8oPyFlbWJlZGRlZFxcXFwvKSgoJHtRVU9URURfU09VUkNFX01PRFVMRV9QQVRIfSkpYCwgXCJnXCIpLFxuICAgIG5ldyBSZWdFeHAoYChcXFxcYmltcG9ydFxcXFxzKykoW1wiJ10pXFxcXC8oPyFlbWJlZGRlZFxcXFwvKSgoJHtRVU9URURfU09VUkNFX01PRFVMRV9QQVRIfSkpYCwgXCJnXCIpLFxuICAgIG5ldyBSZWdFeHAoXG4gICAgICBgKFxcXFxiaW1wb3J0XFxcXHMqXFxcXChcXFxccyopKFtcIiddKVxcXFwvKD8hZW1iZWRkZWRcXFxcLykoKCR7UVVPVEVEX1NPVVJDRV9NT0RVTEVfUEFUSH0pKWAsXG4gICAgICBcImdcIixcbiAgICApLFxuICAgIG5ldyBSZWdFeHAoXG4gICAgICBgKFxcXFxibmV3XFxcXHMrVVJMXFxcXHMqXFxcXChcXFxccyopKFtcIiddKVxcXFwvKD8hZW1iZWRkZWRcXFxcLykoKCR7UVVPVEVEX1NPVVJDRV9NT0RVTEVfUEFUSH0pKWAsXG4gICAgICBcImdcIixcbiAgICApLFxuICBdO1xuICBmb3IgKGNvbnN0IHJlIG9mIHBhdHRlcm5zKSB7XG4gICAgb3V0ID0gb3V0LnJlcGxhY2UocmUsIChtYXRjaCwgbGVhZCwgcXVvdGUsIHBhdGhQYXJ0KSA9PlxuICAgICAgcHJlZml4UXVvdGVkU291cmNlTW9kdWxlUGF0aChtYXRjaCwgbGVhZCwgcXVvdGUsIHBhdGhQYXJ0LCBlbWJlZFBhdGgpLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqIFJld3JpdGUgcm9vdC1hYnNvbHV0ZSBtb2R1bGUgc2NyaXB0IHNyYy9ocmVmIGluIEhUTUwgKGUuZy4gL2xpYi9tYWluLnRzeCkuICovXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZUh0bWxTb3VyY2VNb2R1bGVBdHRyaWJ1dGVzKGh0bWwsIGVtYmVkUGF0aCkge1xuICBjb25zdCByZSA9IG5ldyBSZWdFeHAoXG4gICAgYChcXFxccyg/OnNyY3xocmVmKVxcXFxzKj1cXFxccyopKFtcIiddKVxcXFwvKD8hZW1iZWRkZWRcXFxcLykoKCR7UVVPVEVEX1NPVVJDRV9NT0RVTEVfUEFUSH0pKWAsXG4gICAgXCJnaVwiLFxuICApO1xuICByZXR1cm4gaHRtbC5yZXBsYWNlKHJlLCAobWF0Y2gsIGxlYWQsIHF1b3RlLCBwYXRoUGFydCkgPT5cbiAgICBwcmVmaXhRdW90ZWRTb3VyY2VNb2R1bGVQYXRoKG1hdGNoLCBsZWFkLCBxdW90ZSwgcGF0aFBhcnQsIGVtYmVkUGF0aCksXG4gICk7XG59XG5cbi8qKiBSZXdyaXRlIEVTIG1vZHVsZSBzdHJpbmcgaW1wb3J0cyBvbmx5LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVKc01vZHVsZVBhdGhzKGNvbnRlbnQsIGVtYmVkUGF0aCkge1xuICBjb25zdCBwcmVmaXggPSBlbWJlZFByZWZpeChlbWJlZFBhdGgpO1xuICBjb25zdCBhc3NldCA9IEFTU0VUX1BBVEhfUEFUVEVSTjtcblxuICAvKiogQHBhcmFtIHtzdHJpbmd9IG1hdGNoIEBwYXJhbSB7c3RyaW5nfSBsZWFkIEBwYXJhbSB7c3RyaW5nfSBxdW90ZSBAcGFyYW0ge3N0cmluZ30gcGF0aFBhcnQgKi9cbiAgZnVuY3Rpb24gcHJlZml4SW1wb3J0TWF0Y2gobWF0Y2gsIGxlYWQsIHF1b3RlLCBwYXRoUGFydCkge1xuICAgIGlmIChpc1ZpdGVTcGVjaWFsSW1wb3J0UGF0aChgLyR7cGF0aFBhcnR9YCkpIHJldHVybiBtYXRjaDtcbiAgICByZXR1cm4gYCR7bGVhZH0ke3F1b3RlfSR7cHJlZml4fSR7cGF0aFBhcnR9YDtcbiAgfVxuXG4gIGxldCBvdXQgPSBjb250ZW50O1xuXG4gIG91dCA9IG91dC5yZXBsYWNlKG5ldyBSZWdFeHAoYFxcXFxiZnJvbVxcXFxzKyhbXCInXSlcXFxcLygke2Fzc2V0fSlgLCBcImdcIiksIChtYXRjaCwgcSwgcGF0aFBhcnQpID0+XG4gICAgcHJlZml4SW1wb3J0TWF0Y2gobWF0Y2gsIFwiZnJvbSBcIiwgcSwgcGF0aFBhcnQpLFxuICApO1xuICBvdXQgPSBvdXQucmVwbGFjZShuZXcgUmVnRXhwKGBcXFxcYmltcG9ydFxcXFxzKyhbXCInXSlcXFxcLygke2Fzc2V0fSlgLCBcImdcIiksIChtYXRjaCwgcSwgcGF0aFBhcnQpID0+XG4gICAgcHJlZml4SW1wb3J0TWF0Y2gobWF0Y2gsIFwiaW1wb3J0IFwiLCBxLCBwYXRoUGFydCksXG4gICk7XG4gIG91dCA9IG91dC5yZXBsYWNlKFxuICAgIG5ldyBSZWdFeHAoYFxcXFxiaW1wb3J0XFxcXHMqXFxcXChcXFxccyooW1wiJ10pXFxcXC8oJHthc3NldH0pYCwgXCJnXCIpLFxuICAgIChtYXRjaCwgcSwgcGF0aFBhcnQpID0+IHByZWZpeEltcG9ydE1hdGNoKG1hdGNoLCBcImltcG9ydChcIiwgcSwgcGF0aFBhcnQpLFxuICApO1xuICBvdXQgPSBvdXQucmVwbGFjZShcbiAgICBuZXcgUmVnRXhwKGBcXFxcYm5ld1xcXFxzK1VSTFxcXFxzKlxcXFwoXFxcXHMqKFtcIiddKVxcXFwvKCR7YXNzZXR9KWAsIFwiZ1wiKSxcbiAgICAobWF0Y2gsIHEsIHBhdGhQYXJ0KSA9PiBwcmVmaXhJbXBvcnRNYXRjaChtYXRjaCwgXCJuZXcgVVJMKFwiLCBxLCBwYXRoUGFydCksXG4gICk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVKc1B1YmxpY0Fzc2V0UGF0aHMoY29udGVudCwgZW1iZWRQYXRoKSB7XG4gIGNvbnN0IHByZWZpeCA9IGVtYmVkUHJlZml4KGVtYmVkUGF0aCk7XG4gIGxldCBvdXQgPSBjb250ZW50O1xuXG4gIG91dCA9IG91dC5yZXBsYWNlKFxuICAgIG5ldyBSZWdFeHAoYChbXCInXSlcXFxcLyg/IVxcXFwvfGVtYmVkZGVkXFxcXC8pKCR7UFVCTElDX0FTU0VUX1JPT1RTfSkoXFxcXC9bXlwiJ10qKT9gLCBcImdcIiksXG4gICAgYCQxJHtwcmVmaXh9JDIkM2AsXG4gICk7XG5cbiAgb3V0ID0gb3V0LnJlcGxhY2UoXG4gICAgbmV3IFJlZ0V4cChgXFxcXGJzcmM6XFxcXHMqKFtcIiddKVxcXFwvKD8hXFxcXC98ZW1iZWRkZWRcXFxcLykoJHtQVUJMSUNfUk9PVF9GSUxFfSlgLCBcImdpXCIpLFxuICAgIGBzcmM6ICQxJHtwcmVmaXh9JDJgLFxuICApO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXdyaXRlQ3NzVXJscyhjb250ZW50LCBlbWJlZFBhdGgpIHtcbiAgY29uc3QgcHJlZml4ID0gZW1iZWRQcmVmaXgoZW1iZWRQYXRoKS5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gIGxldCBvdXQgPSBjb250ZW50LnJlcGxhY2UoXG4gICAgbmV3IFJlZ0V4cChgdXJsXFxcXChcXFxccyooW1wiJ10/KVxcXFwvKCR7QVNTRVRfUEFUSF9QQVRURVJOfSlgLCBcImdcIiksXG4gICAgYHVybCgkMSR7cHJlZml4fS8kMmAsXG4gICk7XG4gIG91dCA9IHJld3JpdGVQdWJsaWNSb290RmlsZXMob3V0LCBlbWJlZFBhdGgpO1xuICByZXR1cm4gcmV3cml0ZU5leHREZXZQYXRocyhvdXQsIGVtYmVkUGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXdyaXRlVGFyZ2V0T3JpZ2luKGNvbnRlbnQsIHByb3h5VGFyZ2V0LCBhc3NldFBhdGgpIHtcbiAgY29uc3QgeyB1cmwsIG9yaWdpbiwgYmFzZVBhdGggfSA9IHBhcnNlRW1iZWRUYXJnZXQocHJveHlUYXJnZXQpO1xuICBjb25zdCBhc3NldFByZWZpeCA9IGVtYmVkUHJlZml4KGFzc2V0UGF0aCk7XG4gIGxldCBvdXQgPSBjb250ZW50O1xuXG4gIGlmIChiYXNlUGF0aCkge1xuICAgIG91dCA9IG91dC5yZXBsYWNlQWxsKGAke3VybH0vYCwgYCR7YmFzZVBhdGh9L2ApO1xuICAgIG91dCA9IG91dC5yZXBsYWNlQWxsKHVybCwgYmFzZVBhdGgpO1xuICAgIG91dCA9IG91dC5yZXBsYWNlQWxsKGAke29yaWdpbn0vYCwgYXNzZXRQcmVmaXgpO1xuICB9IGVsc2Uge1xuICAgIG91dCA9IG91dC5yZXBsYWNlQWxsKGAke3VybH0vYCwgXCIvXCIpO1xuICAgIG91dCA9IG91dC5yZXBsYWNlQWxsKGAke29yaWdpbn0vYCwgYXNzZXRQcmVmaXgpO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqXG4gKiBQdWJsaWMgaG9zdCArIEhNUiBzb2NrZXQgdGFyZ2V0IGZvciBAdml0ZS9jbGllbnQgcmV3cml0ZXMuXG4gKiBVc2VzIFgtRm9yd2FyZGVkLSogYmVoaW5kIEhUVFBTIGVkZ2Ugbmdpbnggc28gd2UgbmV2ZXIgZW1pdCB3c3M6Ly9ob3N0OjgwL1x1MjAyNlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRIbXJDb250ZXh0KHJlcSwgYXNzZXRQYXRoKSB7XG4gIGNvbnN0IGZvcndhcmRlZFByb3RvID0gU3RyaW5nKHJlcT8uaGVhZGVycz8uW1wieC1mb3J3YXJkZWQtcHJvdG9cIl0gPz8gXCJcIilcbiAgICAuc3BsaXQoXCIsXCIpWzBdXG4gICAgLnRyaW0oKVxuICAgIC50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBmb3J3YXJkZWRIb3N0ID0gU3RyaW5nKHJlcT8uaGVhZGVycz8uW1wieC1mb3J3YXJkZWQtaG9zdFwiXSA/PyBcIlwiKVxuICAgIC5zcGxpdChcIixcIilbMF1cbiAgICAudHJpbSgpO1xuICBjb25zdCBob3N0SGVhZGVyID0gU3RyaW5nKHJlcT8uaGVhZGVycz8uaG9zdCA/PyBcImxvY2FsaG9zdDo1MTczXCIpXG4gICAgLnNwbGl0KFwiLFwiKVswXVxuICAgIC50cmltKCk7XG4gIGNvbnN0IGJyb3dzZXJIb3N0UmF3ID0gZm9yd2FyZGVkSG9zdCB8fCBob3N0SGVhZGVyO1xuICBjb25zdCBwcm90byA9IGZvcndhcmRlZFByb3RvIHx8IChyZXE/LnNvY2tldD8uZW5jcnlwdGVkID8gXCJodHRwc1wiIDogXCJodHRwXCIpO1xuXG4gIGxldCBob3N0bmFtZSA9IFwibG9jYWxob3N0XCI7XG4gIGxldCBwb3J0ID0gcHJvdG8gPT09IFwiaHR0cHNcIiA/IFwiNDQzXCIgOiBcIjgwXCI7XG4gIHRyeSB7XG4gICAgY29uc3QgdSA9IG5ldyBVUkwoYGh0dHA6Ly8ke2Jyb3dzZXJIb3N0UmF3fWApO1xuICAgIGhvc3RuYW1lID0gdS5ob3N0bmFtZTtcbiAgICBpZiAodS5wb3J0KSBwb3J0ID0gdS5wb3J0O1xuICB9IGNhdGNoIHtcbiAgICBjb25zdCBpZHggPSBicm93c2VySG9zdFJhdy5sYXN0SW5kZXhPZihcIjpcIik7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgIGhvc3RuYW1lID0gYnJvd3Nlckhvc3RSYXcuc2xpY2UoMCwgaWR4KTtcbiAgICAgIHBvcnQgPSBicm93c2VySG9zdFJhdy5zbGljZShpZHggKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaG9zdG5hbWUgPSBicm93c2VySG9zdFJhdztcbiAgICB9XG4gIH1cblxuICBjb25zdCBiYXNlUGF0aCA9IGFzc2V0UGF0aC5lbmRzV2l0aChcIi9cIikgPyBhc3NldFBhdGggOiBgJHthc3NldFBhdGh9L2A7XG4gIGNvbnN0IHBvcnROdW0gPSBOdW1iZXIocG9ydCk7XG4gIGNvbnN0IGRlZmF1bHRQb3J0ID0gcHJvdG8gPT09IFwiaHR0cHNcIiA/IDQ0MyA6IDgwO1xuICBjb25zdCBwdWJsaWNQb3J0U3VmZml4ID1cbiAgICBOdW1iZXIuaXNGaW5pdGUocG9ydE51bSkgJiYgcG9ydE51bSA+IDAgJiYgcG9ydE51bSAhPT0gZGVmYXVsdFBvcnQgPyBgOiR7cG9ydH1gIDogXCJcIjtcbiAgY29uc3QgcHVibGljSG9zdCA9IGAke2hvc3RuYW1lfSR7cHVibGljUG9ydFN1ZmZpeH1gO1xuICBjb25zdCBzb2NrZXRUYXJnZXQgPSBgJHtwdWJsaWNIb3N0fSR7YmFzZVBhdGh9YDtcbiAgY29uc3Qgc2VydmVySG9zdFZhbHVlID0gYCR7cHJvdG99Oi8vJHtwdWJsaWNIb3N0fSR7YmFzZVBhdGh9YDtcblxuICByZXR1cm4ge1xuICAgIGJyb3dzZXJIb3N0OiBwdWJsaWNIb3N0LFxuICAgIGhvc3RuYW1lLFxuICAgIHBvcnQsXG4gICAgcHJvdG8sXG4gICAgYmFzZVBhdGgsXG4gICAgc29ja2V0VGFyZ2V0LFxuICAgIHNlcnZlckhvc3RWYWx1ZSxcbiAgICBobXJQb3J0OiBOdW1iZXIocG9ydCkgfHwgZGVmYXVsdFBvcnQsXG4gIH07XG59XG5cbi8qKlxuICogUG9pbnQgVml0ZSdzIEB2aXRlL2NsaWVudCBITVIgYXQgdGhlIExhdW5jaHBhZCBob3N0ICsgL2VtYmVkZGVkLzxwb3J0Pi8gcGF0aFxuICogKG5vdCB0aGUgdXBzdHJlYW0gcHJvamVjdCBwb3J0IFx1MjAxNCBhdm9pZHMgZGlyZWN0IFdTIHRvIDo1MDAxIGFuZCB3cm9uZyA6NTAwMCBmYWxsYmFja3MpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZVZpdGVIbXJDbGllbnQoY29udGVudCwgaG1yQ29udGV4dCkge1xuICBpZiAoXG4gICAgIWNvbnRlbnQuaW5jbHVkZXMoXCJzZXJ2ZXJIb3N0XCIpICYmXG4gICAgIWNvbnRlbnQuaW5jbHVkZXMoXCJfX0hNUl9cIikgJiZcbiAgICAhY29udGVudC5pbmNsdWRlcyhcImhtclBvcnRcIikgJiZcbiAgICAhY29udGVudC5pbmNsdWRlcyhcInNldHVwV2ViU29ja2V0XCIpXG4gICkge1xuICAgIHJldHVybiBjb250ZW50O1xuICB9XG5cbiAgY29uc3QgeyBzb2NrZXRUYXJnZXQsIHNlcnZlckhvc3RWYWx1ZSwgaG1yUG9ydCwgYmFzZVBhdGggfSA9IGhtckNvbnRleHQ7XG5cbiAgbGV0IG91dCA9IGNvbnRlbnQ7XG5cbiAgb3V0ID0gb3V0LnJlcGxhY2UoXG4gICAgL2NvbnN0IHNlcnZlckhvc3QgPSAoXCJbXlwiXSpcInxfX1NFUlZFUl9IT1NUX18pLyxcbiAgICBgY29uc3Qgc2VydmVySG9zdCA9IFwiJHtzZXJ2ZXJIb3N0VmFsdWV9XCJgLFxuICApO1xuXG4gIG91dCA9IG91dC5yZXBsYWNlKFxuICAgIC9jb25zdCBkaXJlY3RTb2NrZXRIb3N0ID0gKFwiW15cIl0qXCJ8X19ITVJfRElSRUNUX1RBUkdFVF9fKS8sXG4gICAgYGNvbnN0IGRpcmVjdFNvY2tldEhvc3QgPSBcIiR7c29ja2V0VGFyZ2V0fVwiYCxcbiAgKTtcblxuICBvdXQgPSBvdXQucmVwbGFjZSgvY29uc3QgaG1yUG9ydCA9IChbXjtcXG5dKykvLCBgY29uc3QgaG1yUG9ydCA9ICR7aG1yUG9ydH1gKTtcblxuICBvdXQgPSBvdXQucmVwbGFjZSgvY29uc3Qgc29ja2V0SG9zdCA9IGBbXmBdK2AvcywgYGNvbnN0IHNvY2tldEhvc3QgPSBcXGAke3NvY2tldFRhcmdldH1cXGBgKTtcblxuICBvdXQgPSBvdXQucmVwbGFjZSgvY29uc3QgYmFzZSA9IChfX0JBU0VfX1teO10rfFtcIiddW15cIiddKltcIiddKS8sIGBjb25zdCBiYXNlID0gXCIke2Jhc2VQYXRofVwiYCk7XG5cbiAgLy8gVml0ZSA1KyBXZWJTb2NrZXQgVVJMIHdoZW4gc29ja2V0SG9zdCBjb25zdCByZXdyaXRlIG1pc3NlZFxuICBvdXQgPSBvdXQucmVwbGFjZShcbiAgICAvYFxcJFxce3NvY2tldFByb3RvY29sXFx9OlxcL1xcL1xcJFxce3NvY2tldEhvc3RcXH1cXD90b2tlbj1cXCRcXHt3c1Rva2VuXFx9YC9nLFxuICAgIGBcXGBcXCR7c29ja2V0UHJvdG9jb2x9Oi8vJHtzb2NrZXRUYXJnZXR9P3Rva2VuPVxcJHt3c1Rva2VufVxcYGAsXG4gICk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuY29uc3QgRU1CRURfQk9PVFNUUkFQX1NDUklQVCA9IGJ1aWxkRW1iZWRCb290c3RyYXBTY3JpcHQoKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGluamVjdEVtYmVkQm9vdHN0cmFwU2NyaXB0cyhodG1sKSB7XG4gIGlmIChodG1sLmluY2x1ZGVzKFwiZGF0YS1lbWJlZC1ib290c3RyYXBcIikpIHJldHVybiBodG1sO1xuICBpZiAoLzxoZWFkW14+XSo+L2kudGVzdChodG1sKSkge1xuICAgIHJldHVybiBodG1sLnJlcGxhY2UoLzxoZWFkW14+XSo+L2ksIChtKSA9PiBgJHttfSR7RU1CRURfQk9PVFNUUkFQX1NDUklQVH1gKTtcbiAgfVxuICByZXR1cm4gYCR7RU1CRURfQk9PVFNUUkFQX1NDUklQVH0ke2h0bWx9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVIdG1sTGlua1RhcmdldHMoaHRtbCkge1xuICByZXR1cm4gaHRtbFxuICAgIC5yZXBsYWNlKC9cXGJ0YXJnZXRcXHMqPVxccypbXCInXV90b3BbXCInXS9naSwgJ3RhcmdldD1cIl9zZWxmXCInKVxuICAgIC5yZXBsYWNlKC9cXGJ0YXJnZXRcXHMqPVxccypbXCInXV9wYXJlbnRbXCInXS9naSwgJ3RhcmdldD1cIl9zZWxmXCInKTtcbn1cblxuY29uc3QgRU1CRURfUk9VVEVfUkVQT1JURVIgPSBgZnVuY3Rpb24gZW1iZWRQcmVmaXgoKXt0cnl7dmFyIG09bG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL15cXFxcL2VtYmVkZGVkXFxcXC8oXFxcXGR7MSw1fSkvKTtpZihtKXJldHVyblwiL2VtYmVkZGVkL1wiK21bMV07dmFyIGNtPWRvY3VtZW50LmNvb2tpZS5tYXRjaCgvKD86Xnw7XFxcXHMqKWVtYmVkX3BvcnQ9KFxcXFxkezEsNX0pKD86O3wkKS8pO3JldHVybiBjbT9cIi9lbWJlZGRlZC9cIitjbVsxXTpudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX1mdW5jdGlvbiB0b0VtYmVkVXJsKHVybCl7dmFyIHByZWZpeD1lbWJlZFByZWZpeCgpO2lmKCFwcmVmaXh8fHVybD09bnVsbClyZXR1cm4gdXJsO3RyeXt2YXIgYWJzLHJlc3Q9XCJcIjtpZih0eXBlb2YgdXJsIT09XCJzdHJpbmdcIil7aWYodHlwZW9mIFVSTCE9PVwidW5kZWZpbmVkXCImJnVybCBpbnN0YW5jZW9mIFVSTCl7aWYodXJsLm9yaWdpbiE9PWxvY2F0aW9uLm9yaWdpbilyZXR1cm4gdXJsO2Ficz11cmwucGF0aG5hbWU7cmVzdD11cmwuc2VhcmNoK3VybC5oYXNofWVsc2UgcmV0dXJuIHVybH1lbHNle2lmKCF1cmx8fHVybC5jaGFyQXQoMCk9PT1cIiNcIilyZXR1cm4gdXJsO2lmKC9eaHR0cHM/OlxcXFwvXFxcXC8vaS50ZXN0KHVybCl8fHVybC5zbGljZSgwLDIpPT09XCIvL1wiKXt2YXIgeD1uZXcgVVJMKHVybCxsb2NhdGlvbi5ocmVmKTtpZih4Lm9yaWdpbiE9PWxvY2F0aW9uLm9yaWdpbilyZXR1cm4gdXJsO2Ficz14LnBhdGhuYW1lO3Jlc3Q9eC5zZWFyY2greC5oYXNofWVsc2UgaWYodXJsLmNoYXJBdCgwKSE9PVwiL1wiKXtyZXR1cm4gdXJsfWVsc2V7dmFyIHFpPXVybC5pbmRleE9mKFwiP1wiKSxoaT11cmwuaW5kZXhPZihcIiNcIiksY3V0PXVybC5sZW5ndGg7aWYocWk+PTApY3V0PU1hdGgubWluKGN1dCxxaSk7aWYoaGk+PTApY3V0PU1hdGgubWluKGN1dCxoaSk7YWJzPXVybC5zbGljZSgwLGN1dCk7cmVzdD11cmwuc2xpY2UoY3V0KX19aWYoYWJzPT09cHJlZml4fHxhYnMuaW5kZXhPZihwcmVmaXgrXCIvXCIpPT09MClyZXR1cm4gYWJzK3Jlc3Q7cmV0dXJuIHByZWZpeCsoYWJzPT09XCIvXCI/IFwiL1wiOmFicykrcmVzdH1jYXRjaChlMil7cmV0dXJuIHVybH19ZnVuY3Rpb24gcmVwb3J0RW1iZWRSb3V0ZSgpe3RyeXtpZih3aW5kb3cuc2VsZj09PXdpbmRvdy50b3ApcmV0dXJuO3ZhciBwYXRoPWxvY2F0aW9uLnBhdGhuYW1lLHNlYXJjaD1sb2NhdGlvbi5zZWFyY2gsaGFzaD1sb2NhdGlvbi5oYXNoLG09cGF0aC5tYXRjaCgvXlxcXFwvZW1iZWRkZWRcXFxcLyhcXFxcZHsxLDV9KShcXFxcLy4qKT8kLykscG9ydD1tP051bWJlcihtWzFdKTpudWxsLGFwcD1tPyhtWzJdfHxcIi9cIik6cGF0aDtpZighcG9ydCl7dHJ5e3ZhciBjbT1kb2N1bWVudC5jb29raWUubWF0Y2goLyg/Ol58O1xcXFxzKillbWJlZF9wb3J0PShcXFxcZHsxLDV9KSg/Ojt8JCkvKTtpZihjbSlwb3J0PU51bWJlcihjbVsxXSl9Y2F0Y2goZUMpe319aWYoIWFwcC5zdGFydHNXaXRoKFwiL1wiKSlhcHA9XCIvXCIrYXBwO3dpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe3R5cGU6XCJsYXVuY2hwYWQ6ZW1iZWQtcm91dGVcIixwb3J0OnBvcnQscGF0aDphcHArc2VhcmNoK2hhc2h9LGxvY2F0aW9uLm9yaWdpbil9Y2F0Y2goZSl7fX1yZXBvcnRFbWJlZFJvdXRlKCk7d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwb3BzdGF0ZVwiLHJlcG9ydEVtYmVkUm91dGUpO3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiaGFzaGNoYW5nZVwiLHJlcG9ydEVtYmVkUm91dGUpO3ZhciBfcHM9aGlzdG9yeS5wdXNoU3RhdGUsX3JzPWhpc3RvcnkucmVwbGFjZVN0YXRlO2hpc3RvcnkucHVzaFN0YXRlPWZ1bmN0aW9uKHN0YXRlLHRpdGxlLHVybCl7dmFyIHI9X3BzLmNhbGwodGhpcyxzdGF0ZSx0aXRsZSx1cmwhPW51bGw/dG9FbWJlZFVybCh1cmwpOnVybCk7cmVwb3J0RW1iZWRSb3V0ZSgpO3JldHVybiByfTtoaXN0b3J5LnJlcGxhY2VTdGF0ZT1mdW5jdGlvbihzdGF0ZSx0aXRsZSx1cmwpe3ZhciByPV9ycy5jYWxsKHRoaXMsc3RhdGUsdGl0bGUsdXJsIT1udWxsP3RvRW1iZWRVcmwodXJsKTp1cmwpO3JlcG9ydEVtYmVkUm91dGUoKTtyZXR1cm4gcn07YDtcblxuY29uc3QgSUZSQU1FX05BVl9HVUFSRCA9IGA8c2NyaXB0IGRhdGEtZW1iZWQtZ3VhcmQ+KGZ1bmN0aW9uKCl7dmFyIHU9bmV3IFVSTChsb2NhdGlvbi5ocmVmKTt2YXIgY2g9ZmFsc2U7aWYodS5zZWFyY2hQYXJhbXMuaGFzKFwiZW1iZWRfZnJhbWVcIikpe3Uuc2VhcmNoUGFyYW1zLmRlbGV0ZShcImVtYmVkX2ZyYW1lXCIpO2NoPXRydWV9aWYodS5zZWFyY2hQYXJhbXMuaGFzKFwiZW1iZWRfcG9ydFwiKSl7dS5zZWFyY2hQYXJhbXMuZGVsZXRlKFwiZW1iZWRfcG9ydFwiKTtjaD10cnVlfWlmKGNoKXt2YXIgcT11LnNlYXJjaFBhcmFtcy50b1N0cmluZygpO2hpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsXCJcIix1LnBhdGhuYW1lKyhxP1wiP1wiK3E6XCJcIikrdS5oYXNoKX1pZih3aW5kb3cuc2VsZj09PXdpbmRvdy50b3ApcmV0dXJuOyR7RU1CRURfUk9VVEVfUkVQT1JURVJ9dmFyIHA9TG9jYXRpb24ucHJvdG90eXBlLHI9cC5yZXBsYWNlLGE9cC5hc3NpZ247cC5yZXBsYWNlPWZ1bmN0aW9uKHUpe3ZhciBuZXh0PXRvRW1iZWRVcmwodSk7aWYodGhpcz09PXdpbmRvdy50b3AubG9jYXRpb24pe3dpbmRvdy5zZWxmLmxvY2F0aW9uLnJlcGxhY2UobmV4dCk7cmV0dXJufXJldHVybiByLmNhbGwodGhpcyxuZXh0KX07cC5hc3NpZ249ZnVuY3Rpb24odSl7dmFyIG5leHQ9dG9FbWJlZFVybCh1KTtpZih0aGlzPT09d2luZG93LnRvcC5sb2NhdGlvbil7d2luZG93LnNlbGYubG9jYXRpb24uYXNzaWduKG5leHQpO3JldHVybn1yZXR1cm4gYS5jYWxsKHRoaXMsbmV4dCl9O3RyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LnRvcCxcImxvY2F0aW9uXCIse3NldDpmdW5jdGlvbih2KXt3aW5kb3cuc2VsZi5sb2NhdGlvbj10b0VtYmVkVXJsKHYpfSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gd2luZG93LnNlbGYubG9jYXRpb259LGNvbmZpZ3VyYWJsZTp0cnVlfSl9Y2F0Y2goZSl7fWRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGZ1bmN0aW9uKGUpe3ZhciBuPWUudGFyZ2V0JiZlLnRhcmdldC5jbG9zZXN0P2UudGFyZ2V0LmNsb3Nlc3QoXCJhXCIpOm51bGw7aWYoIW4pcmV0dXJuO3ZhciB0PShuLmdldEF0dHJpYnV0ZShcInRhcmdldFwiKXx8XCJcIikudG9Mb3dlckNhc2UoKTtpZih0PT09XCJfdG9wXCJ8fHQ9PT1cIl9wYXJlbnRcIil7ZS5wcmV2ZW50RGVmYXVsdCgpO24uc2V0QXR0cmlidXRlKFwidGFyZ2V0XCIsXCJfc2VsZlwiKTt3aW5kb3cuc2VsZi5sb2NhdGlvbj10b0VtYmVkVXJsKG4uaHJlZik7cmV0dXJufXZhciBocmVmPW4uZ2V0QXR0cmlidXRlKFwiaHJlZlwiKTtpZighaHJlZnx8aHJlZi5jaGFyQXQoMCk9PT1cIiNcInx8L15odHRwcz86L2kudGVzdChocmVmKSlyZXR1cm47dmFyIHByZWZpeD1lbWJlZFByZWZpeCgpO2lmKCFwcmVmaXh8fGhyZWYuY2hhckF0KDApIT09XCIvXCIpcmV0dXJuO3RyeXt2YXIgcWk9aHJlZi5pbmRleE9mKFwiP1wiKSxoaT1ocmVmLmluZGV4T2YoXCIjXCIpLGN1dD1ocmVmLmxlbmd0aDtpZihxaT49MCljdXQ9TWF0aC5taW4oY3V0LHFpKTtpZihoaT49MCljdXQ9TWF0aC5taW4oY3V0LGhpKTt2YXIgYWJzPWhyZWYuc2xpY2UoMCxjdXQpO2lmKGFicz09PXByZWZpeHx8YWJzLmluZGV4T2YocHJlZml4K1wiL1wiKT09PTApcmV0dXJuO2UucHJldmVudERlZmF1bHQoKTt3aW5kb3cuc2VsZi5sb2NhdGlvbj10b0VtYmVkVXJsKGhyZWYpfWNhdGNoKGUyKXt9fSx0cnVlKX0pKCk7PC9zY3JpcHQ+YDtcblxuZXhwb3J0IGZ1bmN0aW9uIGluamVjdElmcmFtZU5hdmlnYXRpb25HdWFyZChodG1sKSB7XG4gIGlmIChodG1sLmluY2x1ZGVzKFwiZGF0YS1lbWJlZC1ndWFyZFwiKSkgcmV0dXJuIGh0bWw7XG4gIGlmICgvPGhlYWRbXj5dKj4vaS50ZXN0KGh0bWwpKSB7XG4gICAgcmV0dXJuIGh0bWwucmVwbGFjZSgvPGhlYWRbXj5dKj4vaSwgKG0pID0+IGAke219JHtJRlJBTUVfTkFWX0dVQVJEfWApO1xuICB9XG4gIHJldHVybiBgJHtJRlJBTUVfTkFWX0dVQVJEfSR7aHRtbH1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0QmFzZUhyZWYoaHRtbCwgYmFzZUhyZWYpIHtcbiAgY29uc3QgaHJlZiA9IGJhc2VIcmVmLmVuZHNXaXRoKFwiL1wiKSA/IGJhc2VIcmVmIDogYCR7YmFzZUhyZWZ9L2A7XG4gIGNvbnN0IHRhZyA9IGA8YmFzZSBocmVmPVwiJHtocmVmfVwiPmA7XG4gIC8vIFJlcGxhY2UgYW55IGV4aXN0aW5nIDxiYXNlPiAoZS5nLiBocmVmPVwiL1wiKSBcdTIwMTQgVnVlIGNyZWF0ZVdlYkhpc3RvcnkoKSByZWFkcyBpdDtcbiAgLy8gbGVhdmluZyByb290IGJhc2UgdW5kZXIgL2VtYmVkZGVkLzxwb3J0Pi8geWllbGRzIGEgYmxhbmsgUm91dGVyVmlldy5cbiAgaWYgKC88YmFzZVxcYltePl0qPi9pLnRlc3QoaHRtbCkpIHtcbiAgICByZXR1cm4gaHRtbC5yZXBsYWNlKC88YmFzZVxcYltePl0qPi9naSwgdGFnKTtcbiAgfVxuICBpZiAoLzxoZWFkW14+XSo+L2kudGVzdChodG1sKSkge1xuICAgIHJldHVybiBodG1sLnJlcGxhY2UoLzxoZWFkW14+XSo+L2ksIChtKSA9PiBgJHttfSR7dGFnfWApO1xuICB9XG4gIHJldHVybiBgJHt0YWd9JHtodG1sfWA7XG59XG5cbi8qKiBWaXRlIGVzYnVpbGQgcHJlLWJ1bmRsZXMgXHUyMDE0IHNraXAgc3RyaW5nIHJld3JpdGVzIHRoYXQgY29ycnVwdCByZWdleCBsaXRlcmFscyBpbnNpZGUgZGVwcy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ZpdGVQcmVidW5kbGVkRGVwUGF0aChwYXRobmFtZSkge1xuICBjb25zdCBwYXRoT25seSA9IFN0cmluZyhwYXRobmFtZSA/PyBcIlwiKS5zcGxpdChcIj9cIilbMF07XG4gIHJldHVybiAvXFwvbm9kZV9tb2R1bGVzXFwvXFwudml0ZVxcL2RlcHMoPzpfdGVtcCk/XFwvLy50ZXN0KHBhdGhPbmx5KTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVJld3JpdGVSZXF1ZXN0UGF0aChyZXEsIGFzc2V0UGF0aCkge1xuICBjb25zdCByYXdVcmwgPSByZXE/LnVybCA/PyBcIlwiO1xuICBpZiAocmF3VXJsKSB7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VFbWJlZGRlZFBvcnRSZXF1ZXN0KHJhd1VybCk7XG4gICAgaWYgKHBhcnNlZD8udXBzdHJlYW1QYXRoKSByZXR1cm4gcGFyc2VkLnVwc3RyZWFtUGF0aDtcbiAgICByZXR1cm4gcmF3VXJsLnNwbGl0KFwiP1wiKVswXSA/PyBcIlwiO1xuICB9XG4gIHJldHVybiBhc3NldFBhdGggPz8gXCJcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJld3JpdGVFbWJlZGRlZEJvZHkoYm9keSwgY29udGVudFR5cGUsIHByb3h5VGFyZ2V0LCBhc3NldFBhdGgsIHJlcSkge1xuICBjb25zdCByZXF1ZXN0UGF0aCA9IHJlc29sdmVSZXdyaXRlUmVxdWVzdFBhdGgocmVxLCBhc3NldFBhdGgpO1xuXG4gIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcyhcInRleHQvaHRtbFwiKSkge1xuICAgIGNvbnN0IHsgYmFzZVBhdGggfSA9IHBhcnNlRW1iZWRUYXJnZXQocHJveHlUYXJnZXQpO1xuICAgIGNvbnN0IGFwcEJhc2UgPSByZXNvbHZlRW1iZWREb2N1bWVudEJhc2UoYXNzZXRQYXRoLCBiYXNlUGF0aCk7XG4gICAgbGV0IG91dCA9IHJld3JpdGVUYXJnZXRPcmlnaW4oYm9keSwgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCk7XG4gICAgb3V0ID0gcmV3cml0ZUh0bWxBc3NldEF0dHJpYnV0ZXMob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVIdG1sU291cmNlTW9kdWxlQXR0cmlidXRlcyhvdXQsIGFzc2V0UGF0aCk7XG4gICAgb3V0ID0gcmV3cml0ZUh0bWxQcmVsb2FkTGlua3Mob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVSb290UGF0aHMob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVQdWJsaWNSb290RmlsZXMob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVOZXh0RGV2UGF0aHMob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVOZXh0SW1hZ2VVcmxzKG91dCwgYXNzZXRQYXRoKTtcbiAgICBvdXQgPSByZXdyaXRlSHRtbE1ldGFSZWZyZXNoKG91dCwgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCk7XG4gICAgb3V0ID0gcmV3cml0ZUh0bWxMaW5rVGFyZ2V0cyhvdXQpO1xuICAgIG91dCA9IGluamVjdEVtYmVkQm9vdHN0cmFwU2NyaXB0cyhvdXQpO1xuICAgIG91dCA9IGluamVjdElmcmFtZU5hdmlnYXRpb25HdWFyZChvdXQpO1xuICAgIG91dCA9IGluamVjdEJhc2VIcmVmKG91dCwgYXBwQmFzZSk7XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcyhcInRleHQvY3NzXCIpKSB7XG4gICAgcmV0dXJuIHJld3JpdGVDc3NVcmxzKHJld3JpdGVUYXJnZXRPcmlnaW4oYm9keSwgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCksIGFzc2V0UGF0aCk7XG4gIH1cblxuICBpZiAoaXNSZXdyaXRhYmxlU2NyaXB0Q29udGVudFR5cGUoY29udGVudFR5cGUsIHJlcXVlc3RQYXRoKSkge1xuICAgIGlmIChpc1ZpdGVQcmVidW5kbGVkRGVwUGF0aChyZXF1ZXN0UGF0aCkpIHtcbiAgICAgIC8vIExpZ2h0IHBhdGg6IGF2b2lkIGFnZ3Jlc3NpdmUgL2ltYWdlc3wvYXNzZXRzIHJld3JpdGVzIHRoYXQgY29ycnVwdCB2ZW5kb3IgcmVnZXhlcy5cbiAgICAgIC8vIFN0aWxsIGFwcGx5IHN1cmdpY2FsIHJvdXRlciBiYXNlbmFtZXMgXHUyMDE0IHJlYWN0LXJvdXRlci1kb20gLyB2dWUtcm91dGVyIC9cbiAgICAgIC8vIEB0YW5zdGFjay9yZWFjdC1yb3V0ZXIgc2hpcCBmcm9tIC52aXRlL2RlcHMsIGFuZCB3aXRob3V0IHRoaXMgdGhlIFNQQVxuICAgICAgLy8gbmF2aWdhdGVzIHRvIGJhcmUgL2xvZ2luIFx1MjE5MiBMYXVuY2hQYWQgaG9zdCBVSSAob3IgYSBoaXN0b3J5IGxvb3ApLlxuICAgICAgbGV0IG91dCA9IHJld3JpdGVUYXJnZXRPcmlnaW4oYm9keSwgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCk7XG4gICAgICBvdXQgPSByZXdyaXRlSnNNb2R1bGVQYXRocyhvdXQsIGFzc2V0UGF0aCk7XG4gICAgICBvdXQgPSByZXdyaXRlUmVhY3RSb3V0ZXJCYXNlbmFtZShvdXQsIHsgcmVxdWVzdFBhdGggfSk7XG4gICAgICBvdXQgPSByZXdyaXRlVnVlUm91dGVyQmFzZShvdXQsIHsgYXNzZXRQYXRoLCByZXF1ZXN0UGF0aCB9KTtcbiAgICAgIG91dCA9IHJld3JpdGVUYW5zdGFja1JvdXRlckJhc2VwYXRoKG91dCwgeyBhc3NldFBhdGgsIHJlcXVlc3RQYXRoIH0pO1xuICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICBsZXQgb3V0ID0gcmV3cml0ZVRhcmdldE9yaWdpbihib2R5LCBwcm94eVRhcmdldCwgYXNzZXRQYXRoKTtcbiAgICBvdXQgPSByZXdyaXRlSnNNb2R1bGVQYXRocyhvdXQsIGFzc2V0UGF0aCk7XG4gICAgb3V0ID0gcmV3cml0ZUpzU291cmNlTW9kdWxlUGF0aHMob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVKc1B1YmxpY0Fzc2V0UGF0aHMob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVQdWJsaWNSb290RmlsZXMob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVOZXh0RGV2UGF0aHMob3V0LCBhc3NldFBhdGgpO1xuICAgIG91dCA9IHJld3JpdGVOZXh0SW1hZ2VVcmxzKG91dCwgYXNzZXRQYXRoKTtcbiAgICBvdXQgPSByZXdyaXRlUmVhY3RSb3V0ZXJCYXNlbmFtZShvdXQsIHsgcmVxdWVzdFBhdGggfSk7XG4gICAgb3V0ID0gcmV3cml0ZVZ1ZVJvdXRlckJhc2Uob3V0LCB7IGFzc2V0UGF0aCwgcmVxdWVzdFBhdGggfSk7XG4gICAgb3V0ID0gcmV3cml0ZVRhbnN0YWNrUm91dGVyQmFzZXBhdGgob3V0LCB7IGFzc2V0UGF0aCwgcmVxdWVzdFBhdGggfSk7XG4gICAgaWYgKHJlcSkge1xuICAgICAgb3V0ID0gcmV3cml0ZVZpdGVIbXJDbGllbnQob3V0LCBidWlsZEhtckNvbnRleHQocmVxLCBhc3NldFBhdGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHJldHVybiBib2R5O1xufVxuXG5mdW5jdGlvbiBpc1Jld3JpdGFibGVTY3JpcHRDb250ZW50VHlwZShjb250ZW50VHlwZSwgcmVxdWVzdFBhdGgpIHtcbiAgY29uc3QgY3QgPSBTdHJpbmcoY29udGVudFR5cGUgPz8gXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgaWYgKGN0LmluY2x1ZGVzKFwiamF2YXNjcmlwdFwiKSB8fCBjdC5pbmNsdWRlcyhcInR5cGVzY3JpcHRcIikgfHwgY3QuaW5jbHVkZXMoXCJ0ZXh0L3gtdHlwZXNjcmlwdFwiKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChcbiAgICByZXF1ZXN0UGF0aCAmJlxuICAgIGlzTW9kdWxlU2NyaXB0UmVxdWVzdFBhdGgocmVxdWVzdFBhdGgpICYmXG4gICAgaXNJbmNvcnJlY3RNb2R1bGVDb250ZW50VHlwZShjb250ZW50VHlwZSlcbiAgKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hvdWxkUmV3cml0ZVJlc3BvbnNlKGNvbnRlbnRUeXBlLCBjb250ZW50RW5jb2RpbmcsIHJlcXVlc3RQYXRoKSB7XG4gIGlmIChyZXF1ZXN0UGF0aCAmJiBpc1ZpdGVTcGVjaWFsSW1wb3J0UGF0aChyZXF1ZXN0UGF0aCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGNvbnRlbnRFbmNvZGluZyAmJiAvXihnemlwfGJyfGRlZmxhdGUpL2kudGVzdChjb250ZW50RW5jb2RpbmcudHJpbSgpKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBpc0J1bmRsZWRBc3NldFBhdGggPVxuICAgIHJlcXVlc3RQYXRoICYmIC9cXC8oPzpzdGF0aWN8YXNzZXRzKVxcLy8udGVzdChyZXF1ZXN0UGF0aCkgJiYgIS9cXC9fbmV4dFxcLy8udGVzdChyZXF1ZXN0UGF0aCk7XG4gIGlmIChpc0J1bmRsZWRBc3NldFBhdGgpIHtcbiAgICAvLyBQcm9kdWN0aW9uIFZpdGUgY2h1bmtzIGxpdmUgdW5kZXIgL2Fzc2V0cy8gXHUyMDE0IHN0aWxsIHJld3JpdGUgSlMgZm9yIFJlYWN0IFJvdXRlciBiYXNlbmFtZS5cbiAgICByZXR1cm4gaXNSZXdyaXRhYmxlU2NyaXB0Q29udGVudFR5cGUoY29udGVudFR5cGUsIHJlcXVlc3RQYXRoKTtcbiAgfVxuICByZXR1cm4gKFxuICAgIGNvbnRlbnRUeXBlLmluY2x1ZGVzKFwidGV4dC9odG1sXCIpIHx8XG4gICAgaXNSZXdyaXRhYmxlU2NyaXB0Q29udGVudFR5cGUoY29udGVudFR5cGUsIHJlcXVlc3RQYXRoKSB8fFxuICAgIGNvbnRlbnRUeXBlLmluY2x1ZGVzKFwidGV4dC9jc3NcIikgfHxcbiAgICBjb250ZW50VHlwZS5pbmNsdWRlcyhcImFwcGxpY2F0aW9uL2pzb25cIilcbiAgKTtcbn1cblxuLyoqIFBhcnNlIC9lbWJlZGRlZC88cG9ydD4vLi4uIGZyb20gcmVxdWVzdCBVUkw7IHJldHVybnMgbnVsbCBpZiBub3QgYSBtYXRjaC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUVtYmVkZGVkUG9ydFJlcXVlc3QocmF3VXJsKSB7XG4gIGNvbnN0IHBhdGhuYW1lID0gKHJhd1VybCB8fCBcIi9cIikuc3BsaXQoXCI/XCIpWzBdID8/IFwiL1wiO1xuICBjb25zdCBtYXRjaCA9IHBhdGhuYW1lLm1hdGNoKC9eXFwvZW1iZWRkZWRcXC8oXFxkezEsNX0pKFxcLy4qKT8kLyk7XG4gIGlmICghbWF0Y2gpIHJldHVybiBudWxsO1xuICBjb25zdCBwb3J0ID0gTnVtYmVyKG1hdGNoWzFdKTtcbiAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKHBvcnQpIHx8IHBvcnQgPCAxIHx8IHBvcnQgPiA2NTUzNSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHJlc3QgPSBtYXRjaFsyXSA/PyBcIi9cIjtcbiAgY29uc3QgdXBzdHJlYW1QYXRoID0gcmVzdCA9PT0gXCIvXCIgfHwgcmVzdCA9PT0gXCJcIiA/IFwiL1wiIDogcmVzdC5zdGFydHNXaXRoKFwiL1wiKSA/IHJlc3QgOiBgLyR7cmVzdH1gO1xuICByZXR1cm4geyBwb3J0LCBhc3NldFBhdGg6IGAvZW1iZWRkZWQvJHtwb3J0fWAsIHVwc3RyZWFtUGF0aCB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUksgSUUgTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9mcm9udGVuZC9pZnJhbWUtcHJldmlld1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXcvZW1iZWRQcm94eUhhbmRsZXIuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLJTIwSUUlMjBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L2VtYmVkUHJveHlIYW5kbGVyLmpzXCI7aW1wb3J0IGh0dHAgZnJvbSBcIm5vZGU6aHR0cFwiO1xuaW1wb3J0IHsgdXBzdHJlYW1WaXRlSG9zdEhlYWRlciwgdXBzdHJlYW1WaXRlT3JpZ2luIH0gZnJvbSBcIi4vZW1iZWRVcHN0cmVhbS5qc1wiO1xuaW1wb3J0IHtcbiAgYXBwbHlQcm94eVJlc3BvbnNlSGVhZGVycyxcbiAgcmV3cml0ZUVtYmVkZGVkQm9keSxcbiAgc2hvdWxkUmV3cml0ZVJlc3BvbnNlLFxuICBzdHJpcEVtYmVkRnJhbWVQYXJhbSxcbn0gZnJvbSBcIi4vcmV3cml0ZVBhdGhzLmpzXCI7XG5pbXBvcnQge1xuICBpc0luY29ycmVjdE1vZHVsZUNvbnRlbnRUeXBlLFxuICBpc01vZHVsZVNjcmlwdFJlcXVlc3RQYXRoLFxuICByZXNvbHZlTW9kdWxlU2NyaXB0Q29udGVudFR5cGUsXG4gIHNob3VsZFN5bnRoZXNpemVWaXRlVXJsTW9kdWxlLFxuICBzeW50aGVzaXplVml0ZVVybE1vZHVsZSxcbn0gZnJvbSBcIi4vdml0ZVNwZWNpYWxJbXBvcnQudXRpbC5qc1wiO1xuaW1wb3J0IHtcbiAgYnVpbGRFbWJlZFVwc3RyZWFtQ29ubmVjdFBhdGgsXG4gIHNob3VsZEZvcndhcmRVbnN0cmlwcGVkRW1iZWRQYXRoLFxufSBmcm9tIFwiLi4vLi4vc2hhcmVkL3ByZXZpZXctcmV3cml0ZS9lbWJlZFVwc3RyZWFtUGF0aC5qc1wiO1xuXG4vKiogRml4IG1vZHVsZSBNSU1FIHdoZW4gdXBzdHJlYW0vcmVsYXkgcmV0dXJucyBhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0gKFVBVCBEb2NrZXIgcmVsYXkpLiAqL1xuZnVuY3Rpb24gYXBwbHlFbWJlZE1vZHVsZUNvbnRlbnRUeXBlKGhlYWRlcnMsIHJlcXVlc3RQYXRoKSB7XG4gIGlmICghaXNNb2R1bGVTY3JpcHRSZXF1ZXN0UGF0aChyZXF1ZXN0UGF0aCkpIHJldHVybiBoZWFkZXJzO1xuICBjb25zdCBjdCA9IGhlYWRlcnNbXCJjb250ZW50LXR5cGVcIl0gPz8gaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXTtcbiAgaWYgKCFpc0luY29ycmVjdE1vZHVsZUNvbnRlbnRUeXBlKGN0KSkgcmV0dXJuIGhlYWRlcnM7XG4gIGNvbnN0IG91dCA9IHsgLi4uaGVhZGVycyB9O1xuICBkZWxldGUgb3V0W1wiQ29udGVudC1UeXBlXCJdO1xuICBvdXRbXCJjb250ZW50LXR5cGVcIl0gPSByZXNvbHZlTW9kdWxlU2NyaXB0Q29udGVudFR5cGUocmVxdWVzdFBhdGgpO1xuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlRW1iZWRQcm94eVJlc3BvbnNlKHVwc3RyZWFtLCByZXEsIG91dCwgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCkge1xuICBjb25zdCByZXF1ZXN0UGF0aCA9IHJlcS51cmwgPz8gXCJcIjtcblxuICBkZWxldGUgdXBzdHJlYW0uaGVhZGVyc1tcIngtZnJhbWUtb3B0aW9uc1wiXTtcbiAgZGVsZXRlIHVwc3RyZWFtLmhlYWRlcnNbXCJjb250ZW50LXNlY3VyaXR5LXBvbGljeVwiXTtcbiAgZGVsZXRlIHVwc3RyZWFtLmhlYWRlcnNbXCJjb250ZW50LXNlY3VyaXR5LXBvbGljeS1yZXBvcnQtb25seVwiXTtcblxuICBjb25zdCBjb250ZW50VHlwZSA9IFN0cmluZyh1cHN0cmVhbS5oZWFkZXJzW1wiY29udGVudC10eXBlXCJdID8/IFwiXCIpO1xuICBjb25zdCBjb250ZW50RW5jb2RpbmcgPSBTdHJpbmcodXBzdHJlYW0uaGVhZGVyc1tcImNvbnRlbnQtZW5jb2RpbmdcIl0gPz8gXCJcIik7XG4gIGNvbnN0IHJld3JpdGVSZXNwb25zZSA9IHNob3VsZFJld3JpdGVSZXNwb25zZShjb250ZW50VHlwZSwgY29udGVudEVuY29kaW5nLCByZXF1ZXN0UGF0aCk7XG4gIGNvbnN0IGNodW5rcyA9IFtdO1xuXG4gIHVwc3RyZWFtLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XG4gIHVwc3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICBjb25zdCByYXcgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7XG4gICAgbGV0IGhlYWRlcnMgPSBhcHBseVByb3h5UmVzcG9uc2VIZWFkZXJzKHVwc3RyZWFtLmhlYWRlcnMsIHByb3h5VGFyZ2V0LCBhc3NldFBhdGgpO1xuICAgIGhlYWRlcnMgPSBhcHBseUVtYmVkTW9kdWxlQ29udGVudFR5cGUoaGVhZGVycywgcmVxdWVzdFBhdGgpO1xuICAgIGxldCBib2R5VGV4dCA9IHJhdy50b1N0cmluZyhcInV0ZjhcIik7XG5cbiAgICBpZiAoc2hvdWxkU3ludGhlc2l6ZVZpdGVVcmxNb2R1bGUocmVxdWVzdFBhdGgsIGNvbnRlbnRUeXBlLCBib2R5VGV4dCkpIHtcbiAgICAgIGJvZHlUZXh0ID0gc3ludGhlc2l6ZVZpdGVVcmxNb2R1bGUocmVxdWVzdFBhdGgpO1xuICAgICAgZGVsZXRlIGhlYWRlcnNbXCJjb250ZW50LWxlbmd0aFwiXTtcbiAgICAgIGRlbGV0ZSBoZWFkZXJzW1wiY29udGVudC1lbmNvZGluZ1wiXTtcbiAgICAgIG91dC53cml0ZUhlYWQodXBzdHJlYW0uc3RhdHVzQ29kZSA/PyAyMDAsIGhlYWRlcnMpO1xuICAgICAgb3V0LmVuZChCdWZmZXIuZnJvbShib2R5VGV4dCwgXCJ1dGY4XCIpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocmV3cml0ZVJlc3BvbnNlKSB7XG4gICAgICBjb25zdCBlZmZlY3RpdmVUeXBlID0gaGVhZGVyc1tcImNvbnRlbnQtdHlwZVwiXSA/PyBjb250ZW50VHlwZTtcbiAgICAgIGNvbnN0IHRleHQgPSByZXdyaXRlRW1iZWRkZWRCb2R5KGJvZHlUZXh0LCBlZmZlY3RpdmVUeXBlLCBwcm94eVRhcmdldCwgYXNzZXRQYXRoLCByZXEpO1xuICAgICAgY29uc3QgYm9keSA9IEJ1ZmZlci5mcm9tKHRleHQsIFwidXRmOFwiKTtcbiAgICAgIGRlbGV0ZSBoZWFkZXJzW1wiY29udGVudC1sZW5ndGhcIl07XG4gICAgICBkZWxldGUgaGVhZGVyc1tcImNvbnRlbnQtZW5jb2RpbmdcIl07XG4gICAgICBvdXQud3JpdGVIZWFkKHVwc3RyZWFtLnN0YXR1c0NvZGUgPz8gMjAwLCBoZWFkZXJzKTtcbiAgICAgIG91dC5lbmQoYm9keSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC53cml0ZUhlYWQodXBzdHJlYW0uc3RhdHVzQ29kZSA/PyAyMDAsIGhlYWRlcnMpO1xuICAgICAgb3V0LmVuZChyYXcpO1xuICAgIH1cbiAgfSk7XG4gIHVwc3RyZWFtLm9uKFwiZXJyb3JcIiwgKCkgPT4ge1xuICAgIGlmICghb3V0LmhlYWRlcnNTZW50KSB7XG4gICAgICBvdXQud3JpdGVIZWFkKDUwMiwgeyBcImNvbnRlbnQtdHlwZVwiOiBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIiB9KTtcbiAgICAgIG91dC5lbmQoXCJVcHN0cmVhbSBwcmV2aWV3IGVycm9yXCIpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHByb3h5RXJyb3JIdG1sKHByb3h5VGFyZ2V0KSB7XG4gIGNvbnN0IGhvc3RIaW50ID0gcHJveHlUYXJnZXQuaW5jbHVkZXMoXCJob3N0LmRvY2tlci5pbnRlcm5hbFwiKVxuICAgID8gXCI8cD5PbiB5b3VyIE1hYywgcnVuIHRoZSBkZXYgc2VydmVyIHdpdGggPGNvZGU+dml0ZSAtLWhvc3Q8L2NvZGU+IChvciA8Y29kZT5zZXJ2ZXIuaG9zdDogdHJ1ZTwvY29kZT4pIHNvIERvY2tlciBjYW4gcmVhY2ggaXQgdmlhIDxjb2RlPmhvc3QuZG9ja2VyLmludGVybmFsPC9jb2RlPi48L3A+XCJcbiAgICA6IHByb3h5VGFyZ2V0LmluY2x1ZGVzKFwiOi8vYmFja2VuZDpcIilcbiAgICAgID8gXCI8cD5UaGUgcGxhdGZvcm0gaXMgc3RhcnRpbmcgdGhlIHByZXZpZXcgZGV2IHNlcnZlci4gV2FpdCBhIG1vbWVudCwgdGhlbiByZWxvYWQgdGhpcyBwYWdlLjwvcD5cIlxuICAgICAgOiBgPHA+U3RhcnQgdGhlIHByb2plY3QgZGV2IHNlcnZlciBvbiA8Y29kZT4ke3Byb3h5VGFyZ2V0fTwvY29kZT4sIHRoZW4gcmVsb2FkLjwvcD5gO1xuICByZXR1cm4gYDwhRE9DVFlQRSBodG1sPjxodG1sPjxib2R5IHN0eWxlPVwiZm9udC1mYW1pbHk6c3lzdGVtLXVpO3BhZGRpbmc6MjRweFwiPlxuICAgIDxoMT5DYW5ub3QgcmVhY2ggcHJldmlldzwvaDE+XG4gICAgJHtob3N0SGludH1cbiAgPC9ib2R5PjwvaHRtbD5gO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7aW1wb3J0KCdub2RlOmh0dHAnKS5JbmNvbWluZ01lc3NhZ2V9IHJlcVxuICogQHBhcmFtIHtpbXBvcnQoJ25vZGU6aHR0cCcpLlNlcnZlclJlc3BvbnNlfSByZXNcbiAqIEBwYXJhbSB7eyB1cHN0cmVhbUhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCBhc3NldFBhdGg6IHN0cmluZywgdXBzdHJlYW1QYXRoOiBzdHJpbmcsIHJlbGF5VmlhQmFja2VuZEFwaT86IGJvb2xlYW4sIGJhY2tlbmRBcGlQb3J0PzogbnVtYmVyLCBmcmFtZXdvcms/OiBzdHJpbmcgfCBudWxsIH19IGN0eFxuICogQHBhcmFtIHtudW1iZXJ9IFthdHRlbXB0XVxuICovXG5mdW5jdGlvbiBwcm94eUVtYmVkZGVkUmVxdWVzdElubmVyKHJlcSwgcmVzLCBjdHgsIGF0dGVtcHQgPSAwKSB7XG4gIGNvbnN0IHtcbiAgICB1cHN0cmVhbUhvc3QsXG4gICAgcG9ydCxcbiAgICBhc3NldFBhdGgsXG4gICAgdXBzdHJlYW1QYXRoLFxuICAgIHJlbGF5VmlhQmFja2VuZEFwaSA9IGZhbHNlLFxuICAgIGJhY2tlbmRBcGlQb3J0ID0gNTAwMCxcbiAgICBmcmFtZXdvcmsgPSBudWxsLFxuICB9ID0gY3R4O1xuICBjb25zdCBwcm94eVRhcmdldCA9IHVwc3RyZWFtVml0ZU9yaWdpbihwb3J0KTtcbiAgY29uc3QgaG9zdCA9IHJlcS5oZWFkZXJzLmhvc3QgPz8gXCJsb2NhbGhvc3Q6NTE3M1wiO1xuXG4gIGNvbnN0IHJhd1VybCA9IHJlcS51cmwgPz8gXCIvXCI7XG4gIGNvbnN0IHF1ZXJ5ID0gcmF3VXJsLmluY2x1ZGVzKFwiP1wiKSA/IHJhd1VybC5zbGljZShyYXdVcmwuaW5kZXhPZihcIj9cIikpIDogXCJcIjtcbiAgY29uc3QgcGF0aFdpdGhRdWVyeSA9IHN0cmlwRW1iZWRGcmFtZVBhcmFtKHVwc3RyZWFtUGF0aCArIHF1ZXJ5KTtcbiAgY29uc3QgcGF0aE9ubHkgPSBwYXRoV2l0aFF1ZXJ5LnNwbGl0KFwiP1wiKVswXSB8fCBcIi9cIjtcbiAgY29uc3QgcXVlcnlPbmx5ID0gcGF0aFdpdGhRdWVyeS5pbmNsdWRlcyhcIj9cIilcbiAgICA/IHBhdGhXaXRoUXVlcnkuc2xpY2UocGF0aFdpdGhRdWVyeS5pbmRleE9mKFwiP1wiKSlcbiAgICA6IFwiXCI7XG4gIGNvbnN0IHVwc3RyZWFtVGFpbCA9IHBhdGhPbmx5LnN0YXJ0c1dpdGgoXCIvXCIpID8gcGF0aE9ubHkgOiBgLyR7cGF0aE9ubHl9YDtcbiAgY29uc3QgZm9yd2FyZFVuc3RyaXBwZWQgPSBzaG91bGRGb3J3YXJkVW5zdHJpcHBlZEVtYmVkUGF0aChmcmFtZXdvcmspO1xuXG4gIGNvbnN0IGNvbm5lY3RIb3N0bmFtZSA9IHVwc3RyZWFtSG9zdDtcbiAgY29uc3QgY29ubmVjdFBvcnQgPSByZWxheVZpYUJhY2tlbmRBcGkgPyBiYWNrZW5kQXBpUG9ydCA6IHBvcnQ7XG4gIC8vIEJhY2tlbmQgcmVsYXkgYWx3YXlzIHVzZXMgL2VtYmVkZGVkLzxwb3J0Pi9cdTIwMjY7IGJhY2tlbmQgc3RyaXBzIG9yIG5vdCBiYXNlZCBvbiBmcmFtZXdvcmsuXG4gIC8vIERpcmVjdCB0byBOZXh0OiBrZWVwIGVtYmVkIHByZWZpeCBzbyBiYXNlUGF0aCBtYXRjaGVzLiBEaXJlY3QgdG8gVml0ZTogc3RyaXAuXG4gIGNvbnN0IGNvbm5lY3RQYXRoID0gcmVsYXlWaWFCYWNrZW5kQXBpXG4gICAgPyBgL2VtYmVkZGVkLyR7cG9ydH0ke3Vwc3RyZWFtVGFpbCA9PT0gXCIvXCIgPyBcIi9cIiA6IHVwc3RyZWFtVGFpbH0ke3F1ZXJ5T25seX1gXG4gICAgOiBgJHtidWlsZEVtYmVkVXBzdHJlYW1Db25uZWN0UGF0aCh7XG4gICAgICAgIHBvcnQsXG4gICAgICAgIHVwc3RyZWFtVGFpbCxcbiAgICAgICAgZm9yd2FyZFVuc3RyaXBwZWQsXG4gICAgICB9KX0ke3F1ZXJ5T25seX1gO1xuICBjb25zdCBjb25uZWN0VGFyZ2V0ID0gYGh0dHA6Ly8ke2Nvbm5lY3RIb3N0bmFtZX06JHtjb25uZWN0UG9ydH0ke2Nvbm5lY3RQYXRofWA7XG4gIGNvbnN0IHRyYW5zcG9ydCA9IGh0dHA7XG5cbiAgY29uc3QgZm9yd2FyZEhlYWRlcnMgPSB7IC4uLnJlcS5oZWFkZXJzIH07XG4gIGRlbGV0ZSBmb3J3YXJkSGVhZGVycy5jb25uZWN0aW9uO1xuICBkZWxldGUgZm9yd2FyZEhlYWRlcnNbXCJwcm94eS1jb25uZWN0aW9uXCJdO1xuICBkZWxldGUgZm9yd2FyZEhlYWRlcnNbXCJ0cmFuc2Zlci1lbmNvZGluZ1wiXTtcbiAgZGVsZXRlIGZvcndhcmRIZWFkZXJzLmhvc3Q7XG5cbiAgY29uc3QgcHJveHlSZXEgPSB0cmFuc3BvcnQucmVxdWVzdChcbiAgICB7XG4gICAgICBob3N0bmFtZTogY29ubmVjdEhvc3RuYW1lLFxuICAgICAgcG9ydDogY29ubmVjdFBvcnQsXG4gICAgICBwYXRoOiBjb25uZWN0UGF0aCxcbiAgICAgIG1ldGhvZDogcmVxLm1ldGhvZCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgLi4uZm9yd2FyZEhlYWRlcnMsXG4gICAgICAgIGhvc3Q6IHVwc3RyZWFtVml0ZUhvc3RIZWFkZXIocG9ydCksXG4gICAgICAgIG9yaWdpbjogYGh0dHA6Ly8ke2hvc3R9YCxcbiAgICAgICAgXCJhY2NlcHQtZW5jb2RpbmdcIjogXCJpZGVudGl0eVwiLFxuICAgICAgICBcIngtZm9yd2FyZGVkLXByZWZpeFwiOiBhc3NldFBhdGgsXG4gICAgICAgIFwieC1mb3J3YXJkZWQtaG9zdFwiOiBob3N0LFxuICAgICAgICBcIngtZm9yd2FyZGVkLXByb3RvXCI6IFwiaHR0cFwiLFxuICAgICAgfSxcbiAgICB9LFxuICAgIChwcm94eVJlcykgPT4ge1xuICAgICAgaGFuZGxlRW1iZWRQcm94eVJlc3BvbnNlKHByb3h5UmVzLCByZXEsIHJlcywgcHJveHlUYXJnZXQsIGFzc2V0UGF0aCk7XG4gICAgfSxcbiAgKTtcblxuICBwcm94eVJlcS5vbihcImVycm9yXCIsICgpID0+IHtcbiAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCAmJiBhdHRlbXB0IDwgMikge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiBwcm94eUVtYmVkZGVkUmVxdWVzdElubmVyKHJlcSwgcmVzLCBjdHgsIGF0dGVtcHQgKyAxKSwgNDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFyZXMuaGVhZGVyc1NlbnQpIHtcbiAgICAgIHJlcy53cml0ZUhlYWQoNTAyLCB7IFwiY29udGVudC10eXBlXCI6IFwidGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04XCIgfSk7XG4gICAgICByZXMuZW5kKHByb3h5RXJyb3JIdG1sKGNvbm5lY3RUYXJnZXQpKTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIkdFVFwiICYmIHJlcS5tZXRob2QgIT09IFwiSEVBRFwiKSB7XG4gICAgcmVxLnBpcGUocHJveHlSZXEpO1xuICB9IGVsc2Uge1xuICAgIHByb3h5UmVxLmVuZCgpO1xuICB9XG59XG5cbi8qKiBQcm94eSBhIHNpbmdsZSBIVFRQIHJlcXVlc3QgdG8gdGhlIHByb2plY3QgZGV2IHNlcnZlciAoZGlyZWN0IG9yIHZpYSBiYWNrZW5kIEFQSSByZWxheSkuICovXG5leHBvcnQgZnVuY3Rpb24gcHJveHlFbWJlZGRlZFJlcXVlc3QocmVxLCByZXMsIGN0eCkge1xuICBwcm94eUVtYmVkZGVkUmVxdWVzdElubmVyKHJlcSwgcmVzLCBjdHgsIDApO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUksgSUUgTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9zaGFyZWQvcHJldmlldy1yZXdyaXRlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUksgSUUgTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9zaGFyZWQvcHJldmlldy1yZXdyaXRlL2VtYmVkVXBzdHJlYW1QYXRoLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyUyMElFJTIwTGF1bmNoUGFkL3Byb2plY3QtbWFuYWdlbWVudC1wbGF0Zm9ybS9zaGFyZWQvcHJldmlldy1yZXdyaXRlL2VtYmVkVXBzdHJlYW1QYXRoLmpzXCI7LyoqXG4gKiBCdWlsZCB0aGUgcGF0aCBmb3J3YXJkZWQgdG8gYSBwcm9qZWN0IHByZXZpZXcgdXBzdHJlYW0gZnJvbSAvZW1iZWRkZWQvPHBvcnQ+L1x1MjAyNi5cbiAqXG4gKiBWaXRlIC8gQ1JBOiBzdHJpcCB0aGUgZW1iZWQgcHJlZml4IChkZXYgc2VydmVyIHNlcnZlcyBhdCAvKS5cbiAqIE5leHQgd2l0aCBMQVVOQ0hQQURfRU1CRURfQkFTRV9QQVRIOiBrZWVwIC9lbWJlZGRlZC88cG9ydD4vXHUyMDI2IHNvIEFwcCBSb3V0ZXIgbWF0Y2hlcy5cbiAqL1xuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZH0gZnJhbWV3b3JrXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3VsZEZvcndhcmRVbnN0cmlwcGVkRW1iZWRQYXRoKGZyYW1ld29yaykge1xuICByZXR1cm4gU3RyaW5nKGZyYW1ld29yayB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpID09PSBcIm5leHRcIjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3tcbiAqICAgcG9ydDogbnVtYmVyLFxuICogICB1cHN0cmVhbVRhaWw6IHN0cmluZyxcbiAqICAgZm9yd2FyZFVuc3RyaXBwZWQ/OiBib29sZWFuLFxuICogfX0gb3B0c1xuICogQHJldHVybnMge3N0cmluZ30gcGF0aCBvbmx5IChubyBxdWVyeSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRW1iZWRVcHN0cmVhbUNvbm5lY3RQYXRoKHsgcG9ydCwgdXBzdHJlYW1UYWlsLCBmb3J3YXJkVW5zdHJpcHBlZCA9IGZhbHNlIH0pIHtcbiAgY29uc3QgbiA9IE51bWJlcihwb3J0KTtcbiAgY29uc3QgcmF3ID0gU3RyaW5nKHVwc3RyZWFtVGFpbCA/PyBcIlwiKTtcbiAgY29uc3QgZW1wdHkgPSByYXcgPT09IFwiXCI7XG4gIGNvbnN0IHRhaWwgPSBlbXB0eSA/IFwiXCIgOiByYXcuc3RhcnRzV2l0aChcIi9cIikgPyByYXcgOiBgLyR7cmF3fWA7XG4gIGlmICghZm9yd2FyZFVuc3RyaXBwZWQgfHwgIU51bWJlci5pc0ludGVnZXIobikgfHwgbiA8IDEgfHwgbiA+IDY1NTM1KSB7XG4gICAgcmV0dXJuIHRhaWwgfHwgXCIvXCI7XG4gIH1cbiAgY29uc3QgcHJlZml4ID0gYC9lbWJlZGRlZC8ke259YDtcbiAgaWYgKHRhaWwgPT09IHByZWZpeCB8fCB0YWlsLnN0YXJ0c1dpdGgoYCR7cHJlZml4fS9gKSkgcmV0dXJuIHRhaWw7XG4gIC8vIE5leHQgdHJhaWxpbmdTbGFzaDpmYWxzZSBcdTIwMTQgYXZvaWQgYC9lbWJlZGRlZC88cG9ydD4vYCB1cHN0cmVhbSAoMzA4IGxvb3Agd2l0aCBwcm94eSkuXG4gIGlmIChlbXB0eSB8fCB0YWlsID09PSBcIi9cIikgcmV0dXJuIHByZWZpeDtcbiAgcmV0dXJuIGAke3ByZWZpeH0ke3RhaWx9YDtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXdcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyBJRSBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L2VtYmVkUG9ydC5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvdnJhai5nL0Rlc2t0b3AvbGFiL1lPUkslMjBJRSUyMExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXcvZW1iZWRQb3J0LmpzXCI7aW1wb3J0IHsgRU1CRURfRlJBTUVfUEFSQU0sIGlzRW1iZWRJbmZyYXN0cnVjdHVyZVBhdGggfSBmcm9tIFwiLi9jb25zdGFudHMuanNcIjtcbmltcG9ydCB7IGlzUHVibGljUm9vdEZpbGVQYXRoIH0gZnJvbSBcIi4vcmV3cml0ZVBhdGhzLmpzXCI7XG5cbmV4cG9ydCBjb25zdCBFTUJFRF9QT1JUX1BBUkFNID0gXCJlbWJlZF9wb3J0XCI7XG5leHBvcnQgY29uc3QgRU1CRURfUE9SVF9DT09LSUUgPSBcImVtYmVkX3BvcnRcIjtcblxuLyoqIFBhcnNlIHBvcnQgZnJvbSBgL2VtYmVkZGVkLzxwb3J0Pi9cdTIwMjZgLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUG9ydEZyb21FbWJlZGRlZFBhdGgocGF0aG5hbWUpIHtcbiAgY29uc3QgbSA9IFN0cmluZyhwYXRobmFtZSA/PyBcIlwiKS5tYXRjaCgvXlxcL2VtYmVkZGVkXFwvKFxcZHsxLDV9KSg/OlxcL3wkKS8pO1xuICBpZiAoIW0pIHJldHVybiBudWxsO1xuICBjb25zdCBwb3J0ID0gTnVtYmVyKG1bMV0pO1xuICBpZiAoIU51bWJlci5pc0ludGVnZXIocG9ydCkgfHwgcG9ydCA8IDEgfHwgcG9ydCA+IDY1NTM1KSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHBvcnQ7XG59XG5cbi8qKlxuICogTGF1bmNoUGFkIENsaWVudCBMaW5rIHB1YmxpYyBVUkw6IGAvcHJvamVjdHMvOnNsdWdgIChub3QgZGV0YWlscy9vbmJvYXJkaW5nL3JvYWRtYXApLlxuICogVXNlZCBvbmx5IGZvciB0b3AtbGV2ZWwgaG9zdC1zaGVsbCBzYWZldHkgXHUyMDE0IG5vdCBhcyBhbiBvcnBoYW4gcGF0aCBkZW55bGlzdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2xpZW50TGlua1NoZWxsUGF0aChwYXRobmFtZSkge1xuICBjb25zdCBwID0gU3RyaW5nKHBhdGhuYW1lID8/IFwiXCIpLnNwbGl0KFwiP1wiKVswXSA/PyBcIlwiO1xuICByZXR1cm4gL15cXC9wcm9qZWN0c1xcLyg/IWRldGFpbHMoPzpcXC98JCl8b25ib2FyZGluZyg/OlxcL3wkKXxyb2FkbWFwKD86XFwvfCQpKVteL10rXFwvPyQvLnRlc3QocCk7XG59XG5cbi8qKlxuICogUGF0aHMgdGhhdCBiZWxvbmcgdG8gTGF1bmNoUGFkJ3Mgb3duIFZpdGUgd2hlbiByZXF1ZXN0ZWQgYXQgdGhlIGhvc3Qgcm9vdC5cbiAqIE11c3QgbmV2ZXIgYmUgb3JwaGFuLXByb3hpZWQgdmlhIGVtYmVkX3BvcnQgY29va2llIGFsb25lIChjYXVzZXMgNTAyIG9uIDo1MTczKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTGF1bmNocGFkSG9zdFZpdGVQYXRoKHBhdGhuYW1lKSB7XG4gIGNvbnN0IHAgPSBTdHJpbmcocGF0aG5hbWUgPz8gXCJcIikuc3BsaXQoXCI/XCIpWzBdID8/IFwiXCI7XG4gIGlmICgvXlxcL0AoPzp2aXRlfHJlYWN0LXJlZnJlc2h8ZnN8aWQpKD86XFwvfCQpLy50ZXN0KHApKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKC9eXFwvc3JjXFwvLy50ZXN0KHApKSByZXR1cm4gdHJ1ZTtcbiAgLy8gVml0ZSBjbGllbnQgc2hpbXMgKGVudi5tanMsIGNsaWVudC5tanMpIFx1MjAxNCBzdGFsZSBlbWJlZF9wb3J0IGNvb2tpZSBtdXN0IG5vdCBwcm94eSB0aGVzZSB0byBwcmV2aWV3ICg1MDIpLlxuICBpZiAoL15cXC9ub2RlX21vZHVsZXNcXC92aXRlKD86XFwvfCQpLy50ZXN0KHApKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKC9eXFwvbm9kZV9tb2R1bGVzXFwvXFwudml0ZSg/OlxcL3wkKS8udGVzdChwKSkgcmV0dXJuIHRydWU7XG4gIC8vIExhdW5jaFBhZCBWaXRlIENTUy9KUyBkZXBzICh0bGRyYXcsIHh5ZmxvdywgcmVhY3RvdXIsIFx1MjAyNikgXHUyMDE0IG5ldmVyIG9ycGhhbi1wcm94eSB2aWEgZW1iZWQgY29va2llLlxuICBpZiAoL15cXC9ub2RlX21vZHVsZXMoPzpcXC98JCkvLnRlc3QocCkpIHJldHVybiB0cnVlO1xuICBpZiAoL15cXC9AaWRcXC8vLnRlc3QocCkpIHJldHVybiB0cnVlO1xuICAvLyBUeXBvL2NvbW1vbiBob3N0IGZhdmljb24gXHUyMDE0IG5vdCBhIHByb2plY3Qgb3JwaGFuIHNpZ25hbCBieSBjb29raWUgYWxvbmVcbiAgaWYgKC9eXFwvZmV2aWNvblxcLnBuZyQvaS50ZXN0KHApIHx8IC9eXFwvZmF2aWNvblxcLmljbyQvaS50ZXN0KHApKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKiogUm9vdCBgL25vZGVfbW9kdWxlcy9cdTIwMjZgIHJlcXVlc3RzIChWaXRlIENTUy9KUyBkZXBzKS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0hvc3ROb2RlTW9kdWxlc1BhdGgocGF0aG5hbWUpIHtcbiAgY29uc3QgcCA9IFN0cmluZyhwYXRobmFtZSA/PyBcIlwiKS5zcGxpdChcIj9cIilbMF0gPz8gXCJcIjtcbiAgcmV0dXJuIC9eXFwvbm9kZV9tb2R1bGVzKD86XFwvfCQpLy50ZXN0KHApO1xufVxuXG4vKipcbiAqIExhdW5jaFBhZCBgL3Byb2plY3RzYCBob3N0IHJvdXRlcyAobGlzdCArIHBsYXRmb3JtIHN1YnBhdGhzKS5cbiAqIE5vdCBDbGllbnQgTGluayBgL3Byb2plY3RzLzpzbHVnYCBhbmQgbm90IGdlbmVyaWMgTmV4dCBgL3Byb2plY3RzLzppZGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0xhdW5jaHBhZFByb2plY3RzSG9zdFBhdGgocGF0aG5hbWUpIHtcbiAgY29uc3QgcCA9IFN0cmluZyhwYXRobmFtZSA/PyBcIlwiKS5zcGxpdChcIj9cIilbMF0gPz8gXCJcIjtcbiAgaWYgKHAgPT09IFwiL3Byb2plY3RzXCIgfHwgcCA9PT0gXCIvcHJvamVjdHMvXCIpIHJldHVybiB0cnVlO1xuICByZXR1cm4gL15cXC9wcm9qZWN0c1xcLyhkZXRhaWxzfG9uYm9hcmRpbmd8cm9hZG1hcCkoPzpcXC98JCkvLnRlc3QocCk7XG59XG5cbi8qKlxuICogTGF1bmNoUGFkIGhvc3QgU1BBIHJvdXRlcyB0aGF0IG11c3Qgc3RheSBvbiB0aGUgcGxhdGZvcm0gKG5ldmVyIGNvb2tpZS1vcnBoYW4pLlxuICogRXhjbHVkZXMgY29tbW9uIHByZXZpZXctYXBwIHJvdXRlcyAoL2xvZ2luLCAvZGFzaGJvYXJkLCAvcHJvamVjdHMvOmlkKS5cbiAqIGAvc2V0dGluZ3NgIGlzIExhdW5jaFBhZCBpbnRlZ3JhdGlvbnMgXHUyMDE0IHByZXZpZXcgL3NldHRpbmdzIHN0aWxsIHdvcmtzIHZpYSBlbWJlZCByZWZlcmVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNMYXVuY2hwYWRIb3N0QXBwUGF0aChwYXRobmFtZSkge1xuICBjb25zdCBwID0gU3RyaW5nKHBhdGhuYW1lID8/IFwiXCIpLnNwbGl0KFwiP1wiKVswXSA/PyBcIlwiO1xuICBpZiAoIXAuc3RhcnRzV2l0aChcIi9cIikgfHwgcCA9PT0gXCIvXCIpIHJldHVybiBmYWxzZTtcbiAgaWYgKGlzTGF1bmNocGFkUHJvamVjdHNIb3N0UGF0aChwKSkgcmV0dXJuIHRydWU7XG4gIGNvbnN0IGZpcnN0ID0gcC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pWzBdPy50b0xvd2VyQ2FzZSgpID8/IFwiXCI7XG4gIHJldHVybiAoXG4gICAgZmlyc3QgPT09IFwiYXV0aFwiIHx8XG4gICAgZmlyc3QgPT09IFwiaW50ZWdyYXRpb25zXCIgfHxcbiAgICBmaXJzdCA9PT0gXCJzZXR0aW5nc1wiIHx8XG4gICAgZmlyc3QgPT09IFwiam9ic1wiIHx8XG4gICAgZmlyc3QgPT09IFwiZGVwbG95bWVudHNcIiB8fFxuICAgIGZpcnN0ID09PSBcInByb21wdC1tYW5hZ2VtZW50XCIgfHxcbiAgICBmaXJzdCA9PT0gXCJjb3N0LWFuYWx5dGljc1wiIHx8XG4gICAgZmlyc3QgPT09IFwibW9kZWwtcm91dGVyXCIgfHxcbiAgICBmaXJzdCA9PT0gXCJxXCIgfHxcbiAgICBmaXJzdCA9PT0gXCJhZG1pblwiIHx8XG4gICAgZmlyc3QgPT09IFwicmVsZWFzZXNcIiB8fFxuICAgIGZpcnN0ID09PSBcIndvcmtzcGFjZVwiIHx8XG4gICAgZmlyc3QgPT09IFwiY2xpZW50LWxpbmtcIlxuICApO1xufVxuXG5mdW5jdGlvbiBwYXJzZVBvcnRGcm9tQ29va2llKGhlYWRlcikge1xuICBpZiAoIWhlYWRlcikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IG1hdGNoID0gU3RyaW5nKGhlYWRlcikubWF0Y2goXG4gICAgbmV3IFJlZ0V4cChgKD86Xnw7XFxcXHMqKSR7RU1CRURfUE9SVF9DT09LSUV9PShcXFxcZHsxLDV9KSg/Ojt8JClgKSxcbiAgKTtcbiAgaWYgKCFtYXRjaCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHBvcnQgPSBOdW1iZXIobWF0Y2hbMV0pO1xuICBpZiAoIU51bWJlci5pc0ludGVnZXIocG9ydCkgfHwgcG9ydCA8IDEgfHwgcG9ydCA+IDY1NTM1KSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHBvcnQ7XG59XG5cbmZ1bmN0aW9uIHBhcnNlUG9ydEZyb21SZWZlcmVyKHJlZmVyZXIpIHtcbiAgaWYgKCFyZWZlcmVyKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IHBhdGhuYW1lIH0gPSBuZXcgVVJMKHJlZmVyZXIpO1xuICAgIHJldHVybiBwYXJzZVBvcnRGcm9tRW1iZWRkZWRQYXRoKHBhdGhuYW1lKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGVhZGVyVmFsdWUoaGVhZGVycywgbmFtZSkge1xuICBpZiAoIWhlYWRlcnMgfHwgdHlwZW9mIGhlYWRlcnMgIT09IFwib2JqZWN0XCIpIHJldHVybiBcIlwiO1xuICBjb25zdCBsb3dlciA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoaGVhZGVycykpIHtcbiAgICBpZiAoU3RyaW5nKGtleSkudG9Mb3dlckNhc2UoKSA9PT0gbG93ZXIpIHJldHVybiBTdHJpbmcodmFsdWUgPz8gXCJcIik7XG4gIH1cbiAgcmV0dXJuIFwiXCI7XG59XG5cbmZ1bmN0aW9uIGlzVG9wTGV2ZWxEb2N1bWVudE5hdmlnYXRpb24ocmVxKSB7XG4gIGNvbnN0IGRlc3QgPSBoZWFkZXJWYWx1ZShyZXE/LmhlYWRlcnMsIFwic2VjLWZldGNoLWRlc3RcIikudG9Mb3dlckNhc2UoKTtcbiAgY29uc3QgbW9kZSA9IGhlYWRlclZhbHVlKHJlcT8uaGVhZGVycywgXCJzZWMtZmV0Y2gtbW9kZVwiKS50b0xvd2VyQ2FzZSgpO1xuICBpZiAoZGVzdCAmJiBkZXN0ICE9PSBcImRvY3VtZW50XCIpIHJldHVybiBmYWxzZTtcbiAgaWYgKG1vZGUgJiYgbW9kZSAhPT0gXCJuYXZpZ2F0ZVwiICYmIG1vZGUgIT09IFwibmVzdGVkLW5hdmlnYXRlXCIpIHJldHVybiBmYWxzZTtcbiAgLy8gTWlzc2luZyBTZWMtRmV0Y2gtKiAob2xkZXIgY2xpZW50cyAvIHNvbWUgUlNDKTogdHJlYXQgcGF0aCBzaGFwZSBzZXBhcmF0ZWx5LlxuICBpZiAoIWRlc3QgJiYgIW1vZGUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIGRlc3QgPT09IFwiZG9jdW1lbnRcIjtcbn1cblxuZnVuY3Rpb24gcmVxdWVzdFBhdGhuYW1lKHJlcSkge1xuICBjb25zdCByYXdVcmwgPSByZXE/LnVybCA/PyBcIi9cIjtcbiAgdHJ5IHtcbiAgICByZXR1cm4gbmV3IFVSTChyYXdVcmwsIFwiaHR0cDovL2xvY2FsaG9zdFwiKS5wYXRobmFtZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFN0cmluZyhyYXdVcmwpLnNwbGl0KFwiP1wiKVswXSB8fCBcIi9cIjtcbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgcHJvamVjdCBkZXYtc2VydmVyIHBvcnQgZm9yIG9ycGhhbiByZXF1ZXN0cyBhdCB0aGUgaG9zdCByb290LlxuICogUHJlZmVyIHBhdGggLyByZWZlcmVyIGVtYmVkIHByZWZpeDsgdXNlIGVtYmVkX3BvcnQgY29va2llIGZvciBicmVha291dCArIFJTQyxcbiAqIGJ1dCBuZXZlciBzdGVhbCB0b3AtbGV2ZWwgcGxhdGZvcm0gbmF2aWdhdGlvbnMgKE9BdXRoLCBDbGllbnQgTGluaykgdmlhIGNvb2tpZSBhbG9uZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVFbWJlZFBvcnRGcm9tUmVxdWVzdChyZXEpIHtcbiAgY29uc3QgcmF3VXJsID0gcmVxPy51cmwgPz8gXCIvXCI7XG4gIGxldCBwYXRobmFtZSA9IFwiL1wiO1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmF3VXJsLCBcImh0dHA6Ly9sb2NhbGhvc3RcIik7XG4gICAgcGF0aG5hbWUgPSB1cmwucGF0aG5hbWU7XG4gICAgY29uc3QgZnJvbVBhdGggPSBwYXJzZVBvcnRGcm9tRW1iZWRkZWRQYXRoKHVybC5wYXRobmFtZSk7XG4gICAgaWYgKGZyb21QYXRoKSByZXR1cm4gZnJvbVBhdGg7XG5cbiAgICBjb25zdCBmcm9tUXVlcnkgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChFTUJFRF9QT1JUX1BBUkFNKTtcbiAgICBpZiAoZnJvbVF1ZXJ5ICYmIC9eXFxkezEsNX0kLy50ZXN0KGZyb21RdWVyeSkpIHtcbiAgICAgIGNvbnN0IHBvcnQgPSBOdW1iZXIoZnJvbVF1ZXJ5KTtcbiAgICAgIGlmIChwb3J0ID49IDEgJiYgcG9ydCA8PSA2NTUzNSkgcmV0dXJuIHBvcnQ7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICBwYXRobmFtZSA9IHJlcXVlc3RQYXRobmFtZShyZXEpO1xuICB9XG5cbiAgY29uc3QgcmVmZXJlciA9IHJlcT8uaGVhZGVycz8ucmVmZXJlcjtcbiAgY29uc3QgZnJvbVJlZmVyZXIgPSBwYXJzZVBvcnRGcm9tUmVmZXJlcihyZWZlcmVyKTtcbiAgaWYgKGZyb21SZWZlcmVyKSByZXR1cm4gZnJvbVJlZmVyZXI7XG5cbiAgLy8gSG9zdCAvbm9kZV9tb2R1bGVzLyogaXMgYWx3YXlzIExhdW5jaFBhZCBWaXRlIHVubGVzcyB0aGUgcmVxdWVzdCBVUkwgaXMgYWxyZWFkeVxuICAvLyAvZW1iZWRkZWQvPHBvcnQ+L1x1MjAyNiAoaGFuZGxlZCBhYm92ZSkuIFN0YWxlIGVtYmVkX3BvcnQgKyBicmVha291dCByZWZlcmVyIG11c3Qgbm90IDUwMiBoZXJlLlxuICBpZiAoaXNIb3N0Tm9kZU1vZHVsZXNQYXRoKHBhdGhuYW1lKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgZnJvbUNvb2tpZSA9IHBhcnNlUG9ydEZyb21Db29raWUocmVxPy5oZWFkZXJzPy5jb29raWUpO1xuICBpZiAoIWZyb21Db29raWUpIHJldHVybiBudWxsO1xuXG4gIC8vIE5ldmVyIHN0ZWFsIExhdW5jaFBhZCBWaXRlIG1vZHVsZXMgKC9Adml0ZS9jbGllbnQsIC9zcmMvXHUyMDI2KSB2aWEgc3RhbGUgZW1iZWRfcG9ydCBjb29raWUuXG4gIC8vIFRob3NlIG5lZWQgYW4gL2VtYmVkZGVkLzxwb3J0PiByZWZlcmVyIChhbHJlYWR5IGhhbmRsZWQgYWJvdmUpIG9yIHN0YXkgb24gaG9zdCBWaXRlLlxuICBpZiAoaXNMYXVuY2hwYWRIb3N0Vml0ZVBhdGgocGF0aG5hbWUpIHx8IGlzUHVibGljUm9vdEZpbGVQYXRoKHBhdGhuYW1lKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gUGxhdGZvcm0gU1BBIHJvdXRlcyAoL2F1dGgvY2FsbGJhY2ssIC9qb2JzLCBcdTIwMjYpIFx1MjAxNCBjb29raWUgYWxvbmUgbXVzdCBub3QgcHJveHkgdG8gcHJldmlldy5cbiAgLy8gRW1iZWQtcHJlZml4ZWQgT0F1dGggc3RpbGwgcmVzb2x2ZXMgdmlhIC9lbWJlZGRlZCByZWZlcmVyIGFib3ZlLlxuICBpZiAoaXNMYXVuY2hwYWRIb3N0QXBwUGF0aChwYXRobmFtZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBzaXRlID0gaGVhZGVyVmFsdWUocmVxPy5oZWFkZXJzLCBcInNlYy1mZXRjaC1zaXRlXCIpLnRvTG93ZXJDYXNlKCk7XG4gIGNvbnN0IHRvcExldmVsRG9jID0gaXNUb3BMZXZlbERvY3VtZW50TmF2aWdhdGlvbihyZXEpO1xuXG4gIC8vIFRvcC1sZXZlbCBkb2N1bWVudCBsb2FkcyB3aXRob3V0IHNhbWUtb3JpZ2luIGFwcCBjb250ZXh0IChPQXV0aCByZXR1cm4sIHR5cGVkIFVSTCxcbiAgLy8gcmVmcmVzaCkgbXVzdCBoaXQgTGF1bmNoUGFkIFx1MjAxNCBub3QgYSBzdGFsZSBlbWJlZF9wb3J0IGNvb2tpZSBcdTIxOTIgcHJldmlldyA1MDIgcGFnZS5cbiAgaWYgKHRvcExldmVsRG9jICYmICghcmVmZXJlciB8fCBzaXRlID09PSBcIm5vbmVcIiB8fCBzaXRlID09PSBcImNyb3NzLXNpdGVcIikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFRvcC1sZXZlbCBvcGVuL3JlZnJlc2ggb2YgTGF1bmNoUGFkIENsaWVudCBMaW5rIG11c3Qgbm90IGJlIGhpamFja2VkIGJ5IGVtYmVkX3BvcnQuXG4gIC8vIE5leHQgYXBwcyBtYXkgYWxzbyB1c2UgL3Byb2plY3RzLzppZCBcdTIwMTQgdGhvc2UgY29tZSB3aXRoIGFuIGFwcCByZWZlcmVyIChlLmcuIC9kYXNoYm9hcmQpLlxuICBpZiAoaXNDbGllbnRMaW5rU2hlbGxQYXRoKHBhdGhuYW1lKSAmJiB0b3BMZXZlbERvYykge1xuICAgIGlmICghcmVmZXJlciB8fCBzaXRlID09PSBcIm5vbmVcIiB8fCBzaXRlID09PSBcImNyb3NzLXNpdGVcIikgcmV0dXJuIG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlZlBhdGggPSBuZXcgVVJMKHJlZmVyZXIpLnBhdGhuYW1lO1xuICAgICAgaWYgKFxuICAgICAgICBpc0NsaWVudExpbmtTaGVsbFBhdGgocmVmUGF0aCkgfHxcbiAgICAgICAgcmVmUGF0aC5zdGFydHNXaXRoKFwiL3Byb2plY3RzL2RldGFpbHNcIikgfHxcbiAgICAgICAgcmVmUGF0aC5zdGFydHNXaXRoKFwiL3Byb2plY3RzL29uYm9hcmRpbmdcIikgfHxcbiAgICAgICAgcmVmUGF0aC5zdGFydHNXaXRoKFwiL3Byb2plY3RzL3JvYWRtYXBcIilcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGlmICghcmVmZXJlcikge1xuICAgIC8vIFJTQyAvIHN1YnJlc291cmNlIGFmdGVyIGJyZWFrb3V0OiBjb29raWUgaXMgZW5vdWdoLlxuICAgIHJldHVybiBmcm9tQ29va2llO1xuICB9XG5cbiAgY29uc3QgcmVmUG9ydCA9IHBhcnNlUG9ydEZyb21SZWZlcmVyKHJlZmVyZXIpO1xuICBpZiAocmVmUG9ydCA9PT0gZnJvbUNvb2tpZSkgcmV0dXJuIGZyb21Db29raWU7XG4gIGlmIChyZWZQb3J0ICE9IG51bGwpIHJldHVybiBudWxsO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVmUGF0aCA9IG5ldyBVUkwocmVmZXJlcikucGF0aG5hbWU7XG4gICAgaWYgKGlzRW1iZWRJbmZyYXN0cnVjdHVyZVBhdGgocmVmUGF0aCkgJiYgIXBhcnNlUG9ydEZyb21FbWJlZGRlZFBhdGgocmVmUGF0aCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBSZWZlcmVyIGlzIENsaWVudCBMaW5rIHNoZWxsIFx1MjE5MiBkbyBub3QgZm9sbG93IGNvb2tpZSBpbnRvIG9ycGhhbiBwcm94eS5cbiAgICBpZiAoaXNDbGllbnRMaW5rU2hlbGxQYXRoKHJlZlBhdGgpKSByZXR1cm4gbnVsbDtcbiAgICAvLyBSZWZlcmVyIGlzIExhdW5jaFBhZCBob3N0IFNQQSBcdTIxOTIgc3RheSBvbiBwbGF0Zm9ybSAoZS5nLiAvbG9naW4gXHUyMTkyIC9wcm9qZWN0cykuXG4gICAgaWYgKGlzTGF1bmNocGFkSG9zdEFwcFBhdGgocmVmUGF0aCkpIHJldHVybiBudWxsO1xuICAgIC8vIEJyZWFrb3V0IGNoYWluOiByZWZlcmVyIGlzIGFuIGFwcCBwYXRoICgvZGFzaGJvYXJkLCAvbG9naW4sIFx1MjAyNikuXG4gICAgcmV0dXJuIGZyb21Db29raWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEVtYmVkSWZyYW1lRW50cnkocG9ydCwgdXBzdHJlYW1CYXNlUGF0aCA9IFwiXCIpIHtcbiAgY29uc3QgbiA9IE51bWJlcihwb3J0KTtcbiAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG4pIHx8IG4gPCAxIHx8IG4gPiA2NTUzNSkgcmV0dXJuIFwiXCI7XG4gIGNvbnN0IGJhc2UgPSB1cHN0cmVhbUJhc2VQYXRoLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgY29uc3QgcGF0aCA9IGJhc2UgPyBgL2VtYmVkZGVkLyR7bn0ke2Jhc2V9L2AgOiBgL2VtYmVkZGVkLyR7bn0vYDtcbiAgcmV0dXJuIGAke3BhdGh9PyR7RU1CRURfRlJBTUVfUEFSQU19PTEmJHtFTUJFRF9QT1JUX1BBUkFNfT0ke259YDtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLIElFIExhdW5jaFBhZC9wcm9qZWN0LW1hbmFnZW1lbnQtcGxhdGZvcm0vZnJvbnRlbmQvaWZyYW1lLXByZXZpZXdcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy92cmFqLmcvRGVza3RvcC9sYWIvWU9SSyBJRSBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L3Jvb3RBc3NldE1pZGRsZXdhcmUuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3ZyYWouZy9EZXNrdG9wL2xhYi9ZT1JLJTIwSUUlMjBMYXVuY2hQYWQvcHJvamVjdC1tYW5hZ2VtZW50LXBsYXRmb3JtL2Zyb250ZW5kL2lmcmFtZS1wcmV2aWV3L3Jvb3RBc3NldE1pZGRsZXdhcmUuanNcIjtpbXBvcnQgeyBpc0VtYmVkSW5mcmFzdHJ1Y3R1cmVQYXRoIH0gZnJvbSBcIi4vY29uc3RhbnRzLmpzXCI7XG5pbXBvcnQge1xuICBFTUJFRF9QVUJMSUNfUEFUSF9QUkVGSVhFUyxcbiAgaXNQdWJsaWNSb290RmlsZVBhdGgsXG4gIGlzVXBzdHJlYW1CdW5kbGVyUGF0aCxcbn0gZnJvbSBcIi4vcmV3cml0ZVBhdGhzLmpzXCI7XG5pbXBvcnQgeyByZXNvbHZlRW1iZWRQb3J0RnJvbVJlcXVlc3QgfSBmcm9tIFwiLi9lbWJlZFBvcnQuanNcIjtcbmltcG9ydCB7IG5vcm1hbGl6ZUVtYmVkVXBzdHJlYW1SZXNvbHZlciB9IGZyb20gXCIuL2VtYmVkVXBzdHJlYW0uanNcIjtcbmltcG9ydCB7IHByb3h5RW1iZWRkZWRSZXF1ZXN0IH0gZnJvbSBcIi4vZW1iZWRQcm94eUhhbmRsZXIuanNcIjtcblxuLyoqIFRydWUgd2hlbiBhIHJvb3QtbGV2ZWwgcmVxdWVzdCBzaG91bGQgYmUgZm9yd2FyZGVkIHRvIHRoZSBlbWJlZGRlZCBwcm9qZWN0IGRldiBzZXJ2ZXIuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPcnBoYW5FbWJlZGRlZEFzc2V0UGF0aChwYXRobmFtZSkge1xuICBjb25zdCBwID0gKHBhdGhuYW1lID8/IFwiXCIpLnNwbGl0KFwiP1wiKVswXSA/PyBcIlwiO1xuICBpZiAoIXAuc3RhcnRzV2l0aChcIi9cIikgfHwgcC5zdGFydHNXaXRoKFwiL2VtYmVkZGVkL1wiKSB8fCBwLnN0YXJ0c1dpdGgoXCIvaWZyYW1lLXByZXZpZXcvXCIpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChpc1Vwc3RyZWFtQnVuZGxlclBhdGgocCkpIHJldHVybiB0cnVlO1xuICBpZiAoXG4gICAgRU1CRURfUFVCTElDX1BBVEhfUFJFRklYRVMuc29tZSgocHJlZml4KSA9PiBwID09PSBgLyR7cHJlZml4fWAgfHwgcC5zdGFydHNXaXRoKGAvJHtwcmVmaXh9L2ApKVxuICApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoaXNQdWJsaWNSb290RmlsZVBhdGgocCkpIHJldHVybiB0cnVlO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQXBwIHJvdXRlcyB0aGF0IGJyb2tlIG91dCBvZiAvZW1iZWRkZWQvPHBvcnQ+LyAoZS5nLiAvZGFzaGJvYXJkLCAvbG9naW4pLlxuICogR2F0ZWQgYnkgZW1iZWQgY29udGV4dCAocG9ydCByZXNvbHV0aW9uKSwgbm90IGJ5IHByb2R1Y3Qtcm91dGUgbmFtZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09ycGhhbkVtYmVkZGVkQXBwUGF0aChwYXRobmFtZSkge1xuICBjb25zdCBwID0gKHBhdGhuYW1lID8/IFwiXCIpLnNwbGl0KFwiP1wiKVswXSA/PyBcIlwiO1xuICBpZiAoIXAuc3RhcnRzV2l0aChcIi9cIikgfHwgcCA9PT0gXCIvXCIpIHJldHVybiBmYWxzZTtcbiAgaWYgKGlzRW1iZWRJbmZyYXN0cnVjdHVyZVBhdGgocCkpIHJldHVybiBmYWxzZTtcbiAgaWYgKGlzT3JwaGFuRW1iZWRkZWRBc3NldFBhdGgocCkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc09ycGhhbkVtYmVkZGVkUHJveHlQYXRoKHBhdGhuYW1lKSB7XG4gIHJldHVybiBpc09ycGhhbkVtYmVkZGVkQXNzZXRQYXRoKHBhdGhuYW1lKSB8fCBpc09ycGhhbkVtYmVkZGVkQXBwUGF0aChwYXRobmFtZSk7XG59XG5cbi8qKlxuICogUHJveHkgYXNzZXQgKyBhcHAtcm91dGUgcmVxdWVzdHMgdGhhdCBvbWl0IC9lbWJlZGRlZC88cG9ydD4vXG4gKiB3aGVuIGFuIGVtYmVkIHBvcnQgY2FuIGJlIHJlc29sdmVkIGZyb20gcGF0aC9yZWZlcmVyL2Nvb2tpZSBjb250ZXh0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1iZWRkZWRSb290QXNzZXRNaWRkbGV3YXJlKG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCByZXNvbHZlVXBzdHJlYW1Ib3N0ID0gbm9ybWFsaXplRW1iZWRVcHN0cmVhbVJlc29sdmVyKG9wdGlvbnMpO1xuXG4gIHJldHVybiAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb25zdCByYXdVcmwgPSByZXEudXJsID8/IFwiL1wiO1xuICAgIGNvbnN0IHBhdGhuYW1lID0gcmF3VXJsLnNwbGl0KFwiP1wiKVswXSA/PyBcIi9cIjtcbiAgICBpZiAoIWlzT3JwaGFuRW1iZWRkZWRQcm94eVBhdGgocGF0aG5hbWUpKSB7XG4gICAgICBuZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcG9ydCA9IHJlc29sdmVFbWJlZFBvcnRGcm9tUmVxdWVzdChyZXEpO1xuICAgIGlmICghcG9ydCkge1xuICAgICAgbmV4dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHByb3h5RW1iZWRkZWRSZXF1ZXN0KHJlcSwgcmVzLCB7XG4gICAgICB1cHN0cmVhbUhvc3Q6IHJlc29sdmVVcHN0cmVhbUhvc3QocG9ydCksXG4gICAgICBwb3J0LFxuICAgICAgYXNzZXRQYXRoOiBgL2VtYmVkZGVkLyR7cG9ydH1gLFxuICAgICAgdXBzdHJlYW1QYXRoOiBwYXRobmFtZSxcbiAgICB9KTtcbiAgfTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc2EsT0FBTyxVQUFVO0FBQ3ZiLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sV0FBVztBQUNsQixTQUFTLG9CQUFvQjs7O0FDSG9iLFNBQVMsNkJBQTZCOzs7QUNFdmYsSUFBTSw2QkFBNkI7QUFDbkMsSUFBTSwyQkFBMkI7QUFHMUIsU0FBUywyQkFBMkI7QUFDekMsUUFBTSxPQUFPLE9BQU8sUUFBUSxJQUFJLHFCQUFxQixHQUFHLEVBQUUsS0FBSyxFQUFFLFlBQVk7QUFDN0UsU0FBTyxTQUFTLE9BQU8sU0FBUyxXQUFXLFNBQVM7QUFDdEQ7QUFHTyxTQUFTLHFCQUFxQixNQUFNLE9BQU8sS0FBSztBQUNyRCxTQUFPLE9BQU8sVUFBVSxJQUFJLEtBQUssUUFBUSxTQUFTLFFBQVE7QUFDNUQ7QUFNTyxTQUFTLDRCQUE0QjtBQUFBLEVBQzFDLGVBQWU7QUFBQSxFQUNmLHNCQUFzQjtBQUFBLEVBQ3RCLG1CQUFtQjtBQUFBLEVBQ25CLGlCQUFpQjtBQUNuQixJQUFJLENBQUMsR0FBRztBQUNOLFFBQU0sY0FBYyxPQUFPLGdCQUFnQixXQUFXLEVBQUUsS0FBSyxLQUFLO0FBQ2xFLFFBQU0sVUFBVSxzQkFDWixPQUFPLG1CQUFtQixFQUFFLEtBQUssS0FBSyxPQUN0QztBQUNKLFFBQU0sUUFBUSxPQUFPLGdCQUFnQixLQUFLO0FBQzFDLFFBQU0sTUFBTSxPQUFPLGNBQWMsS0FBSztBQUV0QyxTQUFP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
