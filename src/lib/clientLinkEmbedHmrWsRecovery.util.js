/** Parent-side HMR WebSocket failures before an automatic hard iframe reload. */
export const EMBED_HMR_WS_FAIL_BEFORE_HARD_RELOAD = 5;

/** Automatic hard-reload attempts before giving up. */
export const EMBED_HMR_WS_MAX_AUTO_HARD_RELOADS = 1;

/**
 * Tracks embed HMR WebSocket failure streaks so the parent can toast once,
 * auto hard-reload after repeated failures, then surface a final recovery message.
 */
export function createEmbedHmrWsFailureTracker({
  failBeforeHardReload = EMBED_HMR_WS_FAIL_BEFORE_HARD_RELOAD,
  maxAutoHardReloads = EMBED_HMR_WS_MAX_AUTO_HARD_RELOADS,
} = {}) {
  let parentFailCount = 0;
  let initialToastShown = false;
  let autoHardReloadAttempts = 0;
  let hardReloadInFlight = false;
  let exhausted = false;

  const resetEpisode = () => {
    parentFailCount = 0;
    hardReloadInFlight = false;
  };

  return {
    /** Full reset after a healthy HMR connection or manual user recovery. */
    reset() {
      parentFailCount = 0;
      initialToastShown = false;
      autoHardReloadAttempts = 0;
      hardReloadInFlight = false;
      exhausted = false;
    },

    isExhausted() {
      return exhausted;
    },

    onOpen() {
      this.reset();
      return { action: "connected", nextState: "connected" };
    },

    /**
     * @param {{ skip?: boolean }} opts
     * @returns {{
     *   action: "ignored" | "counted" | "hard-reload" | "exhausted",
     *   nextState?: "failed" | "recovering" | "exhausted",
     *   showInitialToast?: boolean,
     *   showExhaustedToast?: boolean,
     * }}
     */
    onFailed({ skip = false } = {}) {
      if (skip || exhausted) {
        return { action: "ignored" };
      }

      parentFailCount += 1;

      const result = {
        action: "counted",
        nextState: "failed",
        showInitialToast: false,
        showExhaustedToast: false,
      };

      if (!initialToastShown) {
        initialToastShown = true;
        result.showInitialToast = true;
      }

      if (parentFailCount < failBeforeHardReload) {
        return result;
      }

      if (
        autoHardReloadAttempts < maxAutoHardReloads &&
        !hardReloadInFlight
      ) {
        hardReloadInFlight = true;
        autoHardReloadAttempts += 1;
        return {
          action: "hard-reload",
          nextState: "recovering",
          showInitialToast: false,
          showExhaustedToast: false,
        };
      }

      exhausted = true;
      return {
        action: "exhausted",
        nextState: "exhausted",
        showExhaustedToast: true,
      };
    },

    /**
     * @param {{ success: boolean }} outcome
     */
    onHardReloadComplete({ success }) {
      hardReloadInFlight = false;
      parentFailCount = 0;

      if (success) {
        return { nextState: "idle" };
      }

      exhausted = true;
      return {
        nextState: "exhausted",
        showExhaustedToast: true,
      };
    },
  };
}
