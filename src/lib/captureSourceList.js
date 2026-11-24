import { format } from "date-fns";

const QUESTIONNAIRE_TYPES = new Set([
  "questionnaire_created",
  "questionnaire_generated",
  "questionnaire_response",
  "questionnaire_published",
  "questionnaire_captured",
]);

export const CAPTURE_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "text_note", label: "Notes" },
  { id: "file_upload", label: "Files" },
  { id: "website", label: "Websites" },
  { id: "hub_meeting", label: "Hub" },
  { id: "granola", label: "Granola" },
  { id: "confluence", label: "Confluence" },
  { id: "questionnaires", label: "Questionnaires" },
];

export const CAPTURE_SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "title_asc", label: "Title A–Z" },
  { id: "title_desc", label: "Title Z–A" },
  { id: "type", label: "Type" },
  { id: "phase", label: "Engagement phase" },
  { id: "longest", label: "Longest content" },
  { id: "most_extracted", label: "Most insights" },
];

export const CAPTURE_CONTENT_FILTERS = [
  { id: "any", label: "Any content" },
  { id: "extracted", label: "Has insights" },
  { id: "no_extracted", label: "No insights" },
  { id: "body", label: "Has notes" },
  { id: "no_body", label: "No notes" },
];

const PHASES = [
  ["prospect_known", "Prospect known"],
  ["first_call", "First call"],
  ["discovery_calls", "Discovery calls"],
  ["signed", "Signed"],
  ["pre_kickoff", "Pre-kickoff"],
  ["kickoff", "Kickoff"],
  ["post_kickoff", "Post-kickoff"],
];

const PHASE_LABEL = Object.fromEntries(PHASES);
const PHASE_ORDER = new Map(PHASES.map(([id], index) => [id, index]));

const EXTRACTED_FIELDS = [
  ["goals", "Goals"],
  ["requirements", "Requirements"],
  ["painPoints", "Pain points"],
  ["risks", "Risks"],
  ["openQuestions", "Open questions"],
  ["actionItems", "Action items"],
  ["stakeholders", "Stakeholders"],
];

const APPLIED_LABELS = {
  client: "Client profile",
  company: "Company profile",
  product: "Product profile",
  competitors: "Competitors",
};

const MIME_LABELS = {
  "application/pdf": "PDF",
  "text/plain": "Plain text",
  "text/markdown": "Markdown",
  "text/x-markdown": "Markdown",
  timeline_note: "Note",
  "hub/meeting": "Hub meeting",
};

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item)).filter(Boolean);
}

export function captureTypeFilterId(entry) {
  const source = asText(entry?.meta?.source);
  if (source === "granola") return "granola";
  if (source === "confluence") return "confluence";
  if (entry?.type === "website_enrich" || source === "website_enrich") return "website";
  if (QUESTIONNAIRE_TYPES.has(entry?.type)) return "questionnaires";
  if (entry?.type === "text_note") return "text_note";
  if (entry?.type === "file_upload") return "file_upload";
  if (entry?.type === "hub_meeting") return "hub_meeting";
  return asText(entry?.type) || "other";
}

export function captureSourceKey(entry) {
  const source = asText(entry?.meta?.source);
  if (source) return source;
  if (entry?.type === "hub_meeting") return "hub_meeting";
  if (entry?.type === "file_upload") return "file_upload";
  if (entry?.type === "text_note") return "manual_note";
  return asText(entry?.type) || "unknown";
}

export function captureSourceLabel(entry) {
  const key = captureSourceKey(entry);
  if (key === "granola") return "Granola";
  if (key === "confluence") return "Confluence";
  if (key === "website_enrich" || key === "website_scan") return "Website";
  if (key === "manual_note") return "Manual note";
  if (key === "hub_meeting") return "Hub";
  if (key === "file_upload") return "Upload";
  return key.replace(/_/g, " ");
}

export function formatCaptureCreatedAt(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "MMM d, yyyy, h:mm a");
}

