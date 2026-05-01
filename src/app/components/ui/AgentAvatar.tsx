import { Bot } from 'lucide-react';
import type { AgentType } from '../../data/aiAgentData';
import { AGENT_LABELS } from '../../data/aiAgentData';

interface AgentAvatarProps {
  agentType: AgentType;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

export function AgentAvatar({ agentType, size = 'sm', showLabel = false }: AgentAvatarProps) {
  const { label, color, bg } = AGENT_LABELS[agentType];
  const sizes = {
    xs: { box: 'w-5 h-5', icon: 10 },
    sm: { box: 'w-6 h-6', icon: 12 },
    md: { box: 'w-7 h-7', icon: 14 },
  };
  const { box, icon } = sizes[size];

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div
        className={`${box} rounded flex items-center justify-center flex-shrink-0`}
        style={{ backgroundColor: bg, border: `1px solid ${color}30` }}
      >
        <Bot size={icon} style={{ color }} />
      </div>
      {showLabel && (
        <span className="text-[12px] font-medium" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}

interface AgentBadgeProps {
  agentType: AgentType;
  size?: 'xs' | 'sm';
}

export function AgentBadge({ agentType, size = 'sm' }: AgentBadgeProps) {
  const { label, color, bg } = AGENT_LABELS[agentType];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}
      style={{ backgroundColor: bg, color }}
    >
      <Bot size={size === 'xs' ? 9 : 10} />
      {label}
    </span>
  );
}

interface AgentStatusBadgeProps {
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'Scheduled' | 'Running' | 'Completed' | 'Failed' | 'Pending';
  size?: 'xs' | 'sm';
}

export function AgentStatusBadge({ status, size = 'sm' }: AgentStatusBadgeProps) {
  const lower = status.toLowerCase();
  const styles: Record<string, { bg: string; text: string; dot?: string }> = {
    scheduled: { bg: '#F3F4F6', text: '#6B7280' },
    running: { bg: '#EEF2FF', text: '#4F46E5', dot: '#4F46E5' },
    completed: { bg: '#EEF2FF', text: '#4F46E5' },
    failed: { bg: '#FEF2F2', text: '#DC2626' },
    pending: { bg: '#F3F4F6', text: '#6B7280' },
  };
  const style = styles[lower] || styles.scheduled;
  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    running: 'Running',
    completed: 'Completed by Agent',
    failed: 'Needs Attention',
    pending: 'Pending',
  };
  const px = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${px}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {lower === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: style.dot }} />
      )}
      {labels[lower] ?? status}
    </span>
  );
}
