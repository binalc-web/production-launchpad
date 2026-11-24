import { getCaptureTypeLabel } from "@/lib/captureEntryPreview";
import { ENGAGEMENT_PHASES, TIMELINE_FILTERS } from "../constants";

/** Singular/plural labels for timeline capture counts in progress summaries. */
const CAPTURE_COUNT_LABELS = {
  text_note: { one: "note", other: "notes" },
  file_upload: { one: "file", other: "files" },
  website: { one: "website", other: "websites" },
  hub_meeting: { one: "Hub meeting", other: "Hub meetings" },
  granola: { one: "Granola meeting", other: "Granola meetings" },
  confluence: { one: "Confluence page", other: "Confluence pages" },
};

/** Whether a timeline entry belongs to a capture filter chip. */
function timelineEntryMatchesFilter(entry, filterId) {
  if (filterId === "granola") return entry?.meta?.source === "granola";
  if (filterId === "confluence") return entry?.meta?.source === "confluence";
  if (filterId === "website") return entry?.type === "website_enrich";
  if (filterId === "text_note") {
    return (
      entry.type === "text_note" &&
      entry?.meta?.source !== "granola" &&
      entry?.meta?.source !== "confluence"
    );
  }
  return entry.type === filterId;
}

/** Count timeline entries per capture type (excludes questionnaires). */
function getTimelineTypeCounts(timeline) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const filter of TIMELINE_FILTERS) {
    if (filter.id === "all" || filter.id === "questionnaires") continue;
    const count = timeline.filter((entry) => timelineEntryMatchesFilter(entry, filter.id)).length;
    if (count > 0) counts[filter.id] = count;
  }
  return counts;
}

/** Human-readable count for one capture type, e.g. "2 notes" or "1 Hub meeting". */
function formatCaptureTypeCount(filterId, count) {
  const labels = CAPTURE_COUNT_LABELS[filterId];
  if (!labels) return String(count);
  if (count === 1) return `1 ${labels.one}`;
  return `${count} ${labels.other}`;
}

/**
 * Plain-language capture progress for journey badges and sidebar detail.
 * Names capture types instead of a generic count.
 */
