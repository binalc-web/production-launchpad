/** User-facing copy for the three client-link preview recovery actions. */

/** Primary (3.5s): show “taking longer than expected” copy and enable Reload via previewLoadStuckRecoveryAvailable. */
export const PREVIEW_RELOAD_SERVER_STUCK_HINT_DELAY_MS = 3500;

/** Backup (2min): enable Reload via previewReloadActionEnabled if the 5s path did not fire. */
export const PREVIEW_RELOAD_SERVER_ENABLE_DELAY_MS = 2 * 60 * 1000;

/** Abort heavy refresh-build sync and fall back to iframe remount. */
export const PREVIEW_REFRESH_BUILD_TIMEOUT_MS = 120 * 1000;

export { PREVIEW_CONTENT_LOAD_MESSAGES } from "./clientLinkPreviewContentLoad.util";

/** Show Restart agent manually if the first version still is not saved after this delay. */
export const PREVIEW_RESTART_AGENT_STUCK_DELAY_MS = 2 * 60 * 1000;

export const CLIENT_LINK_FIRST_VERSION_BUILD = {
  bannerTitle: "AI agent is working",
  loaderTitle: "Creating your first version",
  loaderIntro:
    "The AI agent is building your project and starting the preview. This usually takes a few minutes on first run.",
  chatLockedHint: "AI Chat opens after the first version is saved. You can watch progress here.",
  autoStarting: "Starting the AI agent…",
  autoRestarting: "Restarting the AI agent…",
  failedTitle: "Could not start your build",
  timedOutTitle: "Setup is taking too long",
  timedOutMessage:
    "The first version has not been created yet. Try reloading the preview server or restarting the agent.",
  autoSettledMessage:
    "Automatic setup did not finish. Try the recovery options below or contact your Launchpad team.",
  supportLabel: "Contact Launchpad team",
  supportHint: "Share this project link and what you tried with your Launchpad product team.",
  updateEmailLabel: "Update email",
};

/** Preview overlay while chat/onboard agent is active instead of "Start Server". */
export const CLIENT_LINK_AGENT_WORKING_OVERLAY = {
  title: "AI agent is working",
  fallbackMessage: "Agent is working on your request…",
};

/** Boot messages when always-on preview was soft-stopped after idle. */
export const CLIENT_LINK_PREVIEW_IDLE_WAKE = {
  title: "Preview was paused after inactivity",
  starting: "Starting again…",
  stillStarting: "Still starting again. Preview will appear when ready.",
};

/** Boot messages for first open / cold start (no idle wake stamp). */
export const CLIENT_LINK_PREVIEW_COLD_START = {
  starting: "Starting preview…",
  stillStarting: "Still starting the preview. It will appear when ready.",
};

/**
 * @param {string | null | undefined} wakeReason
 * @returns {boolean}
 */
export function isPreviewIdleWakeReason(wakeReason) {
  return String(wakeReason || "").trim() === "inactivity";
}

/**
 * Loader message while preview is booting from ensure/status.
 * @param {{ wakeReason?: string | null, installRunning?: boolean, status?: string }} [opts]
 * @returns {string}
 */
export function clientLinkPreviewBootMessage(opts = {}) {
  if (opts.installRunning || opts.status === "installing") {
    return "Installing dependencies…";
  }
  if (isPreviewIdleWakeReason(opts.wakeReason)) {
    return CLIENT_LINK_PREVIEW_IDLE_WAKE.starting;
  }
  return CLIENT_LINK_PREVIEW_COLD_START.starting;
}

