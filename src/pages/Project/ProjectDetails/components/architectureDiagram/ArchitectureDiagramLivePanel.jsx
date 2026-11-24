import { AgentOrchestrationLivePanel } from "@/components/chat/AgentOrchestrationLivePanel";
import { ArchitectureDiagramStepper } from "./ArchitectureDiagramStepper";
import { mapArchitectureStatusForLivePanel } from "./architectureDiagramSteps";

export function ArchitectureDiagramLivePanel({
  visible,
  runStatus,
  runPhase,
  runLog,
  agentStream = { streamText: "", streamPhase: "", streamTimeline: [] },
  generationStartedAtMs = null,
  onDismiss,
}) {
  const run = { status: runStatus, currentPhase: runPhase };

  return (
    <AgentOrchestrationLivePanel
      visible={visible}
      title="Architecture output"
      subtitle="Live progress while the knowledge graph is built on your development repository."
      phases={[]}
      pipelineSteps={<ArchitectureDiagramStepper run={run} showHeading={false} />}
      activeProgressLabel="Building architecture diagram…"
      runStatus={mapArchitectureStatusForLivePanel(runStatus)}
      runPhase={runPhase}
      runLog={runLog}
      commandPreview=""
      timeline={[]}
      validationChecks={[]}
      agentStream={agentStream}
      startedAtMs={generationStartedAtMs}
      logsOpenLabel="Show activity log"
      logsCloseLabel="Hide activity log"
      dismissAriaLabel="Dismiss architecture output"
      onDismiss={onDismiss}
    />
  );
}
