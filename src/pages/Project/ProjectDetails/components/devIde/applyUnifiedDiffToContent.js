/**
 * Apply a unified diff (or truncated tool diffPreview) onto original file text.
 * Returns null when the patch cannot be applied cleanly.
 * @param {string} original
 * @param {string} unifiedDiff
 * @returns {string|null}
 */
export function applyUnifiedDiffToContent(original, unifiedDiff) {
  const diff = typeof unifiedDiff === "string" ? unifiedDiff : "";
  if (!diff.trim()) return null;

  const originalLines = String(original ?? "").split(/\r?\n/);
  /** @type {Array<{ oldStart: number, lines: string[] }>} */
  const hunks = [];
  /** @type {string[]|null} */
  let current = null;
  let oldStart = 1;

  for (const rawLine of diff.split(/\r?\n/)) {
    const header = rawLine.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (header) {
      if (current) hunks.push({ oldStart, lines: current });
      oldStart = Math.max(1, Number(header[1]) || 1);
      current = [];
      continue;
    }
    if (!current) {
      // Preview sometimes omits @@ headers — collect content lines as one hunk from line 1.
      if (
        rawLine.startsWith("---") ||
        rawLine.startsWith("+++") ||
        rawLine.startsWith("diff ") ||
        rawLine.startsWith("index ")
      ) {
        continue;
      }
      if (
        rawLine.startsWith("+") ||
        rawLine.startsWith("-") ||
        rawLine.startsWith(" ") ||
        rawLine === ""
      ) {
        current = [];
        oldStart = 1;
      } else {
        continue;
      }
    }
    if (
      rawLine.startsWith("+") ||
      rawLine.startsWith("-") ||
      rawLine.startsWith(" ") ||
      rawLine === "\\ No newline at end of file"
    ) {
      current.push(rawLine);
    }
  }
  if (current?.length) hunks.push({ oldStart, lines: current });
  if (hunks.length === 0) return null;

  let result = originalLines.slice();
  // Apply from bottom to top so earlier line numbers stay valid.
  for (let h = hunks.length - 1; h >= 0; h -= 1) {
    const hunk = hunks[h];
    const startIdx = hunk.oldStart - 1;
    /** @type {string[]} */
    const oldSlice = [];
    /** @type {string[]} */
    const newSlice = [];
    for (const line of hunk.lines) {
      if (line.startsWith("\\")) continue;
      if (line.startsWith("+")) {
        newSlice.push(line.slice(1));
      } else if (line.startsWith("-")) {
        oldSlice.push(line.slice(1));
      } else if (line.startsWith(" ")) {
        const text = line.slice(1);
        oldSlice.push(text);
        newSlice.push(text);
      }
    }

    const actual = result.slice(startIdx, startIdx + oldSlice.length);
    if (actual.length !== oldSlice.length || actual.some((v, i) => v !== oldSlice[i])) {
      // Fuzzy: search nearby for the old slice (truncated previews / off-by-one).
      const found = findSliceIndex(result, oldSlice, startIdx);
      if (found < 0) return null;
      result = [...result.slice(0, found), ...newSlice, ...result.slice(found + oldSlice.length)];
    } else {
      result = [
        ...result.slice(0, startIdx),
        ...newSlice,
        ...result.slice(startIdx + oldSlice.length),
      ];
    }
  }

  return result.join("\n");
}

/**
 * @param {string[]} haystack
 * @param {string[]} needle
 * @param {number} hint
 */
function findSliceIndex(haystack, needle, hint) {
  if (needle.length === 0) return Math.max(0, Math.min(hint, haystack.length));
  const from = Math.max(0, hint - 40);
  const to = Math.min(haystack.length - needle.length, hint + 40);
  for (let i = from; i <= to; i += 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  // Full scan fallback for small needles.
  if (needle.length <= 8) {
    for (let i = 0; i <= haystack.length - needle.length; i += 1) {
      let ok = true;
      for (let j = 0; j < needle.length; j += 1) {
        if (haystack[i + j] !== needle[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return i;
    }
  }
  return -1;
}
