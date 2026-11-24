import assert from "node:assert/strict";
import test from "node:test";
import {
  ASSISTANT_THREAD_PARAM,
  applyAssistantThreadIdToSearchParams,
  assistantThreadSearchParamMatches,
  readAssistantThreadIdFromSearchParams,
} from "../src/lib/assistantThreadSearchParam.js";

test("ASSISTANT_THREAD_PARAM is threadId", () => {
  assert.equal(ASSISTANT_THREAD_PARAM, "threadId");
});

test("readAssistantThreadIdFromSearchParams trims and nulls empty", () => {
  assert.equal(
    readAssistantThreadIdFromSearchParams(new URLSearchParams("threadId=%20abc-123%20")),
    "abc-123",
  );
  assert.equal(readAssistantThreadIdFromSearchParams(new URLSearchParams("threadId=")), null);
  assert.equal(readAssistantThreadIdFromSearchParams(new URLSearchParams("projectId=1")), null);
});

test("applyAssistantThreadIdToSearchParams sets and clears without clobbering others", () => {
  const prev = new URLSearchParams("projectId=42");
  const withThread = applyAssistantThreadIdToSearchParams(prev, "thr-1");
  assert.equal(withThread.get("threadId"), "thr-1");
  assert.equal(withThread.get("projectId"), "42");

  const cleared = applyAssistantThreadIdToSearchParams(withThread, null);
  assert.equal(cleared.get("threadId"), null);
  assert.equal(cleared.get("projectId"), "42");
});

test("assistantThreadSearchParamMatches compares active thread", () => {
  const params = new URLSearchParams("threadId=thr-1");
  assert.equal(assistantThreadSearchParamMatches(params, "thr-1"), true);
  assert.equal(assistantThreadSearchParamMatches(params, "thr-2"), false);
  assert.equal(assistantThreadSearchParamMatches(params, null), false);
  assert.equal(assistantThreadSearchParamMatches(new URLSearchParams(), null), true);
});
