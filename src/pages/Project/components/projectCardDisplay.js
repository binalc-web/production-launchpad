import { formatDistanceToNow, parseISO } from "date-fns";
import { buildProjectClientUrls } from "@/lib/projectClientLinkUrls";
import { normalizeReleaseStatus, releaseStatusPresentation } from "@/lib/releasePresentation";
import { formatProjectVersionLabel } from "@/lib/utils";
import { formatUsd } from "@/pages/AgentAnalytics/agentAnalyticsDisplay";

export function getCreatorLabel(project) {
  if (typeof project?.createdBy?.name === "string" && project.createdBy.name.trim() !== "") {
    return project.createdBy.name.trim();
  }
  if (typeof project?.createdBy?.email === "string" && project.createdBy.email.trim() !== "") {
    return project.createdBy.email.trim();
  }
  return "—";
}

export function formatRelativeUpdated(project) {
  const raw = project?.updatedAt ?? project?.createdAt;
  if (!raw) return "—";
  try {
    const date = typeof raw === "string" ? parseISO(raw) : new Date(raw);
    if (Number.isNaN(date.getTime())) return "—";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "—";
  }
}

export function getLatestRelease(project) {
  const releases = Array.isArray(project?.releases) ? project.releases : [];
  if (releases.length === 0) return null;
  return releases[0];
}

export function getActiveVersionLabel(project) {
  const version = project?.versions?.[0]?.version;
  if (!version) return null;
  return formatProjectVersionLabel(version);
}

export function getReleaseStatusChip(release) {
  if (!release) return null;
  const presentation = releaseStatusPresentation(release);
  return {
    label: presentation.label,
    className: presentation.pillClass,
    status: normalizeReleaseStatus(release),
    releaseName: release.name ?? null,
  };
}

export function getProjectCardMeta(project) {
  const { clientUrl, previewOnlyUrl, linksDisabledHint } = buildProjectClientUrls(project);
  const latestRelease = getLatestRelease(project);
  const releaseChip = getReleaseStatusChip(latestRelease);
  const slug = project?.slug != null ? String(project.slug).trim() : "";
  const description = typeof project?.description === "string" ? project.description.trim() : "";

  return {
    creatorLabel: getCreatorLabel(project),
    updatedRelative: formatRelativeUpdated(project),
    activeVersionLabel: getActiveVersionLabel(project),
    latestRelease,
    releaseChip,
    description,
    clientUrl,
    previewOnlyUrl,
    linksDisabledHint,
    hasSlug: Boolean(slug),
    fromScratch: Boolean(project?.fromScratch),
    showNoSlugChip: !slug,
    budgetRemainingLabel:
      Number.isFinite(Number(project?.remainingUsd)) && Number.isFinite(Number(project?.budgetUsd))
        ? `${formatUsd(project.remainingUsd)} AI budget left`
        : null,
  };
}
