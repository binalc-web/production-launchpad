import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClientLinkEphemeralAgentOutputMessage,
  isLocalUserMessagePendingOnServer,
  isPersistedClientLinkAgentOutputRow,
  lastUserTurnHasPersistedAgentOutput,
  shouldKeepEphemeralAgentOutputMessage,
  splitClientLinkPersistedAgentOutputText,
  userTurnHasPersistedAgentOutputForUserId,
} from "../src/pages/ClientLink/clientLinkPersistedAgentOutput.util.js";

test("splitClientLinkPersistedAgentOutputText splits header and body", () => {
  assert.deepEqual(
    splitClientLinkPersistedAgentOutputText("Agent: Demo\n\nTranscript"),
    { header: "Agent: Demo", body: "Transcript" },
  );
  assert.deepEqual(splitClientLinkPersistedAgentOutputText("Plain text"), {
    header: null,
    body: "Plain text",
  });
});

test("lastUserTurnHasPersistedAgentOutput ignores ephemeral stream bridges", () => {
  const rows = [
    { id: 3, role: "user", text: "second" },
    {
      key: "ephemeral:agent-output:9:3",
      role: "system",
      mode: "agent",
      text: "## Live markdown\n\nStill streaming",
      isEphemeral: true,
      isPersistedAgentOutput: true,
    },
  ];
  assert.equal(
    lastUserTurnHasPersistedAgentOutput(rows, { mode: "agent" }),
    false,
  );
});

test("lastUserTurnHasPersistedAgentOutput scopes to the latest user turn", () => {
  const rows = [
    { id: 1, role: "user", text: "first" },
    {
      id: 2,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nAnswer one",
      isPersistedAgentOutput: true,
    },
    { id: 3, role: "user", text: "second" },
  ];
  assert.equal(
    lastUserTurnHasPersistedAgentOutput(rows, { mode: "agent" }),
    false,
  );
  rows.push({
    id: 4,
    role: "system",
    mode: "agent",
    text: "Agent output\n\nAnswer two",
    isPersistedAgentOutput: true,
  });
  assert.equal(
    lastUserTurnHasPersistedAgentOutput(rows, { mode: "agent" }),
    true,
  );
});

test("buildClientLinkEphemeralAgentOutputMessage stores body only", () => {
  const row = buildClientLinkEphemeralAgentOutputMessage("Live tail", "agent");
  assert.equal(row?.mode, "agent");
  assert.equal(row?.text, "Live tail");
});

test("buildClientLinkEphemeralAgentOutputMessage accepts timeline-only rows", () => {
  const row = buildClientLinkEphemeralAgentOutputMessage("", "agent", [
    {
      type: "tool_call",
      id: "1",
      toolName: "Shell",
      label: "ls",
      status: "running",
    },
  ]);
  assert.equal(row?.text, "");
  assert.equal(row?.streamTimeline?.length, 1);
});

test("isPersistedClientLinkAgentOutputRow matches system ask/agent rows", () => {
  assert.equal(
    isPersistedClientLinkAgentOutputRow({ role: "system", mode: "ask" }),
    true,
  );
  assert.equal(
    isPersistedClientLinkAgentOutputRow({ role: "system", mode: "agent" }),
    true,
  );
  assert.equal(
    isPersistedClientLinkAgentOutputRow({ role: "assistant", mode: "ask" }),
    false,
  );
});

test("shouldKeepEphemeralAgentOutputMessage scopes to user turn", () => {
  const serverRows = [
    { id: 1, role: "user", text: "first" },
    {
      id: 2,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nAnswer one",
      isPersistedAgentOutput: true,
    },
  ];
  const mergeContextRows = [
    ...serverRows,
    { role: "user", text: "second", id: null },
  ];
  const ephemeralForFirstTurn = {
    key: "ephemeral:agent-output:9:1",
    isEphemeral: true,
    role: "system",
    mode: "agent",
    text: "Live tail",
  };
  const ephemeralForPendingTurn = {
    key: "ephemeral:agent-output:9:latest",
    isEphemeral: true,
    role: "system",
    mode: "agent",
    text: "Live tail",
  };
  assert.equal(
    shouldKeepEphemeralAgentOutputMessage(ephemeralForFirstTurn, serverRows),
    false,
  );
  assert.equal(
    shouldKeepEphemeralAgentOutputMessage(
      ephemeralForPendingTurn,
      mergeContextRows,
    ),
    true,
  );
});

test("isLocalUserMessagePendingOnServer keeps optimistic user rows", () => {
  const serverRows = [{ id: 1, role: "user", text: "first" }];
  assert.equal(
    isLocalUserMessagePendingOnServer(
      { role: "user", text: "second", id: null },
      serverRows,
    ),
    true,
  );
  assert.equal(
    isLocalUserMessagePendingOnServer(
      { role: "user", text: "first", id: 1 },
      serverRows,
    ),
    false,
  );
});

test("userTurnHasPersistedAgentOutputForUserId ignores other turns", () => {
  const rows = [
    { id: 1, role: "user", text: "first" },
    {
      id: 2,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nAnswer one",
      isPersistedAgentOutput: true,
    },
    { id: 3, role: "user", text: "second" },
  ];
  assert.equal(
    userTurnHasPersistedAgentOutputForUserId(rows, 1, { mode: "agent" }),
    true,
  );
  assert.equal(
    userTurnHasPersistedAgentOutputForUserId(rows, 3, { mode: "agent" }),
    false,
  );
});
