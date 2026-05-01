import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ChevronLeft, Calendar, Clock, CheckCircle, X, Search,
  FileText, FolderPlus, User, Zap, Mic, Table2, type LucideIcon
} from 'lucide-react';
import { meetings, reviewedActions, auditLog } from '../../data/aiNotetakerData';
import type { SuggestionType } from '../../data/aiNotetakerData';

type Tab = 'summary' | 'transcript' | 'actions' | 'audit';

const SUGGESTION_TYPE_CONFIG: Record<SuggestionType, { icon: LucideIcon; color: string; bg: string }> = {
  'add-task': { icon: CheckCircle, color: '#2563EB', bg: '#EFF6FF' },
  'create-project': { icon: FolderPlus, color: '#16A34A', bg: '#F0FDF4' },
  'update-client': { icon: User, color: '#7C3AED', bg: '#F5F3FF' },
  'log-note': { icon: FileText, color: '#6B7280', bg: '#F9FAFB' },
};

function SummarySection({ label, color, items }: { label: string; color: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151] leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#D1D5DB] flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MeetingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const meeting = meetings.find(m => m.id === id);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [transcriptSearch, setTranscriptSearch] = useState('');

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[15px] text-[#374151] mb-2">Meeting not found</p>
          <button onClick={() => navigate('/ai-notetaker')} className="text-[13px] text-[#2563EB] hover:underline">
            ← Back to AI Notetaker
          </button>
        </div>
      </div>
    );
  }

  const actions = reviewedActions[id ?? ''] ?? [];
  const audit = auditLog[id ?? ''] ?? [];

  const filteredTranscript = (meeting.transcript ?? []).filter(seg =>
    !transcriptSearch ||
    seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
    seg.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'actions', label: 'Actions Taken' },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <button
          onClick={() => navigate('/ai-notetaker')}
          className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#374151] transition-colors"
        >
          <ChevronLeft size={14} /> AI Notetaker
        </button>
        <span className="text-[#D1D5DB]">/</span>
        <div className="flex items-center gap-2 min-w-0">
          <Mic size={14} className="text-[#9CA3AF] flex-shrink-0" />
          <h1 className="text-[15px] font-semibold text-[#111827] truncate">{meeting.title}</h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] text-[11px] font-medium rounded-full flex-shrink-0">
            <CheckCircle size={10} /> Reviewed
          </span>
        </div>

        <div className="ml-auto flex items-center gap-4 text-[12px] text-[#9CA3AF]">
          <span className="flex items-center gap-1"><Calendar size={11} /> {meeting.date}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {meeting.time}</span>
          <span className="flex items-center gap-1"><Mic size={11} /> {meeting.duration}</span>
          {/* Attendees */}
          <div className="flex items-center gap-1">
            {meeting.attendees.map((a, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-white"
                style={{ backgroundColor: a.color, marginLeft: i > 0 ? '-4px' : 0, zIndex: 10 - i, position: 'relative' }}
                title={a.name}
              >
                {a.initials}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] bg-white px-6 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-0 py-3 mr-6 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {tab.label}
            {tab.id === 'actions' && actions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-[10px] rounded-full">{actions.length}</span>
            )}
            {tab.id === 'audit' && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-[#FEFCE8] text-[#CA8A04] text-[10px] rounded-full">P2</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary */}
        {activeTab === 'summary' && meeting.summary && (
          <div className="max-w-[720px] mx-auto px-6 py-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
              <h2 className="text-[15px] font-semibold text-[#111827]">AI-Generated Summary</h2>
              <span className="text-[12px] text-[#9CA3AF]">Read-only</span>
            </div>
            <div className="space-y-6 bg-white border border-[#E5E7EB] rounded-xl p-6">
              <SummarySection label="Key Discussion Points" color="#2563EB" items={meeting.summary.keyPoints} />
              <div className="h-px bg-[#F3F4F6]" />
              <SummarySection label="Decisions Made" color="#16A34A" items={meeting.summary.decisions} />
              <div className="h-px bg-[#F3F4F6]" />
              <SummarySection label="Action Items Identified" color="#7C3AED" items={meeting.summary.actionItems} />
            </div>
          </div>
        )}

        {/* Transcript */}
        {activeTab === 'transcript' && (
          <div className="max-w-[760px] mx-auto px-6 py-5">
            {/* Search */}
            <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white mb-4 focus-within:border-[#2563EB]">
              <Search size={13} className="text-[#9CA3AF]" />
              <input
                value={transcriptSearch}
                onChange={e => setTranscriptSearch(e.target.value)}
                placeholder="Search transcript..."
                className="text-[13px] outline-none flex-1 placeholder-[#9CA3AF] text-[#374151]"
              />
              {transcriptSearch && (
                <>
                  <span className="text-[11px] text-[#9CA3AF]">{filteredTranscript.length} results</span>
                  <button onClick={() => setTranscriptSearch('')}><X size={12} className="text-[#9CA3AF]" /></button>
                </>
              )}
            </div>

            {meeting.transcript && meeting.transcript.length > 0 ? (
              <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-[#F9FAFB]">
                {filteredTranscript.map(seg => {
                  const speakerColor = meeting.attendees.find(a =>
                    a.name.toLowerCase().includes(seg.speaker.split(' ')[0].toLowerCase())
                  )?.color ?? '#9CA3AF';
                  return (
                    <div key={seg.id} className="flex gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition-colors">
                      <span className="text-[11px] font-mono text-[#9CA3AF] flex-shrink-0 pt-0.5 w-[56px]">{seg.timestamp}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-semibold block mb-1" style={{ color: speakerColor }}>
                          {seg.speaker}
                        </span>
                        <p className="text-[13px] text-[#374151] leading-relaxed">{seg.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white border border-[#E5E7EB] rounded-xl">
                <FileText size={24} className="text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-[13px] text-[#9CA3AF]">No transcript available for this meeting.</p>
              </div>
            )}
          </div>
        )}

        {/* Actions Taken */}
        {activeTab === 'actions' && (
          <div className="max-w-[680px] mx-auto px-6 py-5">
            <h2 className="text-[14px] font-semibold text-[#374151] mb-4">
              Actions Taken <span className="font-normal text-[#9CA3AF]">({actions.length})</span>
            </h2>
            {actions.length > 0 ? (
              <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-[#F3F4F6]">
                {actions.map(action => {
                  const cfg = SUGGESTION_TYPE_CONFIG[action.suggestionType];
                  const ActionIcon = cfg.icon;
                  return (
                    <div key={action.id} className="flex items-start gap-4 px-5 py-4">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: action.accepted ? cfg.bg : '#FEF2F2' }}
                      >
                        {action.accepted
                          ? <ActionIcon size={14} style={{ color: cfg.color }} />
                          : <X size={14} className="text-[#DC2626]" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium ${action.accepted ? 'text-[#111827]' : 'text-[#9CA3AF] line-through'}`}>
                          {action.description}
                        </p>
                        <p className="text-[12px] text-[#9CA3AF] mt-0.5">{action.outcome}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        action.accepted
                          ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                          : 'bg-[#F9FAFB] text-[#9CA3AF] border border-[#E5E7EB]'
                      }`}>
                        {action.accepted ? <><CheckCircle size={9} /> Accepted</> : <><X size={9} /> Dismissed</>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white border border-[#E5E7EB] rounded-xl">
                <CheckCircle size={24} className="text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-[13px] text-[#9CA3AF]">No actions recorded for this meeting.</p>
              </div>
            )}
          </div>
        )}

        {/* Audit Log (P2) */}
        {activeTab === 'audit' && (
          <div className="max-w-[760px] mx-auto px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[14px] font-semibold text-[#374151]">Audit Log</h2>
              <span className="px-2 py-0.5 bg-[#FEFCE8] border border-[#FDE68A] text-[#CA8A04] text-[10px] font-medium rounded-full">Phase 2</span>
            </div>
            {audit.length > 0 ? (
              <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <tr>
                      {['Suggestion', 'Action', 'User', 'Timestamp'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((entry, i) => (
                      <tr key={entry.id} className={`border-b border-[#F3F4F6] last:border-0 ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}>
                        <td className="px-4 py-3 text-[13px] text-[#374151]">{entry.suggestion}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                            entry.action === 'Accepted'
                              ? 'bg-[#F0FDF4] text-[#16A34A]'
                              : entry.action === 'Dismissed'
                                ? 'bg-[#FEF2F2] text-[#DC2626]'
                                : 'bg-[#EFF6FF] text-[#2563EB]'
                          }`}>
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#374151]">{entry.user}</td>
                        <td className="px-4 py-3 text-[12px] text-[#9CA3AF]">{entry.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-white border border-[#E5E7EB] rounded-xl">
                <Table2 size={24} className="text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-[13px] text-[#9CA3AF]">No audit entries for this meeting.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}