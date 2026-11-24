import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const panelPath = fileURLToPath(
  new URL(
    "../src/pages/Project/ProductManagement/panels/BacklogSuggestionsPanel.jsx",
    import.meta.url,
  ),
);
const panel = readFileSync(panelPath, "utf8");

test("BacklogSuggestionsPanel offers a visible 'Select all epics' option", () => {
  assert.match(panel, /id="backlog-suggestions-select-all-epics"/);
  assert.match(panel, /aria-label="Select all epics"/);
  assert.match(panel, />\s*Select all epics\s*<\/label>/);
  assert.match(panel, /htmlFor="backlog-suggestions-select-all-epics"/);
});

test("select-all selects every epic unless all are already selected", () => {
  // From none/partial (indeterminate) it approves all; only a full selection clears.
  assert.match(
    panel,
    /const nextStatus = allEpicsSelected \? "pending" : "approved";/,
  );
  assert.match(
    panel,
    /for \(const s of result\?\.suggestions \?\? \[\]\) \{\s*setDecision\(s\.id, nextStatus\);/,
  );
  // Must not trust the raw checkbox value, which can be "indeterminate".
  assert.doesNotMatch(panel, /checked === true \? "approved" : "pending"/);
});

test("select-all reflects selection state and individual toggling stays intact", () => {
  assert.match(
    panel,
    /checked=\{someEpicsSelected \? "indeterminate" : allEpicsSelected\}/,
  );
  assert.match(panel, /data-\[state=indeterminate\]:bg-primary/);
  assert.match(
    panel,
    /\{approvedList\.length\} of \{totalEpics\} \{totalEpics === 1 \? "epic" : "epics"\}/,
  );
  // Per-epic header toggle still flips a single suggestion.
  assert.match(
    panel,
    /const toggleThis = \(\) => setDecision\(s\.id, selected \? "pending" : "approved"\);/,
  );
});
