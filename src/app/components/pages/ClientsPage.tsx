import { useState } from 'react';
import {
  Download, Upload, Plus, X, ChevronDown, ChevronUp, MoreHorizontal,
  ArrowUpDown, Phone, Mail, MapPin, Edit2, ChevronRight, User,
  Mic, Clock, Calendar, ExternalLink, Bot, Cloud, HardDrive, FolderOpen,
  AlertTriangle
} from 'lucide-react';
import { clients as initialClients, TEAM_MEMBERS, type Client } from '../../data/mockData';
import { clientMeetings } from '../../data/aiNotetakerData';
import { agentConfigs, agentRuns, AGENT_LABELS, type AgentType, type DataSource } from '../../data/aiAgentData';
import { Avatar } from '../Layout';
import { AgentBadge } from '../ui/AgentAvatar';

const PRIORITY_STYLES: Record<string, { color: string; dot: string }> = {
  High: { color: '#DC2626', dot: '#DC2626' },
  Medium: { color: '#CA8A04', dot: '#F59E0B' },
  Low: { color: '#6B7280', dot: '#9CA3AF' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#F0FDF4', text: '#16A34A' },
  Inactive: { bg: '#F3F4F6', text: '#6B7280' },
  Prospect: { bg: '#EFF6FF', text: '#2563EB' },
};

const ASSIGNED_WORK = [
  { name: 'Monthly Bookkeeping', frequency: 'Monthly, last day', status: 'Active' },
  { name: 'Quarterly Tax Planning', frequency: 'Quarterly', status: 'Active' },
  { name: 'Annual Tax Return (1040)', frequency: 'Annual, Apr 15', status: 'Active' },
  { name: 'Payroll Processing', frequency: 'Biweekly', status: 'Active' },
];

export default function ClientsPage() {
  const [clients] = useState(initialClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'work' | 'meetings' | 'agents'>('details');
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <h1 className="text-[20px] font-semibold text-[#111827]">Clients</h1>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
            <Upload size={13} /> Import
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
            <Download size={13} /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded transition-colors">
            <Plus size={13} /> Create Client
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Table */}
        <div className={`flex-1 overflow-auto min-w-0 ${selectedClient ? 'border-r border-[#E5E7EB]' : ''}`}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="w-8 px-4 py-2.5 text-left">
                  <input type="checkbox" className="rounded border-[#D1D5DB] accent-[#2563EB]" />
                </th>
                {[
                  { key: 'name', label: 'Client Name' },
                  { key: 'priority', label: 'Priority' },
                  { key: 'status', label: 'Status' },
                  { key: 'assignee', label: 'Assignee' },
                  { key: 'entityType', label: 'Entity Type' },
                  { key: 'fiscalYearEnd', label: 'Fiscal Year End' },
                  { key: 'lastEdited', label: 'Last Edited' },
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
              {clients.map(client => (
                <tr
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`border-b border-[#F3F4F6] cursor-pointer transition-colors ${
                    selectedClient?.id === client.id ? 'bg-[#EFF6FF]' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-[#D1D5DB] accent-[#2563EB]" />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[13px] text-[#111827] font-medium hover:text-[#2563EB]">{client.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_STYLES[client.priority].dot }} />
                      <span className="text-[13px]" style={{ color: PRIORITY_STYLES[client.priority].color }}>{client.priority}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ backgroundColor: STATUS_STYLES[client.status].bg, color: STATUS_STYLES[client.status].text }}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {TEAM_MEMBERS[client.assignee] && (
                      <div className="flex items-center gap-1.5">
                        <Avatar initials={TEAM_MEMBERS[client.assignee].initials} color={TEAM_MEMBERS[client.assignee].color} size="sm" />
                        <span className="text-[13px] text-[#374151]">{client.assignee}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[13px] text-[#374151]">{client.entityType}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-[#374151]">{client.fiscalYearEnd}</td>
                  <td className="px-4 py-2.5 text-[13px] text-[#9CA3AF]">{client.lastEdited}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 text-[12px] text-[#9CA3AF]">{clients.length} clients</div>
        </div>

        {/* Client detail panel */}
        {selectedClient && (
          <div className="w-[520px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedClient(null)} className="p-1 hover:bg-[#F3F4F6] rounded">
                  <X size={14} className="text-[#9CA3AF]" />
                </button>
                <span className="text-[13px] text-[#374151] font-semibold truncate max-w-[260px]">{selectedClient.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="p-1.5 hover:bg-[#F3F4F6] rounded">
                  <Edit2 size={13} className="text-[#6B7280]" />
                </button>
                <button className="p-1.5 hover:bg-[#F3F4F6] rounded">
                  <MoreHorizontal size={14} className="text-[#6B7280]" />
                </button>
              </div>
            </div>

            {/* Client header */}
            <div className="px-5 py-4 border-b border-[#F3F4F6] flex-shrink-0">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                  <span className="text-[15px] font-semibold text-[#2563EB]">
                    {selectedClient.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#111827]">{selectedClient.name}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[12px] text-[#6B7280]">{selectedClient.entityType}</span>
                    <span className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ backgroundColor: STATUS_STYLES[selectedClient.status].bg, color: STATUS_STYLES[selectedClient.status].text }}>
                      {selectedClient.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E5E7EB] flex-shrink-0 px-5">
              {(['details', 'work', 'meetings', 'agents'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-0 py-2.5 mr-5 text-[13px] font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-[#2563EB] text-[#2563EB]'
                      : 'border-transparent text-[#6B7280] hover:text-[#374151]'
                  }`}
                >
                  {tab === 'details' ? 'Details' : tab === 'work' ? 'Assigned Work' : tab === 'meetings' ? 'Meetings' : 'AI Agents'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'details' && (
                <div>
                  {/* Notes */}
                  <div className="px-5 py-4 border-b border-[#F3F4F6]">
                    <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Notes</h4>
                    <textarea
                      defaultValue={selectedClient.notes}
                      className="w-full text-[13px] text-[#374151] border border-[#E5E7EB] rounded-md p-3 resize-none focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-[#9CA3AF] leading-relaxed"
                      rows={4}
                      placeholder="Add notes about this client..."
                    />
                  </div>

                  {/* Contacts */}
                  <div className="px-5 py-4 border-b border-[#F3F4F6]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Contacts</h4>
                      <button className="text-[12px] text-[#2563EB] hover:underline flex items-center gap-1">
                        <Plus size={11} /> Add
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedClient.contacts.map(contact => (
                        <div key={contact.id} className="p-3 rounded-lg border border-[#F3F4F6] bg-[#FAFAFA]">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#E5E7EB] flex items-center justify-center">
                                <User size={13} className="text-[#6B7280]" />
                              </div>
                              <span className="text-[13px] font-medium text-[#111827]">{contact.name}</span>
                              {contact.isPrimary && (
                                <span className="px-1.5 py-0.5 bg-[#FEFCE8] text-[#CA8A04] text-[10px] font-medium rounded">Primary</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1 pl-9">
                            <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                              <Mail size={11} className="flex-shrink-0" />
                              <a href={`mailto:${contact.email}`} className="hover:text-[#2563EB] truncate">{contact.email}</a>
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                              <Phone size={11} className="flex-shrink-0" />
                              <span>{contact.phone}</span>
                            </div>
                            <div className="flex items-start gap-2 text-[12px] text-[#6B7280]">
                              <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                              <span className="leading-snug">{contact.address}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom fields */}
                  <div className="px-5 py-4">
                    <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Custom Fields</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Assignee', value: selectedClient.assignee },
                        { label: 'Priority', value: selectedClient.priority },
                        { label: 'Entity Type', value: selectedClient.entityType },
                        { label: 'Fiscal Year End', value: selectedClient.fiscalYearEnd },
                        ...(selectedClient.birthdate ? [{ label: 'Birthdate', value: selectedClient.birthdate }] : []),
                        { label: 'Services', value: selectedClient.services.join(', ') },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start">
                          <span className="w-[140px] text-[12px] text-[#6B7280] flex-shrink-0 pt-0.5">{label}</span>
                          <span className="text-[13px] text-[#374151] flex-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'work' && (
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Recurring Series</h4>
                    <button className="text-[12px] text-[#2563EB] hover:underline flex items-center gap-1">
                      <Plus size={11} /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ASSIGNED_WORK.map(work => (
                      <div
                        key={work.name}
                        className="flex items-center justify-between p-3 border border-[#F3F4F6] rounded-lg hover:border-[#E5E7EB] cursor-pointer group"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-[#111827] group-hover:text-[#2563EB] transition-colors">{work.name}</p>
                          <p className="text-[12px] text-[#9CA3AF] mt-0.5">{work.frequency}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A]">{work.status}</span>
                          <ChevronRight size={13} className="text-[#D1D5DB] group-hover:text-[#9CA3AF]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'meetings' && (
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Meeting History</h4>
                    <span className="text-[11px] text-[#9CA3AF]">via AI Notetaker</span>
                  </div>
                  {clientMeetings[selectedClient.name] && clientMeetings[selectedClient.name].length > 0 ? (
                    <div className="space-y-2">
                      {clientMeetings[selectedClient.name].map((m, i) => (
                        <div key={i} className="p-3 border border-[#F3F4F6] rounded-lg hover:border-[#E5E7EB] hover:bg-[#FAFAFA] transition-all group cursor-pointer">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-[13px] font-medium text-[#111827] group-hover:text-[#2563EB] transition-colors">{m.title}</p>
                            <button className="flex items-center gap-0.5 text-[11px] text-[#2563EB] hover:underline flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              View <ExternalLink size={10} />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF] mb-2">
                            <span className="flex items-center gap-1"><Calendar size={10} /> {m.date}</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {m.duration}</span>
                            <span className="flex items-center gap-1"><Mic size={10} /> AI Notes</span>
                          </div>
                          <p className="text-[12px] text-[#6B7280] leading-relaxed line-clamp-2">{m.snippet}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-[#E5E7EB] rounded-lg">
                      <Mic size={20} className="text-[#D1D5DB] mx-auto mb-2" />
                      <p className="text-[13px] text-[#9CA3AF]">No meetings recorded yet</p>
                      <p className="text-[12px] text-[#D1D5DB] mt-0.5">Use AI Notetaker to record your next call</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'agents' && (
                <AIAgentsTab client={selectedClient} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentConfigModal({
  client,
  existingConfig,
  onClose,
}: {
  client: Client;
  existingConfig?: typeof agentConfigs[number] | null;
  onClose: () => void;
}) {
  const [agentType, setAgentType] = useState<AgentType>(existingConfig?.agentType ?? 'claude-excel');
  const [skillName, setSkillName] = useState(existingConfig?.skillName ?? '');
  const [dataSource, setDataSource] = useState<DataSource>(existingConfig?.dataSource ?? 'OneDrive');
  const [filePath, setFilePath] = useState(existingConfig?.filePath ?? '');
  const [newTabName, setNewTabName] = useState(existingConfig?.newTabName ?? '');
  const [task, setTask] = useState(existingConfig?.taskName ?? '');

  const isEdit = !!existingConfig;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <Bot size={14} className="text-[#4F46E5]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#111827]">
              {isEdit ? 'Edit Configuration' : 'Add Agent Configuration'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F3F4F6] rounded">
            <X size={14} className="text-[#9CA3AF]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Client context */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#F9FAFB] border border-[#F3F4F6] rounded-md">
            <div className="w-6 h-6 rounded bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-semibold text-[#2563EB]">
                {client.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </span>
            </div>
            <span className="text-[12px] font-medium text-[#374151]">{client.name}</span>
          </div>

          {/* Task */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Task (from agent-assigned template tasks)</label>
            <div className="relative">
              <select
                value={task}
                onChange={e => setTask(e.target.value)}
                className="w-full appearance-none text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 pr-8 text-[#374151] bg-white outline-none focus:border-[#4F46E5]"
              >
                <option value="">Select a task…</option>
                <option value="Transaction Analysis">Transaction Analysis — Monthly Bookkeeping</option>
                <option value="Bank Reconciliation">Bank Reconciliation — Monthly Bookkeeping</option>
                <option value="Payroll Summary">Payroll Summary — Payroll Processing</option>
                <option value="Financial Report Generation">Financial Report Generation — Quarterly Close</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

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
            <div className="relative">
              <select
                value={skillName}
                onChange={e => setSkillName(e.target.value)}
                className="w-full appearance-none text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 pr-8 text-[#374151] bg-white outline-none focus:border-[#4F46E5]"
              >
                <option value="">Select skill…</option>
                <option value="Transaction Analysis">Transaction Analysis</option>
                <option value="Bank Reconciliation">Bank Reconciliation</option>
                <option value="Payroll Summary">Payroll Summary</option>
                <option value="Financial Report Generation">Financial Report Generation</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          {/* Data Source */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Data Source</label>
            <div className="flex gap-2">
              {(['OneDrive', 'Google Drive', 'Manual Upload'] as DataSource[]).map(src => (
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
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                placeholder={`/Clients/${client.name.split(' ')[0]}/2026/Bookkeeping.xlsx`}
                className="flex-1 text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] outline-none focus:border-[#4F46E5] placeholder-[#9CA3AF]"
              />
              <button className="px-3 py-2 border border-[#E5E7EB] rounded-md text-[12px] text-[#374151] hover:bg-[#F9FAFB] whitespace-nowrap">
                Browse
              </button>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Path to the workbook in {dataSource === 'OneDrive' ? 'OneDrive' : dataSource === 'Google Drive' ? 'Google Drive' : 'your file system'} for this client.
            </p>
          </div>

          {/* New Tab Name */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">New Tab Name</label>
            <input
              type="text"
              value={newTabName}
              onChange={e => setNewTabName(e.target.value)}
              placeholder="e.g. April 2026 — Transaction Analysis"
              className="w-full text-[13px] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#374151] outline-none focus:border-[#4F46E5] placeholder-[#9CA3AF]"
            />
            <p className="text-[11px] text-[#9CA3AF] mt-1">This tab will be auto-appended to the workbook when the agent runs.</p>
          </div>

          {/* Warning if not filled */}
          {(!task || !filePath) && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FEFCE8] border border-[#FEF08A] rounded-md">
              <AlertTriangle size={13} className="text-[#CA8A04] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#854D0E]">
                Select a task and enter a file path to enable this agent configuration.
              </p>
            </div>
          )}
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

function AIAgentsTab({ client }: { client: Client }) {
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<typeof agentConfigs[number] | null>(null);
  const clientAgentConfigs = agentConfigs.filter(config => config.clientId === client.id);
  const clientAgentRuns = agentRuns.filter(run => run.clientId === client.id);

  const CONFIG_STATUS_STYLES: Record<string, { dot: string; text: string }> = {
    Configured: { dot: '#16A34A', text: '#16A34A' },
    'Not Configured': { dot: '#F59E0B', text: '#CA8A04' },
    Error: { dot: '#DC2626', text: '#DC2626' },
  };

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-[13px] font-semibold text-[#111827]">Agent Configuration for {client.name}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug">Each agent-assigned task needs a configuration telling it where to find this client's data.</p>
        </div>
        <button
          onClick={() => { setEditingConfig(null); setShowConfigModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#4F46E5] rounded text-[12px] text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors whitespace-nowrap flex-shrink-0"
        >
          <Plus size={11} /> Add Configuration
        </button>
      </div>

      {clientAgentConfigs.length > 0 ? (
        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-[#F9FAFB]">
              <tr>
                {['Task / Template', 'Agent', 'Skill', 'Source', 'File Path', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientAgentConfigs.map((config, i) => {
                const statusStyle = CONFIG_STATUS_STYLES[config.status] || CONFIG_STATUS_STYLES.Configured;
                return (
                  <tr key={config.id} className={`border-t border-[#F3F4F6] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}>
                    <td className="px-3 py-2.5">
                      <p className="text-[12px] font-medium text-[#374151]">{config.taskName}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{config.templateName}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <AgentBadge agentType={config.agentType} size="xs" />
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-[#374151]">{config.skillName}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1 text-[12px] text-[#6B7280]">
                        {config.dataSource === 'OneDrive' && <Cloud size={11} />}
                        {config.dataSource === 'Google Drive' && <HardDrive size={11} />}
                        {config.dataSource === 'Manual Upload' && <FolderOpen size={11} />}
                        {config.dataSource.replace(' Drive', '')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[120px]">
                      <span
                        className="text-[11px] text-[#6B7280] truncate block cursor-default"
                        title={config.filePath}
                      >
                        {config.filePath}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: statusStyle.text }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusStyle.dot }} />
                        {config.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingConfig(config); setShowConfigModal(true); }}
                          className="text-[11px] text-[#6B7280] hover:text-[#374151]"
                        >
                          Edit
                        </button>
                        <button className="text-[11px] text-[#4F46E5] hover:text-[#4338CA]">Test Run</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-[#E5E7EB] rounded-lg">
          <Bot size={20} className="text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-[13px] text-[#9CA3AF]">No agent configurations yet</p>
          <p className="text-[12px] text-[#D1D5DB] mt-0.5">Add a configuration to automate tasks for this client</p>
          <button
            onClick={() => { setEditingConfig(null); setShowConfigModal(true); }}
            className="mt-3 px-3 py-1.5 border border-[#4F46E5] rounded text-[12px] text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
          >
            + Add Configuration
          </button>
        </div>
      )}

      {/* Run History */}
      {clientAgentRuns.length > 0 && (
        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRunHistory(!showRunHistory)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
          >
            <span className="text-[13px] font-medium text-[#111827]">Recent Agent Runs ({clientAgentRuns.length})</span>
            {showRunHistory ? <ChevronUp size={14} className="text-[#9CA3AF]" /> : <ChevronDown size={14} className="text-[#9CA3AF]" />}
          </button>
          {showRunHistory && (
            <table className="w-full border-collapse border-t border-[#E5E7EB]">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  {['Date', 'Task', 'Agent', 'Status', 'Duration', 'Output'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientAgentRuns.map((run, i) => (
                  <tr key={run.id} className={`border-t border-[#F3F4F6] ${run.status === 'Failed' ? 'bg-[#FFF5F5]' : i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}>
                    <td className="px-3 py-2 text-[11px] text-[#6B7280] whitespace-nowrap">{run.date}</td>
                    <td className="px-3 py-2 text-[12px] text-[#374151] max-w-[140px] truncate">{run.taskName}</td>
                    <td className="px-3 py-2"><AgentBadge agentType={run.agentType} size="xs" /></td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        run.status === 'Completed' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                        run.status === 'Failed' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                        run.status === 'Running' ? 'bg-[#EEF2FF] text-[#4F46E5]' :
                        'bg-[#F3F4F6] text-[#6B7280]'
                      }`}>
                        {run.status === 'Running' && <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse flex-shrink-0" />}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-[#6B7280] font-mono">{run.duration}</td>
                    <td className="px-3 py-2">
                      {run.outputFile ? (
                        <button className="flex items-center gap-1 text-[11px] text-[#4F46E5] hover:underline">
                          <ExternalLink size={10} /> View
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#D1D5DB]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Config modal */}
      {showConfigModal && (
        <AgentConfigModal
          client={client}
          existingConfig={editingConfig}
          onClose={() => { setShowConfigModal(false); setEditingConfig(null); }}
        />
      )}
    </div>
  );
}