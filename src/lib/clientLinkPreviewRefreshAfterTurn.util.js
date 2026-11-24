/**
 * HMR-first post-turn preview refresh — single decision path for agent turn sync.
 */

import { auditPreviewPipeline } from "./previewPipelineAudit.js";
import { waitForEmbedHmrUpdate } from "./clientLinkEmbedHmrWs.js";
import {
  isIframePreviewContentReady,
  isIframePreviewErrorPage,
} from "./clientLinkPreviewHealth.js";

const POST_TURN_SYNC_WAIT_MS = 1200;

/** Vite postMessage statuses that mean the embed actually applied an update. */
export const CONFIRMED_EMBED_HMR_STATUSES = new Set(["hmr-update", "full-reload"]);

function canAccessIframeDocument(iframe) {
  if (!iframe) return false;
  try {
    const doc = iframe.contentDocument;
    return Boolean(doc && doc.body);
  } catch {
    return false;
  }
}

function previewStillUsable(previewIframeRef) {
  const iframe = previewIframeRef.current;
  return (
    iframe &&
    canAccessIframeDocument(iframe) &&
    // Robust content check (#root populated / real app shell), not just "body has children"
    // so a blank-but-loaded shell is treated as stale, not usable.
    isIframePreviewContentReady(iframe) &&
    !isIframePreviewErrorPage(iframe)
  );
}

/**
 * True when post-turn refresh can skip a soft iframe reload (confirmed remount/HMR only).
 * @param {{ mode?: string, status?: string } | null | undefined} syncResult
 */
export function shouldSkipPostTurnSoftReload(syncResult) {
  if (!syncResult || typeof syncResult !== "object") return false;
  const mode = typeof syncResult.mode === "string" ? syncResult.mode.trim() : "";
  if (mode === "remount") return true;
  if (mode === "hmr") {
    const status = typeof syncResult.status === "string" ? syncResult.status.trim() : "";
    return CONFIRMED_EMBED_HMR_STATUSES.has(status);
  }
  return false;
}

/**
 * Decide the post-turn preview action.
 *
 * For dev-preview projects the BACKEND already syncs the workspace and Vite hot-applies the
 * change to the connected embed during the merge finalize (the registry outcome is reset on
 * every follow-up, so a known `backendRefreshMode` here belongs to THIS turn):
 *   - "none": nothing changed → leave the preview alone.
 *   - "hmr": the live dev server already hot-applied it. If the embed HMR socket is healthy,
 *     do nothing (no re-sync, no disconnect). If the socket is down it likely missed the
 *     update → soft reload to resync.
 *   - "restart": the dev server restarted → soft reload so the embed reconnects.
 *   - "full" / unknown (no fresh backend outcome, e.g. static-build projects): run the
 *     authoritative frontend sync as a fallback.
 *
 * Returns `{ refreshMode }` (or the sync result for the "full" path) so callers can log copy.
 * @param {object} deps
 * @returns {Promise<{ ok?: boolean, mode?: string, status?: string, refreshMode?: string } | null>}
 */
