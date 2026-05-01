import { useState } from 'react';
import {
  Plus, X, ChevronDown, ChevronUp, MoreHorizontal, ArrowUpDown,
  Clock, CheckSquare, Users, AlertTriangle, Edit2, Trash2, ChevronRight,
  Bot, User, Info, Cloud, HardDrive, FolderOpen
} from 'lucide-react';
import { templates as initialTemplates, TEAM_MEMBERS, type Template, type TemplateTask } from '../../data/mockData';
import { AGENT_LABELS, type AgentType } from '../../data/aiAgentData';
import { Avatar } from '../Layout';
import { AgentAvatar, AgentBadge } from '../ui/AgentAvatar';

// Monthly Bookkeeping template gets agent tasks added for demo
const AGENT_TEMPLATE_TASKS: Record<string, TemplateTask['agentAssignee']> = {
  tt10: { type: 'claude-excel', skillName: 'Transaction Analysis' },
  tt11: { type: 'claude-excel', skillName: 'Bank Reconciliation' },
};

function AddTaskPanel({ onClose }: { onClose: () => void }) {
  const [assigneeTab, setAssigneeTab] = useState<'team' | 'agent'>('team');
  const [agentType, setAgentType] = useState<AgentType>('claude-excel');
  const [skillName, setSkillName] = useState('Transaction Analysis');

  return (
    <div className="w-[360px] flex-shrink-0 border-l border-[#E5E7EB] flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] flex-shrink-0">
        <h3 className="text-[14px] font-semibold text-[#111827]">Add Task</h3>
        <button onClick={onClose} className="p-1 hover:bg-[#F3F4F6] rounded">
          <X size={14} className="text-[#9CA3AF]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Task Name */}
        <div>
          <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Task Name</label>
          <input
            type="text"
            placeholder="e.g. Categorize transactions in QBO"
            className="w-full text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] outline-none focus:border-[#2563EB] placeholder-[#9CA3AF]"
          />
        </div>

        {/* Cascading Due Date */}
        <div>
          <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Cascading Due Date</label>
          <input
            type="text"
            placeholder="e.g. 5 days after month end"
            className="w-full text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] outline-none focus:border-[#2563EB] placeholder-[#9CA3AF]"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Budgeted Time</label>
          <input
            type="text"
            placeholder="e.g. 1h 30m"
            className="w-full text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] outline-none focus:border-[#2563EB] placeholder-[#9CA3AF]"
          />
        </div>

        {/* Assignee — segmented */}
        <div>
          <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Assignee</label>

          {/* Segmented selector */}
          <div className="flex border border-[#E5E7EB] rounded-md overflow-hidden mb-3">
            <button
              onClick={() => setAssigneeTab('team')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors ${
                assigneeTab === 'team'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
              }`}
            >
              <User size={12} /> Team Member
            </button>
            <button
              onClick={() => setAssigneeTab('agent')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors border-l border-[#E5E7EB] ${
                assigneeTab === 'agent'
                  ? 'bg-[#4F46E5] text-white'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
              }`}
            >
              <Bot size={12} /> AI Agent
            </button>
          </div>

          {assigneeTab === 'team' ? (
            <div className="relative">
              <select className="w-full appearance-none text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 pr-8 text-[#374151] bg-white outline-none focus:border-[#2563EB]">
                <option value="">Unassigned</option>
                {Object.entries(TEAM_MEMBERS).map(([key]) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Agent Type */}
              <div>
                <label className="block text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-1.5">Agent Type</label>
                <div className="space-y-2">
                  {(['claude-excel', 'claude-cowork'] as AgentType[]).map(type => {
                    const { label, color, bg } = AGENT_LABELS[type];
                    const isSelected = agentType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setAgentType(type)}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border-2 text-left transition-all"
                        style={{
                          borderColor: isSelected ? color : '#E5E7EB',
                          backgroundColor: isSelected ? bg : 'white',
                        }}
                      >
                        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                          <Bot size={14} style={{ color }} />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold" style={{ color: isSelected ? color : '#374151' }}>{label}</p>
                          <p className="text-[10px] text-[#9CA3AF]">
                            {type === 'claude-excel' ? 'Best for spreadsheet work' : 'Best for research & drafting'}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
                            <span className="text-white text-[9px]">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skill Name */}
              <div>
                <label className="block text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-1.5">Skill Name</label>
                <div className="relative">
                  <select
                    value={skillName}
                    onChange={e => setSkillName(e.target.value)}
                    className="w-full appearance-none text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 pr-8 text-[#374151] bg-white outline-none focus:border-[#4F46E5]"
                  >
                    <option>Transaction Analysis</option>
                    <option>Bank Reconciliation</option>
                    <option>Payroll Summary</option>
                    <option>Financial Report Generation</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
              </div>

              {/* Trigger (read-only) */}
              <div>
                <label className="block text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-1.5">Trigger</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F9FAFB] border border-[#F3F4F6] rounded-md">
                  <Clock size={12} className="text-[#9CA3AF]" />
                  <span className="text-[12px] text-[#6B7280]">Auto-runs when task becomes due</span>
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-2 px-3 py-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md">
                <Info size={13} className="text-[#2563EB] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#3B82F6] leading-relaxed">
                  Each client using this template will need an agent configuration (file path, data source) set on their profile. Configure from the client's AI Agents tab.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3.5 border-t border-[#E5E7EB] flex gap-2 flex-shrink-0">
        <button className="flex-1 px-3 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded hover:bg-[#1D4ED8] transition-colors">
          Save
        </button>
        <button className="px-3 py-2 border border-[#E5E7EB] text-[13px] text-[#374151] rounded hover:bg-[#F9FAFB] transition-colors whitespace-nowrap">
          Save & Create Another
        </button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates] = useState(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPropagateModal, setShowPropagateModal] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown size={11} className="text-[#D1D5DB] ml-1" />;
    return sortDir === 'asc' ? <ChevronUp size={11} className="text-[#6B7280] ml-1" /> : <ChevronDown size={11} className="text-[#6B7280] ml-1" />;
  };

  // Enrich tasks with agent assignees for demo (Monthly Bookkeeping)
  const enrichedTemplate = selectedTemplate ? {
    ...selectedTemplate,
    tasks: selectedTemplate.tasks.map(t => ({
      ...t,
      agentAssignee: selectedTemplate.id === 'tmpl2' ? AGENT_TEMPLATE_TASKS[t.id] : undefined,
    })),
  } : null;

  const agentTaskCount = enrichedTemplate?.tasks.filter(t => t.agentAssignee).length ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <h1 className="text-[20px] font-semibold text-[#111827]">Templates</h1>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded transition-colors">
            <Plus size={13} /> Create Template
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Table */}
        <div className={`flex-1 overflow-auto min-w-0 ${selectedTemplate ? 'border-r border-[#E5E7EB]' : ''}`}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="w-8 px-4 py-2.5 text-left">
                  <input type="checkbox" className="rounded border-[#D1D5DB] accent-[#2563EB]" />
                </th>
                {[
                  { key: 'name', label: 'Template Name' },
                  { key: 'taskCount', label: 'Task Count' },
                  { key: 'clientCount', label: 'Client Count' },
                ].map(({ key, label }) => (
                  <th key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-2.5 text-left text-[11px] font-medium text-[#6B7280] uppercase tracking-wider cursor-pointer hover:bg-[#F3F4F6] select-none w-[200px]">
                    <span className="flex items-center">
                      {label} <SortIcon col={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr
                  key={template.id}
                  onClick={() => { setSelectedTemplate(template); setShowAddTask(false); }}
                  className={`border-b border-[#F3F4F6] cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-[#EFF6FF]' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-[#D1D5DB] accent-[#2563EB]" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#111827] font-medium hover:text-[#2563EB]">{template.name}</span>
                      {/* Show agent badge if template has agent tasks */}
                      {template.id === 'tmpl2' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#EEF2FF] text-[#4F46E5]">
                          <Bot size={9} /> 2 agents
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-[13px] text-[#374151]">
                      <CheckSquare size={13} className="text-[#9CA3AF]" />
                      {template.taskCount} tasks
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-[13px] text-[#374151]">
                      <Users size={13} className="text-[#9CA3AF]" />
                      {template.clientCount} clients
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 text-[12px] text-[#9CA3AF]">{templates.length} templates</div>
        </div>

        {/* Template detail panel */}
        {selectedTemplate && enrichedTemplate && (
          <div className="w-[640px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedTemplate(null)} className="p-1 hover:bg-[#F3F4F6] rounded">
                  <X size={14} className="text-[#9CA3AF]" />
                </button>
                <h2 className="text-[15px] font-semibold text-[#111827]">{selectedTemplate.name}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="p-1.5 hover:bg-[#F3F4F6] rounded">
                  <Edit2 size={13} className="text-[#6B7280]" />
                </button>
                <button className="p-1.5 hover:bg-[#FEF2F2] rounded">
                  <Trash2 size={13} className="text-[#DC2626]" />
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center gap-6 bg-[#FAFAFA] flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[13px] text-[#374151]">
                <CheckSquare size={14} className="text-[#2563EB]" />
                <span className="font-medium">{selectedTemplate.taskCount}</span>
                <span className="text-[#9CA3AF]">tasks</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-[#374151]">
                <Users size={14} className="text-[#2563EB]" />
                <span className="font-medium">{selectedTemplate.clientCount}</span>
                <span className="text-[#9CA3AF]">clients</span>
              </div>
              {agentTaskCount > 0 && (
                <div className="flex items-center gap-1.5 text-[13px]">
                  <Bot size={14} className="text-[#4F46E5]" />
                  <span className="font-medium text-[#4F46E5]">{agentTaskCount}</span>
                  <span className="text-[#9CA3AF]">agent-automated</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Task list */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold text-[#111827]">Tasks</h3>
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="text-[12px] text-[#2563EB] flex items-center gap-1 hover:underline"
                    >
                      <Plus size={11} /> Add Task
                    </button>
                  </div>

                  {/* Task header */}
                  <div className="grid grid-cols-[1fr_180px_90px_110px_30px] gap-2 px-2 py-1.5 text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider border-b border-[#F3F4F6] mb-1">
                    <span>Task Name</span>
                    <span>Cascading Due Date</span>
                    <span>Budget</span>
                    <span>Assignee</span>
                    <span></span>
                  </div>

                  <div className="space-y-0.5">
                    {enrichedTemplate.tasks.map((task, index) => {
                      const isAgent = !!task.agentAssignee;
                      return (
                        <div
                          key={task.id}
                          className={`grid grid-cols-[1fr_180px_90px_110px_30px] gap-2 px-2 py-2.5 rounded hover:bg-[#F9FAFB] group items-center cursor-pointer border transition-colors ${
                            isAgent ? 'border-[#E0E7FF] bg-[#FAFBFF] hover:bg-[#F0F2FF]' : 'border-transparent hover:border-[#F3F4F6]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] text-[#D1D5DB] font-mono w-4 flex-shrink-0">{index + 1}</span>
                            {isAgent && <Bot size={12} className="text-[#4F46E5] flex-shrink-0" />}
                            <span className="text-[13px] text-[#111827] truncate">{task.name}</span>
                            {task.checklistCount > 0 && (
                              <span className="flex items-center gap-0.5 text-[11px] text-[#9CA3AF] flex-shrink-0">
                                <CheckSquare size={10} /> {task.checklistCount}
                              </span>
                            )}
                            {isAgent && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#EEF2FF] text-[#4F46E5] flex-shrink-0">
                                Agent
                              </span>
                            )}
                          </div>
                          <span className="text-[12px] text-[#6B7280] truncate">{task.cascadingDueDate}</span>
                          <span className="text-[12px] text-[#374151] flex items-center gap-1">
                            <Clock size={11} className="text-[#9CA3AF]" /> {task.budgetedTime}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isAgent && task.agentAssignee ? (
                              <>
                                <AgentAvatar agentType={task.agentAssignee.type} size="sm" />
                                <span className="text-[11px] text-[#4F46E5] truncate font-medium">{task.agentAssignee.skillName}</span>
                              </>
                            ) : (
                              TEAM_MEMBERS[task.assignee] ? (
                                <>
                                  <Avatar initials={TEAM_MEMBERS[task.assignee].initials} color={TEAM_MEMBERS[task.assignee].color} size="sm" />
                                  <span className="text-[12px] text-[#374151] truncate">{task.assignee}</span>
                                </>
                              ) : (
                                <span className="text-[12px] text-[#9CA3AF]">Unassigned</span>
                              )
                            )}
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#F3F4F6] rounded">
                            <MoreHorizontal size={12} className="text-[#9CA3AF]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Push changes banner */}
                <div className="mx-5 mb-5 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-[#2563EB] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-[#1E40AF] mb-1">Template changes not yet pushed</p>
                      <p className="text-[12px] text-[#3B82F6]">Push changes to all {selectedTemplate.clientCount} associated clients to apply your updates.</p>
                    </div>
                    <button
                      onClick={() => setShowPropagateModal(true)}
                      className="flex-shrink-0 px-3 py-1.5 bg-[#2563EB] text-white text-[12px] font-medium rounded hover:bg-[#1D4ED8] transition-colors"
                    >
                      Push Changes
                    </button>
                  </div>
                </div>
              </div>

              {/* Associated clients sidebar */}
              <div className="w-[200px] border-l border-[#F3F4F6] flex-shrink-0 overflow-y-auto">
                <div className="px-4 py-3 border-b border-[#F3F4F6]">
                  <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                    Clients ({selectedTemplate.clientCount})
                  </h4>
                </div>
                <div className="py-2">
                  {selectedTemplate.clients.map(client => {
                    // Simulate "Not Configured" for Coastal Wine & Spirits
                    const notConfigured = selectedTemplate.id === 'tmpl2' && client === 'Coastal Wine & Spirits';
                    return (
                      <button key={client} className="w-full text-left px-4 py-2 hover:bg-[#F9FAFB] group">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-semibold text-[#2563EB]">
                              {client.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <span className="text-[12px] text-[#374151] group-hover:text-[#2563EB] leading-tight flex-1">{client}</span>
                          {notConfigured && (
                            <span className="w-2 h-2 rounded-full bg-[#F59E0B] flex-shrink-0" title="Agent not configured" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {Array.from({ length: Math.max(0, selectedTemplate.clientCount - selectedTemplate.clients.length) }).map((_, i) => (
                    <div key={i} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-[#F3F4F6] flex-shrink-0" />
                        <div className="h-3 bg-[#F3F4F6] rounded flex-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Panel */}
        {showAddTask && selectedTemplate && (
          <AddTaskPanel onClose={() => setShowAddTask(false)} />
        )}
      </div>

      {/* Propagate modal */}
      {showPropagateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[440px] p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-[#D97706]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#111827] mb-1">Push changes to all clients?</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">
                  This will update all <strong>{selectedTemplate.clientCount} clients</strong> associated with the <strong>"{selectedTemplate.name}"</strong> template. Existing task data may be overwritten.
                </p>
              </div>
            </div>
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mb-5">
              <p className="text-[12px] text-[#DC2626] font-medium">⚠ This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPropagateModal(false)}
                className="px-4 py-2 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPropagateModal(false)}
                className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded hover:bg-[#1D4ED8]"
              >
                Yes, push to all {selectedTemplate.clientCount} clients
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
