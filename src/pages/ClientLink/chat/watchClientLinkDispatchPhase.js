import { consumeClientLinkAgentStream } from "@/api";

/**
 * Listen for dispatch_phase events while the follow-up POST is still open.
 * Ignores snapshots so a prior agent status cannot replace the step label.
 * @param {string} slug
 * @param {number} releaseId
 * @param {(phase: string) => void} onPhase
 * @returns {() => void}
 */
export function watchClientLinkDispatchPhase(slug, releaseId, onPhase) {
  const controller = new AbortController();
  void consumeClientLinkAgentStream(slug, releaseId, {
    signal: controller.signal,
    dispatchOnly: true,
    onEvent: (evt) => {
      if (evt?.type === "dispatch_phase" && typeof evt.phase === "string" && evt.phase.trim()) {
        onPhase(evt.phase.trim());
      }
      return false;
    },
  }).catch(() => {});
  return () => controller.abort();
}
