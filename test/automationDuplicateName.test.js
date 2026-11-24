import test from "node:test";
import assert from "node:assert/strict";
import {
  DUPLICATE_AUTOMATION_NAME_MESSAGE,
  duplicateAutomationNameError,
} from "../src/pages/Jobs/utils/automationName.util.js";

test("duplicateAutomationNameError detects backend duplicate name message", () => {
  const message = duplicateAutomationNameError({ error: DUPLICATE_AUTOMATION_NAME_MESSAGE });
  assert.equal(message, DUPLICATE_AUTOMATION_NAME_MESSAGE);
});

test("duplicateAutomationNameError returns null for unrelated errors", () => {
  assert.equal(duplicateAutomationNameError({ error: "Failed to create job" }), null);
  assert.equal(duplicateAutomationNameError(null), null);
});
