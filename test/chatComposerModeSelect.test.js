import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComposerModeCycleIds,
  buildComposerModeIds,
  cycleComposerMode,
} from "../src/components/chat/chatComposerModeSelect.util.js";

test("buildComposerModeIds includes plan and optional voice", () => {
  assert.deepEqual(buildComposerModeIds(true, false), ["agent", "plan", "ask"]);
  assert.deepEqual(buildComposerModeIds(true, true), ["agent", "plan", "ask", "voice"]);
  assert.deepEqual(buildComposerModeIds(true, false, true), ["agent", "plan", "ask", "voice"]);
  assert.deepEqual(buildComposerModeCycleIds(true, false), ["agent", "plan", "ask"]);
});

test("cycleComposerMode wraps forward and backward", () => {
  const ids = ["agent", "plan", "ask"];
  assert.equal(cycleComposerMode("agent", ids, "next"), "plan");
  assert.equal(cycleComposerMode("plan", ids, "next"), "ask");
  assert.equal(cycleComposerMode("ask", ids, "next"), "agent");
  assert.equal(cycleComposerMode("agent", ids, "prev"), "ask");
  assert.equal(cycleComposerMode("plan", ids, "prev"), "agent");
});
