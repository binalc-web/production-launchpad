import {
  normalizeBackendDeployMode,
  normalizeBackendInfraStack,
  normalizeBackendLockAgentMode,
} from "@/pages/Project/ProjectDetails/components/ReleaseLockBackendAgentCard";
import { getActiveRelease } from "@/pages/Project/ProductManagement/utils/releaseWorkflowStatus";
import { formatUsd } from "@/pages/AgentAnalytics/agentAnalyticsDisplay";
import { PROJECT_BUDGET_EXCEEDED_MESSAGE } from "@/constants/projectBudget";

const BACKEND_MODE_LABELS = {
  plan: "Plan",
  code_auto: "Code + auto merge",
  code_pr: "Code + PR",
};

const INFRA_STACK_LABELS = {
  cloudformation: "CloudFormation",
  terraform: "Terraform",
  none: "None",
};

const DEPLOY_MODE_LABELS = {
  server: "Server",
  serverless: "Serverless",
};

/** @param {string | null | undefined} mode */
export function formatBackendLockAgentModeLabel(mode) {
  const normalized = normalizeBackendLockAgentMode(mode);
  return BACKEND_MODE_LABELS[normalized] ?? BACKEND_MODE_LABELS.code_auto;
}

/** @param {string | null | undefined} infraStack @param {string | null | undefined} deployMode */
export function formatBackendInfraLabel(infraStack, deployMode) {
  const stack = normalizeBackendInfraStack(infraStack);
  const stackLabel = INFRA_STACK_LABELS[stack] ?? INFRA_STACK_LABELS.cloudformation;
  if (stack === "none") return stackLabel;
  const hosting = normalizeBackendDeployMode(deployMode);
  const hostingLabel = DEPLOY_MODE_LABELS[hosting] ?? DEPLOY_MODE_LABELS.server;
  return `${stackLabel} · ${hostingLabel}`;
}

/** @param {string | null | undefined} developmentRepoUrl */
export function formatDevRepoStatus(developmentRepoUrl) {
  const url = String(developmentRepoUrl ?? "").trim();
  if (!url) {
    return { status: "missing", label: "Not set" };
  }
  try {
    const host = new URL(url).host;
    return {
      status: "connected",
      label: host || "Connected",
      hint: url,
    };
  } catch {
    return { status: "connected", label: "Connected", hint: url };
  }
}

/** @param {Array<{ isActive?: boolean, version?: string }> | null | undefined} versions */
export function formatLiveRevisionLabel(versions) {
  const active = (versions ?? []).find((v) => v?.isActive);
  const version = String(active?.version ?? "").trim();
  return version || "None";
}

/** @param {string | null | undefined} url */
export function formatDeployUrlStatus(url) {
  const raw = String(url ?? "")
    .trim()
    .replace(/\/$/, "");
  if (!raw) {
    return { label: "Not deployed", hint: null };
  }
  try {
    const host = new URL(raw).host;
    return {
      label: host || raw,
      hint: raw,
    };
  } catch {
    return { label: raw, hint: raw };
  }
}

/**
 * First frontend deployment URL from deploy-map environments (CloudFront / website).
 * @param {{ environments?: Array<{ deployment?: { links?: Array<{ id?: string, url?: string }> } }> } | null | undefined} deployMap
 */
export function resolveFrontendDeployUrl(deployMap) {
  const environments = deployMap?.environments ?? [];
  for (const env of environments) {
    const links = env?.deployment?.links ?? [];
    const frontend = links.find((link) => link?.id === "frontend" && link?.url);
    const url = String(frontend?.url ?? "").trim();
    if (url) return url.replace(/\/$/, "");
  }
  for (const env of environments) {
    for (const link of env?.deployment?.links ?? []) {
      const url = String(link?.url ?? "")
        .trim()
        .replace(/\/$/, "");
      if (url && /cloudfront\.net/i.test(url)) return url;
    }
  }
  return "";
}

/**
 * @param {object | null | undefined} project
 * @param {{ frontendDeployUrl?: string | null | undefined }} [options]
 * @returns {Array<{ id: string, label: string, value: string, variant?: string, hint?: string, href?: string, navigate: { section: string, area?: string } }>}
 */
export function buildProjectStatusItems(project, options = {}) {
  if (!project) return [];

  const activeRelease = getActiveRelease(project.releases);
  const activeReleaseName = String(activeRelease?.name ?? "").trim() || "None";
  const liveRevision = formatLiveRevisionLabel(project.versions);
  const frontendDeployUrl = String(options.frontendDeployUrl ?? "").trim();
  const frontendDeploy = frontendDeployUrl ? formatDeployUrlStatus(frontendDeployUrl) : null;
  const remainingUsd = Number(project.remainingUsd ?? NaN);
  const budgetUsd = Number(project.budgetUsd ?? NaN);
  const hasBudgetSummary = Number.isFinite(remainingUsd) && Number.isFinite(budgetUsd);

  /** @type {Array<{ id: string, label: string, value: string, variant?: string, hint?: string, href?: string, navigate: { section: string, area?: string } }>} */
  const items = [
    ...(hasBudgetSummary
      ? [
          {
            id: "ai-budget",
            label: "AI budget left",
            value: formatUsd(remainingUsd),
            variant: project.isOverBudget ? "warning" : "default",
            hint: project.isOverBudget
              ? PROJECT_BUDGET_EXCEEDED_MESSAGE
              : `${formatUsd(project.totalSpendUsd ?? 0)} spent of ${formatUsd(budgetUsd)}`,
            navigate: { section: "backend" },
          },
        ]
      : []),
    {
      id: "active-release",
      label: "Active release",
      value: activeReleaseName,
      variant: activeRelease ? "primary" : "muted",
      navigate: { section: "releases", area: "active" },
    },
    {
      id: "live-revision",
      label: "Live revision",
      value: liveRevision,
      variant: liveRevision === "None" ? "muted" : "default",
      navigate: { section: "releases", area: "active" },
    },
  ];

  if (frontendDeploy) {
    items.push({
      id: "frontend-url",
      label: "Frontend URL",
      value: frontendDeploy.label,
      hint: frontendDeploy.hint ?? undefined,
      href: frontendDeployUrl,
      navigate: { section: "environment" },
    });
  }

  return items;
}
