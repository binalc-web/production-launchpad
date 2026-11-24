import test from "node:test";
import assert from "node:assert/strict";
import {
  isAssistantFollowActive,
  isAssistantGoalActive,
  isAssistantTickActive,
  stripAssistantStatusLinesForDisplay,
  truncateAssistantId,
} from "../src/lib/assistantGoal.js";

test("isAssistantGoalActive is true for goal and loop while in_progress", () => {
  assert.equal(isAssistantGoalActive({ mode: "goal", status: "in_progress" }), true);
  assert.equal(isAssistantGoalActive({ mode: "loop", status: "in_progress" }), true);
  assert.equal(isAssistantGoalActive({ mode: "goal", status: "blocked" }), false);
  assert.equal(isAssistantGoalActive({ mode: "idle", status: "in_progress" }), false);
  assert.equal(isAssistantGoalActive({ mode: "follow", status: "in_progress" }), false);
  assert.equal(isAssistantGoalActive(null), false);
});

test("isAssistantFollowActive and isAssistantTickActive", () => {
  assert.equal(isAssistantFollowActive({ mode: "follow", status: "in_progress" }), true);
  assert.equal(isAssistantFollowActive({ mode: "follow", status: "complete" }), false);
  assert.equal(isAssistantTickActive({ mode: "follow", status: "in_progress" }), true);
  assert.equal(isAssistantTickActive({ mode: "goal", status: "in_progress" }), true);
  assert.equal(isAssistantTickActive({ mode: "idle", status: null }), false);
});

test("stripAssistantStatusLinesForDisplay removes machine status from prose", () => {
  const stripped = stripAssistantStatusLinesForDisplay(
    `Agent started on development.\n\n**Status:** preparing\n- **Session:** abc-123\n- **Next action:** poll\n\nNEXT_ACTION: poll\nGOAL_STATUS: in_progress`,
  );
  assert.match(stripped, /Agent started on development/);
  assert.doesNotMatch(stripped, /NEXT_ACTION/);
  assert.doesNotMatch(stripped, /Session:/);
});

test("truncateAssistantId shortens long ids", () => {
  assert.equal(truncateAssistantId("short"), "short");
  assert.equal(truncateAssistantId("bedbad5d-37be-48d8-a6a5-8d446636a00e"), "bedbad5d…");
});
