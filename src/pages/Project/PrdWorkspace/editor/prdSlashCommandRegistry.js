import { getPrdSlashCommands } from "./prdSlashCommands.js";

/** @type {import("./prdSlashCommands.js").SlashCommandItem[]} */
let extraSlashCommands = [];

/** @param {import("./prdSlashCommands.js").SlashCommandItem[]} commands */
export function setExtraSlashCommands(commands) {
  extraSlashCommands = Array.isArray(commands) ? commands : [];
}

export function getAllSlashCommands() {
  return [...getPrdSlashCommands(), ...extraSlashCommands];
}

export function filterSlashCommands(query) {
  const q = String(query || "").trim().toLowerCase();
  const items = getAllSlashCommands();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.searchTerms?.some((t) => t.includes(q)),
  );
}
