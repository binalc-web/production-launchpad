import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Edit3, X, Users, ArrowRight, Bot
} from 'lucide-react';
import { planningData, TEAM_MEMBERS } from '../../data/mockData';
import { agentScheduledTasks } from '../../data/aiAgentData';
import { Avatar } from '../Layout';
import { AgentBadge } from '../ui/AgentAvatar';

export default function PlanningPage() {
  const [selectedCell, setSelectedCell] = useState<{ member: string; weekIdx: number } | null>(null);
  const [selectedAgentWeek, setSelectedAgentWeek] = useState<number | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  const { weeks, currentWeekIndex, teamRows } = planningData;

  const totalHours = weeks.map((_, wi) => {
    const parts = teamRows.flatMap(row => {
      const h = row.hours[wi];
      const match = h.match(/(\d+)h\s*(\d+)?m?/);
      if (!match) return [0];
      return [parseInt(match[1]) * 60 + (parseInt(match[2] || '0'))];
    });
    const total = parts.reduce((a, b) => a + b, 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h ${m}m`;
  });

  const filteredRows = assigneeFilter === 'All'
    ? teamRows
    : teamRows.filter(r => r.member === assigneeFilter);

  const selectedRowData = selectedCell
    ? teamRows.find(r => r.member === selectedCell.member)
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <h1 className="text-[20px] font-semibold text-[#111827]">Planning</h1>

        {/* Week navigator */}
        <div className="flex items-center gap-1 ml-4 border border-[#E5E7EB] rounded overflow-hidden">
          <button className="p-1.5 hover:bg-[#F9FAFB] border-r border-[#E5E7EB]">
            <ChevronLeft size={14} className="text-[#6B7280]" />
          </button>
          <span className="px-3 text-[13px] text-[#374151] font-medium">
            {weeks[0]} — {weeks[weeks.length - 1]}
          </span>
          <button className="p-1.5 hover:bg-[#F9FAFB] border-l border-[#E5E7EB]">
            <ChevronRight size={14} className="text-[#6B7280]" />
          </button>
        </div>

        {/* Assignee filter */}
        <div className="relative">
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="appearance-none text-[13px] border border-[#E5E7EB] rounded px-3 py-1.5 pr-7 text-[#374151] bg-white outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value="All">All Team Members</option>
            {Object.keys(TEAM_MEMBERS).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
        </div>

        {/* Client filter */}
        <div className="relative">
          <select className="appearance-none text-[13px] border border-[#E5E7EB] rounded px-3 py-1.5 pr-7 text-[#374151] bg-white outline-none focus:border-[#2563EB] cursor-pointer">
            <option>All Clients</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
        </div>

        <div className="ml-auto">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
            <Edit3 size={13} /> Bulk Edit
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className={`flex-1 overflow-auto min-w-0 ${selectedCell ? 'border-r border-[#E5E7EB]' : ''}`}>
          <table className="w-full border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="w-[180px] px-4 py-2.5 text-left text-[11px] font-medium text-[#6B7280] uppercase tracking-wider border-r border-[#E5E7EB]">
                  Team Member
                </th>
                {weeks.map((week, wi) => (
                  <th key={week} className="px-4 py-2.5 text-center text-[11px] font-medium text-[#6B7280] uppercase tracking-wider min-w-[120px]">
                    <div className={`${wi === currentWeekIndex ? 'text-[#2563EB]' : ''}`}>
                      {week}
                    </div>
                    {wi === currentWeekIndex && (
                      <div className="mt-0.5 h-0.5 bg-[#2563EB] rounded-full mx-2" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Overview row */}
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <td className="px-4 py-3 border-r border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#E5E7EB] flex items-center justify-center">
                      <Users size={12} className="text-[#6B7280]" />
                    </div>
                    <span className="text-[12px] font-semibold text-[#374151]">Team Overview</span>
                  </div>
                </td>
                {weeks.map((week, wi) => (
                  <td key={week} className="px-4 py-3 text-center">
                    <span className={`text-[13px] font-semibold ${wi === currentWeekIndex ? 'text-[#2563EB]' : 'text-[#374151]'}`}>
                      {totalHours[wi]}
                    </span>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">outstanding</div>
                  </td>
                ))}
              </tr>

              {/* Team member rows */}
              {filteredRows.map(row => {
                const member = TEAM_MEMBERS[row.member];
                if (!member) return null;
                return (
                  <tr key={row.member} className="border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 border-r border-[#E5E7EB]">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={member.initials} color={member.color} size="sm" />
                        <div>
                          <div className="text-[13px] font-medium text-[#111827]">{row.member}</div>
                          <div className="text-[11px] text-[#9CA3AF]">{member.email.split('@')[0]}</div>
                        </div>
                      </div>
                    </td>
                    {weeks.map((week, wi) => {
                      const isCurrentWeek = wi === currentWeekIndex;
                      const isSelected = selectedCell?.member === row.member && selectedCell?.weekIdx === wi;
                      const hours = row.hours[wi];
                      const [h] = hours.match(/\d+/)!;
                      const hoursNum = parseInt(h);
                      const intensity = Math.min(hoursNum / 20, 1);

                      return (
                        <td key={week}
                          onClick={() => setSelectedCell(isSelected ? null : { member: row.member, weekIdx: wi })}
                          className={`px-4 py-3 text-center cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#EFF6FF]' : isCurrentWeek ? 'hover:bg-[#F0F7FF]' : 'hover:bg-[#F9FAFB]'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[13px] font-semibold ${
                              isSelected ? 'text-[#2563EB]' : isCurrentWeek ? 'text-[#2563EB]' : 'text-[#374151]'
                            }`}>
                              {hours}
                            </span>
                            <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden max-w-[80px]">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${intensity * 100}%`,
                                  backgroundColor: isCurrentWeek ? '#2563EB' : '#D1D5DB'
                                }}
                              />
                            </div>
                            <div className="text-[10px] text-[#9CA3AF]">
                              {row.tasks[wi]?.length ?? 0} task{(row.tasks[wi]?.length ?? 0) !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Unassigned row */}
              <tr className="border-b border-[#F3F4F6] bg-[#FAFAFA]">
                <td className="px-4 py-3 border-r border-[#E5E7EB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#D1D5DB] flex items-center justify-center">
                      <span className="text-[10px] text-[#9CA3AF]">?</span>
                    </div>
                    <span className="text-[13px] text-[#9CA3AF] italic">Unassigned</span>
                  </div>
                </td>
                {weeks.map(week => (
                  <td key={week} className="px-4 py-3 text-center">
                    <span className="text-[13px] text-[#D1D5DB]">—</span>
                  </td>
                ))}
              </tr>

              {/* AI Agents row */}
              <tr className="border-b border-[#E5E7EB] bg-[#F5F3FF]">
                <td className="px-4 py-3 border-r border-[#E5E7EB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                      <Bot size={13} className="text-[#4F46E5]" />
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-[#4F46E5]">AI Agents</div>
                      <div className="text-[10px] text-[#9CA3AF]">automated tasks</div>
                    </div>
                  </div>
                </td>
                {weeks.map((week, wi) => {
                  const weekTasks = agentScheduledTasks.filter(t => t.weekIndex === wi);
                  const isSelected = selectedAgentWeek === wi;
                  const hasFailed = weekTasks.some(t => t.status === 'Failed');
                  const hasRunning = weekTasks.some(t => t.status === 'Running');
                  return (
                    <td
                      key={week}
                      onClick={() => {
                        setSelectedAgentWeek(isSelected ? null : wi);
                        setSelectedCell(null);
                      }}
                      className={`px-4 py-3 text-center cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#EEECFF]'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[13px] font-semibold ${isSelected ? 'text-[#4F46E5]' : hasFailed ? 'text-[#DC2626]' : 'text-[#4F46E5]'}`}>
                          {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''}
                        </span>
                        <div className="w-full h-1.5 bg-[#E0E7FF] rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(weekTasks.length / 10 * 100, 100)}%`,
                              backgroundColor: hasFailed ? '#DC2626' : hasRunning ? '#4F46E5' : '#818CF8',
                            }}
                          />
                        </div>
                        {hasFailed && <span className="text-[10px] text-[#DC2626] font-medium">1 failed</span>}
                        {hasRunning && !hasFailed && <span className="text-[10px] text-[#4F46E5]">running</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Side panel */}
        {selectedCell && selectedRowData && (
          <div className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  {TEAM_MEMBERS[selectedCell.member] && (
                    <Avatar initials={TEAM_MEMBERS[selectedCell.member].initials} color={TEAM_MEMBERS[selectedCell.member].color} size="sm" />
                  )}
                  <span className="text-[14px] font-semibold text-[#111827]">{selectedCell.member}</span>
                </div>
                <p className="text-[12px] text-[#9CA3AF] mt-0.5 pl-8">{weeks[selectedCell.weekIdx]}</p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="p-1 hover:bg-[#F3F4F6] rounded">
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-[#F3F4F6] bg-[#FAFAFA] flex-shrink-0">
              <span className="text-[13px] font-semibold text-[#374151]">
                {selectedRowData.hours[selectedCell.weekIdx]}
              </span>
              <span className="text-[12px] text-[#9CA3AF] ml-2">total outstanding</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4">
                <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Tasks this week</h4>
                {(selectedRowData.tasks[selectedCell.weekIdx] ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {(selectedRowData.tasks[selectedCell.weekIdx] ?? []).map((taskLabel, i) => {
                      const parts = taskLabel.split(' — ');
                      const taskName = parts[0];
                      const clientName = parts[1] || '';
                      return (
                        <div key={i} className="p-3 border border-[#F3F4F6] rounded-lg hover:border-[#E5E7EB] cursor-pointer group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[#111827] truncate group-hover:text-[#2563EB] transition-colors">
                                {taskName}
                              </p>
                              <p className="text-[11px] text-[#9CA3AF] mt-0.5">{clientName}</p>
                            </div>
                            <button className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowRight size={13} className="text-[#9CA3AF]" />
                            </button>
                          </div>
                          {/* Reassign button */}
                          <div className="mt-2 pt-2 border-t border-[#F9FAFB] flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {TEAM_MEMBERS[selectedCell.member] && (
                                <Avatar initials={TEAM_MEMBERS[selectedCell.member].initials} color={TEAM_MEMBERS[selectedCell.member].color} size="sm" />
                              )}
                              <span className="text-[11px] text-[#6B7280]">{selectedCell.member}</span>
                            </div>
                            <button className="text-[11px] text-[#2563EB] hover:underline">Reassign</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[13px] text-[#9CA3AF]">No tasks this week</div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#E5E7EB] flex-shrink-0">
              <button className="w-full py-2 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors font-medium">
                Bulk Reassign Tasks
              </button>
            </div>
          </div>
        )}

        {/* Side panel for agent week */}
        {selectedAgentWeek !== null && (
          <div className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden bg-white border-l border-[#E5E7EB]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                    <Bot size={13} className="text-[#4F46E5]" />
                  </div>
                  <span className="text-[14px] font-semibold text-[#4F46E5]">AI Agents</span>
                </div>
                <p className="text-[12px] text-[#9CA3AF] mt-0.5 pl-8">{weeks[selectedAgentWeek]}</p>
              </div>
              <button onClick={() => setSelectedAgentWeek(null)} className="p-1 hover:bg-[#F3F4F6] rounded">
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4">
                <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Scheduled Agent Tasks</h4>
                <div className="space-y-2">
                  {agentScheduledTasks.filter(t => t.weekIndex === selectedAgentWeek).map(task => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border text-[12px] ${
                        task.status === 'Failed' ? 'border-[#FECACA] bg-[#FFF5F5]' :
                        task.status === 'Running' ? 'border-[#E0E7FF] bg-[#EEF2FF]' :
                        task.status === 'Completed' ? 'border-[#BBF7D0] bg-[#F0FDF4]' :
                        'border-[#F3F4F6] bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-[#374151]">{task.clientName}</span>
                        <AgentBadge agentType={task.agentType} size="xs" />
                      </div>
                      <p className="text-[#6B7280] mb-1.5">{task.taskName}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#9CA3AF]">Due {task.dueDate}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          task.status === 'Failed' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                          task.status === 'Running' ? 'bg-[#EEF2FF] text-[#4F46E5]' :
                          task.status === 'Completed' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                          'bg-[#F3F4F6] text-[#6B7280]'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}