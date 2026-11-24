/** Map RAG source types to console inspector locations. */
export const SOURCE_TYPE_TO_CONSOLE = Object.freeze({
  capture: { section: "discovery", area: "capture" },
  discovery_summary: { section: "discovery", area: "brief" },
  workspace_doc: { section: "discovery", area: "documents" },
  prd: { section: "discovery", area: "brief" },
  backlog_epic: { section: "backlog", area: "board" },
  backlog_story: { section: "backlog", area: "board" },
  release: { section: "releases", area: "overview" },
  release_changelog: { section: "releases", area: "overview" },
  release_scope: { section: "releases", area: "active" },
  scope_implement_run: { section: "web-app", area: "implement" },
  project_version: { section: "web-app", area: "preview" },
  project_snapshot: { section: "web-app", area: "preview" },
  deploy: { section: "environment", area: null },
  cloud_deploy: { section: "cloud-infra", area: "deploy" },
  feedback: { section: "feedback", area: null },
  comment: { section: "feedback", area: null },
  infra_analysis: { section: "cloud-infra", area: "infra-analysis" },
  job: { section: "automations", area: null },
  qa_topic: { section: "qa-reports", area: null },
  activity: { section: "collaboration", area: null },
});

export function citationToInspector(citation, fallbackProjectId = null) {
  if (!citation || typeof citation !== "object") return null;
  const sourceType = String(citation.sourceType || "").trim();
  const loc = SOURCE_TYPE_TO_CONSOLE[sourceType] || {
    section: citation.section || "discovery",
    area: citation.area ?? "capture",
  };
  const projectId = citation.projectId ?? fallbackProjectId;
  if (projectId == null) return null;
  return {
    projectId: String(projectId),
    section: citation.section || loc.section,
    area: citation.area === undefined ? loc.area : citation.area,
    label: citation.label || sourceType,
  };
}

export function buildConsolePath(projectId, { section, area } = {}) {
  const qs = new URLSearchParams();
  if (section) qs.set("section", section);
  if (area) qs.set("area", area);
  const q = qs.toString();
  return `/projects/details/${encodeURIComponent(projectId)}${q ? `?${q}` : ""}`;
}

export function buildEmbedConsolePath(projectId, { section, area } = {}) {
  const qs = new URLSearchParams();
  qs.set("embed", "1");
  if (section) qs.set("section", section);
  if (area) qs.set("area", area);
  return `/projects/details/${encodeURIComponent(projectId)}?${qs.toString()}`;
}