export function buildCaptureProgressSummary(clientDetails, discoveryData) {
  const q = getQuestionnaireStatus(discoveryData);
  const timeline = clientDetails?.timeline || [];
  const typeCounts = getTimelineTypeCounts(timeline);
  const typeKeys = Object.keys(typeCounts);
  const parts = [];

  if (timeline.length === 1 && typeKeys.length === 1 && typeCounts[typeKeys[0]] === 1) {
    parts.push(`1 ${getCaptureTypeLabel(timeline[0]).toLowerCase()}`);
  } else if (typeKeys.length > 0) {
    typeKeys.forEach((filterId) => {
      parts.push(formatCaptureTypeCount(filterId, typeCounts[filterId]));
    });
  }

  if (q.publishedCount > 0) {
    parts.push(
      q.publishedCount === 1 ? "1 live questionnaire" : `${q.publishedCount} live questionnaires`,
    );
  } else if (q.questionnaireCount > 0) {
    parts.push(
      q.questionnaireCount === 1
        ? "1 questionnaire in draft"
        : `${q.questionnaireCount} questionnaires in draft`,
    );
  }

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function getCompletedEngagementPhases(currentPhase) {
  const idx = ENGAGEMENT_PHASES.findIndex((p) => p.id === currentPhase);
  if (idx <= 0) return [];
  return ENGAGEMENT_PHASES.slice(0, idx).map((p) => p.id);
}

export function getQuestionnaireStatus(discoveryData) {
  const questionnaires = discoveryData?.questionnaires || [];
  const allQuestionnaires = questionnaires.length
    ? questionnaires
    : discoveryData?.questions?.length
      ? [
          {
            questions: discoveryData.questions,
            responses: discoveryData.responses || [],
            publishedAt: discoveryData.publishedAt,
          },
        ]
      : [];

  let questionnaireCount = allQuestionnaires.length;
  let publishedCount = 0;
  let capturedCount = 0;
  let responseCount = 0;
  let hasQuestions = false;

  for (const qn of allQuestionnaires) {
    const questions = qn.questions || [];
    const responses = qn.responses || [];
    if (questions.length > 0) hasQuestions = true;
    if (qn.publishedAt && qn.publicPath) {
      publishedCount += 1;
      if (qn.capturedAt) capturedCount += 1;
    }
    responseCount += responses.length;
  }

  if (!questionnaireCount && (discoveryData?.questions || []).length > 0) {
    questionnaireCount = 1;
    hasQuestions = true;
    responseCount = (discoveryData?.responses || []).length;
    if (discoveryData?.publishedAt) publishedCount = 1;
  }

  return {
    questionnaireCount,
    publishedCount,
    capturedCount,
    liveCount: publishedCount - capturedCount,
    responseCount,
    hasPublished: publishedCount > 0,
    hasCaptured: capturedCount > 0,
    hasResponses: responseCount > 0,
    hasQuestions,
  };
}

/** @deprecated Use getQuestionnaireStatus */
export function getQuestionnaireStepStatus(discoveryData) {
  const status = getQuestionnaireStatus(discoveryData);
  return {
    ...status,
    published: status.hasPublished,
    completed: [],
    firstIncomplete: null,
    collect: status.hasResponses ? "collect" : null,
  };
}

export function isNextActionSatisfied(phase, discoveryData, clientDetails) {
  const q = getQuestionnaireStatus(discoveryData);
  const company = clientDetails?.personas?.company || {};
  const timelineLen = clientDetails?.timeline?.length || 0;

  switch (phase) {
    case "prospect_known":
      return Boolean(company.website || clientDetails?.website);
    case "first_call":
      return timelineLen >= 1;
    case "discovery_calls":
      return q.hasPublished || q.hasQuestions;
    case "signed":
      return q.hasPublished;
    case "pre_kickoff":
      return q.hasResponses || q.hasCaptured;
    case "kickoff":
      return (clientDetails?.workspaceDocuments || []).length > 0;
    default:
      return false;
  }
}

export function getSatisfiedEngagementPhases(discoveryData, clientDetails) {
  return ENGAGEMENT_PHASES.filter((p) =>
    isNextActionSatisfied(p.id, discoveryData, clientDetails),
  ).map((p) => p.id);
}

export function hasDiscoverySignal(clientDetails, discoveryData) {
  const timelineLen = clientDetails?.timeline?.length || 0;
  if (timelineLen >= 1) return true;
  const personas = clientDetails?.personas || {};
  return ["client", "company", "competitors", "product"].some((key) => {
    const p = personas[key];
    if (!p) return false;
    if (key === "competitors") return (p.items || []).length > 0;
    if (key === "product") {
      if ((p.existingProducts || []).length > 0) return true;
      return Object.entries(p).some(
        ([field, v]) =>
          field !== "existingProducts" &&
          field !== "smartFields" &&
          field !== "meta" &&
          typeof v === "string" &&
          v.trim(),
      );
    }
    return Object.values(p).some((v) => typeof v === "string" && v.trim());
  });
}

export function getDiscoveryAreaIndicators(clientDetails, discoveryData) {
  const docCount = (clientDetails?.workspaceDocuments || []).length;
  const hasBrief = Boolean(
    discoveryData?.summary &&
    Object.values(discoveryData.summary).some((v) => typeof v === "string" && v.trim()),
  );
  const personas = clientDetails?.personas || {};
  const profilePcts = ["client", "company", "competitors", "product"].map((key) => {
    const p = personas[key];
    if (!p) return 0;
    if (key === "competitors") return (p.items || []).length > 0 ? 100 : 0;
    if (key === "product") {
      const existing = (p.existingProducts || []).length > 0 ? 1 : 0;
      const fields = Object.entries(p).filter(
        ([field, v]) =>
          field !== "existingProducts" &&
          field !== "smartFields" &&
          field !== "meta" &&
          typeof v === "string",
      );
      const filled = fields.filter(([, v]) => v.trim()).length;
      const newScore = fields.length ? Math.round((filled / fields.length) * 100) : 0;
      return existing > 0 ? Math.max(newScore, 50) : newScore;
    }
    const fields = Object.values(p).filter((v) => typeof v === "string");
    if (fields.length === 0) return 0;
    return Math.round((fields.filter((v) => v.trim()).length / fields.length) * 100);
  });
  const avgProfile = profilePcts.length
    ? Math.round(profilePcts.reduce((a, b) => a + b, 0) / profilePcts.length)
    : 0;

  const captureBadge = buildCaptureProgressSummary(clientDetails, discoveryData);

  return {
    capture: captureBadge,
    profiles: avgProfile > 0 ? `${avgProfile}%` : null,
    documents: docCount > 0 ? String(docCount) : null,
    brief: hasBrief ? "Ready" : null,
  };
}
