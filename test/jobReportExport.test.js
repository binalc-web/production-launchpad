import test from "node:test";
import assert from "node:assert/strict";
import { jobReportPdfFileName } from "../src/pages/Jobs/utils/jobReportExport.js";

test("jobReportPdfFileName prefers markdown title", () => {
  const name = jobReportPdfFileName("# Requirements Document — Mattar\n\nBody", "Weekly scan");
  assert.equal(name, "Requirements_Document_Mattar");
});

test("jobReportPdfFileName falls back to job label", () => {
  const name = jobReportPdfFileName("Plain report text", "Mattar automation");
  assert.equal(name, "Mattar_automation");
});

test("jobReportPdfFileName uses default when empty", () => {
  assert.equal(jobReportPdfFileName("", ""), "automation-report");
});
