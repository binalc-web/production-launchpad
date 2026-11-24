import { AgentOrchestrationLivePanel } from "@/components/chat/AgentOrchestrationLivePanel";
import { InfraAnalysisStepper } from "./InfraAnalysisStepper";

/** Map infra analysis run status to deploy-style status for shared live panel. */
export function mapInfraAnalysisRunStatusForLivePanel(status) {
  switch (String(status ?? "").toLowerCase()) {
    case "completed":
      return "SUCCEEDED";
    case "failed":
      return "FAILED";
    case "queued":
    case "running":
      return "RUNNING";
    default:
      return status ?? null;
  }
}

/**
 * Inline live output for infra analysis — numbered pipeline steps and agent timeline over SSE.
 */
export function InfraAnalysisLivePanel({
  visible,
  runStatus,
  runPhase,
  runLog,
  agentStream = { streamText: "", streamPhase: "", streamTimeline: [] },
  analysisStartedAtMs = null,
  onDismiss,
}) {
  const run = { status: runStatus, currentPhase: runPhase };

  return (
    <AgentOrchestrationLivePanel
      visible={visible}
      title="Analysis output"
      subtitle="Live agent activity while infrastructure is scanned across your development repositories."
      phases={[]}
      pipelineSteps={<InfraAnalysisStepper run={run} showHeading={false} />}
      activeProgressLabel="Analysis in progress…"
      runStatus={mapInfraAnalysisRunStatusForLivePanel(runStatus)}
      runPhase={runPhase}
      runLog={runLog}
      commandPreview=""
      timeline={[]}
      validationChecks={[]}
      agentStream={agentStream}
      startedAtMs={analysisStartedAtMs}
      logsOpenLabel="Show activity log"
      logsCloseLabel="Hide activity log"
      dismissAriaLabel="Dismiss analysis output"
      onDismiss={onDismiss}
    />
  );
}
