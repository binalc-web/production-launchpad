export function normalizeWorkspaceDocName(name) {
  return (typeof name === "string" ? name.trim() : "") || "Untitled";
}

export function workspaceDocNameExists(docs, name, excludeDocId = null) {
  const target = normalizeWorkspaceDocName(name).toLowerCase();
  return (docs || []).some(
    (d) => d?.id !== excludeDocId && normalizeWorkspaceDocName(d?.name).toLowerCase() === target,
  );
}

/** True when the name is already used by a workspace document or deck. */
export function workspaceItemNameExists(docs, presentations, name, excludeId = null) {
  const target = normalizeWorkspaceDocName(name).toLowerCase();
  const inDocs = (docs || []).some(
    (d) => d?.id !== excludeId && normalizeWorkspaceDocName(d?.name).toLowerCase() === target,
  );
  const inDecks = (presentations || []).some(
    (p) => p?.id !== excludeId && normalizeWorkspaceDocName(p?.name).toLowerCase() === target,
  );
  return inDocs || inDecks;
}
