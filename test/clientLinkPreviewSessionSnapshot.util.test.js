import test from "node:test";
import assert from "node:assert/strict";
import {
  restoreSessionStorage,
  snapshotSessionStorage,
  stageIframeSessionRestore,
  buildEmbedSessionRestoreStorageKey,
  clearStagedSessionRestore,
  EMBED_SESSION_RESTORE_LS_PREFIX,
  STAGED_IFRAME_SESSION_KEY,
  STAGED_IFRAME_LOCAL_KEY,
  restoreIframeStagedStorage,
  isIframeStagedStorageBundle,
  bumpEmbedIframeLocationInPlace,
} from "../src/lib/clientLinkPreviewSessionSnapshot.util.js";

function makeMockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(index) {
      return [...map.keys()][index] ?? null;
    },
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

test("snapshotSessionStorage captures all key/value pairs", () => {
  const storage = makeMockStorage({
    token: "abc",
    "ui.tab": "billing",
  });
  assert.deepEqual(snapshotSessionStorage(storage), {
    token: "abc",
    "ui.tab": "billing",
  });
});

test("restoreSessionStorage round-trips snapshot", () => {
  const storage = makeMockStorage();
  const snapshot = { token: "xyz", step: "2" };
  assert.equal(restoreSessionStorage(storage, snapshot), true);
  assert.equal(storage.getItem("token"), "xyz");
  assert.equal(storage.getItem("step"), "2");
});

test("snapshotSessionStorage returns empty object for null storage", () => {
  assert.deepEqual(snapshotSessionStorage(null), {});
});

test("restoreSessionStorage returns false for invalid input", () => {
  const storage = makeMockStorage();
  assert.equal(restoreSessionStorage(storage, null), false);
});

test("buildEmbedSessionRestoreStorageKey includes port", () => {
  assert.equal(
    buildEmbedSessionRestoreStorageKey(8010),
    `${EMBED_SESSION_RESTORE_LS_PREFIX}8010`,
  );
});

test("stageIframeSessionRestore writes session + local bundle to localStorage", () => {
  const sessionStorage = makeMockStorage({ token: "abc" });
  const iframeLocalStorage = makeMockStorage({ auth: "jwt" });
  const iframe = {
    contentWindow: {
      sessionStorage,
      localStorage: iframeLocalStorage,
    },
  };
  const ls = makeMockStorage();
  const originalLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
  });
  try {
    assert.equal(stageIframeSessionRestore(8010, iframe), true);
    const key = buildEmbedSessionRestoreStorageKey(8010);
    const parsed = JSON.parse(ls.getItem(key));
    assert.equal(isIframeStagedStorageBundle(parsed), true);
    assert.deepEqual(parsed[STAGED_IFRAME_SESSION_KEY], { token: "abc" });
    assert.deepEqual(parsed[STAGED_IFRAME_LOCAL_KEY], { auth: "jwt" });
    clearStagedSessionRestore(8010);
    assert.equal(ls.getItem(key), null);
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
    });
  }
});

test("bumpEmbedIframeLocationInPlace keeps pathname and bumps _pv", () => {
  const sessionStorage = makeMockStorage({ token: "abc" });
  let replaced = "";
  const iframe = {
    contentDocument: { body: {} },
    contentWindow: {
      sessionStorage,
      localStorage: makeMockStorage(),
      location: {
        pathname: "/embedded/8010/",
        search: "?embed_frame=1&embed_port=8010&_pv=1",
        hash: "",
        replace(url) {
          replaced = url;
        },
        reload() {
          replaced = "reload";
        },
      },
    },
  };
  assert.equal(bumpEmbedIframeLocationInPlace(iframe, 8010), true);
  assert.equal(replaced, "/embedded/8010/?embed_frame=1&embed_port=8010&_pv=2");
});

test("restoreIframeStagedStorage supports legacy flat session snapshots", () => {
  const sessionStorage = makeMockStorage();
  const iframe = {
    contentWindow: { sessionStorage, localStorage: makeMockStorage() },
  };
  assert.equal(restoreIframeStagedStorage(iframe, { token: "legacy" }), true);
  assert.equal(sessionStorage.getItem("token"), "legacy");
});
