import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("clientLinkSendFollowup wires plan mode on the request body", () => {
  const src = readFileSync(path.join(root, "src/api/index.js"), "utf8");
  assert.match(src, /normalizedMode === ["']ask["'] \|\| normalizedMode === ["']plan["']/);
  assert.match(src, /export async function clientLinkBuildPlan/);
  assert.match(src, /export async function clientLinkClearPendingPlan/);
  assert.match(src, /\/build-plan/);
  assert.match(src, /\/pending-plan/);
});

test("ClientLinkChatPanel exposes Plan mode and pending plan Build chrome", () => {
  const src = readFileSync(
    path.join(root, "src/pages/ClientLink/components/ClientLinkChatPanel.jsx"),
    "utf8",
  );
  assert.match(src, /composerMode/);
  assert.match(src, /setComposerMode/);
  assert.match(src, /ChatComposerModeSelect/);
  assert.match(src, /setComposerMode\(value\)/);
  assert.match(src, /BackendCodePlanDocument/);
  assert.match(src, /handleBuildPendingPlan/);
  assert.match(src, /clientLinkBuildPlan/);
});

test("ClientLinkChatPanel only refreshes the preview after agent-mode turns (not ask/plan)", () => {
  const src = readFileSync(
    path.join(root, "src/pages/ClientLink/components/ClientLinkChatPanel.jsx"),
    "utf8",
  );
  assert.match(src, /turn\.phase === TURN_PHASE\.DONE && \(turn\.mode \?\? "agent"\) === "agent"/);
});
