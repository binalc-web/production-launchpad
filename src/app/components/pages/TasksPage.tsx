import { useState, useEffect } from 'react';
import {
  Search, Filter, Columns, Download, Edit3, X, ChevronDown, ChevronUp,
  ArrowUpDown, Clock, Calendar, CheckCircle, Circle, MessageSquare,
  ExternalLink, Send, Plus, Bot, User, Zap, Check
} from 'lucide-react';
import { allTasks as initialTasks, TEAM_MEMBERS } from '../../data/mockData';
import { Avatar } from '../Layout';
import { AgentBadge, AgentStatusBadge } from '../ui/AgentAvatar';
import { type AgentType, AGENT_LABELS } from '../../data/aiAgentData';

type TaskWithProject = typeof initialTasks[number];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'Not Started': { bg: '#F3F4F6', text: '#6B7280' },
  'In Progress': { bg: '#EFF6FF', text: '#2563EB' },
  'Complete': { bg: '#F0FDF4', text: '#16A34A' },
};

const DATE_FILTERS = ['Overdue', 'Today', 'This Week', 'This Month'];

const AGENT_OPTIONS: { type: AgentType; name: string; description: string }[] = [
  {
    type: 'claude-excel',
    name: 'Claude Excel',
    description: 'Analyzes & writes to spreadsheets — ideal for data-heavy tasks',
  },
  {
    type: 'claude-cowork',
    name: 'Claude Cowork',
    description: 'Works alongside your workflow apps (QBO, Gusto, etc.)',
  },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [taskComment, setTaskComment] = useState('');
  const [agentFilter, setAgentFilter] = useState(false);

  // AI Agent delegation state
  const [delegations, setDelegations] = useState<Record<string, AgentType>>({});
  const [panelAssigneeTab, setPanelAssigneeTab] = useState<'human' | 'agent'>('human');
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('claude-excel');
  const [delegationConfirmed, setDelegationConfirmed] = useState<string | null>(null);

  // Sync tab when selected task changes
  useEffect(() => {
    if (selectedTask) {
      const hasDelegation = !!delegations[selectedTask.id];
      setPanelAssigneeTab(hasDelegation ? 'agent' : 'human');
      if (hasDelegation) setSelectedAgentType(delegations[selectedTask.id]);
    }
  }, [selectedTask?.id]);

  const handleDelegate = (taskId: string) => {
    setDelegations(prev => ({ ...prev, [taskId]: selectedAgentType }));
    setDelegationConfirmed(taskId);
    setTimeout(() => setDelegationConfirmed(null), 2000);
  };

  const handleRemoveDelegation = (taskId: string) => {
    setDelegations(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setPanelAssigneeTab('human');
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown size={11} className="text-[#D1D5DB] ml-1" />;
    return sortDir === 'asc' ? <ChevronUp size={11} className="text-[#6B7280] ml-1" /> : <ChevronDown size={11} className="text-[#6B7280] ml-1" />;
  };

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed, status: t.completed ? 'Not Started' as const : 'Complete' as const } : t
    ));
    if (selectedTask?.id === taskId) {
      setSelectedTask(t => t ? { ...t, completed: !t.completed, status: t.completed ? 'Not Started' as const : 'Complete' as const } : null);
    }
  };

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.client.toLowerCase().includes(search.toLowerCase());
    const matchAssignee = assigneeFilter === 'All' || t.assignee === assigneeFilter;
    const matchAgent = !agentFilter || !!(t as any).agentTask || !!delegations[t.id];
    return matchSearch && matchAssignee && matchAgent;
  });

  const applyDateFilter = (f: string) => {
    setDateFilter(prev => prev === f ? null : f);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-4 gap-2 flex-shrink-0 bg-white">
        <h1 className="text-[20px] font-semibold text-[#111827] mr-2">Tasks</h1>

        {/* Search */}
        <div className="flex items-center gap-1.5 border border-[#E5E7EB] rounded px-3 py-1.5 bg-white w-[220px] focus-within:border-[#2563EB]">
          <Search size={13} className="text-[#9CA3AF] flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="text-[13px] outline-none bg-transparent w-full placeholder-[#9CA3AF] text-[#374151]"
          />
        </div>

        {/* Assignee filter */}
        <div className="relative">
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="appearance-none text-[13px] border border-[#E5E7EB] rounded px-3 py-1.5 pr-7 text-[#374151] bg-white outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value="All">All Assignees</option>
            {Object.keys(TEAM_MEMBERS).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
        </div>

        {/* Date quick filters */}
        <div className="flex items-center gap-1">
          {DATE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => applyDateFilter(f)}
              className={`px-2.5 py-1.5 text-[12px] rounded border transition-colors ${
                dateFilter === f
                  ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB] font-medium'
                  : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
              }`}
            >
              {f}
            </button>
          ))}
          {/* Agent Tasks toggle */}
          <button
            onClick={() => setAgentFilter(!agentFilter)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded border transition-colors ml-1 ${
              agentFilter
                ? 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5] font-medium'
                : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            <Bot size={11} /> Agent Tasks
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
            <Filter size={13} /> Filters
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
            <Columns size={13} /> Columns
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
            <Download size={13} /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
            <Edit3 size={13} /> Edit
          </button>
        </div>
      </div>

      {/* Active filters */}
      {(dateFilter || filters.length > 0) && (
        <div className="h-[38px] border-b border-[#E5E7EB] flex items-center px-6 gap-2 flex-shrink-0 bg-[#FAFAFA]">
          {dateFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              Due: {dateFilter}
              <button onClick={() => setDateFilter(null)}><X size={10} strokeWidth={2.5} /></button>
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Table */}
        <div className={`flex-1 overflow-auto min-w-0 ${selectedTask ? 'border-r border-[#E5E7EB]' : ''}`}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="w-8 px-4 py-2.5 text-left">
                  <input type="checkbox" className="rounded border-[#D1D5DB] accent-[#2563EB]" />
                </th>
                <th className="w-8 px-2 py-2.5" />
                {[
                  { key: 'name', label: 'Task Name' },
                  { key: 'dueDate', label: 'Due Date' },
                  { key: 'assignee', label: 'Assignee' },
                  { key: 'budgetedTime', label: 'Budgeted Time' },
                  { key: 'status', label: 'Status' },
                  { key: 'project', label: 'Associated Project' },
                  ...(agentFilter ? [{ key: 'agentStatus', label: 'Agent Status' }] : []),
                ].map(({ key, label }) => (
                  <th key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-2.5 text-left text-[11px] font-medium text-[#6B7280] uppercase tracking-wider cursor-pointer hover:bg-[#F3F4F6] select-none">
                    <span className="flex items-center">
                      {label} <SortIcon col={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => {
                const delegation = delegations[task.id];
                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`border-b border-[#F3F4F6] cursor-pointer transition-colors ${
                      selectedTask?.id === task.id ? 'bg-[#EFF6FF]' : 'hover:bg-[#F9FAFB]'
                    } ${task.completed ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-[#D1D5DB] accent-[#2563EB]" />
                    </td>
                    <td className="px-2 py-2.5" onClick={e => { e.stopPropagation(); toggleTaskComplete(task.id); }}>
                      {task.completed
                        ? <CheckCircle size={15} className="text-[#16A34A]" />
                        : <Circle size={15} className="text-[#D1D5DB] hover:text-[#2563EB] transition-colors" />
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-medium ${task.completed ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'}`}>
                          {task.name}
                        </span>
                        {task.isNext && !task.completed && (
                          <span className="px-1.5 py-0.5 bg-[#F3E8FF] text-[#7C3AED] text-[10px] font-semibold rounded-full">NEXT</span>
                        )}
                        {delegation && (
                          <span className="px-1.5 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-semibold rounded-full flex items-center gap-0.5">
                            <Bot size={9} /> AI
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#9CA3AF]">{task.client}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-[#374151] whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={11} className="text-[#9CA3AF]" /> {task.dueDate}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {delegation ? (
                        <AgentBadge agentType={delegation} size="xs" />
                      ) : (
                        TEAM_MEMBERS[task.assignee] && (
                          <div className="flex items-center gap-1.5">
                            <Avatar initials={TEAM_MEMBERS[task.assignee].initials} color={TEAM_MEMBERS[task.assignee].color} size="sm" />
                            <span className="text-[13px] text-[#374151]">{task.assignee}</span>
                          </div>
                        )
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-[#374151]">
                      <span className="flex items-center gap-1"><Clock size={11} className="text-[#9CA3AF]" /> {task.budgetedTime}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: STATUS_STYLES[task.status].bg, color: STATUS_STYLES[task.status].text }}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[13px] text-[#374151] hover:text-[#2563EB]">{task.project}</span>
                    </td>
                    {agentFilter && (
                      <td className="px-4 py-2.5">
                        {(task as any).agentTask ? (
                          <AgentStatusBadge status={(task as any).agentTask.state} size="xs" />
                        ) : delegation ? (
                          <AgentStatusBadge status="scheduled" size="xs" />
                        ) : (
                          <span className="text-[12px] text-[#D1D5DB]">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 text-[12px] text-[#9CA3AF]">{filtered.length} tasks</div>
        </div>

        {/* Task detail panel */}
        {selectedTask && (
          <div className="w-[460px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-[#F3F4F6] rounded">
                  <X size={14} className="text-[#9CA3AF]" />
                </button>
                <span className="text-[13px] font-semibold text-[#374151] truncate max-w-[260px]">{selectedTask.name}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Status */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-[#111827] flex-1 pr-4">{selectedTask.name}</h2>
                <select
                  defaultValue={selectedTask.status}
                  className="text-[12px] border border-[#E5E7EB] rounded px-2 py-1 text-[#374151] bg-white outline-none focus:border-[#2563EB]"
                >
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Complete</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5 text-[13px]">
                <div>
                  <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wider block mb-1">Due Date</span>
                  <span className="text-[#374151] flex items-center gap-1"><Calendar size={11} className="text-[#9CA3AF]" /> {selectedTask.dueDate}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wider block mb-1">Budgeted Time</span>
                  <span className="text-[#374151] flex items-center gap-1"><Clock size={11} className="text-[#9CA3AF]" /> {selectedTask.budgetedTime}</span>
                </div>

                {/* Assignee — full-width spanning both columns */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wider">Assignee</span>
                    {/* Tab toggle: Human / AI Agent */}
                    <div className="flex items-center rounded border border-[#E5E7EB] overflow-hidden bg-[#F9FAFB]">
                      <button
                        onClick={() => setPanelAssigneeTab('human')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          panelAssigneeTab === 'human'
                            ? 'bg-white text-[#111827] shadow-sm border-r border-[#E5E7EB]'
                            : 'text-[#6B7280] hover:text-[#374151] border-r border-[#E5E7EB]'
                        }`}
                      >
                        <User size={10} /> Human
                      </button>
                      <button
                        onClick={() => setPanelAssigneeTab('agent')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          panelAssigneeTab === 'agent'
                            ? 'bg-white text-[#4F46E5]'
                            : 'text-[#6B7280] hover:text-[#374151]'
                        }`}
                      >
                        <Bot size={10} /> AI Agent
                      </button>
                    </div>
                  </div>

                  {panelAssigneeTab === 'human' ? (
                    /* Human assignee */
                    <div className="flex items-center gap-2">
                      {TEAM_MEMBERS[selectedTask.assignee] && (
                        <>
                          <Avatar initials={TEAM_MEMBERS[selectedTask.assignee].initials} color={TEAM_MEMBERS[selectedTask.assignee].color} size="sm" />
                          <span className="text-[13px] text-[#374151]">{selectedTask.assignee}</span>
                        </>
                      )}
                      {delegations[selectedTask.id] && (
                        <span className="ml-auto text-[11px] text-[#9CA3AF] italic">
                          AI delegation active — remove it to reassign
                        </span>
                      )}
                    </div>
                  ) : (
                    /* AI Agent delegation panel */
                    <div className="rounded-lg border border-[#E5E7EB] overflow-hidden">
                      {/* Agent type selection */}
                      <div className="p-3 bg-[#FAFAFA] border-b border-[#E5E7EB]">
                        <p className="text-[11px] text-[#6B7280] mb-2.5">Select an AI Agent to handle this task automatically when due.</p>
                        <div className="space-y-2">
                          {AGENT_OPTIONS.map(opt => {
                            const { color, bg } = AGENT_LABELS[opt.type];
                            const isSelected = selectedAgentType === opt.type;
                            const isDelegated = delegations[selectedTask.id] === opt.type;
                            return (
                              <button
                                key={opt.type}
                                onClick={() => setSelectedAgentType(opt.type)}
                                className={`w-full flex items-start gap-2.5 p-2.5 rounded-md border text-left transition-all ${
                                  isSelected
                                    ? 'border-[#4F46E5] bg-white shadow-sm'
                                    : 'border-[#E5E7EB] bg-white hover:border-[#C7D2FE] hover:bg-[#F5F3FF]/30'
                                }`}
                              >
                                <div
                                  className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                                  style={{ backgroundColor: bg, border: `1px solid ${color}30` }}
                                >
                                  <Bot size={13} style={{ color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[12px] font-medium text-[#111827]">{opt.name}</span>
                                    {isDelegated && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#EEF2FF] text-[#4F46E5]">
                                        <Check size={9} /> Delegated
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">{opt.description}</p>
                                </div>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full border-2 border-[#4F46E5] flex items-center justify-center flex-shrink-0 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action footer */}
                      <div className="px-3 py-2.5 bg-white flex items-center justify-between gap-2">
                        {delegations[selectedTask.id] ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <AgentBadge agentType={delegations[selectedTask.id]} size="xs" />
                              <span className="text-[11px] text-[#6B7280]">handling this task</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {delegations[selectedTask.id] !== selectedAgentType && (
                                <button
                                  onClick={() => handleDelegate(selectedTask.id)}
                                  className="px-2.5 py-1 text-[11px] font-medium text-white bg-[#4F46E5] rounded hover:bg-[#4338CA] transition-colors"
                                >
                                  Switch Agent
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveDelegation(selectedTask.id)}
                                className="px-2.5 py-1 text-[11px] font-medium text-[#DC2626] border border-[#FCA5A5] rounded hover:bg-[#FEF2F2] transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] text-[#9CA3AF]">
                              Task will auto-run when due
                            </span>
                            <button
                              onClick={() => handleDelegate(selectedTask.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded transition-all ${
                                delegationConfirmed === selectedTask.id
                                  ? 'bg-[#16A34A] text-white'
                                  : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                              }`}
                            >
                              {delegationConfirmed === selectedTask.id ? (
                                <><Check size={12} /> Delegated!</>
                              ) : (
                                <><Zap size={12} /> Delegate to AI</>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wider block mb-1">Client</span>
                  <span className="text-[#374151]">{selectedTask.client}</span>
                </div>
              </div>

              {/* Checklist */}
              <div className="mb-5">
                <h4 className="text-[12px] font-semibold text-[#374151] mb-2 flex items-center gap-1.5">
                  Checklist
                  <span className="text-[#9CA3AF] font-normal">({selectedTask.checklistCompleted}/{selectedTask.checklistTotal})</span>
                </h4>
                {selectedTask.checklistTotal > 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: selectedTask.checklistTotal }).map((_, i) => (
                      <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={i < selectedTask.checklistCompleted}
                          className="rounded border-[#D1D5DB] accent-[#2563EB]"
                        />
                        <span className={`text-[13px] ${i < selectedTask.checklistCompleted ? 'line-through text-[#9CA3AF]' : 'text-[#374151]'}`}>
                          Checklist item {i + 1}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <button className="text-[12px] text-[#2563EB] flex items-center gap-1 hover:underline">
                    <Plus size={11} /> Add checklist item
                  </button>
                )}
              </div>

              {/* Comments */}
              <div className="mb-4">
                <h4 className="text-[12px] font-semibold text-[#374151] mb-3 flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-[#6B7280]" /> Comments
                </h4>
                <p className="text-[13px] text-[#9CA3AF] mb-3">No comments on this task yet.</p>
                <div className="flex gap-2">
                  <Avatar initials="SK" color="#3B82F6" size="sm" />
                  <div className="flex-1 border border-[#E5E7EB] rounded focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB] overflow-hidden">
                    <input
                      value={taskComment}
                      onChange={e => setTaskComment(e.target.value)}
                      placeholder="Add a comment... (type @ to mention)"
                      className="w-full px-3 py-2 text-[13px] outline-none bg-white placeholder-[#9CA3AF]"
                    />
                    <div className="flex justify-end px-2 py-1.5 bg-[#F9FAFB] border-t border-[#F3F4F6]">
                      <button className="flex items-center gap-1 px-3 py-1 bg-[#2563EB] text-white text-[12px] font-medium rounded hover:bg-[#1D4ED8]">
                        <Send size={11} /> Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Go to project */}
              <div className="pt-3 border-t border-[#F3F4F6]">
                <button className="text-[12px] text-[#2563EB] hover:underline flex items-center gap-1.5">
                  <ExternalLink size={12} />
                  Go to project: {selectedTask.project}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}