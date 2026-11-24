import assert from "node:assert/strict";
import test from "node:test";
import {
  countUnifiedDiffLineStats,
  looksLikeJsonObject,
  parseLegacyToolResultPreview,
  resolveToolCallDisplay,
  shortenPath,
} from "../src/pages/ClientLink/chat/agentToolCallDisplay.util.js";

test("shortenPath keeps tail segments", () => {
  assert.equal(
    shortenPath("/app/projects/foo/src/components/Card.tsx"),
    ".../components/Card.tsx",
  );
});

test("parseLegacyToolResultPreview extracts path and diff", () => {
  const legacy = parseLegacyToolResultPreview(
    JSON.stringify({
      path: "/app/src/App.tsx",
      diffString: "-old\n+new",
    }),
  );
  assert.equal(legacy?.targetPath, "/app/src/App.tsx");
  assert.equal(legacy?.diffPreview, "-old\n+new");
});

test("resolveToolCallDisplay never surfaces raw JSON in detail", () => {
  const display = resolveToolCallDisplay({
    toolName: "Edit",
    toolKind: "edit",
    label: "edit",
    status: "success",
    resultPreview: JSON.stringify({
      path: "/app/src/MarketingRoles.tsx",
      diffString: "-removed\n+added",
    }),
  });
  assert.equal(display.detail, ".../src/MarketingRoles.tsx");
  assert.equal(display.diffPreview, "-removed\n+added");
  assert.equal(display.diffAdded, 1);
  assert.equal(display.diffRemoved, 1);
  assert.equal(display.resultPreview, undefined);
  assert.equal(looksLikeJsonObject(display.detail), false);
});

test("countUnifiedDiffLineStats ignores unified-diff headers", () => {
  const stats = countUnifiedDiffLineStats(
    "--- a/File.tsx\n+++ b/File.tsx\n@@ -1 +1 @@\n-old\n+new",
  );
  assert.equal(stats.added, 1);
  assert.equal(stats.removed, 1);
});

test("resolveToolCallDisplay uses structured diff stats when present", () => {
  const display = resolveToolCallDisplay({
    toolName: "Edit",
    toolKind: "edit",
    targetPath: "/app/src/File.tsx",
    diffPreview: "--- a/File.tsx\n+++ b/File.tsx\n+line",
    diffAdded: 47,
    diffRemoved: 12,
    status: "success",
  });
  assert.equal(display.diffAdded, 47);
  assert.equal(display.diffRemoved, 12);
});

test("resolveToolCallDisplay prefers structured fields over legacy", () => {
  const display = resolveToolCallDisplay({
    toolName: "Edit",
    toolKind: "edit",
    targetPath: "/app/src/File.tsx",
    diffPreview: "+line",
    status: "success",
  });
  assert.equal(display.detail, ".../src/File.tsx");
  assert.equal(display.diffPreview, "+line");
});

test("resolveToolCallDisplay shows shell stdout as plain text", () => {
  const display = resolveToolCallDisplay({
    toolName: "Shell",
    toolKind: "shell",
    command: "echo hi",
    status: "success",
    resultPreview: "hi\n",
  });
  assert.equal(display.detail, "echo hi");
  assert.equal(display.resultPreview, "hi");
});

test("resolveToolCallDisplay labels Task cards as subagent title plus prompt", () => {
  const display = resolveToolCallDisplay({
    toolName: "Verifier",
    toolKind: "subagent",
    label: "Check auth middleware.",
    status: "running",
  });
  assert.equal(display.toolName, "Verifier");
  assert.equal(display.toolKind, "subagent");
  assert.equal(display.detail, "Check auth middleware.");
});

test("resolveToolCallDisplay labels spawn-subagent.sh shells as Subagent (CLI)", () => {
  const display = resolveToolCallDisplay({
    toolName: "Shell",
    toolKind: "shell",
    command: ".cursor/skills/spawn-subagents/scripts/spawn-subagent.sh --background -- \"review\"",
    status: "running",
  });
  assert.equal(display.toolName, "Subagent (CLI)");
  assert.equal(display.detail.includes("spawn-subagent.sh"), true);
});
