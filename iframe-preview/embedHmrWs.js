import { buildEmbedCompileProgressScriptBody } from "./embedCompileProgress.js";

/** postMessage type from embed iframe → Client Link parent when Vite/Next HMR WebSocket fails. */
export const EMBED_HMR_WS_MESSAGE_TYPE = "launchpad:embed-hmr-ws";

/** Consecutive HMR socket failures inside iframe before notifying parent. */
export const EMBED_HMR_WS_FAIL_STREAK = 3;

/** localStorage key prefix — must match clientLinkPreviewSessionSnapshot.util.js */
export const EMBED_SESSION_RESTORE_LS_PREFIX = "launchpad:embed-session-restore:";

/**
 * Runs before any other embed bootstrap script.
 * Opaque iframe sandboxes (missing allow-same-origin) throw on storage access; many preview
 * apps (zustand persist, auth stores via useSyncExternalStore) then return a fresh object
 * on every getSnapshot read → React max update depth / white screen after navigation.
 */
export function buildEmbedStorageShimScript() {
  return `<script data-embed-storage-shim>(function(){function mem(){var m=Object.create(null);return{get length(){return Object.keys(m).length},clear:function(){m=Object.create(null)},getItem:function(k){return Object.prototype.hasOwnProperty.call(m,String(k))?m[String(k)]:null},key:function(i){return Object.keys(m)[i]||null},removeItem:function(k){delete m[String(k)]},setItem:function(k,v){m[String(k)]=String(v)}}}function ok(s){try{var t="__lp_stor_probe__";s.setItem(t,"1");s.removeItem(t);return true}catch(e){return false}}function patch(n){try{var cur=window[n];if(cur&&ok(cur))return;var next=mem();try{if(cur&&typeof cur.getItem==="function"){var k;for(var i=0;i<cur.length;i++){k=cur.key(i);if(k!=null)try{next.setItem(k,cur.getItem(k))}catch(e2){}}}}catch(e3){}Object.defineProperty(window,n,{value:next,configurable:true,writable:true})}catch(e4){}}patch("localStorage");patch("sessionStorage")})();</script>`;
}

/**
 * Runs first in proxied preview HTML: restore staged sessionStorage before React boots.
 * Parent stages via stageIframeSessionRestore() before iframe navigations / Vite reloads.
 */
export function buildEmbedSessionRestoreScript() {
  const prefix = EMBED_SESSION_RESTORE_LS_PREFIX;
  // Restore cookies under Path=/embedded/<port>/ only (never Path=/ — avoids nginx Cookie Too Large).
  return `<script data-embed-session-restore>(function(){try{var m=location.pathname.match(/^\\/embedded\\/(\\d{1,5})/);if(!m)return;var key="${prefix}"+m[1],raw=localStorage.getItem(key);if(!raw)return;localStorage.removeItem(key);var snap=JSON.parse(raw);if(!snap||typeof snap!=="object")return;var sk="__lpSession",lk="__lpLocal",ck="__lpCookies",cp="/embedded/"+m[1]+"/";if(snap[sk]||snap[lk]||snap[ck]){var s=snap[sk],l=snap[lk],c=snap[ck];if(s&&typeof s==="object")for(var k in s){if(Object.prototype.hasOwnProperty.call(s,k))sessionStorage.setItem(k,s[k])}if(l&&typeof l==="object")for(var k2 in l){if(Object.prototype.hasOwnProperty.call(l,k2))localStorage.setItem(k2,l[k2])}if(typeof c==="string"&&c){for(var p=c.split(/;\\s*/),i=0;i<p.length;i++){var part=p[i].trim();if(!part||part.indexOf("=")<0)continue;var nv=part.split(";")[0].trim();if(nv)document.cookie=nv+"; path="+cp+"; SameSite=Lax"}}}else{for(var k3 in snap){if(Object.prototype.hasOwnProperty.call(snap,k3))sessionStorage.setItem(k3,snap[k3])}}}catch(e){}})();</script>`;
}

/**
 * Inline bootstrap: rewrite WS URLs under /embedded/<port>/ and report HMR connectivity.
 * Injected into proxied preview HTML (see rewritePaths.injectEmbedBootstrapScripts).
 */
