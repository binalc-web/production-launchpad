import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_PROVIDERS,
  agentProviderForAgentId,
  agentProviderLabel,
  normalizeAgentProvider,
} from "../src/constants/agentProvider.js";
import { computeCursorAgentUsageCostUsd } from "../src/pages/AgentAnalytics/agentAnalyticsDisplay.js";
import { getCursorModelLabel } from "../src/constants/cursorModelCatalog.js";

test("normalizeAgentProvider defaults everything but opencode to cursor", () => {
  assert.equal(normalizeAgentProvider("opencode"), AGENT_PROVIDERS.OPENCODE);
  assert.equal(normalizeAgentProvider(" OpenCode "), AGENT_PROVIDERS.OPENCODE);
  assert.equal(normalizeAgentProvider("cursor"), AGENT_PROVIDERS.CURSOR);
  assert.equal(normalizeAgentProvider(undefined), AGENT_PROVIDERS.CURSOR);
  assert.equal(normalizeAgentProvider("other"), AGENT_PROVIDERS.CURSOR);
});

test("agentProviderLabel", () => {
  assert.equal(agentProviderLabel("opencode"), "OpenCode");
  assert.equal(agentProviderLabel(null), "Cursor");
});

test("agentProviderForAgentId uses the oc_ prefix", () => {
  assert.equal(agentProviderForAgentId("oc_abc"), AGENT_PROVIDERS.OPENCODE);
  assert.equal(agentProviderForAgentId("bc_abc"), AGENT_PROVIDERS.CURSOR);
  assert.equal(agentProviderForAgentId("legacy-id"), AGENT_PROVIDERS.CURSOR);
  assert.equal(agentProviderForAgentId(""), AGENT_PROVIDERS.CURSOR);
});

test("OpenCode model ids resolve to their own label and pricing", () => {
  assert.equal(getCursorModelLabel("anthropic/claude-sonnet-5-5"), "Claude Sonnet 5.5");
  const cost = computeCursorAgentUsageCostUsd(
    { inputTokens: 1_000_000, outputTokens: 1_000_000 },
    "anthropic/claude-sonnet-5-5",
  );
  assert.equal(cost, 18);
});
