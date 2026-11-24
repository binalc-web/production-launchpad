import test from "node:test";
import assert from "node:assert/strict";

import {
  findPendingInfraAnalysisConfirmationMessage,
  isInfraAnalysisAssistantActive,
  pairInfraAnalysisChatMessages,
} from "../src/pages/Project/ProjectDetails/chat/infraAnalysisChat.util.js";

test("isInfraAnalysisAssistantActive detects pending assistant", () => {
  assert.equal(isInfraAnalysisAssistantActive({ role: "assistant", status: "pending" }), true);
  assert.equal(isInfraAnalysisAssistantActive({ role: "assistant", status: "completed" }), false);
  assert.equal(isInfraAnalysisAssistantActive({ role: "user", status: "pending" }), false);
});

test("findPendingInfraAnalysisConfirmationMessage finds awaiting row", () => {
  const messages = [
    { id: "1", role: "user", content: "x" },
    {
      id: "2",
      role: "assistant",
      status: "awaiting_confirmation",
      confirmationStatus: "awaiting_confirmation",
    },
  ];
  assert.equal(findPendingInfraAnalysisConfirmationMessage(messages)?.id, "2");
});

test("pairInfraAnalysisChatMessages groups user with following assistant", () => {
  const pairs = pairInfraAnalysisChatMessages([
    { id: "u1", role: "user", content: "hi" },
    { id: "a1", role: "assistant", reply: "hello" },
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].user?.id, "u1");
  assert.equal(pairs[0].assistant?.id, "a1");
});
