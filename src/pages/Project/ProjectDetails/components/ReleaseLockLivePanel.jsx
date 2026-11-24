import { AgentOrchestrationLivePanel } from "@/components/chat/AgentOrchestrationLivePanel";

const LOCK_PHASES = [
  { key: "SYNCING_SUBMODULE", label: "Preparing repo" },
  { key: "AGENT_PLAN", label: "Backend plan agent" },
  { key: "LOCKING", label: "Locking release" },
];

/**
 * Inline live release lock output — same agent timeline UX as cloud deploy.
 */
export function ReleaseLockLivePanel({
  visible,
  runStatus,
  runPhase,
  runLog,
  agentStream = { streamText: "", streamPhase: "", streamTimeline: [] },
  lockStartedAtMs = null,
  onDismiss,
}) {
  return (
    <AgentOrchestrationLivePanel
      visible={visible}
      title="Release lock output"
      subtitle="Live agent activity while the backend plan agent runs. The release locks when it finishes successfully."
      phases={LOCK_PHASES}
      agentPhaseKey="AGENT_PLAN"
      activeProgressLabel="Release lock in progress…"
      runStatus={runStatus}
      runPhase={runPhase}
      runLog={runLog}
      agentStream={agentStream}
      startedAtMs={lockStartedAtMs}
      logsOpenLabel="Show lock logs"
      logsCloseLabel="Hide lock logs"
      dismissAriaLabel="Dismiss release lock output"
      onDismiss={onDismiss}
    />
  );
}
