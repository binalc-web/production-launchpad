import test from "node:test";
import assert from "node:assert/strict";
import { dedupeConsecutiveStreamLines } from "../src/lib/clientLinkLiveStreamText.js";

test("dedupeConsecutiveStreamLines removes repeated adjacent lines", () => {
  const input =
    "Searching the codebase for that dashboard subtitle so we can update it.\n" +
    "Checking prior context and design specs for the intended replacement text.\n" +
    "Checking prior context and design specs for the intended replacement text.";
  const out = dedupeConsecutiveStreamLines(input);
  assert.equal(
    out,
    "Searching the codebase for that dashboard subtitle so we can update it.\n" +
      "Checking prior context and design specs for the intended replacement text.",
  );
});
