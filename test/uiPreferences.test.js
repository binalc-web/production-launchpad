import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUiPreferenceScope,
  readUiPreferences,
  uiPreferencesStorageKey,
  validatePreference,
  validatePreferencesBlob,
  writeUiPreferences,
} from "../src/lib/uiPreferences.js";

/** Minimal localStorage mock for preference tests. */
function withLocalStorage(run) {
  const store = new Map();
  const previous = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, String(value));
      },
      removeItem: (key) => {
        store.delete(key);
      },
    },
  };
  try {
    run(store);
  } finally {
    if (previous === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previous;
    }
  }
}

test("buildUiPreferenceScope resolves global, project, and client-link scopes", () => {
  assert.equal(buildUiPreferenceScope(), "global");
  assert.equal(buildUiPreferenceScope({ projectId: 42 }), "project:42");
  assert.equal(buildUiPreferenceScope({ clientLinkSlug: "acme" }), "client-link:acme");
});

test("uiPreferencesStorageKey prefixes scope", () => {
  assert.equal(uiPreferencesStorageKey("global"), "launchpad:ui:global");
  assert.equal(uiPreferencesStorageKey("project:7"), "launchpad:ui:project:7");
});

test("validatePreference falls back on invalid enum", () => {
  assert.equal(
    validatePreference("bad", { defaultValue: "newest", allowed: ["newest", "name"] }),
    "newest",
  );
  assert.equal(
    validatePreference("name", { defaultValue: "newest", allowed: ["newest", "name"] }),
    "name",
  );
});

test("validatePreference coerces booleans and numbers", () => {
  assert.equal(validatePreference("true", { defaultValue: false, type: "boolean" }), true);
  assert.equal(validatePreference("nope", { defaultValue: false, type: "boolean" }), false);
  assert.equal(validatePreference(3, { defaultValue: 1, type: "number", min: 1, max: 10 }), 3);
  assert.equal(validatePreference(99, { defaultValue: 1, type: "number", min: 1, max: 10 }), 1);
});

test("writeUiPreferences merges and readUiPreferences validates", () => {
  const schema = {
    sort: { defaultValue: "newest", allowed: ["newest", "name"] },
    searchTerm: { defaultValue: "", type: "string" },
    showInactive: { defaultValue: false, type: "boolean" },
  };

  withLocalStorage((store) => {
    writeUiPreferences("global", { sort: "name", searchTerm: "alpha" });
    writeUiPreferences("global", { showInactive: true });
    assert.deepEqual(readUiPreferences("global", schema), {
      sort: "name",
      searchTerm: "alpha",
      showInactive: true,
    });
    assert.ok(store.has("launchpad:ui:global"));
  });
});

test("validatePreferencesBlob handles corrupt stored values", () => {
  const schema = { page: { defaultValue: 1, type: "number", min: 1 } };
  assert.deepEqual(validatePreferencesBlob({ page: "bad" }, schema), { page: 1 });
});
