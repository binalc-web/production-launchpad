/** Stable empty defaults for hook optional array props. */
export const EMPTY_PENDING_PACKS = Object.freeze([]);
export const EMPTY_SELECTED_FOLDERS = Object.freeze([]);

/** Merge onboarding pending packs over fetched workspace custom packs. */
export function mergePendingCursorPacks(savedRows, pendingPacks, idPrefix = "pending") {
  const map = new Map();
  for (const row of savedRows ?? []) {
    if (row?.folderName) map.set(row.folderName, row);
  }
  for (const pack of pendingPacks ?? []) {
    if (!pack?.folderName) continue;
    map.set(pack.folderName, {
      id: pack.id || `${idPrefix}-${pack.folderName}`,
      folderName: pack.folderName,
      body: pack.body ?? "",
      updatedAt: pack.updatedAt ?? null,
    });
  }
  return [...map.values()].sort((a, b) => String(a.folderName).localeCompare(String(b.folderName)));
}

/** Add pending pack folder names to a catalog folder list. */
export function mergePendingFolderNames(folders, pendingPacks) {
  const pendingNames = (pendingPacks ?? []).map((pack) => pack.folderName).filter(Boolean);
  return [...new Set([...(folders ?? []), ...pendingNames])];
}
