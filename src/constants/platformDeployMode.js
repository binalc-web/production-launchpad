/** Public health `deploy_mode` values from GET /api/health. */
export const PLATFORM_DEPLOY_MODE = Object.freeze({
  NORMAL: "normal",
  PREPARING: "preparing",
  READY: "ready",
});

/** Shown in banners and disabled UI for non-admin users. */
export const PLATFORM_MAINTENANCE_TITLE = "Platform is under maintenance";

/** Shown in banners and disabled UI for non-admin users. */
export const PLATFORM_MAINTENANCE_USER_MESSAGE = "Please wait a few minutes and try again.";

/** Shown when prompts are blocked during prepare. */
export const PLATFORM_PREPARE_PROMPT_BLOCKED_MESSAGE =
  "Platform is under maintenance. Please wait a few minutes and try again.";

/** Shown when manual automations are blocked during prepare. */
export const PLATFORM_PREPARE_AUTOMATION_BLOCKED_MESSAGE =
  "Platform is under maintenance. Please wait a few minutes and try again.";

/**
 * @param {string|null|undefined} mode
 */
export function isPlatformDeployModeBlocking(mode) {
  return mode === PLATFORM_DEPLOY_MODE.PREPARING || mode === PLATFORM_DEPLOY_MODE.READY;
}
