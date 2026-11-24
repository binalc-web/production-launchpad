import assert from "node:assert/strict";
import test from "node:test";
import {
  PLAN_TAB_KEY,
  PLAN_TAB_PATH,
  planCacheFromMarkdown,
  upsertPlanTabInList,
} from "../src/pages/Project/ProjectDetails/components/devIde/devIdePlanTab.util.js";
import { splitJobReportMarkdown } from "../src/pages/Jobs/utils/mermaidChart.util.js";

test("upsertPlanTabInList adds a single plan tab", () => {
  const once = upsertPlanTabInList([]);
  assert.equal(once.length, 1);
  assert.equal(once[0].key, PLAN_TAB_KEY);
  assert.equal(once[0].kind, "plan");
  assert.equal(once[0].path, PLAN_TAB_PATH);

  const twice = upsertPlanTabInList(once);
  assert.equal(twice.length, 1);
  assert.equal(twice, once);
});

test("planCacheFromMarkdown requires non-empty markdown", () => {
  assert.equal(planCacheFromMarkdown(""), null);
  assert.equal(planCacheFromMarkdown("   "), null);
  assert.deepEqual(planCacheFromMarkdown("# Plan\n"), { markdown: "# Plan\n" });
});

test("splitJobReportMarkdown isolates mermaid fences for plan preview", () => {
  const segments = splitJobReportMarkdown(`# Goal

Intro

\`\`\`mermaid
flowchart LR
  a --> b
\`\`\`

## Steps
1. Do work
`);
  assert.equal(
    segments.some((s) => s.type === "mermaid"),
    true,
  );
  assert.equal(
    segments.some((s) => s.type === "markdown" && s.content.includes("Goal")),
    true,
  );
});

test("extractPlanHeading returns the first markdown heading for the collapsed plan row", async () => {
  const { extractPlanHeading } = await import(
    "../src/pages/Project/ProjectDetails/components/devIde/devIdePlanTab.util.js"
  );
  assert.equal(extractPlanHeading("intro\n\n## Swap Preview icon ##\n\n### Goal"), "Swap Preview icon");
  assert.equal(extractPlanHeading("no heading here"), "");
  assert.equal(extractPlanHeading(null), "");
});
