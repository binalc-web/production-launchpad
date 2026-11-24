import assert from "node:assert/strict";
import test from "node:test";
import { isTeardownAbortSentryEvent } from "../src/lib/sentryTeardownAbort.util.js";

test("isTeardownAbortSentryEvent drops Chrome abort unhandledrejection (RND-LAUNCHPAD-FE-E)", () => {
  assert.equal(
    isTeardownAbortSentryEvent({
      exception: {
        values: [
          {
            type: "AbortError",
            value: "signal is aborted without reason",
            mechanism: { type: "auto.browser.global_handlers.onunhandledrejection" },
          },
        ],
      },
    }),
    true,
  );
});

test("isTeardownAbortSentryEvent keeps AbortError reported via captureException", () => {
  assert.equal(
    isTeardownAbortSentryEvent({
      exception: {
        values: [
          {
            type: "AbortError",
            value: "signal is aborted without reason",
            mechanism: { type: "generic" },
          },
        ],
      },
    }),
    false,
  );
});

test("isTeardownAbortSentryEvent keeps unrelated unhandled rejections", () => {
  assert.equal(
    isTeardownAbortSentryEvent({
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Cannot read properties of null",
            mechanism: { type: "auto.browser.global_handlers.onunhandledrejection" },
          },
        ],
      },
    }),
    false,
  );
});
