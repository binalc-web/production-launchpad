import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyUnifiedDiffToContent } from "../src/pages/Project/ProjectDetails/components/devIde/applyUnifiedDiffToContent.js";

describe("applyUnifiedDiffToContent", () => {
  it("applies a simple line replacement hunk", () => {
    const original = ["a", "b", "c", "d"].join("\n");
    const diff = ["@@ -1,4 +1,4 @@", " a", "-b", "+B", " c", " d"].join("\n");
    assert.equal(applyUnifiedDiffToContent(original, diff), ["a", "B", "c", "d"].join("\n"));
  });

  it("applies an insertion near the top (comment marker)", () => {
    const original = ["import x from 'y';", "", "export function f() {}"].join("\n");
    const diff = [
      "@@ -1,3 +1,4 @@",
      "+// LaunchPad plan-mode test",
      " import x from 'y';",
      " ",
      " export function f() {}",
    ].join("\n");
    assert.equal(
      applyUnifiedDiffToContent(original, diff),
      ["// LaunchPad plan-mode test", "import x from 'y';", "", "export function f() {}"].join(
        "\n",
      ),
    );
  });

  it("returns null when hunk context does not match", () => {
    const original = "hello\nworld";
    const diff = ["@@ -1,2 +1,2 @@", "-nope", "+yes", " world"].join("\n");
    assert.equal(applyUnifiedDiffToContent(original, diff), null);
  });
});
