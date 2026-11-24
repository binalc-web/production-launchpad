import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_ATTACH_MAX_BYTES,
  chatComposerCanSend,
  classifyChatAttachFile,
  chatAttachFileError,
  chatAttachFilesFromClipboard,
  isBlobPreviewUrl,
  revokeBlobPreviewUrl,
} from "../src/lib/chatAttachments.js";

test("chatAttachFilesFromClipboard picks pasted screenshots and ignores text", () => {
  const shot = { name: "image.png", type: "image/png", size: 10 };
  assert.deepEqual(
    chatAttachFilesFromClipboard({
      files: [],
      items: [
        { kind: "string", type: "text/plain", getAsFile: () => null },
        { kind: "file", type: "image/png", getAsFile: () => shot },
      ],
    }),
    [shot],
  );
  const pdf = { name: "spec.pdf", type: "application/pdf", size: 10 };
  const txt = { name: "a.txt", type: "text/plain", size: 10 };
  assert.deepEqual(chatAttachFilesFromClipboard({ files: [txt, pdf], items: [] }), [pdf]);
  assert.deepEqual(chatAttachFilesFromClipboard({ files: [], items: [] }), []);
  assert.deepEqual(chatAttachFilesFromClipboard(null), []);
});

test("classifyChatAttachFile accepts png jpeg webp and pdf", () => {
  assert.equal(classifyChatAttachFile({ name: "a.png", type: "image/png", size: 10 }), "image");
  assert.equal(classifyChatAttachFile({ name: "a.jpg", type: "image/jpeg", size: 10 }), "image");
  assert.equal(classifyChatAttachFile({ name: "a.webp", type: "image/webp", size: 10 }), "image");
  assert.equal(
    classifyChatAttachFile({ name: "notes.pdf", type: "application/pdf", size: 10 }),
    "pdf",
  );
  assert.equal(
    classifyChatAttachFile({ name: "notes.md", type: "text/markdown", size: 10 }),
    "markdown",
  );
  assert.equal(classifyChatAttachFile({ name: "notes.md", type: "", size: 10 }), "markdown");
  assert.equal(classifyChatAttachFile({ name: "a.gif", type: "image/gif", size: 10 }), null);
  assert.equal(classifyChatAttachFile({ name: "a.txt", type: "text/plain", size: 10 }), null);
});

test("chatAttachFileError enforces size", () => {
  assert.match(
    chatAttachFileError({ name: "x.exe", type: "application/octet-stream", size: 10 }),
    /Unsupported/,
  );
  assert.match(
    chatAttachFileError({
      name: "big.pdf",
      type: "application/pdf",
      size: CHAT_ATTACH_MAX_BYTES + 1,
    }),
    /10 MB/,
  );
  assert.equal(chatAttachFileError({ name: "ok.png", type: "image/png", size: 12 }), null);
});

test("revokeBlobPreviewUrl never revokes non-blob server URLs", () => {
  assert.equal(isBlobPreviewUrl("blob:https://x/1"), true);
  assert.equal(isBlobPreviewUrl("https://cdn.example/a.png"), false);
  assert.equal(isBlobPreviewUrl(null), false);
  const revoked = [];
  const revoke = (u) => revoked.push(u);
  assert.equal(revokeBlobPreviewUrl("https://cdn.example/a.png", revoke), false);
  assert.equal(revokeBlobPreviewUrl("blob:https://x/1", revoke), true);
  assert.deepEqual(revoked, ["blob:https://x/1"]);
});

test("chatComposerCanSend allows attachments without text", () => {
  assert.equal(
    chatComposerCanSend({ draft: "", disabled: false, attachEnabled: true, attachmentCount: 1 }),
    true,
  );
  assert.equal(
    chatComposerCanSend({
      draft: "",
      disabled: false,
      attachEnabled: true,
      attachmentCount: 1,
      uploading: true,
    }),
    false,
  );
  assert.equal(chatComposerCanSend({ draft: "", attachEnabled: false, attachmentCount: 1 }), false);
  assert.equal(
    chatComposerCanSend({ draft: "hello", attachEnabled: false, attachmentCount: 0 }),
    true,
  );
  assert.equal(chatComposerCanSend({ draft: "hello", disabled: true }), false);
});
