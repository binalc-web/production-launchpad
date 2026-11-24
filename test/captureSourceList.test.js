import assert from "node:assert/strict";
import test from "node:test";
import {
  captureFilterOptions,
  captureTypeFilterId,
  describeCaptureSource,
  filterAndSortCaptureItems,
  formatCaptureCreatedAt,
} from "../src/lib/captureSourceList.js";

function item(partial) {
  return {
    id: partial.id,
    label: partial.label,
    typeLabel: partial.typeLabel || "Note",
    preview: partial.preview || "",
    createdAt: partial.createdAt,
    entry: {
      type: partial.type || "text_note",
      title: partial.label,
      body: partial.body || "",
      createdAt: partial.createdAt,
      engagementPhase: partial.phase || null,
      meta: partial.meta || {},
      extractedData: partial.extractedData || {},
      appliedToPersonas: partial.appliedToPersonas || {},
    },
  };
}

const notes = item({
  id: "note",
  label: "Kickoff notes",
  createdAt: "2026-01-02T00:00:00.000Z",
  body: "Discuss billing",
  phase: "kickoff",
  extractedData: { goals: ["Ship billing"] },
});

const granola = item({
  id: "granola",
  label: "Sales call",
  typeLabel: "Granola meeting",
  createdAt: "2026-03-01T00:00:00.000Z",
  type: "text_note",
  meta: { source: "granola", externalNoteId: "note_123" },
  phase: "first_call",
  body: "Pricing came up",
});

const pdf = item({
  id: "pdf",
  label: "Brief",
  typeLabel: "PDF",
  createdAt: "2026-02-01T00:00:00.000Z",
  type: "file_upload",
  meta: { mimeType: "application/pdf", fileName: "brief.pdf" },
  body: "",
});

test("classifies granola and files separately from plain notes", () => {
  assert.equal(captureTypeFilterId(granola.entry), "granola");
  assert.equal(captureTypeFilterId(notes.entry), "text_note");
  assert.equal(captureTypeFilterId(pdf.entry), "file_upload");
});

test("describes created date, source, phase, file, and insights", () => {
  const details = describeCaptureSource(granola);
  assert.equal(details.sourceLabel, "Granola");
  assert.equal(details.phaseLabel, "First call");
  assert.equal(details.externalNoteId, "note_123");
  assert.equal(details.bodyLength, "Pricing came up".length);
  assert.ok(formatCaptureCreatedAt(granola.createdAt));
  assert.equal(formatCaptureCreatedAt("not-a-date"), "");

  const file = describeCaptureSource(pdf);
  assert.equal(file.mimeLabel, "PDF");
  assert.equal(file.fileName, "brief.pdf");
  assert.equal(file.extractedCount, 0);

  const note = describeCaptureSource(notes);
  assert.equal(note.extractedCount, 1);
  assert.deepEqual(note.extractedGroups[0].items, ["Ship billing"]);
});

test("filters by type, content, and search, then sorts oldest first", () => {
  const items = [granola, notes, pdf];
  const notesOnly = filterAndSortCaptureItems(items, { typeFilter: "text_note" });
  assert.deepEqual(
    notesOnly.map((row) => row.id),
    ["note"],
  );

  const withInsights = filterAndSortCaptureItems(items, { contentFilter: "extracted" });
  assert.deepEqual(
    withInsights.map((row) => row.id),
    ["note"],
  );

  const searched = filterAndSortCaptureItems(items, { query: "brief.pdf" });
  assert.deepEqual(
    searched.map((row) => row.id),
    ["pdf"],
  );

  const oldest = filterAndSortCaptureItems(items, { sort: "oldest" });
  assert.deepEqual(
    oldest.map((row) => row.id),
    ["note", "pdf", "granola"],
  );
});

test("filter options count only types that exist and include a no-phase choice", () => {
  const unphased = item({
    id: "loose",
    label: "Loose note",
    createdAt: "2026-04-01T00:00:00.000Z",
  });
  const options = captureFilterOptions([notes, granola, unphased]);
  assert.deepEqual(
    options.types.map((filter) => filter.id),
    ["all", "text_note", "granola"],
  );
  assert.equal(options.types[0].count, 3);
  assert.ok(options.phases.some((phase) => phase.id === "none"));
  assert.ok(options.sources.some((source) => source.id === "granola"));
});
