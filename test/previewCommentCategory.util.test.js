import test from "node:test";
import assert from "node:assert/strict";
import {
  PREVIEW_COMMENT_CATEGORY_LABELS,
  PREVIEW_COMMENT_CATEGORY_HELPER_TEXT,
  PREVIEW_COMMENT_CATEGORY_PLACEHOLDERS,
  PREVIEW_COMMENT_CATEGORY_VALIDATION,
  PREVIEW_COMMENT_CATEGORY_SUBMIT_LABELS,
  normalizePreviewCommentCategory,
  previewCommentCategoryLabel,
  previewCommentElementLabel,
} from "../src/lib/previewCommentCategory.util.js";

test("preview comment category labels use plain-language copy", () => {
  assert.equal(PREVIEW_COMMENT_CATEGORY_LABELS.comments, "What to change");
  assert.equal(PREVIEW_COMMENT_CATEGORY_LABELS.logic, "How it should work");
});

test("preview comment helper text is defined for each category", () => {
  assert.match(PREVIEW_COMMENT_CATEGORY_HELPER_TEXT.comments, /different/i);
  assert.match(PREVIEW_COMMENT_CATEGORY_HELPER_TEXT.logic, /rules|behavior/i);
});

test("preview comment placeholders and validation align with categories", () => {
  assert.ok(PREVIEW_COMMENT_CATEGORY_PLACEHOLDERS.comments.length > 0);
  assert.ok(PREVIEW_COMMENT_CATEGORY_PLACEHOLDERS.logic.length > 0);
  assert.match(PREVIEW_COMMENT_CATEGORY_VALIDATION.comments, /change/i);
  assert.match(PREVIEW_COMMENT_CATEGORY_VALIDATION.logic, /work/i);
  assert.equal(PREVIEW_COMMENT_CATEGORY_SUBMIT_LABELS.comments, "Post feedback");
  assert.equal(PREVIEW_COMMENT_CATEGORY_SUBMIT_LABELS.logic, "Save rules");
});

test("normalizePreviewCommentCategory maps legacy values", () => {
  assert.equal(normalizePreviewCommentCategory("functionality"), "comments");
  assert.equal(normalizePreviewCommentCategory("logic"), "logic");
  assert.equal(normalizePreviewCommentCategory("unknown"), "comments");
});

test("previewCommentCategoryLabel returns renamed labels", () => {
  assert.equal(previewCommentCategoryLabel("comments"), "What to change");
  assert.equal(previewCommentCategoryLabel("logic"), "How it should work");
});

test("previewCommentElementLabel prefers react component stack", () => {
  assert.equal(
    previewCommentElementLabel({
      anchor: { reactComponentStack: ["LoginForm", "div"], tag: "button" },
    }),
    "LoginForm",
  );
  assert.equal(previewCommentElementLabel({ anchor: { tag: "button" } }), "button");
  assert.equal(previewCommentElementLabel({}), "Element");
});
