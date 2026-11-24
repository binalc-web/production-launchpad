export {
  EMBED_HMR_WS_MESSAGE_TYPE,
  EMBED_HMR_WS_FAIL_STREAK,
  isEmbedHmrWsMessage,
} from "../../iframe-preview/embedHmrWs.js";

export {
  EMBED_COMPILE_PROGRESS_MESSAGE_TYPE,
  isEmbedCompileProgressMessage,
  parseEmbedCompileProgressMessage,
} from "../../iframe-preview/embedCompileProgress.js";

export {
  EMBED_HMR_WS_FAIL_BEFORE_HARD_RELOAD,
  EMBED_HMR_WS_MAX_AUTO_HARD_RELOADS,
} from "./clientLinkEmbedHmrWsRecovery.util.js";

/** Default wait for Vite HMR update/full-reload postMessage before hard remount. */
export const EMBED_HMR_UPDATE_WAIT_MS = 3000;

/** Ignore HMR postMessages briefly after sync so pre-sync signals are not mistaken for the new edit. */
export const EMBED_HMR_UPDATE_SETTLE_MS = 400;

const HMR_APPLIED_STATUSES = new Set(["hmr-update", "full-reload"]);

/**
 * Wait until the embed iframe reports a Vite HMR update or full-reload via postMessage.
 * @param {{ port: number | null | undefined, timeoutMs?: number, settleMs?: number, signal?: AbortSignal }} opts
 * @returns {Promise<{ ok: true, status: string } | { ok: false, reason: "timeout" | "aborted" }>}
 */
export function waitForEmbedHmrUpdate({
  port,
  timeoutMs = EMBED_HMR_UPDATE_WAIT_MS,
  settleMs = EMBED_HMR_UPDATE_SETTLE_MS,
  signal,
} = {}) {
  const expectedPort = port != null ? Number(port) : null;
  const maxMs = Number(timeoutMs) > 0 ? Number(timeoutMs) : EMBED_HMR_UPDATE_WAIT_MS;
  const ignoreMs = Number(settleMs) > 0 ? Number(settleMs) : 0;

  return new Promise((resolve) => {
    let settled = false;
    let accepting = ignoreMs <= 0;
    let settleTimerId = null;
    let deadlineTimerId = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      if (settleTimerId != null) window.clearTimeout(settleTimerId);
      if (deadlineTimerId != null) window.clearTimeout(deadlineTimerId);
      signal?.removeEventListener?.("abort", onAbort);
      resolve(result);
    };

    const onAbort = () => finish({ ok: false, reason: "aborted" });
    if (signal?.aborted) {
      finish({ ok: false, reason: "aborted" });
      return;
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });

    const onMessage = (ev) => {
      if (!accepting) return;
      if (ev.origin !== window.location.origin) return;
      const data = ev.data;
      if (data == null || typeof data !== "object" || data.type !== "launchpad:embed-hmr-ws") {
        return;
      }
      if (
        expectedPort != null &&
        Number.isFinite(expectedPort) &&
        Number(data.port) !== expectedPort
      ) {
        return;
      }
      const status = typeof data.status === "string" ? data.status : "";
      if (HMR_APPLIED_STATUSES.has(status)) {
        finish({ ok: true, status });
      }
    };

    window.addEventListener("message", onMessage);

    const startDeadline = () => {
      deadlineTimerId = window.setTimeout(() => finish({ ok: false, reason: "timeout" }), maxMs);
    };

    if (ignoreMs > 0) {
      settleTimerId = window.setTimeout(() => {
        accepting = true;
        startDeadline();
      }, ignoreMs);
    } else {
      startDeadline();
    }
  });
}
