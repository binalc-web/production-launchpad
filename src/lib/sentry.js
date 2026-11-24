import * as Sentry from "@sentry/react";
import config from "../config/index.js";
import { isTeardownAbortSentryEvent } from "./sentryTeardownAbort.util.js";

export { isTeardownAbortSentryEvent };

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

/** `VITE_SENTRY_TRACES_SAMPLE_RATE` in [0, 1]; unset or invalid uses the default, `0` disables tracing. */
function resolveTracesSampleRate(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return DEFAULT_TRACES_SAMPLE_RATE;
  const n = Number(s);
  if (!Number.isFinite(n)) return DEFAULT_TRACES_SAMPLE_RATE;
  return Math.min(Math.max(n, 0), 1);
}

function apiOrigin() {
  try {
    return new URL(config.API_URL, window.location.origin).origin;
  } catch {
    return null;
  }
}

const dsn = String(import.meta.env.VITE_SENTRY_DSN || "").trim();
const environmentLabel = String(import.meta.env.VITE_SENTRY_ENVIRONMENT || "")
  .trim()
  .toLowerCase();
/** Prod builds set VITE_SENTRY_ENVIRONMENT=prod. VITE_MODE=production is also used for UAT. */
const sentryEnabled =
  Boolean(dsn) && (environmentLabel === "prod" || environmentLabel === "production");

if (sentryEnabled) {
  const origin = apiOrigin();
  Sentry.init({
    dsn,
    environment: "production",
    sendDefaultPii: true,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: resolveTracesSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE),
    // Only our own API gets sentry-trace/baggage headers; third-party hosts may reject them in CORS.
    tracePropagationTargets: origin ? [/^\//, origin] : [/^\//],
    initialScope: {
      tags: { runtime: "frontend" },
    },
    beforeSend(event) {
      if (isTeardownAbortSentryEvent(event)) return null;
      return event;
    },
  });
}

/**
 * @param {unknown} error
 * @param {Record<string, unknown>} [captureContext]
 */
export function captureFrontendException(error, captureContext) {
  if (!sentryEnabled) return;
  Sentry.captureException(error, captureContext);
}

/**
 * @param {{ id?: string | number | null, email?: string, name?: string } | null | undefined} user
 */
export function syncSentryUser(user) {
  if (!sentryEnabled) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  const id = user.id == null || user.id === "" ? undefined : String(user.id);
  const email = typeof user.email === "string" && user.email.trim() ? user.email.trim() : undefined;
  const name = typeof user.name === "string" && user.name.trim() ? user.name.trim() : undefined;
  Sentry.setUser({
    id,
    email,
    username: name,
    name,
  });
}
