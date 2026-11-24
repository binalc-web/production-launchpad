import assert from "node:assert/strict";
import test from "node:test";
import { isAbortError } from "../src/lib/abortError.util.js";

// Sentry RND-LAUNCHPAD-FE-E: Chrome AbortController.abort() with no reason.
test("isAbortError detects Chrome signal-aborted-without-reason DOMException", () => {
  assert.equal(
    isAbortError({ name: "AbortError", message: "signal is aborted without reason" }),
    true,
  );
  assert.equal(isAbortError({ name: "AbortError", message: "The user aborted a request." }), true);
  assert.equal(isAbortError({ name: "CanceledError", code: "ERR_CANCELED" }), true);
  assert.equal(isAbortError({ message: "Network Error" }), false);
  assert.equal(isAbortError(null), false);
});
