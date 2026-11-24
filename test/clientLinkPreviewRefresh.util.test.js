import test from "node:test";
import assert from "node:assert/strict";
import {
  refreshPreviewAfterAgentTurn,
  shouldSkipPostTurnSoftReload,
} from "../src/lib/clientLinkPreviewRefreshAfterTurn.util.js";

function usablePreviewIframe() {
  return {
    contentDocument: {
      documentElement: {
        outerHTML: '<html><body><div id="root"><main>ok</main></div></body></html>',
      },
      body: { innerText: "ok", textContent: "ok", childElementCount: 1 },
      getElementById: (id) => (id === "root" ? { childElementCount: 1, textContent: "ok" } : null),
      querySelector: () => null,
    },
  };
}

function blankPreviewIframe() {
  const html = `<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/@vite/client"></script></body></html>`;
  return {
    contentDocument: {
      documentElement: { outerHTML: html },
      body: { innerText: "", textContent: "", childElementCount: 1 },
      getElementById: (id) => (id === "root" ? { childElementCount: 0, textContent: "" } : null),
      querySelector: () => null,
    },
  };
}

const baseDeps = {
  iframeSrc: "/embedded/3000/",
  skipPostTurnWait: true,
  previewPort: 3000,
  previewIframeRef: { current: usablePreviewIframe() },
  previewRefreshBusyRef: { current: false },
  devPreviewEmbedHmr: true,
  embedHmrWsState: "connected",
  openDevEmbedGate: () => {},
  setPreviewIframeReady: () => {},
  setPreviewIframeLoadMessage: () => {},
  setDevEmbedSessionLive: () => {},
};

test("refreshPreviewAfterAgentTurn skips when iframe src missing", async () => {
  let syncCalled = false;
  await refreshPreviewAfterAgentTurn({
    iframeSrc: null,
    syncAndRefreshPreview: async () => {
      syncCalled = true;
      return { mode: "hmr", status: "hmr-update" };
    },
  });
  assert.equal(syncCalled, false);
});

test("shouldSkipPostTurnSoftReload accepts confirmed hmr statuses only", () => {
  assert.equal(shouldSkipPostTurnSoftReload({ mode: "remount" }), true);
  assert.equal(shouldSkipPostTurnSoftReload({ mode: "hmr", status: "hmr-update" }), true);
  assert.equal(shouldSkipPostTurnSoftReload({ mode: "hmr", status: "full-reload" }), true);
  assert.equal(shouldSkipPostTurnSoftReload({ mode: "hmr", status: "iframe-still-ready" }), false);
  assert.equal(shouldSkipPostTurnSoftReload({ mode: "hmr" }), false);
  assert.equal(shouldSkipPostTurnSoftReload({ mode: "noop" }), false);
  assert.equal(shouldSkipPostTurnSoftReload(null), false);
});

test("refreshPreviewAfterAgentTurn skips soft reload on confirmed hmr sync", async () => {
  let reloadCalled = false;
  await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    syncAndRefreshPreview: async () => ({
      mode: "hmr",
      status: "hmr-update",
    }),
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(reloadCalled, false);
});

test("refreshPreviewAfterAgentTurn does not soft reload on noop sync result (static build)", async () => {
  let reloadCalled = false;
  await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    devPreviewEmbedHmr: false,
    syncAndRefreshPreview: async () => ({ mode: "noop" }),
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(reloadCalled, false);
});

test("refreshPreviewAfterAgentTurn soft reloads on iframe-still-ready (static build)", async () => {
  let reloadCalled = false;
  await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    devPreviewEmbedHmr: false,
    syncAndRefreshPreview: async () => ({
      mode: "hmr",
      status: "iframe-still-ready",
    }),
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(reloadCalled, true);
});

test("refreshPreviewAfterAgentTurn soft reloads when sync throws (static build)", async () => {
  let reloadCalled = false;
  await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    devPreviewEmbedHmr: false,
    syncAndRefreshPreview: async () => {
      throw new Error("sync failed");
    },
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(reloadCalled, true);
});

