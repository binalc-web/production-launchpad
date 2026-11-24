/**
 * Client-side filter for repository pickers.
 * Matches the typed text against label and value (repo path / full name).
 * @param {Array<{ value?: string, label?: string }>} options
 * @param {string} query
 * @param {(item: { value?: string, label?: string }) => string} [getText]
 */
export function filterRepositoryOptions(options, query, getText) {
  const list = Array.isArray(options) ? options : [];
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return list;
  return list.filter((item) => {
    const text = getText ? getText(item) : `${item?.label ?? ""} ${item?.value ?? ""}`;
    return String(text).toLowerCase().includes(q);
  });
}
