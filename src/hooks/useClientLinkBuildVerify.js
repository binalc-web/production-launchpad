import { useCallback, useEffect, useState } from "react";
import { fetchPublicClientLinkVerifyStatus } from "@/api";

const POLL_MS = 20_000;

/**
 * Polls LaunchPad's post-turn build check for a Client Link project.
 * `failed` stays true until the next passing run or the user dismisses that run.
 *
 * @param {string | null | undefined} slug
 * @param {{ enabled?: boolean }} [opts]
 */
export function useClientLinkBuildVerify(slug, opts = {}) {
  const enabled = opts.enabled !== false && Boolean(String(slug || "").trim());
  const [status, setStatus] = useState(null);
  const [dismissedRunId, setDismissedRunId] = useState("");

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchPublicClientLinkVerifyStatus(slug);
        if (!cancelled) setStatus(data && typeof data === "object" ? data : null);
      } catch {
        /* status is advisory — keep last value */
      }
    };
    void load();
    const timer = window.setInterval(load, POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, slug]);

  const dismiss = useCallback(() => {
    if (status?.runId) setDismissedRunId(status.runId);
  }, [status?.runId]);

  const failed = status?.status === "failed" && Boolean(status.runId);
  return {
    status,
    failed,
    showBanner: failed && status.runId !== dismissedRunId,
    fixPrompt: failed ? status.fixPrompt || "" : "",
    failedCommand: failed ? status.failedCommand || "" : "",
    dismiss,
  };
}
