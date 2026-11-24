import test from "node:test";
import assert from "node:assert/strict";
import { formatChatPromptTimestamp } from "../src/lib/formatChatPromptTimestamp.js";

test("formatChatPromptTimestamp uses 25 Aug, 2026 03:45 PM style", () => {
  const d = new Date(2026, 7, 25, 15, 45, 0);
  assert.equal(formatChatPromptTimestamp(d), "25 Aug, 2026 03:45 PM");
});

test("formatChatPromptTimestamp pads single-digit hours and uses AM", () => {
  const d = new Date(2026, 0, 5, 9, 5, 0);
  assert.equal(formatChatPromptTimestamp(d), "5 Jan, 2026 09:05 AM");
});

test("formatChatPromptTimestamp maps midnight and noon", () => {
  assert.equal(formatChatPromptTimestamp(new Date(2026, 7, 25, 0, 0, 0)), "25 Aug, 2026 12:00 AM");
  assert.equal(formatChatPromptTimestamp(new Date(2026, 7, 25, 12, 0, 0)), "25 Aug, 2026 12:00 PM");
});

test("formatChatPromptTimestamp returns null for invalid values", () => {
  assert.equal(formatChatPromptTimestamp(null), null);
  assert.equal(formatChatPromptTimestamp(""), null);
  assert.equal(formatChatPromptTimestamp("not-a-date"), null);
});
