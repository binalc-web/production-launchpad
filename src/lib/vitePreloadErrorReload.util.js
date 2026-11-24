const RELOAD_FLAG = "lp:vite-preload-reload";

/**
 * @param {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void }} storage
 */
export function shouldReloadForVitePreloadError(storage) {
  if (storage.getItem(RELOAD_FLAG) === "1") return false;
  storage.setItem(RELOAD_FLAG, "1");
  return true;
}

/** @param {unknown} err */
export function staleChunkImportMessage(err) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/Failed to fetch dynamically imported module/i.test(message)) {
    return "This page is out of date. Refresh and try again.";
  }
  return message || "Could not export PDF";
}

export async function loadPdfExportLibs() {
  try {
    return await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  } catch (err) {
    throw new Error(staleChunkImportMessage(err));
  }
}

/** @param {Window} target */
export function attachVitePreloadErrorReload(target = window) {
  target.addEventListener("vite:preloadError", (event) => {
    try {
      if (!shouldReloadForVitePreloadError(target.sessionStorage)) return;
      event.preventDefault();
      target.location.reload();
    } catch {
      // sessionStorage can throw in private mode; keep the original import error.
    }
  });
}
