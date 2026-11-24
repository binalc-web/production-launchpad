import test from "node:test";
import assert from "node:assert/strict";
import {
  DESKTOP_CLIENTS,
  consentDescription,
  desktopClientFor,
  readDesktopOAuthFromSearch,
  shouldReturnSignedInUserHome,
  stashPendingDesktopState,
  takePendingDesktopState,
} from "../src/pages/Authentication/desktopConnectClients.util.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
    keys: () => [...data.keys()],
  };
}

test("each client has its own label, prompt, failure text and session key", () => {
  const keys = Object.values(DESKTOP_CLIENTS).map((c) => c.sessionKey);
  assert.equal(new Set(keys).size, keys.length, "session keys are unique");
  assert.equal(DESKTOP_CLIENTS.figcraft.label, "FigCraft");
  assert.equal(DESKTOP_CLIENTS.figcraft.signInPrompt, "Sign in to connect FigCraft.");
  assert.equal(DESKTOP_CLIENTS.figcraft.failure, "Failed to connect to FigCraft.");
  // The existing clients keep their exact wording and storage keys.
  assert.equal(DESKTOP_CLIENTS.figma.sessionKey, "hub_oauth_figma_state");
  assert.equal(DESKTOP_CLIENTS["qa-automation"].sessionKey, "hub_oauth_qa_state");
  assert.equal(DESKTOP_CLIENTS.figma.signInPrompt, "Sign in to connect your Figma plugin.");
});

test("a missing or unknown client is the Figma plugin, like before", () => {
  for (const value of [undefined, null, "", "figma", "FIGCRAFT", "constructor", "__proto__", 7]) {
    assert.equal(desktopClientFor(value).id, "figma", String(value));
  }
  assert.equal(desktopClientFor("figcraft").id, "figcraft");
  assert.equal(desktopClientFor(" qa-automation ").id, "qa-automation");
});

test("the URL says which app is signing in, and nothing without a state", () => {
  assert.deepEqual(readDesktopOAuthFromSearch("?state=abc&client=figcraft"), {
    state: "abc",
    client: "figcraft",
  });
  assert.deepEqual(readDesktopOAuthFromSearch("?state=abc&client=qa-automation"), {
    state: "abc",
    client: "qa-automation",
  });
  assert.deepEqual(readDesktopOAuthFromSearch("?state=abc"), { state: "abc", client: "figma" });
  assert.deepEqual(readDesktopOAuthFromSearch("?state=%20abc%20&client=bogus"), {
    state: "abc",
    client: "figma",
  });
  for (const search of ["", "?client=figcraft", "?state=", "?state=%20%20", undefined]) {
    assert.deepEqual(
      readDesktopOAuthFromSearch(search),
      { state: null, client: null },
      String(search),
    );
  }
});

test("an already signed-in person stays on a device login and leaves an ordinary one", () => {
  const user = { email: "a@b.co" };
  assert.equal(shouldReturnSignedInUserHome(user, "?state=write-key&client=figcraft"), false);
  assert.equal(shouldReturnSignedInUserHome(user, "?state=write-key"), false);
  assert.equal(shouldReturnSignedInUserHome(user, ""), true);
  assert.equal(shouldReturnSignedInUserHome(user, "?client=figcraft"), true);
  assert.equal(shouldReturnSignedInUserHome(null, "?state=write-key&client=figcraft"), false);
});

test("the FigCraft consent states its narrower access; the others keep full access", () => {
  const figcraft = consentDescription("figcraft", "a@b.co");
  assert.match(figcraft, /FigCraft will be able to see your name and email \(a@b\.co\)/);
  assert.doesNotMatch(figcraft, /full access/);
  assert.match(figcraft, /never receives your LaunchPad password or session/);
  assert.match(consentDescription(DESKTOP_CLIENTS.figcraft), /name and email and use/);
  assert.equal(
    consentDescription("figma", "a@b.co"),
    "Figma will get full access to your LaunchPad account (a@b.co).",
  );
  assert.equal(
    consentDescription("qa-automation"),
    "QA Automation will get full access to your LaunchPad account.",
  );
});

test("a pending sign-in survives the Google round trip once, for one client", () => {
  const store = memoryStorage();
  stashPendingDesktopState("figcraft", "key-1", store);
  assert.deepEqual(takePendingDesktopState(store), { client: "figcraft", state: "key-1" });
  assert.equal(takePendingDesktopState(store), null, "taken once");
  assert.deepEqual(store.keys(), []);
});

test("starting another app's sign-in drops the earlier one's key", () => {
  const store = memoryStorage();
  stashPendingDesktopState("qa-automation", "old", store);
  stashPendingDesktopState("figcraft", "new", store);
  assert.deepEqual(store.keys(), [DESKTOP_CLIENTS.figcraft.sessionKey]);
  assert.deepEqual(takePendingDesktopState(store), { client: "figcraft", state: "new" });
});

test("an ordinary login (or a failed start) clears every pending key", () => {
  const store = memoryStorage();
  stashPendingDesktopState("figma", "k", store);
  stashPendingDesktopState(null, null, store);
  assert.deepEqual(store.keys(), []);
  assert.equal(takePendingDesktopState(store), null);
});

test("keys left behind by several tabs are all cleared and one wins deterministically", () => {
  const store = memoryStorage();
  store.setItem(DESKTOP_CLIENTS.figma.sessionKey, "f");
  store.setItem(DESKTOP_CLIENTS.figcraft.sessionKey, "c");
  assert.deepEqual(takePendingDesktopState(store), { client: "figcraft", state: "c" });
  assert.deepEqual(store.keys(), []);
});

test("without any storage the helpers do nothing instead of throwing", (t) => {
  // Newer Node versions ship a global sessionStorage; take it away for this test.
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { value: undefined, configurable: true });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else delete globalThis.sessionStorage;
  });
  assert.doesNotThrow(() => stashPendingDesktopState("figcraft", "k"));
  assert.equal(takePendingDesktopState(), null);
});
