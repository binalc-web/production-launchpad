/**
 * Release tldraw focus so email/description inputs receive keystrokes and paste
 * instead of tldraw shortcuts / document clipboard handlers.
 *
 * Must clear `isFocused` (via editor.blur) — not `isFocusMode` — so tldraw
 * detaches its document-level paste/copy/cut listeners and body hotkeys.
 */
export function releaseTldrawKeyboardFocus(editor) {
  if (!editor) return;

  try {
    editor.setEditingShape(null);
  } catch {
    /* ignore */
  }

  try {
    if (typeof editor.blur === "function") {
      // Keep DOM focus on the form field; only clear tldraw's focused state.
      editor.blur({ blurContainer: false });
      return;
    }
  } catch {
    /* fall through */
  }

  try {
    editor.updateInstanceState?.({ isFocused: false });
  } catch {
    /* ignore */
  }
}

/**
 * Stop keyboard/clipboard events from reaching tldraw document/body listeners.
 * Use bubble phase for paste/copy/cut so the focused input still receives them.
 */
export function stopFormKeyboardPropagation(event) {
  event.stopPropagation();
}
