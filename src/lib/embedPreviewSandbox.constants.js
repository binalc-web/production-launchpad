/**
 * Sandbox for project preview iframes (`/embedded/:port/` on the LaunchPad origin).
 *
 * `allow-same-origin` is required: the embed proxy is same-origin with LaunchPad, and
 * without this flag the iframe is opaque — `sessionStorage`/`localStorage` throw
 * (breaking preview sign-in), and the parent cannot use `contentDocument` (picker,
 * comments, session restore).
 *
 * Trade-off: preview JS can read LaunchPad origin storage. True isolation needs a
 * separate embed origin (not omitting `allow-same-origin` on this proxy).
 */
export const UNTRUSTED_PREVIEW_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-modals";
