const EXTRACTED_KEYS = [
  "goals",
  "requirements",
  "painPoints",
  "risks",
  "openQuestions",
  "actionItems",
];

/**
 * @param {object | null | undefined} entry
 * @returns {string}
 */
export function formatCaptureEntryForContext(entry) {
  if (!entry || typeof entry !== "object") return "";
  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  const type = typeof entry.type === "string" ? entry.type.trim() : "note";
  const body = typeof entry.body === "string" ? entry.body.trim() : "";
  const header = [type, title].filter(Boolean).join(" — ");
  const lines = [`### ${header || "Capture entry"}`];
  if (body) lines.push(body);
  const ed = entry.extractedData;
  if (ed && typeof ed === "object") {
    for (const key of EXTRACTED_KEYS) {
      const val = ed[key];
      if (Array.isArray(val) && val.length) {
        lines.push(`${key}: ${val.join("; ")}`);
      }
    }
  }
  return lines.join("\n");
}

/**
 * @param {string[]} orderedIds
 * @param {object[]} entries
 * @returns {string}
 */
export function buildOrderedCaptureContextText(orderedIds, entries) {
  const idToEntry = new Map(entries.map((e) => [String(e.id ?? ""), e]));
  const blocks = [];
  for (const id of orderedIds) {
    const entry = idToEntry.get(String(id));
    if (!entry) continue;
    const block = formatCaptureEntryForContext(entry).trim();
    if (block) blocks.push(block);
  }
  return blocks.join("\n\n---\n\n");
}

/**
 * @param {object} opts
 * @param {string[]} [opts.selectedCaptureEntryIds]
 * @param {object[]} [opts.timeline]
 * @param {string} [opts.captureContextText]
 * @returns {string}
 */
export function resolveCaptureContextText({
  selectedCaptureEntryIds,
  timeline,
  captureContextText,
}) {
  const manual =
    typeof captureContextText === "string" ? captureContextText.trim() : "";
  const ids = Array.isArray(selectedCaptureEntryIds)
    ? selectedCaptureEntryIds.map(String).filter(Boolean)
    : [];
  const fromEntries = ids.length
    ? buildOrderedCaptureContextText(ids, timeline || [])
    : "";
  if (!manual) return fromEntries;
  if (!fromEntries) return manual;
  return `${fromEntries}\n\n---\n\n${manual}`;
}
