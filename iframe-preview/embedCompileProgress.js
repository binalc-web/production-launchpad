/** postMessage type from embed iframe → Client Link parent for compile theater. */
export const EMBED_COMPILE_PROGRESS_MESSAGE_TYPE = "launchpad:embed-compile-progress";

/** Throttle interval for compile-progress postMessage (ms). */
export const EMBED_COMPILE_PROGRESS_THROTTLE_MS = 100;

/**
 * Optional debug/ops endpoint on the Vite plugin (not polled by the embed).
 * Live theater uses HMR WebSocket `custom` / `launchpad:compile-progress` only.
 */
export const EMBED_COMPILE_PROGRESS_ENDPOINT = "/__launchpad/compile-progress";

/**
 * Strip `/embedded/<port>` prefix and query/hash from a URL path.
 * @param {string} pathname
 * @returns {string}
 */
export function stripEmbedPrefixFromPath(pathname) {
  const raw = String(pathname || "");
  const m = raw.match(/^\/embedded\/\d{1,5}(\/.*)?$/);
  if (m) return m[1] || "/";
  return raw || "/";
}

/**
 * Basename (or short path) suitable for theater UI.
 * @param {string} urlOrPath
 * @returns {string}
 */
export function compileProgressFileLabel(urlOrPath) {
  let path = String(urlOrPath || "").trim();
  if (!path) return "";
  try {
    if (/^https?:\/\//i.test(path) || path.startsWith("//")) {
      path = new URL(path, "http://local.invalid").pathname;
    }
  } catch {
    /* keep path */
  }
  path = stripEmbedPrefixFromPath(path.split("?")[0].split("#")[0]);
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return "";
  const last = parts[parts.length - 1];
  if (last === "_next" || last === "static" || last === "chunks") {
    return parts.slice(-2).join("/") || last;
  }
  return last;
}

/**
 * True when a request URL looks like an app module (Vite / Next), not an asset or tooling ping.
 * @param {string} url
 * @returns {boolean}
 */
