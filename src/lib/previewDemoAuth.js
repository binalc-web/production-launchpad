/** Standard LaunchPad preview demo login (mirrors backend previewDemoAuth.constants.js). */

export const PREVIEW_DEMO_PASSWORD = "password123";

export const PREVIEW_DEMO_CREDENTIALS = Object.freeze([
  Object.freeze({ role: "admin", email: "admin@example.com", password: PREVIEW_DEMO_PASSWORD }),
  Object.freeze({
    role: "manager",
    email: "manager@example.com",
    password: PREVIEW_DEMO_PASSWORD,
  }),
  Object.freeze({ role: "user", email: "user@example.com", password: PREVIEW_DEMO_PASSWORD }),
]);

/** @returns {string} */
export function formatPreviewDemoAuthUiHint() {
  const emails = PREVIEW_DEMO_CREDENTIALS.map((c) => c.email).join(", ");
  return `Preview login: ${emails} — password ${PREVIEW_DEMO_PASSWORD}`;
}
