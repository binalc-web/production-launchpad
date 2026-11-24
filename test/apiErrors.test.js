import assert from "node:assert/strict";
import test from "node:test";
import { isApiConnectionError } from "../src/utils/apiErrors.js";

test("isApiConnectionError detects unreachable backend", () => {
  assert.equal(isApiConnectionError({ code: "ERR_NETWORK", request: {} }), true);
  assert.equal(isApiConnectionError({ code: "ERR_CONNECTION_RESET", request: {} }), true);
  assert.equal(isApiConnectionError({ message: "Network Error", request: {} }), true);
});

test("isApiConnectionError ignores HTTP responses and cancellations", () => {
  assert.equal(isApiConnectionError({ response: { status: 500 } }), false);
  assert.equal(isApiConnectionError({ code: "ERR_CANCELED" }), false);
  assert.equal(isApiConnectionError(null), false);
});