export function isCompileTheaterModuleUrl(url) {
  let pathname = "";
  try {
    const u = new URL(String(url || ""), "http://local.invalid");
    pathname = u.pathname || "";
  } catch {
    pathname = String(url || "").split("?")[0];
  }
  pathname = stripEmbedPrefixFromPath(pathname);
  if (!pathname || pathname === "/") return false;

  const lower = pathname.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|map|css|json|html|md|txt)(\?|$)/i.test(lower)) {
    return false;
  }
  if (
    /\/@vite\/client/i.test(pathname) ||
    /\/@react-refresh/i.test(pathname) ||
    /\/@id\//i.test(pathname) ||
    /\/__vite/i.test(pathname) ||
    /\/__launchpad\//i.test(pathname) ||
    /hot-update/i.test(pathname) ||
    /\/favicon\.ico$/i.test(pathname)
  ) {
    return false;
  }

  if (/\/src\//i.test(pathname)) return true;
  if (/\.(tsx?|jsx?|mjs|cjs|vue|svelte)(\?|$)/i.test(pathname)) return true;
  if (/\/_next\/static\/chunks\//i.test(pathname)) return true;
  if (/\/_next\/static\/css\//i.test(pathname)) return false;
  if (/\/_next\//i.test(pathname) && /\.(js|mjs)(\?|$)/i.test(pathname)) return true;

  return false;
}

/**
 * @param {unknown} data
 * @returns {boolean}
 */
export function isEmbedCompileProgressMessage(data) {
  if (data == null || typeof data !== "object") return false;
  if (data.type !== EMBED_COMPILE_PROGRESS_MESSAGE_TYPE) return false;
  if (data.port != null && !Number.isFinite(Number(data.port))) return false;
  if (data.done != null && !Number.isFinite(Number(data.done))) return false;
  if (data.total != null && !Number.isFinite(Number(data.total))) return false;
  return true;
}

/**
 * Normalize a raw postMessage payload into a progress patch.
 * @param {unknown} data
 * @returns {{
 *   port: number | null,
 *   stage: string,
 *   file: string,
 *   done: number,
 *   total: number | null,
 *   route: string,
 * } | null}
 */
export function parseEmbedCompileProgressMessage(data) {
  if (!isEmbedCompileProgressMessage(data)) return null;
  const done = Math.max(0, Math.floor(Number(data.done) || 0));
  let total = data.total != null ? Math.max(0, Math.floor(Number(data.total) || 0)) : null;
  if (total != null && total <= done) total = null;
  const file =
    typeof data.file === "string" && data.file.trim() ? compileProgressFileLabel(data.file) : "";
  const route = typeof data.route === "string" ? data.route.trim() : "";
  const stage =
    typeof data.stage === "string" && data.stage.trim() ? data.stage.trim() : "transform";
  return {
    port: data.port != null ? Number(data.port) : null,
    stage,
    file,
    done,
    total,
    route,
  };
}

/**
 * Inline script: apply Vite HMR WS compile progress + light client module hints; postMessage parent.
 * Injected with the HMR bootstrap (see buildEmbedBootstrapScript). No HTTP poll — server pushes
 * via `custom` / `launchpad:compile-progress` (including a snapshot on WS connection).
 */
export function buildEmbedCompileProgressScriptBody() {
  const type = EMBED_COMPILE_PROGRESS_MESSAGE_TYPE;
  const throttle = EMBED_COMPILE_PROGRESS_THROTTLE_MS;
  // Keep logic self-contained (inline IIFE fragment). Assumes `port` and `p` are in scope.
  // Primary signal: applyServerCompileProgress from the HMR WebSocket handler (embedHmrWs).
  // Secondary: MutationObserver / fetch / Resource Timing for client-side hints when WS is late.
  return `var COMPILE_MSG="${type}",COMPILE_THROTTLE=${throttle};var seenMods=Object.create(null),modDone=0,modTotal=null,modFile="",modStage="transform",lastCompilePost=0,compileTimer=null;var nativeFetch=typeof window.fetch==="function"?window.fetch.bind(window):null;function stripEmbedPath(pathname){var m=String(pathname||"").match(/^\\/embedded\\/\\d{1,5}(\\/.*)?$/);return m?(m[1]||"/"):(pathname||"/")}function fileLabel(u){var path=String(u||"");try{if(/^https?:\\/\\//i.test(path)||path.indexOf("//")===0)path=new URL(path,location.href).pathname}catch(eL){}path=stripEmbedPath(path.split("?")[0].split("#")[0]);var parts=path.split("/").filter(Boolean);if(!parts.length)return"";return parts[parts.length-1]}function isModuleUrl(u){var pathname="";try{pathname=new URL(String(u||""),location.href).pathname}catch(eM){pathname=String(u||"").split("?")[0]}pathname=stripEmbedPath(pathname);if(!pathname||pathname==="/")return false;var lower=pathname.toLowerCase();if(/\\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|map|css|json|html|md|txt)(\\?|$)/i.test(lower))return false;if(/\\/@vite\\/client/i.test(pathname)||/@react-refresh/i.test(pathname)||/@id\\//i.test(pathname)||/\\/__vite/i.test(pathname)||/\\/__launchpad\\//i.test(pathname)||/hot-update/i.test(pathname))return false;if(/\\/src\\//i.test(pathname))return true;if(/\\.(tsx?|jsx?|mjs|cjs|vue|svelte)(\\?|$)/i.test(pathname))return true;if(/\\/_next\\/static\\/chunks\\//i.test(pathname))return true;if(/\\/_next\\//i.test(pathname)&&/\\.(js|mjs)(\\?|$)/i.test(pathname))return true;return false}function resetCompileTheater(){seenMods=Object.create(null);modDone=0;modTotal=null;modFile="";modStage="transform"}function postCompile(force){var now=Date.now();if(!force&&now-lastCompilePost<COMPILE_THROTTLE){if(!compileTimer){compileTimer=setTimeout(function(){compileTimer=null;postCompile(true)},COMPILE_THROTTLE-(now-lastCompilePost))}return}lastCompilePost=now;try{if(window.parent&&window.parent!==window){var payload={type:COMPILE_MSG,port:Number(port),stage:modStage,done:modDone,file:modFile||null};if(modTotal!=null&&modTotal>modDone)payload.total=modTotal;try{payload.route=location.pathname.replace(new RegExp("^/embedded/"+port),"")||"/"}catch(eR){}window.parent.postMessage(payload,location.origin)}}catch(eP){}}function applyServerCompileProgress(j){if(!j||typeof j!=="object")return;var changed=false;if(typeof j.done==="number"&&j.done>modDone){modDone=Math.floor(j.done);changed=true}if(typeof j.total==="number"&&j.total>modDone){modTotal=Math.floor(j.total);changed=true}else if(j.total==null&&modTotal!=null&&modTotal<=modDone){modTotal=null}if(typeof j.file==="string"&&j.file){modFile=fileLabel(j.file);changed=true}if(typeof j.stage==="string"&&j.stage){modStage=j.stage}if(changed||modDone>0)postCompile(false)}function noteModule(u){if(!isModuleUrl(u))return;var key="";try{var x=new URL(String(u),location.href);key=stripEmbedPath(x.pathname)+x.search.replace(/[?&]t=[^&]*/g,"").replace(/[?&]v=[^&]*/g,"")}catch(eK){key=String(u)}if(!key||seenMods[key])return;seenMods[key]=1;modDone+=1;modFile=fileLabel(u);modStage="transform";if(modTotal!=null&&modTotal<modDone)modTotal=modDone;postCompile(false)}function noteEl(el){if(!el||el.nodeType!==1)return;var tag=(el.tagName||"").toLowerCase();if(tag==="script"){var src=el.getAttribute("src")||el.src;if(src)noteModule(src);return}if(tag==="link"){var rel=(el.getAttribute("rel")||"").toLowerCase();if(rel.indexOf("modulepreload")>=0||rel==="preload"){var href=el.getAttribute("href")||el.href;if(href)noteModule(href)}}}try{if(nativeFetch){window.fetch=function(input,init){try{var src=typeof input==="string"?input:(input&&input.url)||"";noteModule(src)}catch(eN){}var opts=init?Object.assign({},init):{};if(opts.credentials==null)opts.credentials="same-origin";return nativeFetch(input,opts)}}}catch(eF2){}try{if(typeof PerformanceObserver==="function"){var onPerf=function(list){var entries=list.getEntries();for(var i=0;i<entries.length;i++){var n=entries[i]&&entries[i].name;if(n)noteModule(n)}};var po=new PerformanceObserver(onPerf);try{po.observe({type:"resource",buffered:true})}catch(eType){try{po.observe({entryTypes:["resource"]})}catch(eTypes){}}}}catch(ePo){}try{if(typeof MutationObserver==="function"&&document.documentElement){var mo=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var nodes=muts[i].addedNodes;for(var j=0;j<nodes.length;j++){var node=nodes[j];noteEl(node);if(node&&node.querySelectorAll){var kids=node.querySelectorAll("script[src],link[rel]");for(var k=0;k<kids.length;k++)noteEl(kids[k])}}}});mo.observe(document.documentElement,{childList:true,subtree:true});var existing=document.querySelectorAll("script[src],link[rel]");for(var ei=0;ei<existing.length;ei++)noteEl(existing[ei])}}catch(eMo){}function scanPerfResources(){try{var entries=performance.getEntriesByType("resource");for(var i=0;i<entries.length;i++){if(entries[i]&&entries[i].name)noteModule(entries[i].name)}}catch(eScan){}}setInterval(scanPerfResources,250);scanPerfResources();`;
}
