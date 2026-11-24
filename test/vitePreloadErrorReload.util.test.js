import test from "node:test";
import assert from "node:assert/strict";
import {
  attachVitePreloadErrorReload,
  shouldReloadForVitePreloadError,
  staleChunkImportMessage,
} from "../src/lib/vitePreloadErrorReload.util.js";

function memoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (key) => (Object.hasOwn(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
  };
}

test("shouldReloadForVitePreloadError reloads once per session", () => {
  const storage = memoryStorage();
  assert.equal(shouldReloadForVitePreloadError(storage), true);
  assert.equal(shouldReloadForVitePreloadError(storage), false);
});

test("staleChunkImportMessage asks to refresh on missing dynamic chunk", () => {
  const err = new TypeError(
    "Failed to fetch dynamically imported module: https://launchpad.yorkdevs.link/assets/jspdf.es.min-qLv-qWmd.js",
  );
  assert.equal(
    staleChunkImportMessage(err),
    "This page is out of date. Refresh and try again.",
  );
});

test("staleChunkImportMessage keeps other errors", () => {
  assert.equal(staleChunkImportMessage(new Error("Nothing to export.")), "Nothing to export.");
});

test("attachVitePreloadErrorReload reloads once then leaves later errors", () => {
  const storage = memoryStorage();
  let reloads = 0;
  const listeners = [];
  const target = {
    sessionStorage: storage,
    location: { reload: () => { reloads += 1; } },
    addEventListener(_name, fn) {
      listeners.push(fn);
    },
  };
  attachVitePreloadErrorReload(target);
  const first = { preventDefault() { first.prevented = true; } };
  listeners[0](first);
  assert.equal(reloads, 1);
  assert.equal(first.prevented, true);
  const second = { preventDefault() { second.prevented = true; } };
  listeners[0](second);
  assert.equal(reloads, 1);
  assert.equal(second.prevented, undefined);
});
