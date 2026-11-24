/** Collapse consecutive identical non-empty lines (Cursor transcript streaming artifact). */
export function dedupeConsecutiveStreamLines(text) {
  if (typeof text !== "string" || !text.trim()) return "";
  const lines = text.split("\n");
  const out = [];
  let prevNorm = null;
  for (const line of lines) {
    const norm = line.trim();
    if (norm && prevNorm && norm === prevNorm) continue;
    out.push(line);
    if (norm) prevNorm = norm;
  }
  return out.join("\n").trim();
}
