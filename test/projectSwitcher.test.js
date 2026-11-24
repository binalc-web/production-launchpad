import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("project switcher search keeps keystrokes out of Radix typeahead", () => {
  const source = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/ProjectSwitcher.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  assert.match(source, />\s*Recent\s*</);
  assert.match(source, />\s*Favorites\s*</);
  assert.match(source, /partitionSwitcherProjects/);
  assert.match(source, /placeholder="Search projects…"/);
  assert.match(
    source,
    /onPointerDown=\{\(e\) => e\.stopPropagation\(\)\}[\s\S]*placeholder="Search projects…"/,
  );
  assert.match(
    source,
    /onKeyDown=\{\(e\) => \{[\s\S]*if \(e\.key === "Escape"\) return;[\s\S]*e\.stopPropagation\(\);/,
  );
});
