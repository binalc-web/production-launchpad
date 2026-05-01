import { useState } from 'react';
import {
  Bot, Plus, Download, Search, RefreshCw,
  CheckCircle, AlertCircle, Clock, ExternalLink, ChevronDown,
  Eye, RotateCcw, FolderOpen, Calendar, X, Cloud, HardDrive,
  ArrowRight, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { agentRuns, AGENT_LABELS, type AgentRun, type AgentRunStatus, type AgentType } from '../../data/aiAgentData';
import { AgentBadge } from '../ui/AgentAvatar';

const RUN_STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  Completed: { bg: '#F0FDF4', text: '#16A34A', icon: CheckCircle },
  Failed: { bg: '#FEF2F2', text: '#DC2626', icon: AlertCircle },
  Running: { bg: '#EEF2FF', text: '#4F46E5', icon: RefreshCw },
  Scheduled: { bg: '#F3F4F6', text: '#6B7280', icon: Clock },
  Pending: { bg: '#F3F4F6', text: '#6B7280', icon: Clock },
};

function AgentRunStatusBadge({ status }: { status: AgentRunStatus }) {
  const style = RUN_STATUS_STYLES[status] || RUN_STATUS_STYLES.Scheduled;
  const Icon = style.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <Icon size={10} className={status === 'Running' ? 'animate-spin' : ''} />
      {status}
    </span>
  );
}

