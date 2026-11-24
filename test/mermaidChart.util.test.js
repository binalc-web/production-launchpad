import test from "node:test";
import assert from "node:assert/strict";
import {
  isMermaidLanguageClass,
  looksLikeMermaidChart,
  splitJobReportMarkdown,
} from "../src/pages/Jobs/utils/mermaidChart.util.js";

test("looksLikeMermaidChart accepts flowchart diagrams", () => {
  assert.equal(looksLikeMermaidChart("flowchart LR\n  A --> B"), true);
});

test("looksLikeMermaidChart rejects plain text or code", () => {
  assert.equal(looksLikeMermaidChart('const x = 1;\nconsole.log("hi");'), false);
  assert.equal(looksLikeMermaidChart("Error: something failed"), false);
});

test("isMermaidLanguageClass matches language-mermaid only", () => {
  assert.equal(isMermaidLanguageClass("language-mermaid"), true);
  assert.equal(isMermaidLanguageClass("language-json"), false);
});

test("splitJobReportMarkdown returns single markdown segment when no fences", () => {
  const md = "# Report\n\n- bullet one";
  const segments = splitJobReportMarkdown(md);
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0], { type: "markdown", content: md });
});

test("splitJobReportMarkdown extracts valid mermaid chart between markdown", () => {
  const md = [
    "# Report",
    "",
    "Before chart.",
    "",
    "```mermaid",
    "flowchart LR",
    "  A --> B",
    "```",
    "",
    "After chart.",
  ].join("\n");

  const segments = splitJobReportMarkdown(md);
  assert.equal(segments.length, 3);
  assert.equal(segments[0].type, "markdown");
  assert.match(segments[0].content, /Before chart\./);
  assert.equal(segments[1].type, "mermaid");
  assert.equal(segments[1].content, "flowchart LR\n  A --> B");
  assert.equal(segments[2].type, "markdown");
  assert.match(segments[2].content, /After chart\./);
});

test("splitJobReportMarkdown keeps invalid mermaid fence in markdown", () => {
  const fence = ["```mermaid", "not a real chart", "```"].join("\n");
  const md = `# Report\n\n${fence}`;
  const segments = splitJobReportMarkdown(md);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].type, "markdown");
  assert.match(segments[0].content, /```mermaid/);
  assert.match(segments[0].content, /not a real chart/);
});
