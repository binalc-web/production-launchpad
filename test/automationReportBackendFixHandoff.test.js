import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAutomationReportFixPrompt,
  buildSelectedFixesExcerpt,
  normalizeReportFixDecision,
  resolveAutomationReportProjectOptions,
} from "../src/utils/automationReportBackendFixHandoff.util.js";

test("buildAutomationReportFixPrompt includes excerpt and repo context", () => {
  const prompt = buildAutomationReportFixPrompt({
    excerpt: "API latency increased.",
    jobName: "Weekly scan",
    repoPath: "github.com/acme/api",
    branch: "main",
  });
  assert.match(prompt, /Weekly scan/);
  assert.match(prompt, /github.com\/acme\/api @ main/);
  assert.match(prompt, /API latency increased/);
});

test("buildAutomationReportFixPrompt limits a selected-options handoff to those fixes", () => {
  const prompt = buildAutomationReportFixPrompt({
    excerpt: "## Add index\n\nCreate an index on orders.created_at.",
    jobName: "Weekly scan",
    selectedFixes: true,
  });
  assert.match(prompt, /only the selected fixes/i);
  assert.match(prompt, /Selected fixes:/);
  assert.match(prompt, /Add index/);
  assert.doesNotMatch(prompt, /Report excerpt:/);
});

test("buildSelectedFixesExcerpt keeps the chosen options in report order", () => {
  const excerpt = buildSelectedFixesExcerpt(
    [
      {
        id: "fix-1",
        title: "Raise timeout",
        summary: "Calls time out.",
        prompt: "Increase timeout.",
      },
      { id: "fix-2", title: "Add index", summary: "Lookups scan.", prompt: "Index created_at." },
    ],
    ["fix-2"],
  );
  assert.match(excerpt, /## Add index/);
  assert.match(excerpt, /Index created_at\./);
  assert.doesNotMatch(excerpt, /Raise timeout/);
});

test("normalizeReportFixDecision treats a missing payload as unavailable and an absent one as loading", () => {
  assert.equal(normalizeReportFixDecision(undefined), null);
  assert.deepEqual(normalizeReportFixDecision(null), { status: "unavailable" });
  assert.deepEqual(normalizeReportFixDecision({ status: "none" }), { status: "none" });
});

test("resolveAutomationReportProjectOptions prefers run project id with label", () => {
  const options = resolveAutomationReportProjectOptions(
    {
      targets: [
        { projectId: 1, project: { name: "Alpha" } },
        { projectId: 2, project: { name: "Beta" } },
      ],
    },
    2,
  );
  assert.deepEqual(options, [{ projectId: 2, label: "Beta" }]);
});

test("resolveAutomationReportProjectOptions dedupes job targets", () => {
  const options = resolveAutomationReportProjectOptions({
    targets: [{ projectId: 3, project: { name: "Gamma" } }],
    documentTargets: [{ projectId: 3, project: { name: "Gamma" } }],
  });
  assert.equal(options.length, 1);
  assert.equal(options[0].projectId, 3);
  assert.equal(options[0].label, "Gamma");
});