test("refreshPreviewAfterAgentTurn passes requireIframeReload to sync (static build)", async () => {
  let capturedRequireReload = null;
  await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    devPreviewEmbedHmr: false,
    requireIframeReload: true,
    syncAndRefreshPreview: async (opts) => {
      capturedRequireReload = opts?.requireIframeReload;
      return { mode: "needs_soft_reload", refreshMode: "restart" };
    },
    softReloadPreviewIframe: async () => {},
  });
  assert.equal(capturedRequireReload, true);
});

test("refreshPreviewAfterAgentTurn runs the authoritative sync for full mode (static build)", async () => {
  let syncCalled = false;
  await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    devPreviewEmbedHmr: false,
    backendRefreshMode: "full",
    syncAndRefreshPreview: async () => {
      syncCalled = true;
      return { mode: "hmr", status: "hmr-update", refreshMode: "hmr" };
    },
    softReloadPreviewIframe: async () => {},
  });
  assert.equal(syncCalled, true);
});

test("refreshPreviewAfterAgentTurn never re-syncs dev-preview, even for unknown/full mode", async () => {
  let syncCalled = false;
  let reloadCalled = false;
  const result = await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    backendRefreshMode: "full",
    embedHmrWsState: "connected",
    syncAndRefreshPreview: async () => {
      syncCalled = true;
      return { mode: "needs_soft_reload" };
    },
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(syncCalled, false);
  assert.equal(reloadCalled, false);
  assert.equal(result?.refreshMode, "hmr");
});

test("refreshPreviewAfterAgentTurn skips re-sync + reload when backend already did hmr", async () => {
  let syncCalled = false;
  let reloadCalled = false;
  const result = await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    backendRefreshMode: "hmr",
    embedHmrWsState: "connected",
    syncAndRefreshPreview: async () => {
      syncCalled = true;
      return { mode: "hmr" };
    },
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(syncCalled, false);
  assert.equal(reloadCalled, false);
  assert.equal(result?.refreshMode, "hmr");
});

test("refreshPreviewAfterAgentTurn soft remounts when hmr mode but iframe blank", async () => {
  let reloadCalled = false;
  const result = await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    previewIframeRef: { current: blankPreviewIframe() },
    backendRefreshMode: "hmr",
    embedHmrWsState: "connected",
    syncAndRefreshPreview: async () => ({ mode: "hmr" }),
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(reloadCalled, true);
  assert.equal(result?.refreshMode, "hmr");
});

test("refreshPreviewAfterAgentTurn soft reloads for backend hmr when socket is down", async () => {
  let syncCalled = false;
  let reloadCalled = false;
  await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    backendRefreshMode: "hmr",
    embedHmrWsState: "failed",
    syncAndRefreshPreview: async () => {
      syncCalled = true;
      return { mode: "hmr" };
    },
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(syncCalled, false);
  assert.equal(reloadCalled, true);
});

test("refreshPreviewAfterAgentTurn does nothing when backend reports none", async () => {
  let syncCalled = false;
  let reloadCalled = false;
  const result = await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    backendRefreshMode: "none",
    syncAndRefreshPreview: async () => {
      syncCalled = true;
      return { mode: "noop", refreshMode: "none" };
    },
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(syncCalled, false);
  assert.equal(reloadCalled, false);
  assert.equal(result?.refreshMode, "none");
});

test("refreshPreviewAfterAgentTurn soft reloads when backend reports restart", async () => {
  let syncCalled = false;
  let reloadCalled = false;
  await refreshPreviewAfterAgentTurn({
    ...baseDeps,
    backendRefreshMode: "restart",
    syncAndRefreshPreview: async () => {
      syncCalled = true;
      return { mode: "needs_soft_reload", refreshMode: "restart" };
    },
    softReloadPreviewIframe: async () => {
      reloadCalled = true;
    },
  });
  assert.equal(syncCalled, false);
  assert.equal(reloadCalled, true);
});
