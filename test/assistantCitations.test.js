import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEmbedConsolePath,
  citationToInspector,
} from "../src/lib/assistantCitations.js";

test("citationToInspector maps backlog stories to the board", () => {
  const loc = citationToInspector({ sourceType: "backlog_story", projectId: 12, label: "Login" });
  assert.equal(loc.section, "backlog");
  assert.equal(loc.area, "board");
  assert.equal(loc.projectId, "12");
});

test("embed console path includes embed=1", () => {
  const path = buildEmbedConsolePath("9", { section: "releases", area: "overview" });
  assert.match(path, /embed=1/);
  assert.match(path, /section=releases/);
});
