import test from "node:test";
import assert from "node:assert/strict";
import { formatSingleHubMeetingToPlainText } from "../src/utils/hubMeetingNotes.js";

test("formatSingleHubMeetingToPlainText joins notes string arrays with blank lines", () => {
  const out = formatSingleHubMeetingToPlainText({
    title: "Subscription landscape",
    date: "2026-04-21",
    notes: ["First paragraph.", "Second paragraph."],
  });
  assert.match(out, /### 2026-04-21 — Subscription landscape/);
  assert.match(out, /First paragraph\./);
  assert.match(out, /Second paragraph\./);
  assert.match(out, /First paragraph\.\n\nSecond paragraph\./);
});

test("formatSingleHubMeetingToPlainText preserves string notes", () => {
  const out = formatSingleHubMeetingToPlainText({
    title: "Kickoff",
    notes: "Single block of notes.",
  });
  assert.match(out, /Single block of notes\./);
});
