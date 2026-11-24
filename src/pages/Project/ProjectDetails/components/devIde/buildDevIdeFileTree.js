/**
 * Build a nested folder tree from flat repo paths.
 * @param {string[]} paths
 */
export function buildDevIdeFileTree(paths) {
  const root = { name: "", children: new Map(), files: [] };

  for (const filePath of paths) {
    const parts = String(filePath || "")
      .split("/")
      .filter(Boolean);
    if (!parts.length) continue;
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        cursor.files.push({ name: part, path: parts.join("/") });
      } else {
        if (!cursor.children.has(part)) {
          cursor.children.set(part, { name: part, children: new Map(), files: [] });
        }
        cursor = cursor.children.get(part);
      }
    }
  }

  return root;
}

/**
 * Filter flat paths by a case-insensitive query (matches any path segment).
 * @param {string[]} paths
 * @param {string} query
 */
export function filterDevIdePaths(paths, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return paths;
  return paths.filter((p) => p.toLowerCase().includes(q));
}
