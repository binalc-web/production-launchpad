import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Regression: SentryIssueBadge on /projects/details/:id rendered
 * "RND-LAUNCHPAD-E8 · error" as a cramped multi-line wrap when Badge
 * defaulted to whitespace-normal + break-words + min-w-0.
 */
const badgeSource = readFileSync(
  new URL("../src/components/ui/badge.jsx", import.meta.url),
  "utf8",
);

const baseMatch = badgeSource.match(/cva\(\s*"([^"]+)"/);

test("Badge base variants stay compact single-line (no default word-break wrap)", () => {
  assert.ok(baseMatch, "expected badgeVariants cva base string");
  const base = baseMatch[1];
  assert.match(base, /\bwhitespace-nowrap\b/);
  assert.doesNotMatch(base, /\bwhitespace-normal\b/);
  assert.doesNotMatch(base, /\bbreak-words\b/);
  assert.doesNotMatch(base, /\bmin-w-0\b/);
  assert.match(base, /\binline-flex\b/);
  assert.match(base, /\brounded-full\b/);
  assert.match(base, /\boverflow-hidden\b/);
});