function ConfigureAgentModal({ onClose }: { onClose: () => void }) {
  const [agentType, setAgentType] = useState<AgentType>('claude-excel');
  const [dataSource, setDataSource] = useState<'OneDrive' | 'Google Drive' | 'Manual Upload'>('OneDrive');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <Bot size={15} className="text-[#4F46E5]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#111827]">Configure Agent Task</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F3F4F6] rounded">
            <X size={14} className="text-[#9CA3AF]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Agent Type */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Agent Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['claude-excel', 'claude-cowork'] as AgentType[]).map(type => {
                const { label, color, bg } = AGENT_LABELS[type];
                const isSelected = agentType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setAgentType(type)}
                    className="flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all"
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
                      <p className="text-[10px] text-[#9CA3AF] leading-tight mt-0.5">
                        {type === 'claude-excel' ? 'Spreadsheets & data' : 'Research & drafting'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skill Name */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Skill Name</label>
            <select className="w-full text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] bg-white outline-none focus:border-[#4F46E5]">
              <option>Transaction Analysis</option>
              <option>Bank Reconciliation</option>
              <option>Payroll Summary</option>
              <option>Financial Report Generation</option>
            </select>
          </div>

          {/* Client & Task */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Client</label>
              <select className="w-full text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] bg-white outline-none focus:border-[#4F46E5]">
                <option>Baker Dental Group</option>
                <option>Rivera Real Estate Holdings</option>
                <option>Northside Medical Practice</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Template Task</label>
              <select className="w-full text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] bg-white outline-none focus:border-[#4F46E5]">
                <option>Categorize transactions in QBO</option>
                <option>Bank reconciliation</option>
                <option>Prepare financial reports</option>
              </select>
            </div>
          </div>

          {/* Data Source */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Data Source</label>
            <div className="flex gap-2">
              {(['OneDrive', 'Google Drive', 'Manual Upload'] as const).map(src => (
                <button
                  key={src}
                  onClick={() => setDataSource(src)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-[12px] font-medium transition-colors"
                  style={{
                    borderColor: dataSource === src ? '#4F46E5' : '#E5E7EB',
                    backgroundColor: dataSource === src ? '#EEF2FF' : 'white',
                    color: dataSource === src ? '#4F46E5' : '#6B7280',
                  }}
                >
                  {src === 'OneDrive' && <Cloud size={12} />}
                  {src === 'Google Drive' && <HardDrive size={12} />}
                  {src === 'Manual Upload' && <FolderOpen size={12} />}
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* File Path */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">File Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="/Clients/ClientName/2026/Bookkeeping.xlsx"
                className="flex-1 text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] outline-none focus:border-[#4F46E5] placeholder-[#9CA3AF]"
              />
              <button className="px-3 py-2 border border-[#E5E7EB] rounded-md text-[12px] text-[#374151] hover:bg-[#F9FAFB] whitespace-nowrap">
                Browse
              </button>
            </div>
          </div>

          {/* New Tab Name */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">New Tab Name</label>
            <input
              type="text"
              placeholder="April 2026 — Transaction Analysis"
              className="w-full text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] outline-none focus:border-[#4F46E5] placeholder-[#9CA3AF]"
            />
            <p className="text-[11px] text-[#9CA3AF] mt-1">This tab will be auto-appended to the workbook when the agent runs.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#F3F4F6]">
          <button onClick={onClose} className="px-4 py-2 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#4F46E5] text-white text-[13px] font-medium rounded hover:bg-[#4338CA] transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="max-w-[540px] w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-5">
          <Bot size={32} className="text-[#4F46E5]" />
        </div>

        {/* Headline */}
        <h2 className="text-[22px] font-semibold text-[#111827] mb-2">Automate your recurring work</h2>
        <p className="text-[14px] text-[#6B7280] leading-relaxed max-w-[420px] mx-auto mb-8">
          Assign AI agents to tasks in your templates. When tasks come due, the agent runs
          automatically — and the output is ready for your team to review.
        </p>

        {/* Agent type cards */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-left">
          {/* Claude for Excel */}
          <div className="p-5 rounded-xl border-2 border-[#E0E7FF] bg-[#FAFBFF] hover:border-[#4F46E5] transition-colors group cursor-default">
            <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center mb-3">
              <Bot size={20} className="text-[#4F46E5]" />
            </div>
            <p className="text-[14px] font-semibold text-[#111827] mb-1">Claude for Excel</p>
            <p className="text-[12px] text-[#6B7280] leading-relaxed">
              Best for transaction analysis, reconciliation, and any work done inside spreadsheets.
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {['Transaction Analysis', 'Bank Reconciliation'].map(s => (
                <span key={s} className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-medium rounded-full">{s}</span>
              ))}
            </div>
          </div>

          {/* Claude Cowork */}
          <div className="p-5 rounded-xl border-2 border-[#EDE9FE] bg-[#FDFCFF] hover:border-[#7C3AED] transition-colors group cursor-default">
            <div className="w-10 h-10 rounded-lg bg-[#F5F3FF] flex items-center justify-center mb-3">
              <Sparkles size={20} className="text-[#7C3AED]" />
            </div>
            <p className="text-[14px] font-semibold text-[#111827] mb-1">Claude Cowork</p>
            <p className="text-[12px] text-[#6B7280] leading-relaxed">
              Best for research, drafting, and tasks that don't require a spreadsheet.
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {['Payroll Summary', 'Financial Reports'].map(s => (
                <span key={s} className="px-2 py-0.5 bg-[#F5F3FF] text-[#7C3AED] text-[10px] font-medium rounded-full">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onSetup}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-medium rounded-lg transition-colors"
        >
          Set Up Your First Agent Task
          <ArrowRight size={15} />
        </button>
        <p className="text-[12px] text-[#9CA3AF] mt-3">
          You'll be taken to Templates to assign an agent to a task.
        </p>
      </div>
    </div>
  );
}

export default function AIAgentsHub() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const navigate = useNavigate();

  const todayRuns = agentRuns.filter(r => r.status === 'Running' || r.date === 'Apr 1, 2026');
  const runningNow = agentRuns.filter(r => r.status === 'Running').length;
  const completedToday = agentRuns.filter(r => r.status === 'Completed' && r.date === 'Apr 1, 2026').length;
  const needAttention = agentRuns.filter(r => r.status === 'Failed').length;

  const filteredRuns = agentRuns.filter(r => {
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchAgent = agentTypeFilter === 'All' || r.agentType === agentTypeFilter;
    const matchSearch = !searchQuery || r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || r.taskName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchAgent && matchSearch;
  });

  if (showEmptyState) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#EEF2FF] flex items-center justify-center">
              <Bot size={14} className="text-[#4F46E5]" />
            </div>
            <h1 className="text-[20px] font-semibold text-[#111827]">AI Agents</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowEmptyState(false)}
              className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] border border-[#E5E7EB] rounded px-3 py-1.5"
            >
              ← View Hub (demo)
            </button>
          </div>
        </div>
        <EmptyState onSetup={() => navigate('/templates')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#EEF2FF] flex items-center justify-center">
            <Bot size={14} className="text-[#4F46E5]" />
          </div>
          <h1 className="text-[20px] font-semibold text-[#111827]">AI Agents</h1>
        </div>

        {/* Date range */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
          <Calendar size={13} className="text-[#9CA3AF]" />
          Apr 1, 2026
          <ChevronDown size={11} className="text-[#9CA3AF]" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Demo toggle for empty state */}
          <button
            onClick={() => setShowEmptyState(true)}
            className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] border border-[#E5E7EB] rounded px-3 py-1.5"
            title="Preview empty/onboarding state"
          >
            Empty state
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-medium rounded transition-colors"
          >
            <Plus size={13} /> Configure Agent Task
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider">Running Now</span>
                <div className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-[32px] font-semibold text-[#111827] leading-none">{runningNow}</span>
                <span className="text-[13px] text-[#9CA3AF] mb-0.5">agent{runningNow !== 1 ? 's' : ''} active</span>
              </div>
              <p className="text-[12px] text-[#4F46E5] mt-2">Baker Dental — Transaction Analysis</p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider">Completed Today</span>
                <CheckCircle size={15} className="text-[#16A34A]" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-[32px] font-semibold text-[#111827] leading-none">{completedToday}</span>
                <span className="text-[13px] text-[#9CA3AF] mb-0.5">task{completedToday !== 1 ? 's' : ''} done</span>
              </div>
              <p className="text-[12px] text-[#16A34A] mt-2">Across 3 clients this morning</p>
            </div>

            <button
              className="bg-white border border-[#E5E7EB] rounded-lg p-4 text-left hover:border-[#FCA5A5] transition-colors"
              onClick={() => setStatusFilter('Failed')}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider">Need Attention</span>
                <AlertCircle size={15} className={needAttention > 0 ? 'text-[#DC2626]' : 'text-[#9CA3AF]'} />
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-[32px] font-semibold leading-none ${needAttention > 0 ? 'text-[#DC2626]' : 'text-[#111827]'}`}>{needAttention}</span>
                <span className="text-[13px] text-[#9CA3AF] mb-0.5">failed run{needAttention !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-[12px] text-[#DC2626] mt-2">{needAttention > 0 ? 'Click to filter ↓' : 'All clear'}</p>
            </button>
          </div>

          {/* Today's activity */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F3F4F6] flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#111827]">Today's Activity</h2>
              <span className="text-[12px] text-[#9CA3AF]">Apr 1, 2026</span>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {todayRuns.map(run => (
                <ActivityRow key={run.id} run={run} />
              ))}
            </div>
          </div>

          {/* All Agent Runs table */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center gap-3 flex-wrap">
              <h2 className="text-[14px] font-semibold text-[#111827] mr-2">All Agent Runs</h2>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none text-[12px] border border-[#E5E7EB] rounded px-3 py-1.5 pr-7 text-[#374151] bg-white outline-none focus:border-[#4F46E5] cursor-pointer"
                >
                  {['All', 'Completed', 'Failed', 'Running', 'Scheduled'].map(s => (
                    <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>

              {/* Agent type filter */}
              <div className="relative">
                <select
                  value={agentTypeFilter}
                  onChange={e => setAgentTypeFilter(e.target.value)}
                  className="appearance-none text-[12px] border border-[#E5E7EB] rounded px-3 py-1.5 pr-7 text-[#374151] bg-white outline-none focus:border-[#4F46E5] cursor-pointer"
                >
                  <option value="All">All Agents</option>
                  <option value="claude-excel">Claude Excel</option>
                  <option value="claude-cowork">Claude Cowork</option>
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>

              {/* Search */}
              <div className="flex items-center gap-1.5 border border-[#E5E7EB] rounded px-3 py-1.5 bg-white w-[200px] focus-within:border-[#4F46E5]">
                <Search size={12} className="text-[#9CA3AF] flex-shrink-0" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search client or task..."
                  className="text-[12px] outline-none bg-transparent w-full placeholder-[#9CA3AF] text-[#374151]"
                />
              </div>

              {statusFilter !== 'All' && (
                <button
                  onClick={() => setStatusFilter('All')}
                  className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#374151]"
                >
                  <X size={10} /> Clear filter
                </button>
              )}

              <div className="ml-auto">
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[12px] text-[#374151] hover:bg-[#F9FAFB]">
                  <Download size={12} /> Export Audit Log
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    {['Date', 'Client', 'Task', 'Agent', 'Skill', 'Status', 'Duration', 'Output'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map(run => (
                    <tr
                      key={run.id}
                      className={`border-b border-[#F3F4F6] hover:bg-[#FAFAFA] ${run.status === 'Failed' ? 'bg-[#FFF5F5]' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-[12px] text-[#6B7280] whitespace-nowrap">
                        {run.date}<br />
                        <span className="text-[11px] text-[#9CA3AF]">{run.time}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[13px] text-[#2563EB] hover:underline cursor-pointer font-medium">{run.clientName}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-[#374151] max-w-[200px]">
                        <span className="truncate block">{run.taskName}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <AgentBadge agentType={run.agentType} />
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[#6B7280]">{run.skillName}</td>
                      <td className="px-4 py-2.5">
                        <AgentRunStatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[#6B7280] font-mono">{run.duration}</td>
                      <td className="px-4 py-2.5">
                        {run.outputFile ? (
                          <button className="flex items-center gap-1 text-[12px] text-[#4F46E5] hover:underline">
                            <ExternalLink size={11} /> View Output
                          </button>
                        ) : (
                          <span className="text-[12px] text-[#D1D5DB]">No output</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button className="text-[12px] text-[#6B7280] hover:text-[#374151] flex items-center gap-1">
                            <Eye size={12} /> View
                          </button>
                          {run.status === 'Failed' && (
                            <button className="text-[12px] text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1">
                              <RotateCcw size={12} /> Re-run
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRuns.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-[#9CA3AF]">
                        No agent runs match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#F3F4F6] text-[12px] text-[#9CA3AF]">
              {filteredRuns.length} run{filteredRuns.length !== 1 ? 's' : ''}
              {statusFilter !== 'All' && ` · filtered by ${statusFilter}`}
            </div>
          </div>
        </div>
      </div>

      {showModal && <ConfigureAgentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function ActivityRow({ run }: { run: AgentRun }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-3 ${run.status === 'Failed' ? 'bg-[#FFF5F5]' : ''}`}>
      <span className="text-[12px] text-[#9CA3AF] w-[68px] flex-shrink-0 font-mono">{run.time}</span>
      <span className="text-[13px] text-[#2563EB] font-medium w-[200px] flex-shrink-0 truncate">{run.clientName}</span>
      <span className="text-[13px] text-[#374151] flex-1 truncate">{run.taskName}</span>
      <AgentBadge agentType={run.agentType} size="xs" />
      <AgentRunStatusBadge status={run.status as AgentRunStatus} />
      <div className="flex items-center gap-2 flex-shrink-0">
        {run.outputFile && (
          <button className="flex items-center gap-1 text-[12px] text-[#4F46E5] hover:underline">
            <ExternalLink size={11} /> Output
          </button>
        )}
        {run.status === 'Failed' && (
          <button className="flex items-center gap-1 text-[12px] text-[#DC2626] hover:underline">
            <AlertCircle size={11} /> Fix
          </button>
        )}
        {run.status === 'Running' && (
          <button className="flex items-center gap-1 text-[12px] text-[#4F46E5] hover:underline">
            <Eye size={11} /> Progress
          </button>
        )}
      </div>
    </div>
  );
}