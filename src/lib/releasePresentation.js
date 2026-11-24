import { format, startOfDay } from "date-fns";
import { isReleaseEffectivelyLocked } from "@/lib/backendAgentStatus";
import { storageStringToEmailsArray } from "@/utils/emailList";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";

export const RELEASE_STATUS_CHANGELOG_LABELS = {
  draft: "Draft",
  active: "Active",
  locked: "Locked",
  skip: "Skip",
};

export const CHANGELOG_FIELD_LABELS = {
  status: "Status",
  releaseDate: "Target release",
  actualReleaseDate: "Actual release",
  actualReleaseNotes: "Actual release notes",
  startDate: "Start date",
  name: "Name",
  description: "Description",
  releaseDescription: "Manual release description",
  isMvp: "MVP",
  tags: "Tags",
  lockedBy: "Locked by",
  clientReleaseNote: "Client release note",
  clientReviewAiSummary: "Review checklist (client link)",
  showClientReviewSummary: "Show checklist on client link",
  clientReviewAiGenerationContext: "AI-only instructions (not shown to clients)",
  migrateFrontend: "Build Frontend App",
};

export const RELEASE_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "locked", label: "Locked" },
  { value: "skip", label: "Skip" },
];

export function actualShipDateChanged(prevDate, nextDate) {
  const p =
    prevDate instanceof Date && !Number.isNaN(prevDate.getTime())
      ? startOfDay(prevDate).getTime()
      : null;
  const n =
    nextDate instanceof Date && !Number.isNaN(nextDate.getTime())
      ? startOfDay(nextDate).getTime()
      : null;
  return p !== n;
}

export function formatReadableDate(value) {
  if (value == null || value === "") return "—";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "MMMM d, yyyy");
  } catch {
    return String(value);
  }
}

export function formatChangelogTimestamp(iso) {
  if (!iso) return "";
  try {
    return format(new Date(iso), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function formatChangelogScalar(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const key = value.toLowerCase();
    if (RELEASE_STATUS_CHANGELOG_LABELS[value]) return RELEASE_STATUS_CHANGELOG_LABELS[value];
    if (RELEASE_STATUS_CHANGELOG_LABELS[key]) return RELEASE_STATUS_CHANGELOG_LABELS[key];
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value))) {
      return formatReadableDate(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((v) => String(v)).join(", ");
  }
  return String(value);
}

export function changelogFieldLabel(key) {
  return (
    CHANGELOG_FIELD_LABELS[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^s./, (c) => c.toUpperCase())
  );
}

export function normalizeReleaseStatus(release) {
  const s = String(release?.status ?? "draft").toLowerCase();
  return ["draft", "active", "locked", "skip"].includes(s) ? s : "draft";
}

export function isReleaseLocked(release) {
  return isReleaseEffectivelyLocked(release);
}

export function releaseCardAccentBarClass(release) {
  switch (normalizeReleaseStatus(release)) {
    case "locked":
      return "bg-red-500";
    case "active":
      return "bg-primary";
    case "skip":
      return "bg-muted-foreground/70";
    default:
      return "bg-muted-foreground/40";
  }
}

export function parseReleaseDateValue(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Locked releases should record when they shipped (roadmap + client reporting). */
export function isLockedReleaseMissingActualShipDate(release) {
  if (normalizeReleaseStatus(release) !== "locked") return false;
  return !parseReleaseDateValue(release.actualReleaseDate);
}

export function releaseStatusLabel(value) {
  return RELEASE_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? String(value ?? "");
}

/** Visual + copy for the lifecycle status chip (single source of truth for header UI). */
export function releaseStatusPresentation(release) {
  const s = normalizeReleaseStatus(release);
  if (s === "active") {
    return {
      label: "Active",
      hint: "Serves the live build when set as the active release",
      pillClass:
        "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 ring-1 ring-emerald-200/70 shadow-sm shadow-emerald-500/5",
      dotClass: "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]",
    };
  }
  if (s === "locked") {
    return {
      label: "Locked",
      hint: "Cannot be unlocked here. View this release by choosing a version on the client link.",
      pillClass:
        "bg-gradient-to-r from-rose-50 to-orange-50 text-rose-900 ring-1 ring-rose-200/70 shadow-sm shadow-rose-500/5",
      dotClass: "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.2)]",
    };
  }
  if (s === "skip") {
    const reason = typeof release?.skipReason === "string" ? release.skipReason.trim() : "";
    return {
      label: "Skip",
      hint: reason || "No skip reason on file — change status anytime if plans change.",
      pillClass: "bg-muted/70 text-muted-foreground ring-1 ring-border shadow-sm",
      dotClass: "bg-muted-foreground",
    };
  }
  return {
    label: "Draft",
    hint: "Work in progress — safe to upload and iterate",
    pillClass: "bg-muted/60 text-foreground ring-1 ring-border",
    dotClass: "bg-muted-foreground",
  };
}

const RELEASE_DOT_VERSION_RE = /^\d+(?:\.\d+)+$/;

export function parseReleaseNameToTuple(name) {
  const n = name?.trim();
  if (!n || !RELEASE_DOT_VERSION_RE.test(n)) return null;
  return n.split(".").map((p) => parseInt(p, 10));
}

export function compareReleaseTuples(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

function bumpLastSegment(tuple) {
  const next = [...tuple];
  next[next.length - 1] += 1;
  return next;
}

export function maxReleaseTupleFromList(releasesList) {
  let maxTuple = null;
  for (const r of releasesList) {
    const t = parseReleaseNameToTuple(r?.name);
    if (!t) continue;
    if (!maxTuple || compareReleaseTuples(t, maxTuple) > 0) maxTuple = t;
  }
  return maxTuple;
}

/** Default patch bump for placeholder / autofill (any greater version is allowed). */
export function getSuggestedPatchReleaseNameFromList(releasesList) {
  const maxTuple = maxReleaseTupleFromList(releasesList);
  if (!maxTuple) return "1.0.0";
  return bumpLastSegment(maxTuple).map(String).join(".");
}

function normalizeEmailForAccess(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Aligns with backend: admin, project creator, or assignedUserEmails. */
export function userCanManageReleasesForProject(user, project) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const creatorId = project?.createdBy?.id ?? project?.createdById;
  if (creatorId != null && Number(user.id) === Number(creatorId)) return true;
  const userEmail = normalizeEmailForAccess(user.email);
  if (!userEmail) return false;
  const assigned = storageStringToEmailsArray(project?.assignedUserEmails);
  return assigned.some((a) => normalizeEmailForAccess(a) === userEmail);
}

export const PROJECT_SETTINGS_ACCESS_HINT =
  "Ask a project creator or LaunchPad admin to grant Project settings access.";

/** Aligns with backend: admin, project creator, or settingsAccessEmails. */
export function userCanAccessProjectSettings(user, project) {
  if (!user || !project) return false;
  if (typeof project.canAccessProjectSettings === "boolean") {
    return project.canAccessProjectSettings;
  }
  if (isLaunchpadAdmin(user.role)) return true;
  const creatorId = project?.createdBy?.id ?? project?.createdById;
  if (creatorId != null && Number(user.id) === Number(creatorId)) return true;
  const userEmail = normalizeEmailForAccess(user.email);
  if (!userEmail) return false;
  const granted = storageStringToEmailsArray(project?.settingsAccessEmails);
  return granted.some((a) => normalizeEmailForAccess(a) === userEmail);
}
