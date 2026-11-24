/**
 * The apps that sign in through the browser ("device login"): the login page opens with
 * `?state=<writeKey>&client=<id>`, the person signs in, approves, and the page hands the key and
 * their session to the backend, which the app picks up by polling.
 *
 * One place describes each client so the login page and the OAuth callback page don't each carry
 * their own copy. `figma` is the default for a `state` without a `client` (the plugin never sent
 * one).
 */

export const DEFAULT_DESKTOP_CLIENT = "figma";

export const DESKTOP_CLIENTS = {
  figma: {
    id: "figma",
    label: "Figma",
    sessionKey: "hub_oauth_figma_state",
    signInPrompt: "Sign in to connect your Figma plugin.",
    failure: "Failed to connect to Figma.",
    /** Whether the app receives the person's whole LaunchPad session (the consent says so). */
    fullAccess: true,
  },
  "qa-automation": {
    id: "qa-automation",
    label: "QA Automation",
    sessionKey: "hub_oauth_qa_state",
    signInPrompt: "Sign in to connect QA Automation.",
    failure: "Failed to connect to QA Automation.",
    fullAccess: true,
  },
  "preview-desktop": {
    id: "preview-desktop",
    label: "Preview Desktop",
    sessionKey: "hub_oauth_preview_desktop_state",
    signInPrompt: "Sign in to connect Preview Desktop.",
    failure: "Failed to connect to Preview Desktop.",
    fullAccess: true,
  },
  figcraft: {
    id: "figcraft",
    label: "FigCraft",
    sessionKey: "hub_oauth_figcraft_state",
    signInPrompt: "Sign in to connect FigCraft.",
    failure: "Failed to connect to FigCraft.",
    // FigCraft gets its own limited token (name, email and the FigCraft routes only), never the
    // session itself.
    fullAccess: false,
  },
};

/** The client for a `client` query value; unknown or missing means the Figma plugin. */
export function desktopClientFor(param) {
  const id = typeof param === "string" ? param.trim() : "";
  return Object.hasOwn(DESKTOP_CLIENTS, id)
    ? DESKTOP_CLIENTS[id]
    : DESKTOP_CLIENTS[DEFAULT_DESKTOP_CLIENT];
}

/**
 * What the page was opened for: `{ state, client }` (client id), or `{ state: null, client: null }`
 * for an ordinary login (a `client` without a `state` is not a device login).
 */
export function readDesktopOAuthFromSearch(search) {
  const params = new URLSearchParams(search || "");
  const state = params.get("state")?.trim() || null;
  if (!state) return { state: null, client: null };
  return { state, client: desktopClientFor(params.get("client")).id };
}

/**
 * A person who is already signed in, opening an ordinary /login, goes straight to the app.
 * A device login (`?state=`) must stay on this page so they can approve it. Read the URL itself:
 * React state that starts empty would send them away before the approval is visible, and the
 * desktop app would poll forever.
 */
export function shouldReturnSignedInUserHome(user, search) {
  if (!user) return false;
  return !readDesktopOAuthFromSearch(search).state;
}

/** What the consent page tells the person the app will be able to do. */
export function consentDescription(client, accountEmail) {
  const { label, fullAccess } = desktopClientFor(client?.id ?? client);
  const who = accountEmail ? ` (${accountEmail})` : "";
  return fullAccess
    ? `${label} will get full access to your LaunchPad account${who}.`
    : `${label} will be able to see your name and email${who} and use your LaunchPad projects on your behalf. It never receives your LaunchPad password or session.`;
}

function sessionStore(storage) {
  if (storage) return storage;
  return typeof sessionStorage === "undefined" ? null : sessionStorage;
}

/**
 * Remember the pending device login across the Google round trip (a full page redirect): exactly
 * one client's key is kept, so a stale one from another app can't be completed by mistake.
 */
export function stashPendingDesktopState(client, state, storage) {
  const store = sessionStore(storage);
  if (!store) return;
  for (const c of Object.values(DESKTOP_CLIENTS)) store.removeItem(c.sessionKey);
  if (state && client) store.setItem(desktopClientFor(client).sessionKey, state);
}

/** The device login stashed before the round trip, if any; clears every key either way. */
export function takePendingDesktopState(storage) {
  const store = sessionStore(storage);
  if (!store) return null;
  let found = null;
  for (const c of Object.values(DESKTOP_CLIENTS)) {
    const state = store.getItem(c.sessionKey);
    store.removeItem(c.sessionKey);
    // Stashing keeps one key, so at most one is set; if another tab left a second, the later
    // client in the registry wins (deterministic) and both keys are cleared.
    if (state) found = { client: c.id, state };
  }
  return found;
}