function mimeLabel(raw) {
  const mime = asText(raw);
  if (!mime) return "";
  if (MIME_LABELS[mime]) return MIME_LABELS[mime];
  if (mime.startsWith("image/")) return "Image";
  return mime;
}

function entryUrls(meta) {
  const urls = [];
  const push = (value) => {
    const text = asText(value);
    if (text && !urls.includes(text)) urls.push(text);
  };
  push(meta?.primaryUrl);
  push(meta?.confluenceUrl);
  push(meta?.url);
  push(meta?.websiteUrl);
  push(meta?.imageUrl);
  for (const url of stringList(meta?.urls)) push(url);
  return urls;
}

function appliedLabels(entry) {
  const applied = entry?.appliedToPersonas;
  if (!applied || typeof applied !== "object") return [];
  return Object.entries(applied)
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
    .map(([key]) => APPLIED_LABELS[key] || key);
}

export function describeCaptureSource(item) {
  const entry = item?.entry && typeof item.entry === "object" ? item.entry : {};
  const meta = entry.meta && typeof entry.meta === "object" ? entry.meta : {};
  const extracted =
    entry.extractedData && typeof entry.extractedData === "object" ? entry.extractedData : {};
  const extractedGroups = EXTRACTED_FIELDS.map(([key, label]) => ({
    key,
    label,
    items: stringList(extracted[key]),
  })).filter((group) => group.items.length > 0);
  const extractedCount = extractedGroups.reduce((sum, group) => sum + group.items.length, 0);
  const body = asText(entry.body);
  const phaseId = asText(entry.engagementPhase);
  const createdAt = item?.createdAt || entry.createdAt || null;
  const urls = entryUrls(meta);
  const pageCount = Number.isFinite(Number(meta.pageCount)) ? Number(meta.pageCount) : null;
  const scope = asText(meta.scope);

  return {
    createdAt,
    createdLabel: formatCaptureCreatedAt(createdAt),
    typeFilterId: captureTypeFilterId(entry),
    sourceKey: captureSourceKey(entry),
    sourceLabel: captureSourceLabel(entry),
    phaseId: phaseId || null,
    phaseLabel: phaseId ? PHASE_LABEL[phaseId] || phaseId.replace(/_/g, " ") : "",
    fileName: asText(meta.fileName),
    mimeLabel: mimeLabel(meta.mimeType),
    urls,
    pageCount,
    scopeLabel: scope === "client" ? "Client" : scope === "company" ? "Company" : "",
    body,
    bodyLength: body.length,
    extractedGroups,
    extractedCount,
    appliedLabels: appliedLabels(entry),
    externalNoteId: asText(meta.externalNoteId),
  };
}

function searchBlob(item, details) {
  const parts = [
    item?.label,
    item?.typeLabel,
    item?.preview,
    details.sourceLabel,
    details.phaseLabel,
    details.fileName,
    details.mimeLabel,
    details.scopeLabel,
    details.body,
    details.externalNoteId,
    ...details.urls,
    ...details.extractedGroups.flatMap((group) => [group.label, ...group.items]),
    ...details.appliedLabels,
  ];
  return parts.filter(Boolean).join("\n").toLowerCase();
}

