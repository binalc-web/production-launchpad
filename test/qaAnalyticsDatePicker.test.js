import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatQaDateOnly, parseQaDateOnly } from "../src/pages/QaAnalytics/qaAnalyticsDisplay.js";

const readSource = (rel) =>
  readFileSync(new URL(`../src/pages/QaAnalytics/${rel}`, import.meta.url), "utf8");

test("QA Analytics filters use the standard calendar picker, not the native date dialog", () => {
  for (const rel of [
    "components/QaAnalyticsFilterRail.jsx",
    "components/QaAnalyticsProjectFilterRail.jsx",
  ]) {
    const source = readSource(rel);
    assert.doesNotMatch(source, /type="date"/, `${rel} must not render a native date input`);
    assert.match(source, /QaAnalyticsDatePicker/, `${rel} must use the shared date picker`);
  }
  const picker = readSource("components/QaAnalyticsDatePicker.jsx");
  assert.match(
    picker,
    /DatePickerSingle/,
    "picker must reuse the project-standard DatePickerSingle",
  );
});

test("parseQaDateOnly / formatQaDateOnly round-trip a calendar day without timezone shift", () => {
  const date = parseQaDateOnly("2026-10-20");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 20);
  assert.equal(formatQaDateOnly(date), "2026-10-20");
  // Values stored with a time suffix still resolve to their date part.
  assert.equal(formatQaDateOnly(parseQaDateOnly("2026-10-20T00:00:00.000Z")), "2026-10-20");
});

test("parseQaDateOnly rejects missing or invalid values", () => {
  assert.equal(parseQaDateOnly(""), null);
  assert.equal(parseQaDateOnly(undefined), null);
  assert.equal(parseQaDateOnly("20/10/2026"), null);
  assert.equal(parseQaDateOnly("2026-02-31"), null);
  assert.equal(formatQaDateOnly(null), "");
});
