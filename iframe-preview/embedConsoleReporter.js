/** postMessage type from same-origin embed iframe → Client Link parent. */
export const EMBED_CONSOLE_MESSAGE_TYPE = "launchpad:preview-console";

/**
 * Head script that records window errors, unhandled rejections, console.error,
 * and router-basename warnings, then posts them to the parent.
 * Runs before the app bundle. Idempotent via window.__launchpadConsole.
 */
export function buildEmbedConsoleReporterScript() {
  const type = EMBED_CONSOLE_MESSAGE_TYPE;
  return `<script data-embed-console>(function(){if(window.__launchpadConsole)return;window.__launchpadConsole=true;var lines=[];function post(){try{if(window.parent&&window.parent!==window)window.parent.postMessage({type:"${type}",consoleLines:lines.slice()},location.origin)}catch(e){}}function remember(line){var text=String(line||"").replace(/\\s+/g," ").trim().slice(0,400);if(!text)return;if(/\\[vite\\]|\\[hmr\\]|\\[Fast Refresh\\]|hot updated|Download the React DevTools|launchpad:/i.test(text))return;if(lines.indexOf(text)!==-1)return;lines.push(text);if(lines.length>8)lines.shift();post()}function argsText(args){var parts=[];for(var i=0;i<args.length;i++){try{parts.push(typeof args[i]==="string"?args[i]:String(args[i]))}catch(e){parts.push("")}}return parts.join(" ")}if(typeof console!=="undefined"&&console){var origError=console.error,origWarn=console.warn;console.error=function(){remember("console: "+argsText(arguments));if(origError)return origError.apply(console,arguments)};console.warn=function(){var text=argsText(arguments);if(/not able to match the URL|basename/i.test(text))remember("warn: "+text);if(origWarn)return origWarn.apply(console,arguments)}}window.addEventListener("error",function(ev){var msg=(ev&&(ev.message||(ev.error&&ev.error.message)))||"error";remember("error: "+msg)});window.addEventListener("unhandledrejection",function(ev){var reason=ev&&ev.reason;var msg=reason&&reason.message?reason.message:String(reason||"unhandledrejection");remember("rejection: "+msg)})})();</script>`;
}

/** @param {string} html */
export function injectEmbedConsoleReporter(html) {
  const source = String(html || "");
  if (source.includes("data-embed-console")) return source;
  const tag = buildEmbedConsoleReporterScript();
  if (/<head[^>]*>/i.test(source)) {
    return source.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
  }
  return `${tag}${source}`;
}
