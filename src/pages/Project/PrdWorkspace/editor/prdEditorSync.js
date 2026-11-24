import { hashTipTapContent } from "./prdContentHash.js";

/**
 * Apply external JSON content without emitting update; preserve selection when possible.
 * @param {import('@tiptap/react').Editor} editor
 * @param {object} content
 */
export function applyExternalEditorContent(editor, content) {
  if (!editor || editor.isDestroyed) return;

  const incomingHash = hashTipTapContent(content);
  const currentHash = hashTipTapContent(editor.getJSON());
  if (incomingHash === currentHash) return;

  const { from, to } = editor.state.selection;
  const wasFocused = editor.isFocused;

  editor.commands.setContent(content, { emitUpdate: false });

  if (wasFocused) {
    const maxPos = editor.state.doc.content.size;
    const safeFrom = Math.min(from, maxPos);
    const safeTo = Math.min(to, maxPos);
    editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
    requestAnimationFrame(() => {
      if (!editor.isDestroyed) editor.view.focus();
    });
  }
}
