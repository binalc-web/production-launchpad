import {
  isConfluenceTimelineEntry,
  isGranolaTimelineEntry,
  isWebsiteEnrichTimelineEntry,
} from "@/pages/Project/ProductManagement/constants";

export const CAPTURE_TYPE_META = {
  text_note: { label: "Note" },
  file_upload: { label: "File" },
  hub_meeting: { label: "Hub meeting" },
  website_enrich: { label: "Website enriched" },
  questionnaire_created: { label: "Questionnaire" },
  questionnaire_generated: { label: "Questions generated" },
  questionnaire_response: { label: "Questionnaire response" },
  questionnaire_published: { label: "Questionnaire published" },
  questionnaire_captured: { label: "Questionnaire captured" },
};

export function getCaptureTypeLabel(entry) {
  if (!entry || typeof entry !== "object") return "Capture";
  if (isGranolaTimelineEntry(entry)) return "Granola meeting";
  if (isConfluenceTimelineEntry(entry)) return "Confluence import";
  if (isWebsiteEnrichTimelineEntry(entry)) return "Website enriched";
  const mime = typeof entry.meta?.mimeType === "string" ? entry.meta.mimeType.trim() : "";
  if (entry.type === "file_upload" && mime === "application/pdf") return "PDF";
  const type = typeof entry.type === "string" ? entry.type.trim() : "";
  return CAPTURE_TYPE_META[type]?.label ?? (type || "Capture");
}

export function getCaptureEntryTitle(entry) {
  if (!entry || typeof entry !== "object") return "Capture entry";
  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  if (title) return title;
  return getCaptureTypeLabel(entry);
}

/** Short plain-text preview for cards and selection chips. */
export function getCaptureEntryPreview(entry, maxLen = 140) {
  if (!entry || typeof entry !== "object") return "";
  const body = typeof entry.body === "string" ? entry.body.trim() : "";
  if (body) {
    return body.length > maxLen ? `${body.slice(0, maxLen).trim()}…` : body;
  }
  const ed = entry.extractedData;
  if (ed && typeof ed === "object") {
    for (const key of [
      "goals",
      "requirements",
      "painPoints",
      "risks",
      "openQuestions",
      "actionItems",
    ]) {
      const val = ed[key];
      if (Array.isArray(val) && val.length) {
        const joined = val.slice(0, 2).join(" · ");
        return joined.length > maxLen ? `${joined.slice(0, maxLen).trim()}…` : joined;
      }
    }
  }
  return "";
}
