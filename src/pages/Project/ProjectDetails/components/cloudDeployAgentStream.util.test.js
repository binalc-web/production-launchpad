import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDeployAgentStreamUpdate,
  emptyDeployAgentStreamState,
  legacyAgentSummaryToUpdate,
  resolveDeployAgentPipelineLabel,
} from "./cloudDeployAgentStream.util.js";

test("applyDeployAgentStreamUpdate merges agent_update SSE payload", () => {
  const prev = emptyDeployAgentStreamState();
  const next = applyDeployAgentStreamUpdate(prev, {
    type: "agent_update",
    streamText: "Running deploy.sh",
    streamPhase: "Agent is working…",
    streamTimeline: [{ type: "thinking", id: "t1", text: "Planning", status: "streaming" }],
  });
  assert.equal(next.streamText, "Running deploy.sh");
  assert.equal(next.streamPhase, "Agent is working…");
  assert.equal(next.streamTimeline.length, 1);
  assert.equal(next.streamTimeline[0].type, "thinking");
});

test("applyDeployAgentStreamUpdate prefers publishStep label", () => {
  const prev = emptyDeployAgentStreamState();
  const next = applyDeployAgentStreamUpdate(prev, {
    type: "agent_update",
    streamText: "",
    streamPhase: "Publishing fixes",
    streamTimeline: [],
    publishStep: { phase: "pending", label: "Publishing to GitHub…" },
  });
  assert.equal(next.streamPhase, "Publishing to GitHub…");
  assert.equal(next.publishStep.label, "Publishing to GitHub…");
});

test("applyDeployAgentStreamUpdate prefers merge conflict publishStep label", () => {
  const prev = emptyDeployAgentStreamState();
  const next = applyDeployAgentStreamUpdate(prev, {
    type: "agent_update",
    streamText: "",
    streamPhase: "Publishing fixes",
    streamTimeline: [],
    publishStep: { phase: "pending", label: "Fixing merge conflicts…" },
  });
  assert.equal(next.streamPhase, "Fixing merge conflicts…");
});

test("resolveDeployAgentPipelineLabel prefers publish step during PUBLISHING", () => {
  assert.equal(
    resolveDeployAgentPipelineLabel(
      { publishStep: { label: "Publishing to GitHub…" }, streamPhase: "" },
      "PUBLISHING",
    ),
    "Publishing to GitHub…",
  );
  assert.equal(
    resolveDeployAgentPipelineLabel({ streamPhase: "" }, "PUBLISHING"),
    "Publishing to GitHub…",
  );
});

test("legacyAgentSummaryToUpdate maps agent_summary to agent_update", () => {
  const mapped = legacyAgentSummaryToUpdate({
    type: "agent_summary",
    summary: "Deploy succeeded",
  });
  assert.deepEqual(mapped, {
    type: "agent_update",
    streamText: "Deploy succeeded",
    streamPhase: "",
    streamTimeline: [],
  });
});