export async function refreshPreviewAfterAgentTurn(deps) {
  const {
    iframeSrc,
    previewPort,
    previewIframeRef,
    previewRefreshBusyRef,
    devPreviewEmbedHmr,
    embedHmrWsState,
    syncAndRefreshPreview,
    softReloadPreviewIframe,
    openDevEmbedGate,
    setPreviewIframeReady,
    setPreviewIframeLoadMessage,
    setDevEmbedSessionLive,
    backendRefreshMode = "full",
    requireIframeReload = false,
  } = deps;

  if (!iframeSrc) return null;

  if (backendRefreshMode === "none") {
    auditPreviewPipeline("agent-turn", "post-turn preview unchanged (backend none)", {
      previewPort,
      ok: true,
    });
    return { refreshMode: "none" };
  }

  // Dev-preview (live HMR): the backend already synced the workspace and Vite hot-applies the
  // change to the connected embed (or the embed reloads itself on reconnect). NEVER run the heavy
  // frontend re-sync here — that fully reloads the preview, which is exactly what we want to
  // avoid. Only soft-reload when the dev server restarted or the embed socket is down (so it may
  // have missed the update).
  if (devPreviewEmbedHmr) {
    const wsHealthy = embedHmrWsState !== "failed" && embedHmrWsState !== "exhausted";
    if (backendRefreshMode === "restart") {
      auditPreviewPipeline("agent-turn", "post-turn soft reload (backend dev restart)", {
        previewPort,
        pending: true,
      });
      await softReloadPreviewIframe();
      return { refreshMode: "restart" };
    }
    if (!wsHealthy) {
      auditPreviewPipeline("agent-turn", "post-turn soft reload (HMR socket unhealthy)", {
        previewPort,
        pending: true,
      });
      await softReloadPreviewIframe();
      return { refreshMode: "hmr" };
    }
    // Healthy socket + hmr/unknown → Vite already applied, unless the iframe is blank/error.
    if (!previewStillUsable(previewIframeRef)) {
      auditPreviewPipeline(
        "agent-turn",
        "post-turn HMR mode but iframe blank/error — soft remount once",
        { previewPort, pending: true },
      );
      await softReloadPreviewIframe();
      return { refreshMode: "hmr" };
    }
    auditPreviewPipeline("agent-turn", "post-turn HMR handled by live dev server", {
      previewPort,
      ok: true,
    });
    setPreviewIframeReady(true);
    setPreviewIframeLoadMessage("");
    setDevEmbedSessionLive(true);
    openDevEmbedGate("");
    return { refreshMode: "hmr" };
  }

  // Non-dev-preview (static build, no live HMR).
  if (backendRefreshMode === "restart") {
    auditPreviewPipeline("agent-turn", "post-turn soft reload (backend dev restart)", {
      previewPort,
      pending: true,
    });
    await softReloadPreviewIframe();
    return { refreshMode: "restart" };
  }

  if (!deps.skipPostTurnWait) {
    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, POST_TURN_SYNC_WAIT_MS);
    });
  }

  auditPreviewPipeline("agent-turn", "post-turn preview sync + reload", {
    previewPort,
    pending: true,
  });

  if (previewRefreshBusyRef.current) {
    if (previewStillUsable(previewIframeRef)) {
      auditPreviewPipeline("agent-turn", "post-turn skip reload (busy, preview ready)", {
        previewPort,
        ok: true,
      });
      return null;
    }
    await softReloadPreviewIframe();
    return null;
  }

  let syncResult = null;
  let syncFailed = false;
  try {
    syncResult = await syncAndRefreshPreview({
      skipLiveBuild: false,
      waitForHmr: true,
      requireIframeReload,
    });
  } catch {
    syncFailed = true;
  }

  const refreshMode =
    syncResult && typeof syncResult.refreshMode === "string" ? syncResult.refreshMode.trim() : "";
  const syncMode = syncResult && typeof syncResult.mode === "string" ? syncResult.mode.trim() : "";

  // Nothing changed on disk → no reload needed (single-line edits that touched no synced file,
  // ask turns, etc.). The workspace sync already ran, so this is authoritative.
  if (!syncFailed && (refreshMode === "none" || syncMode === "noop")) {
    auditPreviewPipeline("agent-turn", "post-turn preview unchanged (no sync needed)", {
      previewPort,
      ok: true,
    });
    return syncResult;
  }

  if (shouldSkipPostTurnSoftReload(syncResult)) {
    // A confirmed remount always reflects the latest workspace. A confirmed HMR usually does
    // too, but a hot update can occasionally leave the app blank/broken (missed module) — in
    // that case fall back to a soft reload so the user never sees stale/empty content.
    if (syncResult.mode === "remount" || previewStillUsable(previewIframeRef)) {
      auditPreviewPipeline("agent-turn", `post-turn preview sync complete (${syncResult.mode})`, {
        previewPort,
        ok: true,
      });
      return syncResult;
    }
    auditPreviewPipeline(
      "agent-turn",
      `post-turn HMR confirmed but content not ready (${syncResult.status || "?"}), soft reloading`,
      { previewPort, pending: true },
    );
    await softReloadPreviewIframe();
    return syncResult;
  }

  const syncStatus =
    syncResult && typeof syncResult.status === "string" ? syncResult.status.trim() : "";
  const shouldSoftReloadImmediately =
    syncFailed ||
    syncMode === "needs_soft_reload" ||
    refreshMode === "restart" ||
    (syncMode === "hmr" && !CONFIRMED_EMBED_HMR_STATUSES.has(syncStatus));

  if (!shouldSoftReloadImmediately) {
    const hmrWsHealthy =
      devPreviewEmbedHmr && embedHmrWsState !== "failed" && embedHmrWsState !== "exhausted";

    if (hmrWsHealthy) {
      const hmrResult = await waitForEmbedHmrUpdate({
        port: previewPort,
        settleMs: 400,
        timeoutMs: 6000,
      });
      if (hmrResult.ok && CONFIRMED_EMBED_HMR_STATUSES.has(hmrResult.status)) {
        auditPreviewPipeline("agent-turn", `post-turn in-place update (${hmrResult.status})`, {
          previewPort,
          ok: true,
        });
        setPreviewIframeReady(true);
        setPreviewIframeLoadMessage("");
        if (devPreviewEmbedHmr) {
          setDevEmbedSessionLive(true);
          openDevEmbedGate("");
        }
        return syncResult;
      }
    }
  }

  auditPreviewPipeline(
    "agent-turn",
    syncFailed
      ? "post-turn soft reload after sync failure"
      : "post-turn soft reload (HMR not confirmed)",
    { previewPort, pending: true },
  );
  await softReloadPreviewIframe();
  return syncResult;
}

export { previewStillUsable, POST_TURN_SYNC_WAIT_MS };
