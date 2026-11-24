/**
 * Detect an active @-mention query in a textarea value.
 * Triggers when `@` starts a word token (no whitespace between @ and caret).
 *
 * @param {string} value
 * @param {number} caretIndex
 * @returns {{ active: boolean, query: string, start: number, end: number }}
 */
export function detectJiraMentionAtCaret(value, caretIndex) {
  const text = typeof value === "string" ? value : "";
  const caret = Number.isFinite(caretIndex) ? caretIndex : text.length;
  const before = text.slice(0, caret);
  const atIndex = before.lastIndexOf("@");
  if (atIndex < 0) {
    return { active: false, query: "", start: caret, end: caret };
  }
  const prev = atIndex > 0 ? before[atIndex - 1] : "";
  if (prev && !/\s/.test(prev)) {
    return { active: false, query: "", start: caret, end: caret };
  }
  const query = before.slice(atIndex + 1);
  if (/\s/.test(query)) {
    return { active: false, query: "", start: caret, end: caret };
  }
  return {
    active: true,
    query,
    start: atIndex,
    end: caret,
  };
}

/**
 * Replace the @-mention token with an inserted mention label.
 * @param {string} value
 * @param {{ start: number, end: number }} range
 * @param {string} insertText — e.g. "@PROJ-123 "
 */
export function replaceMentionRange(value, range, insertText) {
  const text = typeof value === "string" ? value : "";
  const start = Math.max(0, Number(range?.start) || 0);
  const end = Math.max(start, Number(range?.end) || start);
  return `${text.slice(0, start)}${insertText}${text.slice(end)}`;
}