export function buildEmbedBootstrapScript() {
  const type = EMBED_HMR_WS_MESSAGE_TYPE;
  const streakLimit = EMBED_HMR_WS_FAIL_STREAK;
  // Clear Path=/ preview auth leftovers, force future document.cookie Path under /embedded/<port>/,
  // keep embed_port on Path=/ for root orphan-asset routing.
  // After Next client-nav breakout (/login etc.), resolve port from cookie so RSC still sends it.
  const compileBody = buildEmbedCompileProgressScriptBody();
  return `${buildEmbedStorageShimScript()}${buildEmbedSessionRestoreScript()}<script data-embed-bootstrap>(function(){var m=location.pathname.match(/^\\/embedded\\/(\\d{1,5})/);var port=m?m[1]:null;if(!port){try{var cm=document.cookie.match(/(?:^|;\\s*)embed_port=(\\d{1,5})(?:;|$)/);if(cm)port=cm[1]}catch(eC){}}if(!port)return;var p="/embedded/"+port+"/",cp="/embedded/"+port+"/";["user","roles","refresh_token"].forEach(function(n){document.cookie=n+"=;path=/;Max-Age=0"});try{var desc=Object.getOwnPropertyDescriptor(Document.prototype,"cookie")||Object.getOwnPropertyDescriptor(HTMLDocument.prototype,"cookie");if(desc&&desc.set){Object.defineProperty(document,"cookie",{configurable:true,enumerable:true,get:function(){return desc.get.call(document)},set:function(v){var s=String(v),nv=s.split(";")[0].trim();if(/^embed_port=/i.test(nv)){desc.set.call(document,s);return}if(/;\\s*path\\s*=/i.test(s)){s=s.replace(/;\\s*path\\s*=[^;]*/i,"; path="+cp)}else{s=s+"; path="+cp}desc.set.call(document,s)}})}}catch(e0){}document.cookie="embed_port="+port+";path=/;SameSite=Lax";${compileBody}var MSG="${type}",failStreak=0,everOpen=false,lastFullReloadAt=0,lastHmrUpdateAt=0;function notify(status,extra){try{if(window.parent&&window.parent!==window){var payload={type:MSG,status:status,port:Number(port)};if(extra){for(var k in extra){if(Object.prototype.hasOwnProperty.call(extra,k))payload[k]=extra[k]}}window.parent.postMessage(payload,location.origin)}}catch(e){}}function isHmrUrl(u){if(typeof u!=="string")return false;try{var x=new URL(u,location.href);return x.host===location.host&&(x.pathname===p||x.pathname===p.slice(0,-1)||x.pathname.startsWith(p))}catch(e){return false}}function rewriteUrl(u){if(typeof u!=="string")return u;try{var x=new URL(u,location.href);if(x.host===location.host&&!x.pathname.startsWith(p)){if(x.pathname==="/"||x.pathname==="")x.pathname=p;else if(!x.pathname.startsWith("/embedded/"+port))x.pathname="/embedded/"+port+x.pathname}x.protocol=location.protocol==="https:"?"wss:":"ws:";if(location.protocol==="https:"&&x.port==="80")return"wss://"+x.hostname+x.pathname+x.search+x.hash;if(location.protocol!=="https:"&&x.port==="443")return"ws://"+x.hostname+x.pathname+x.search+x.hash;return x.href}catch(e){return u}}var W=WebSocket;WebSocket=function(u,pr){var url=rewriteUrl(u);var ws=pr!==undefined?new W(url,pr):new W(url);if(isHmrUrl(url)){var opened=false;ws.addEventListener("open",function(){opened=true;everOpen=true;failStreak=0;notify("open")});ws.addEventListener("close",function(){if(opened)return;failStreak+=1;if(failStreak>=${streakLimit})notify("failed",{failStreak:failStreak})});ws.addEventListener("message",function(ev){try{var d=typeof ev.data==="string"?ev.data:"";if(!d)return;var msg=JSON.parse(d);if(!msg||!msg.type)return;if(msg.type==="custom"&&msg.event==="launchpad:compile-progress"){try{applyServerCompileProgress(msg.data||msg)}catch(eProg){}return}if(msg.type==="full-reload"){var now=Date.now();if(now-lastFullReloadAt<800)return;lastFullReloadAt=now;try{resetCompileTheater()}catch(eReset){}notify("full-reload",{path:msg.path||null});return}if(msg.type==="update"){var now2=Date.now();if(now2-lastHmrUpdateAt<300)return;lastHmrUpdateAt=now2;notify("hmr-update",{updates:Array.isArray(msg.updates)?msg.updates.length:0})}}catch(e3){}})}return ws};WebSocket.prototype=W.prototype;WebSocket.CONNECTING=W.CONNECTING;WebSocket.OPEN=W.OPEN;WebSocket.CLOSING=W.CLOSING;WebSocket.CLOSED=W.CLOSED})();</script>`;
}

/** @param {unknown} data */
export function isEmbedHmrWsMessage(data) {
  return (
    data != null &&
    typeof data === "object" &&
    data.type === EMBED_HMR_WS_MESSAGE_TYPE &&
    (data.status === "open" ||
      data.status === "failed" ||
      data.status === "full-reload" ||
      data.status === "hmr-update")
  );
}
