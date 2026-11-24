import { AgentOrchestrationLivePanel } from "@/components/chat/AgentOrchestrationLivePanel";
import { resolveDeployAgentPipelineLabel } from "./cloudDeployAgentStream.util";

const DEPLOY_PHASES = [
  { key: "MATERIALIZING", label: "Preparing files" },
  { key: "AGENT_DEPLOY", label: "Agent deploying" },
  { key: "VALIDATING", label: "Checking URLs" },
  { key: "PUBLISHING", label: "Publishing fixes" },
];

/**
 * Inline live deploy output — ClientLink-style agent timeline over SSE.
 */
export function CloudDeployLivePanel({
  visible,
  runStatus,
  runPhase,
  runLog,
  commandPreview,
  timeline = [],
  validationChecks = [],
  agentStream = { streamText: "", streamPhase: "", streamTimeline: [], publishStep: null },
  deployStartedAtMs = null,
  onDismiss,
}) {
  const publishPipelineLabel = resolveDeployAgentPipelineLabel(agentStream, runPhase);

  return (
    <AgentOrchestrationLivePanel
      visible={visible}
      title="Deploy output"
      subtitle={
        <>
          Live agent activity while{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">deploy.sh</code> runs, then URL
          checks and merge or open PR per backend settings.
        </>
      }
      phases={DEPLOY_PHASES}
      agentPhaseKey="AGENT_DEPLOY"
      activeProgressLabel="Deploy in progress…"
      runStatus={runStatus}
      runPhase={runPhase}
      runLog={runLog}
      commandPreview={commandPreview}
      timeline={timeline}
      validationChecks={validationChecks}
      agentStream={agentStream}
      startedAtMs={deployStartedAtMs}
      progressDetailPhaseKey="PUBLISHING"
      progressDetail={runPhase === "PUBLISHING" ? publishPipelineLabel : ""}
      logsOpenLabel="Show deploy logs"
      logsCloseLabel="Hide deploy logs"
      dismissAriaLabel="Dismiss deploy output"
      onDismiss={onDismiss}
    />
  );
}