export const CLIENT_LINK_PREVIEW_RECOVERY = {
  restartAgent: {
    shortLabel: "Restart agent",
    ariaLabel: "Restart agent build",
    title: "Restart agent build",
    whenToUse:
      "Only if the first version still has not appeared after several minutes. Restarts the scratch/Figma agent or saves a version from the workspace if files are already there.",
    disabledNoScratch: "Only available during scratch onboarding before a version is saved.",
  },
  reloadDevServer: {
    shortLabel: "Reload preview",
    ariaLabel: "Reload preview",
    title: "Reload preview",
    whenToUse:
      "Syncs the preview from your last saved version and reloads the iframe. Use if the preview looks stale or shows a blank screen.",
  },
  updateFromGit: {
    shortLabel: "Bring up to date",
    ariaLabel: "Bring preview up to date",
    title: "Bring preview up to date",
    whenToUse:
      "Preview Desktop has newer changes than this page. Brings this preview in line with those changes and reloads it.",
    upToDateToast: "Preview is already up to date.",
    successToast: "Preview is up to date.",
    failedToast: "Could not bring the preview up to date.",
  },
  startServer: {
    shortLabel: "Start Server",
    ariaLabel: "Start preview server",
    title: "Start Server",
    whenToUse: "Starts the project preview server and loads it in this frame.",
  },
  embedHmrConnectionLost:
    "Live preview connection lost. Reconnecting automatically… You can keep chatting.",
  embedHmrReconnectFailed:
    "Live preview could not reconnect automatically. Use Reload preview in the preview toolbar to try again.",
  sendErrorToAgent: {
    shortLabel: "Send error to agent",
    whenToUse: "Sends the preview error page text to the AI agent so it can diagnose and fix it.",
  },
  viewInPreview: {
    shortLabel: "View in preview",
    whenToUse: "Hides this overlay so you can see the error page inside the preview frame.",
  },
  /** Shown when iframe displays the exact document from the preview port. */
  exactPortErrorBanner: "Preview error from the app server — the exact page is shown below.",
};

/** Overlay titles by failure kind (used only when the iframe cannot show the port page). */
export const CLIENT_LINK_PREVIEW_FAILURE_TITLES = {
  port_unreachable: "Preview server not running",
  boot_failed: "Preview failed to start",
  compile_error: "Preview error",
  blank_app: "Preview error",
  runtime_error: "Preview error",
  timeout: "Preview timed out",
  build_failed: "Build failed",
};

/** Non-blocking banner after LaunchPad's post-turn build check fails. */
export const CLIENT_LINK_BUILD_VERIFY_BANNER = {
  title: "Build failed",
  message: (command) =>
    command
      ? `Build failed: \`${command}\` did not pass on the latest version. The preview may still load, but it will not deploy cleanly.`
      : "Build failed on the latest version. The preview may still load, but it will not deploy cleanly.",
  dismissLabel: "Dismiss",
};

export { appendPreviewDiagnosisToAgentPrompt } from "./clientLinkPreviewDiagnosis.util";

export const CLIENT_LINK_PREVIEW_RECOVERY_GUIDE_INTRO =
  "These actions fix different problems. Use the lightest option that matches your situation.";

export const LAUNCHPAD_SUPPORT_EMAIL = import.meta.env.VITE_LAUNCHPAD_SUPPORT_EMAIL?.trim() || "";

/** Chat composer drop-up: report preview loading problems and seed agent fix prompts. */
export const CLIENT_LINK_PREVIEW_LOADING_TROUBLE = {
  triggerLabel: "Having trouble loading?",
  triggerTooltip:
    "Preview not loading right? Pick a common issue or describe what you see — the agent will try to fix it.",
  menuTitle: "Preview not loading?",
  triggerAriaLabel: "Report a preview loading problem",
  options: {
    errorOrLoading: {
      label: "Error screen or keeps loading",
      composerPrompt:
        "The live preview shows an error screen or keeps loading without finishing. Please diagnose and fix the issue so the preview loads correctly.",
    },
    flickering: {
      label: "Preview keeps flickering",
      composerPrompt:
        "The live preview keeps flickering or reloading. Please diagnose and fix what is causing the unstable preview.",
    },
    whiteScreen: {
      label: "White or blank screen",
      composerPrompt:
        "The live preview shows a blank white screen. Please find and fix the issue so the preview loads correctly.",
    },
    other: {
      label: "Other reason",
      placeholder: "Describe what you see…",
      /** @param {string} detail */
      buildPrompt: (detail) =>
        `The live preview is not loading properly: ${detail}. Please diagnose and fix it.`,
    },
  },
};
