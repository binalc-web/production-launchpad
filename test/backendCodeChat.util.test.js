import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCliResultDurationMs,
  findActiveBackendCodeChatAssistant,
  formatBackendCodeChatSessionOptionLabel,
  isAssistantActive,
  pairBackendCodeChatMessages,
  resolveBackendCodeChatTurnLabel,
} from "../src/pages/Project/ProjectDetails/chat/backendCodeChat.util.js";

test("isAssistantActive is true for pending or generating assistant rows", () => {
  assert.equal(isAssistantActive({ role: "assistant", status: "pending" }), true);
  assert.equal(isAssistantActive({ role: "assistant", status: "generating" }), true);
  assert.equal(isAssistantActive({ role: "assistant", status: "completed" }), false);
  assert.equal(isAssistantActive({ role: "user", status: "pending" }), false);
});

test("pairBackendCodeChatMessages groups user with following assistant", () => {
  const pairs = pairBackendCodeChatMessages([
    { id: "u1", role: "user", content: "hi" },
    { id: "a1", role: "assistant", reply: "hello" },
    { id: "u2", role: "user", content: "next" },
  ]);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].user?.id, "u1");
  assert.equal(pairs[0].assistant?.id, "a1");
  assert.equal(pairs[1].user?.id, "u2");
  assert.equal(pairs[1].assistant, null);
});

test("findActiveBackendCodeChatAssistant returns latest in-flight assistant", () => {
  const active = findActiveBackendCodeChatAssistant([
    { id: "a1", role: "assistant", status: "completed" },
    { id: "a2", role: "assistant", status: "generating" },
  ]);
  assert.equal(active?.id, "a2");
  assert.equal(findActiveBackendCodeChatAssistant([]), null);
});

test("resolveBackendCodeChatTurnLabel prefers in-progress publish step label", () => {
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      { publishStep: { phase: "pending", label: "Publishing to GitHub…" } },
      null,
    ),
    "Publishing to GitHub…",
  );
});

test("resolveBackendCodeChatTurnLabel ignores succeeded publish from a prior turn", () => {
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      {
        publishStep: { phase: "succeeded", label: "Published to GitHub" },
        streamPhase: "",
        aiSummary: "Agent is working…",
      },
      { role: "assistant", status: "generating" },
    ),
    "Agent is working…",
  );
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      { publishStep: { phase: "succeeded", label: "Published to GitHub" } },
      { role: "assistant", status: "generating" },
    ),
    "Updating backend code…",
  );
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      {
        publishStep: { phase: "succeeded", label: "Published to GitHub" },
        streamPhase: "Published to GitHub",
      },
      { role: "assistant", status: "generating" },
    ),
    "Updating backend code…",
  );
});

test("resolveBackendCodeChatTurnLabel prefers stream phase then ai summary when completed", () => {
  assert.equal(
    resolveBackendCodeChatTurnLabel({ streamPhase: "Reading files" }, null),
    "Reading files",
  );
  assert.equal(
    resolveBackendCodeChatTurnLabel(null, { streamPhase: "Editing code" }),
    "Editing code",
  );
  assert.equal(
    resolveBackendCodeChatTurnLabel({ aiSummary: "Scanning routes" }, null),
    "Scanning routes",
  );
  assert.equal(
    resolveBackendCodeChatTurnLabel(null, { reply: "Preparing Cursor agent." }),
    "Updating backend code…",
  );
});

test("resolveBackendCodeChatTurnLabel ignores stale Selecting model reply while generating", () => {
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      { streamPhase: "Preparing Cursor agent…", aiSummary: "Preparing Cursor agent…" },
      { role: "assistant", status: "generating", reply: "Selecting model…" },
    ),
    "Preparing Cursor agent…",
  );
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      { streamPhase: "" },
      { role: "assistant", status: "generating", reply: "Selecting model…" },
    ),
    "Updating backend code…",
  );
});

test("resolveBackendCodeChatTurnLabel uses short progress aiSummary while generating", () => {
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      { aiSummary: "Cursor agent is reading your repository and updating backend code." },
      { role: "assistant", status: "generating" },
    ),
    "Cursor agent is reading your repository and updating backend code.",
  );
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      { aiSummary: "Agent is working…" },
      { role: "assistant", status: "generating" },
    ),
    "Agent is working…",
  );
});

test("resolveBackendCodeChatTurnLabel defaults to Planning for in-flight plan mode", () => {
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      { streamPhase: "", aiSummary: null },
      { role: "assistant", status: "generating", mode: "plan" },
    ),
    "Planning…",
  );
  assert.equal(
    resolveBackendCodeChatTurnLabel(
      { streamPhase: "Drafting a plan…", aiSummary: "Drafting a plan…" },
      { role: "assistant", status: "generating", mode: "plan" },
    ),
    "Drafting a plan…",
  );
});

test("extractCliResultDurationMs reads last result event duration", () => {
  assert.equal(
    extractCliResultDurationMs([
      { type: "thinking", text: "x" },
      { type: "result", durationMs: 1200, status: "success" },
    ]),
    1200,
  );
  assert.equal(extractCliResultDurationMs([{ type: "assistant", text: "hi" }]), null);
});

test("formatBackendCodeChatSessionOptionLabel includes branch and time for New chat", () => {
  assert.equal(
    formatBackendCodeChatSessionOptionLabel({ title: "Fix auth", baseBranch: "main" }),
    "Fix auth · main",
  );
  assert.equal(
    formatBackendCodeChatSessionOptionLabel({ title: "New chat", baseBranch: "develop" }),
    "New chat · develop",
  );
  const labeled = formatBackendCodeChatSessionOptionLabel({
    title: "New chat",
    updatedAt: "2026-08-27T12:00:00.000Z",
  });
  assert.match(labeled, /^New chat · /);
});
