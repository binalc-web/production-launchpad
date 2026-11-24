import { isAbortError } from "./abortError.util.js";

/**
 * Chrome reports AbortController teardown as unhandledrejection, then retracts it
 * via rejectionhandled. Sentry never listens for retraction, so intentional SSE/fetch
 * aborts on route change land as production errors (RND-LAUNCHPAD-FE-E).
 * Drop only that global-handler path; captureException AbortErrors still report.
 * @param {{ exception?: { values?: Array<{ type?: string, value?: string, mechanism?: { type?: string } }> } }} event
 */
export function isTeardownAbortSentryEvent(event) {
  const values = event?.exception?.values;
  if (!Array.isArray(values) || values.length === 0) return false;

  const mechanism = values[0]?.mechanism;
  const mechanismType = typeof mechanism?.type === "string" ? mechanism.type : "";
  // Sentry v8: onunhandledrejection; v10+: auto.browser.global_handlers.onunhandledrejection
  if (!mechanismType.endsWith("onunhandledrejection")) return false;

  return values.some((v) => {
    if (!v || typeof v !== "object") return false;
    if (v.type === "AbortError") return true;
    if (typeof v.value === "string" && /^AbortError\b/i.test(v.value)) return true;
    return isAbortError({ name: v.type, message: v.value });
  });
}
