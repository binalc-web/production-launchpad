import { exportDocxFile, exportMarkdownFile } from "../prdExport";

/**
 * @typedef {object} ExportContext
 * @property {object} doc
 * @property {number|string} [projectId]
 * @property {string} [docId]
 * @property {object} [options]
 */

/** @type {Array<{ id: string, label: string, kind: 'file'|'remote', export: (ctx: ExportContext) => Promise<void>|void }>} */
export const EXPORT_DESTINATIONS = [
  {
    id: "markdown",
    label: "Markdown (.md)",
    kind: "file",
    export: ({ doc }) => {
      exportMarkdownFile(doc);
    },
  },
  {
    id: "docx",
    label: "Word (.docx)",
    kind: "file",
    export: async ({ doc }) => {
      await exportDocxFile(doc);
    },
  },
  {
    id: "json",
    label: "JSON (.json)",
    kind: "file",
    export: ({ doc, options }) => {
      options?.exportJson?.(doc);
    },
  },
  {
    id: "confluence",
    label: "Confluence",
    kind: "remote",
    export: async ({ options }) => {
      await options?.openConfluenceDialog?.();
    },
  },
];

/** @param {string} id */
export function getExportDestination(id) {
  return EXPORT_DESTINATIONS.find((d) => d.id === id) || null;
}

/** @returns {typeof EXPORT_DESTINATIONS} */
export function listFileExportDestinations() {
  return EXPORT_DESTINATIONS.filter((d) => d.kind === "file");
}

/** @returns {typeof EXPORT_DESTINATIONS} */
export function listRemoteExportDestinations() {
  return EXPORT_DESTINATIONS.filter((d) => d.kind === "remote");
}
