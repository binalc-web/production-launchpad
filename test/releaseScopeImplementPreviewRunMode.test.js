import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  scopeImplementStartApiPayload,
  scopeImplementStartToastMessage,
  scopeImplementActiveRunStatusMessage,
} from "../src/pages/Project/ProjectDetails/utils/scopeImplementRunMode.js";

const panelPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/pages/Project/ProjectDetails/components/ReleaseScopePanel.jsx",
);

test("Preview start payload is always sequential (ignores Application run mode)", () => {
  assert.deepEqual(scopeImplementStartApiPayload("platform", "all_parallel"), {
    execution: "sequential",
  });
  assert.deepEqual(scopeImplementStartApiPayload("platform", "all_combined"), {
    execution: "sequential",
  });
  assert.deepEqual(scopeImplementStartApiPayload("platform", "all_sequential"), {
    execution: "sequential",
  });
  assert.deepEqual(scopeImplementStartApiPayload("platform", "one_at_a_time"), {
    execution: "sequential",
  });
});

test("Application start payload still honors chosen run mode", () => {
  assert.deepEqual(scopeImplementStartApiPayload("development", "one_at_a_time"), {
    execution: "sequential",
  });
  assert.deepEqual(scopeImplementStartApiPayload("development", "all_parallel"), {
    execution: "batch",
    batchMode: "parallel_agents_separate_prs",
  });
  assert.deepEqual(scopeImplementStartApiPayload("development", "all_sequential"), {
    execution: "batch",
    batchMode: "sequential_agents_shared_pr",
  });
  assert.deepEqual(scopeImplementStartApiPayload("development", "all_combined"), {
    execution: "batch",
    batchMode: "single_agent_shared_pr",
  });
});

test("Preview toast and active status avoid PR wording", () => {
  const toast = scopeImplementStartToastMessage("platform", "all_parallel");
  assert.match(toast, /force-merge to preview main/i);
  assert.match(toast, /follow-ups after the first/i);
  assert.doesNotMatch(toast, /\bPR\b/i);

  const status = scopeImplementActiveRunStatusMessage({
    target: "platform",
    isSequentialSharedPrRun: false,
    isSequentialSeparatePrRun: true,
    isParallelBatchRun: false,
    isCombinedBatchRun: false,
  });
  assert.match(status, /force-merges to preview main/i);
  assert.match(status, /follow-ups after the first/i);
  assert.doesNotMatch(status, /pull request/i);
});

test("Application toast and status keep PR wording", () => {
  assert.match(scopeImplementStartToastMessage("development", "one_at_a_time"), /separate PRs/);
  assert.match(
    scopeImplementActiveRunStatusMessage({
      target: "development",
      isSequentialSharedPrRun: true,
      isSequentialSeparatePrRun: false,
      isParallelBatchRun: false,
      isCombinedBatchRun: false,
    }),
    /shared pull request/,
  );
});

test("Preview confirm dialog omits run-mode radios; Application keeps them", () => {
  const source = readFileSync(panelPath, "utf8");
  assert.match(source, /implementConfirmIsDev\s*\?\s*\(/);
  assert.match(source, /How should agents run\?/);
  assert.match(source, /How agents run/);
  assert.match(source, /force-merges to preview/);
  assert.match(source, /follow-ups after the first/);
  assert.match(source, /name="implement-run-mode"/);
  assert.match(source, /scopeImplementStartApiPayload\(target,\s*implementRunMode\)/);
});
