import test from "node:test";
import assert from "node:assert/strict";
import {
  dedupePersistedAgentOutputByUserTurn,
  mapClientLinkChatRows,
  mergeChatRowsWithEphemeralUi,
  promoteAgentLiveStreamToEphemeralMessage,
  rekeyEphemeralAgentOutputForUser,
} from "../src/pages/ClientLink/chat/clientLinkChatMessages.util.js";

test("mapClientLinkChatRows hides waiting queued prompts but shows dispatching user bubbles", () => {
  const mapped = mapClientLinkChatRows([
    { id: 1, role: "user", text: "running", queueStatus: null },
    { id: 2, role: "user", text: "waiting", queueStatus: "queued" },
    { id: 3, role: "user", text: "sending", queueStatus: "dispatching" },
    { id: 4, role: "system", mode: "ask", text: "Ask response\n\nDone" },
  ]);
  assert.deepEqual(
    mapped.map((m) => m.id),
    [1, 3, 4],
  );
});

test("mapClientLinkChatRow carries queueStatus onto mapped rows", () => {
  const [row] = mapClientLinkChatRows([
    { id: 3, role: "user", text: "sending", queueStatus: "dispatching" },
  ]);
  assert.equal(row.queueStatus, "dispatching");
});

test("dedupePersistedAgentOutputByUserTurn keeps latest agent row per user turn", () => {
  const rows = [
    { id: 1, role: "user", text: "first" },
    {
      id: 2,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nDraft",
      isPersistedAgentOutput: true,
    },
    {
      id: 3,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nFinal",
      isPersistedAgentOutput: true,
    },
    { id: 4, role: "user", text: "second" },
    {
      id: 5,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nTwo",
      isPersistedAgentOutput: true,
    },
  ];
  const deduped = dedupePersistedAgentOutputByUserTurn(rows);
  assert.equal(deduped.length, 4);
  assert.equal(deduped[1].id, 3);
  assert.equal(deduped[3].id, 5);
});

test("mergeChatRowsWithEphemeralUi drops ephemeral when persisted output exists", () => {
  const serverRows = [
    { id: 1, role: "user", text: "hi", key: "db:1" },
    {
      id: 2,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nDone",
      isPersistedAgentOutput: true,
      key: "db:2",
    },
  ];
  const prev = [
    ...serverRows,
    {
      key: "ephemeral:agent-output:9:1",
      role: "system",
      mode: "agent",
      text: "Done",
      isEphemeral: true,
      isPersistedAgentOutput: true,
    },
  ];
  const merged = mergeChatRowsWithEphemeralUi(prev, serverRows);
  assert.equal(merged.filter((m) => m.key?.startsWith("ephemeral:agent-output:")).length, 0);
});

test("mergeChatRowsWithEphemeralUi replaceEphemeralUi drops all local-only rows", () => {
  const prev = [
    { id: 1, role: "user", text: "old", key: "db:1" },
    {
      key: "ephemeral:agent-output:9:1",
      role: "system",
      mode: "agent",
      text: "stale",
      isEphemeral: true,
    },
  ];
  const merged = mergeChatRowsWithEphemeralUi(prev, [], {
    replaceEphemeralUi: true,
  });
  assert.deepEqual(merged, []);
});

test("mergeChatRowsWithEphemeralUi keeps local turn-done system messages across refresh", () => {
  const serverRows = [{ id: 1, role: "user", text: "hi", key: "db:1" }];
  const prev = [
    ...serverRows,
    {
      role: "system",
      key: "client-link-turn-applied:9",
      tone: "success",
      text: "Changes applied.",
    },
  ];
  const merged = mergeChatRowsWithEphemeralUi(prev, serverRows);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].key, "client-link-turn-applied:9");
});

test("promoteAgentLiveStreamToEphemeralMessage inserts after latest user", () => {
  let state = [{ id: 10, role: "user", text: "change color", key: "db:10" }];
  promoteAgentLiveStreamToEphemeralMessage(
    (fn) => {
      state = fn(state);
    },
    { releaseId: 3, streamText: "Updated theme", liveKey: null, mode: "agent" },
  );
  assert.equal(state.length, 2);
  assert.equal(state[0].role, "user");
  assert.equal(state[1].role, "system");
  assert.match(state[1].key, /^ephemeral:agent-output:3:10$/);
});

test("rekeyEphemeralAgentOutputForUser migrates latest key to user id", () => {
  let state = [
    { id: 10, role: "user", text: "change color", key: "db:10" },
    {
      key: "ephemeral:agent-output:3:latest",
      role: "system",
      mode: "agent",
      text: "Streaming body",
      isEphemeral: true,
      isPersistedAgentOutput: true,
    },
  ];
  rekeyEphemeralAgentOutputForUser(
    (fn) => {
      state = fn(state);
    },
    { releaseId: 3, userId: 10 },
  );
  assert.equal(state.length, 2);
  assert.equal(state[1].key, "ephemeral:agent-output:3:10");
  assert.equal(state[1].text, "Streaming body");
});

test("promoteAgentLiveStreamToEphemeralMessage updates existing ephemeral during streaming", () => {
  let state = [
    { id: 10, role: "user", text: "change color", key: "db:10" },
    {
      key: "ephemeral:agent-output:3:10",
      role: "system",
      mode: "agent",
      text: "## Draft",
      isEphemeral: true,
      isPersistedAgentOutput: true,
    },
  ];
  promoteAgentLiveStreamToEphemeralMessage(
    (fn) => {
      state = fn(state);
    },
    {
      releaseId: 3,
      streamText: "## Draft\n\n- item one",
      liveKey: null,
      mode: "agent",
    },
  );
  assert.equal(state.length, 2);
  assert.equal(state[1].text, "## Draft\n\n- item one");
});

test("mapClientLinkChatRows keeps activity on user rows and omits it elsewhere", () => {
  const log = [{ id: "a", seq: 1, ts: 1, kind: "step", label: "x", status: "done" }];
  const mapped = mapClientLinkChatRows([
    { id: 1, role: "user", text: "hi", activity: log },
    { id: 2, role: "system", text: "reply" },
  ]);
  assert.deepEqual(mapped[0].activity, log);
  assert.equal("activity" in mapped[1], false);
});
