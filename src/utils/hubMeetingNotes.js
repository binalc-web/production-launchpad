/**
 * Normalize Hub meeting body fields (string, string[], or nested objects).
 * @param {unknown} body
 * @returns {string}
 */
function normalizeHubMeetingBody(body) {
  if (body == null) return "";
  if (typeof body === "string") return body.trim();
  if (Array.isArray(body)) {
    return body
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item.trim();
        if (typeof item === "object") {
          const nested = item.text ?? item.content ?? item.body ?? item.note ?? item.notes ?? null;
          if (typeof nested === "string") return nested.trim();
          if (Array.isArray(nested)) return normalizeHubMeetingBody(nested);
        }
        return String(item).trim();
      })
      .filter(Boolean)
      .join("\n\n");
  }
  if (typeof body === "object") {
    const nested = body.text ?? body.content ?? body.body ?? body.note ?? body.notes ?? null;
    if (nested != null) return normalizeHubMeetingBody(nested);
  }
  return String(body).trim();
}

/**
 * Turn Hub `/notes/meetings` rows into editable plain text for the release suggestions dialog.
 * @param {unknown} row
 * @returns {string}
 */
export function formatSingleHubMeetingToPlainText(row) {
  if (row == null) return "";
  if (typeof row === "string") {
    const t = row.trim();
    return t;
  }
  if (typeof row !== "object") return "";
  const title = row.title ?? row.name ?? row.subject ?? row.summaryHeading ?? null;
  const body =
    row.notes ?? row.content ?? row.body ?? row.description ?? row.text ?? row.meetingNotes ?? null;
  const date = row.date ?? row.meetingDate ?? row.createdAt ?? row.updatedAt ?? null;
  const headerParts = [date, title].filter(Boolean).map(String);
  const header = headerParts.length ? headerParts.join(" — ") : null;
  const bodyStr = normalizeHubMeetingBody(body);
  if (header && bodyStr) {
    return `### ${header}\n\n${bodyStr}`;
  }
  if (header) {
    return `### ${header}`;
  }
  if (bodyStr) {
    return bodyStr;
  }
  try {
    return JSON.stringify(row);
  } catch {
    return String(row);
  }
}

/**
 * Stable key for tracking which Hub rows were already added to the textarea.
 * @param {unknown} row
 * @param {number} index
 * @returns {string}
 */
export function getHubMeetingRowStableKey(row, index) {
  if (row != null && typeof row === "object") {
    const id = row.id ?? row._id ?? row.meetingId ?? row.uuid ?? row.noteId ?? null;
    if (id != null && String(id).trim()) {
      return `id:${String(id).trim()}`;
    }
  }
  return `idx:${index}`;
}

/**
 * Short label for Hub meeting rows in a select (date — title).
 * @param {unknown} row
 * @param {number} index
 * @returns {string}
 */
export function getHubMeetingRowLabel(row, index) {
  if (row == null) return `Meeting ${index + 1}`;
  if (typeof row === "string") {
    const t = row.trim();
    return t ? t.slice(0, 80) : `Meeting ${index + 1}`;
  }
  if (typeof row !== "object") return `Meeting ${index + 1}`;
  const title = row.title ?? row.name ?? row.subject ?? row.summaryHeading ?? null;
  const date = row.date ?? row.meetingDate ?? row.createdAt ?? row.updatedAt ?? null;
  const parts = [date, title].filter(Boolean).map(String);
  const raw = parts.length ? parts.join(" — ") : `Meeting ${index + 1}`;
  return raw.length > 90 ? `${raw.slice(0, 87)}…` : raw;
}

/**
 * @param {unknown[]} rows
 * @returns {string}
 */
export function formatHubMeetingsToPlainText(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const blocks = [];
  for (const row of rows) {
    const block = formatSingleHubMeetingToPlainText(row);
    if (block) blocks.push(block);
  }
  return blocks.filter(Boolean).join("\n\n---\n\n");
}
