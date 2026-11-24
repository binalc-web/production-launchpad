/**
 * Helpers for loading Monaco from the bundled npm package (Vite workers)
 * instead of @monaco-editor/react's default jsDelivr CDN.
 *
 * CDN workers fail in production when a blob worker calls importScripts on
 * cross-origin assets (Sentry RND-LAUNCHPAD-FE-A).
 */

/**
 * @typedef {{
 *   editor: new () => Worker,
 *   json: new () => Worker,
 *   css: new () => Worker,
 *   html: new () => Worker,
 *   ts: new () => Worker,
 * }} MonacoWorkerFactories
 */

/**
 * @param {string} label
 * @param {MonacoWorkerFactories} factories
 * @returns {new () => Worker}
 */
export function pickMonacoWorkerFactory(label, factories) {
  if (label === "json") return factories.json;
  if (label === "css" || label === "scss" || label === "less") return factories.css;
  if (label === "html" || label === "handlebars" || label === "razor") return factories.html;
  if (label === "typescript" || label === "javascript") return factories.ts;
  return factories.editor;
}

/**
 * @param {MonacoWorkerFactories} factories
 * @returns {(workerId: string, label: string) => Worker}
 */
export function createMonacoEnvironmentGetWorker(factories) {
  return function getWorker(_workerId, label) {
    const WorkerFactory = pickMonacoWorkerFactory(label, factories);
    return new WorkerFactory();
  };
}

/**
 * Point @monaco-editor/react at the bundled monaco-editor package so it never
 * injects a script from cdn.jsdelivr.net.
 *
 * @param {{ config: (opts: { monaco: unknown }) => void }} loader
 * @param {unknown} monaco
 */
export function applyBundledMonacoLoader(loader, monaco) {
  if (!loader || typeof loader.config !== "function") {
    throw new Error("monaco loader.config is required");
  }
  if (!monaco) {
    throw new Error("bundled monaco package is required");
  }
  loader.config({ monaco });
}
