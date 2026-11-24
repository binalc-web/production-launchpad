import { AgentOrchestrationLivePanel } from "@/components/chat/AgentOrchestrationLivePanel";
import { formatPreviewDemoAuthUiHint } from "@/lib/previewDemoAuth";

const MIGRATE_PHASES = [
  { key: "PLATFORM_SYNC", label: "Carbon copy" },
  { key: "PLAN", label: "Screen plan" },
  { key: "IMPLEMENT", label: "Implement screens" },
  { key: "SURGERY", label: "Preview mocks" },
  { key: "AGENT", label: "Preview mocks" },
];

/**
 * Subtle layout copy: single vs multi is development-repo driven.
 * @param {{ migrateDevLayout?: string, migrateDevelopmentRepoCount?: number } | null | undefined} meta
 */
function formatMigrateDevLayoutHint(meta) {
  if (!meta || typeof meta !== "object") return "";
  const n = Number(meta.migrateDevelopmentRepoCount);
  if (Number.isInteger(n) && n >= 1) {
    return `Development: ${n} repo${n === 1 ? "" : "s"} → primary launchpad preview.`;
  }
  if (meta.migrateDevLayout === "multi") {
    return "Development: multi-repo workspace → primary launchpad preview.";
  }
  if (meta.migrateDevLayout === "single") {
    return "Development: 1 repo → primary launchpad preview.";
  }
  return "";
}

/**
 * Prefer an actionable last error line from migrate logs / sync detail.
 * @param {{ runStatus?: string, runLog?: string, platformSyncDetail?: string }} opts
 */
export function resolveMigrateFrontendFailureSummary({
  runStatus,
  runLog = "",
  platformSyncDetail = "",
} = {}) {
  if (String(runStatus || "").toUpperCase() !== "FAILED") return "";
  const detail = String(platformSyncDetail || "").trim();
  if (detail && !/^ok\b/i.test(detail)) return detail;
  const lines = String(runLog || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (/error|fail|denied|forbidden|timeout|unable|could not|missing/i.test(line)) {
      return line.length > 280 ? `${line.slice(0, 277)}…` : line;
    }
  }
  return (
    lines[lines.length - 1] ||
    "Build Frontend App failed. Open the build logs below for details, check GitHub access on the platform repo, then retry."
  );
}

/**
 * Inline live Build Frontend App output — carbon-copy + plan + implement (or legacy surgery).
 */
export function MigrateFrontendLivePanel({
  visible,
  runStatus,
  runPhase,
  runLog,
  agentStream = { streamText: "", streamPhase: "", streamTimeline: [] },
  migrateStartedAtMs = null,
  platformSyncDetail = "",
  migrateDevLayoutMeta = null,
  onDismiss,
}) {
  const effectivePhase =
    runPhase === "AGENT" ? "SURGERY" : runPhase === "IMPLEMENT" ? "IMPLEMENT" : runPhase;
  const threePhase =
    effectivePhase === "PLAN" ||
    effectivePhase === "IMPLEMENT" ||
    String(platformSyncDetail || "")
      .toLowerCase()
      .includes("plan");
  const phases = threePhase
    ? MIGRATE_PHASES.filter(
        (p) => p.key === "PLATFORM_SYNC" || p.key === "PLAN" || p.key === "IMPLEMENT",
      )
    : MIGRATE_PHASES.filter((p) => p.key === "PLATFORM_SYNC" || p.key === "SURGERY");
  const agentPhaseKey =
    effectivePhase === "PLAN" ? "PLAN" : effectivePhase === "IMPLEMENT" ? "IMPLEMENT" : "SURGERY";
  const credsHint = formatPreviewDemoAuthUiHint();
  const layoutHint = formatMigrateDevLayoutHint(migrateDevLayoutMeta);
  const subtitle = [
    "Phase 1 carbon-copies the development UI into the primary launchpad preview; then plan/implement with mocks.",
    layoutHint,
    credsHint,
  ]
    .filter(Boolean)
    .join(" ");

  const failureSummary = resolveMigrateFrontendFailureSummary({
    runStatus,
    runLog,
    platformSyncDetail,
  });

  return (
    <AgentOrchestrationLivePanel
      visible={visible}
      title="Build Frontend App output"
      subtitle={subtitle}
      phases={phases}
      agentPhaseKey={agentPhaseKey}
      activeProgressLabel="Build Frontend App in progress…"
      runStatus={runStatus}
      runPhase={effectivePhase}
      runLog={runLog}
      agentStream={agentStream}
      startedAtMs={migrateStartedAtMs}
      progressDetail={platformSyncDetail}
      progressDetailPhaseKey="PLATFORM_SYNC"
      failureSummary={failureSummary}
      logsOpenLabel="Show build logs"
      logsCloseLabel="Hide build logs"
      dismissAriaLabel="Dismiss Build Frontend App output"
      onDismiss={onDismiss}
    />
  );
}