function createdTime(item) {
  const time = new Date(item?.createdAt || item?.entry?.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
}

function compareCaptureItems(sort, a, b) {
  const da = a.details;
  const db = b.details;
  let diff = 0;
  if (sort === "oldest") diff = createdTime(a.item) - createdTime(b.item);
  else if (sort === "title_asc") diff = compareText(a.item.label, b.item.label);
  else if (sort === "title_desc") diff = compareText(b.item.label, a.item.label);
  else if (sort === "type") diff = compareText(a.item.typeLabel, b.item.typeLabel);
  else if (sort === "phase") {
    const ao = PHASE_ORDER.has(da.phaseId) ? PHASE_ORDER.get(da.phaseId) : 99;
    const bo = PHASE_ORDER.has(db.phaseId) ? PHASE_ORDER.get(db.phaseId) : 99;
    diff = ao - bo;
  } else if (sort === "longest") diff = db.bodyLength - da.bodyLength;
  else if (sort === "most_extracted") diff = db.extractedCount - da.extractedCount;
  else diff = createdTime(b.item) - createdTime(a.item);
  if (diff !== 0) return diff;
  return compareText(a.item.id, b.item.id);
}

/**
 * @param {Array<object>} items capture picker items (`label`, `typeLabel`, `entry`, `createdAt`)
 * @param {{
 *   query?: string,
 *   typeFilter?: string,
 *   phaseFilter?: string,
 *   sourceFilter?: string,
 *   contentFilter?: string,
 *   sort?: string,
 * }} controls
 */
export function filterAndSortCaptureItems(items, controls = {}) {
  const query = asText(controls.query).toLowerCase();
  const typeFilter = controls.typeFilter || "all";
  const phaseFilter = controls.phaseFilter || "all";
  const sourceFilter = controls.sourceFilter || "all";
  const contentFilter = controls.contentFilter || "any";
  const sort = controls.sort || "newest";
  const list = Array.isArray(items) ? items : [];

  const decorated = list.map((item) => {
    const details = describeCaptureSource(item);
    return { item, details, search: searchBlob(item, details) };
  });

  const filtered = decorated.filter(({ details, search }) => {
    if (typeFilter !== "all" && details.typeFilterId !== typeFilter) return false;
    if (phaseFilter === "none" && details.phaseId) return false;
    if (phaseFilter !== "all" && phaseFilter !== "none" && details.phaseId !== phaseFilter) {
      return false;
    }
    if (sourceFilter !== "all" && details.sourceKey !== sourceFilter) return false;
    if (contentFilter === "extracted" && details.extractedCount === 0) return false;
    if (contentFilter === "no_extracted" && details.extractedCount > 0) return false;
    if (contentFilter === "body" && details.bodyLength === 0) return false;
    if (contentFilter === "no_body" && details.bodyLength > 0) return false;
    if (query && !search.includes(query)) return false;
    return true;
  });

  filtered.sort((a, b) => compareCaptureItems(sort, a, b));
  return filtered.map(({ item, details }) => ({ ...item, details }));
}

export function captureFilterOptions(items) {
  const list = Array.isArray(items) ? items : [];
  const described = list.map((item) => describeCaptureSource(item));
  const typeCounts = new Map();
  const phases = new Map();
  const sources = new Map();
  let missingPhase = false;

  for (const details of described) {
    typeCounts.set(details.typeFilterId, (typeCounts.get(details.typeFilterId) || 0) + 1);
    if (details.phaseId) phases.set(details.phaseId, details.phaseLabel);
    else missingPhase = true;
    sources.set(details.sourceKey, details.sourceLabel);
  }

  return {
    types: CAPTURE_TYPE_FILTERS.filter(
      (filter) => filter.id === "all" || (typeCounts.get(filter.id) || 0) > 0,
    ).map((filter) => ({
      ...filter,
      count: filter.id === "all" ? list.length : typeCounts.get(filter.id) || 0,
    })),
    phases: [
      { id: "all", label: "All phases" },
      ...[...phases.entries()]
        .sort((a, b) => (PHASE_ORDER.get(a[0]) ?? 99) - (PHASE_ORDER.get(b[0]) ?? 99))
        .map(([id, label]) => ({ id, label })),
      ...(missingPhase ? [{ id: "none", label: "No phase" }] : []),
    ],
    sources: [
      { id: "all", label: "All sources" },
      ...[...sources.entries()]
        .sort((a, b) => compareText(a[1], b[1]))
        .map(([id, label]) => ({ id, label })),
    ],
  };
}

export function captureFiltersActive(controls = {}) {
  return Boolean(
    asText(controls.query) ||
    (controls.typeFilter && controls.typeFilter !== "all") ||
    (controls.phaseFilter && controls.phaseFilter !== "all") ||
    (controls.sourceFilter && controls.sourceFilter !== "all") ||
    (controls.contentFilter && controls.contentFilter !== "any") ||
    (controls.sort && controls.sort !== "newest"),
  );
}
