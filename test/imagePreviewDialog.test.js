import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const dialog = read("../src/components/images/ImagePreviewDialog.jsx");
const chips = read("../src/components/chat/ChatAttachmentChips.jsx");
const messages = read("../src/components/chat/ChatMessageAttachments.jsx");
const qa = read("../src/pages/Project/ProjectDetails/components/ProjectQaReportsPanel.jsx");
const hook = read("../src/hooks/useChatAttachments.js");

test("ImagePreviewDialog wires zoom controls, load/error states and pinch", () => {
  for (const token of ["ZoomIn", "ZoomOut", "RotateCcw", "onLoad", "onError", "object-contain", "ImageOff", "Open original", "onPointerDown", "onPointerMove", "setPointerCapture", "scaleFromPinchDistance", "onWheel", "onDoubleClick"]) {
    assert.ok(dialog.includes(token), `dialog missing ${token}`);
  }
  assert.ok(dialog.includes("touch-none"));
  assert.ok(dialog.includes("max-h-[85vh]"));
  assert.ok(dialog.includes("w-[min(96vw,1200px)]"));
});

test("staged and persisted thumbnails open the shared dialog with error fallback", () => {
  assert.ok(chips.includes("ImagePreviewDialog"));
  assert.ok(chips.includes("size-11 rounded-md object-cover"));
  assert.ok(chips.includes("ImageOff"));
  assert.ok(chips.includes("stopPropagation"));
  assert.ok(messages.includes("ImagePreviewDialog"));
  assert.ok(messages.includes("ImageOff"));
  // Non-image persisted attachments keep their link rendering.
  assert.ok(messages.includes('target="_blank"'));
});

test("QA screenshots open the dialog while video and trace tiles remain", () => {
  assert.ok(qa.includes("ImagePreviewDialog"));
  assert.ok(qa.includes("selectedImage"));
  assert.ok(qa.includes("ScreenshotThumb"));
  assert.ok(qa.includes("Film"));
  assert.ok(qa.includes("Video"));
  assert.ok(qa.includes("Trace"));
  assert.ok(qa.includes("Move to Feedback Fix"));
});

test("useChatAttachments only revokes blob URLs at lifecycle ends", () => {
  assert.ok(hook.includes("revokeBlobPreviewUrl"));
  assert.ok(hook.includes("hasServerUrl ? record.url : previewUrl"));
  assert.ok(hook.includes("itemsRef.current.forEach"));
  assert.ok(!hook.includes("previewUrl: previewUrl || record.url"));
});
