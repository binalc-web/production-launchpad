import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ChevronLeft, Calendar, Clock, Search, ChevronDown, ChevronUp,
  CheckCircle, X, Edit2, Check, Zap, FolderPlus, FileText, User,
  ArrowRight, Mic, type LucideIcon
} from 'lucide-react';
import { meetings } from '../../data/aiNotetakerData';
import { TEAM_MEMBERS } from '../../data/mockData';

type SuggestionType = 'add-task' | 'create-project' | 'update-client' | 'log-note';
type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';

interface LocalSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  contextSnippet: string;
  target: string;
  status: SuggestionStatus;
  taskName?: string;
  assignee?: string;
  dueDate?: string;
  targetProject?: string;
  noteText?: string;
}

const SUGGESTION_CONFIG: Record<SuggestionType, { label: string; icon: LucideIcon; bg: string; text: string; border: string }> = {
  'add-task': { label: 'Add Task', icon: CheckCircle, bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  'create-project': { label: 'Create Project', icon: FolderPlus, bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  'update-client': { label: 'Update Client', icon: User, bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  'log-note': { label: 'Log Note', icon: FileText, bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
};

const PROJECT_OPTIONS = [
  'Q1 2024 Tax Return — Riverside Restaurant Group',
  'Monthly Bookkeeping — Riverside Restaurant Group',
  'S-Corp Election Filing — Riverside',
  'Annual Audit Preparation',
  'New Project (create)',
];

const TEAM_OPTIONS = Object.keys(TEAM_MEMBERS);

export default function SuggestionReviewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const meeting = meetings.find(m => m.id === id);

  const [suggestions, setSuggestions] = useState<LocalSuggestion[]>(
    meeting?.suggestions?.map(s => ({ ...s, status: 'pending' as SuggestionStatus })) ?? []
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [highlightedSegment, setHighlightedSegment] = useState<string | null>(null);
  const [marked, setMarked] = useState(false);

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

  const pending = suggestions.filter(s => s.status === 'pending').length;
  const reviewed = suggestions.filter(s => s.status !== 'pending').length;
  const total = suggestions.length;
  const allDone = pending === 0;

  const accept = (id: string) => {
    setSuggestions(s => s.map(x => x.id === id ? { ...x, status: 'accepted' } : x));
    setEditingId(null);
  };

  const dismiss = (id: string) => {
    setSuggestions(s => s.map(x => x.id === id ? { ...x, status: 'dismissed' } : x));
    setEditingId(null);
  };

  const startEdit = (id: string) => {
    setEditingId(editingId === id ? null : id);
  };

  const updateSuggestion = (id: string, patch: Partial<LocalSuggestion>) => {
    setSuggestions(s => s.map(x => x.id === id ? { ...x, ...patch } : x));
  };

  const filteredTranscript = (meeting.transcript ?? []).filter(seg =>
    !transcriptSearch || seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()) || seg.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  const handleMarkComplete = () => {
    setMarked(true);
    setTimeout(() => navigate('/ai-notetaker'), 1000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <button
          onClick={() => navigate('/ai-notetaker')}
          className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#374151] transition-colors mr-1"
        >
          <ChevronLeft size={14} /> AI Notetaker
        </button>
        <span className="text-[#D1D5DB]">/</span>
        <div className="flex items-center gap-2 ml-1 min-w-0">
          <Mic size={14} className="text-[#9CA3AF] flex-shrink-0" />
          <h1 className="text-[15px] font-semibold text-[#111827] truncate">Post-Call Review: {meeting.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {/* Attendees */}
          <div className="flex items-center gap-1.5">
            {meeting.attendees.map((a, i) => (
              <div key={i} className="relative" style={{ marginLeft: i > 0 ? '-6px' : 0, zIndex: 10 - i }}>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white"
                  style={{ backgroundColor: a.color }}
                  title={`${a.name} (${a.role})`}
                >
                  {a.initials}
                </div>
              </div>
            ))}
            <span className="text-[12px] text-[#9CA3AF] ml-1">{meeting.attendees.length} attendees</span>
          </div>

          <div className="flex items-center gap-3 text-[12px] text-[#9CA3AF]">
            <span className="flex items-center gap-1"><Calendar size={11} /> {meeting.date}</span>
            <span className="flex items-center gap-1"><Clock size={11} /> {meeting.duration}</span>
          </div>

          {/* Pending count badge */}
          {pending > 0 && (
            <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[12px] font-medium rounded-full border border-[#BFDBFE]">
              {pending} suggestion{pending !== 1 ? 's' : ''} pending
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT — Transcript + Summary (40%) */}
        <div className="w-[42%] flex-shrink-0 border-r border-[#E5E7EB] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* AI Summary */}
            <div className="px-5 py-5 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center">
                  <Zap size={12} className="text-white" />
                </div>
                <h2 className="text-[14px] font-semibold text-[#111827]">AI Summary</h2>
                <span className="text-[11px] text-[#9CA3AF] ml-1">Generated</span>
              </div>

              {meeting.summary && (
                <div className="space-y-4">
                  <SummarySection
                    label="Key Discussion Points"
                    color="#2563EB"
                    items={meeting.summary.keyPoints}
                  />
                  <SummarySection
                    label="Decisions Made"
                    color="#16A34A"
                    items={meeting.summary.decisions}
                  />
                  <SummarySection
                    label="Action Items Identified"
                    color="#7C3AED"
                    items={meeting.summary.actionItems}
                  />
                </div>
              )}
            </div>

            {/* Collapsible Transcript */}
            <div className="border-b border-[#F3F4F6]">
              <button
                onClick={() => setTranscriptOpen(!transcriptOpen)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FAFAFA] transition-colors"
              >
                <span className="text-[13px] font-semibold text-[#374151] flex items-center gap-2">
                  Full Transcript
                  <span className="text-[11px] font-normal text-[#9CA3AF]">({meeting.transcript?.length ?? 0} segments)</span>
                </span>
                {transcriptOpen ? <ChevronUp size={14} className="text-[#9CA3AF]" /> : <ChevronDown size={14} className="text-[#9CA3AF]" />}
              </button>

              {transcriptOpen && (
                <div className="border-t border-[#F3F4F6]">
                  {/* Search */}
                  <div className="px-5 py-2.5 border-b border-[#F3F4F6] bg-[#FAFAFA]">
                    <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg px-3 py-1.5 bg-white focus-within:border-[#2563EB]">
                      <Search size={12} className="text-[#9CA3AF]" />
                      <input
                        value={transcriptSearch}
                        onChange={e => setTranscriptSearch(e.target.value)}
                        placeholder="Search transcript..."
                        className="text-[13px] outline-none flex-1 placeholder-[#9CA3AF] text-[#374151]"
                      />
                      {transcriptSearch && (
                        <button onClick={() => setTranscriptSearch('')}>
                          <X size={12} className="text-[#9CA3AF]" />
                        </button>
                      )}
                    </div>
                    {transcriptSearch && (
                      <p className="text-[11px] text-[#9CA3AF] mt-1.5">
                        {filteredTranscript.length} result{filteredTranscript.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Segments */}
                  <div className="divide-y divide-[#F9FAFB]">
                    {filteredTranscript.map(seg => {
                      const isHighlighted = highlightedSegment === seg.id;
                      const speakerColor = meeting.attendees.find(a =>
                        a.name.toLowerCase().includes(seg.speaker.split(' ')[0].toLowerCase())
                      )?.color ?? '#9CA3AF';

                      return (
                        <div
                          key={seg.id}
                          className={`flex gap-3 px-5 py-3 transition-colors ${isHighlighted ? 'bg-[#FEFCE8]' : 'hover:bg-[#FAFAFA]'}`}
                        >
                          <span className="text-[10px] font-mono text-[#9CA3AF] flex-shrink-0 pt-0.5 w-[50px]">{seg.timestamp}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold block mb-0.5" style={{ color: speakerColor }}>
                              {seg.speaker}
                            </span>
                            <p className="text-[12px] text-[#374151] leading-relaxed">
                              {transcriptSearch ? highlightText(seg.text, transcriptSearch) : seg.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Suggestion Cards (60%) */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#F9FAFB]">
          {/* Progress bar */}
          <div className="px-6 pt-5 pb-4 bg-white border-b border-[#F3F4F6] flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-[#374151]">
                {allDone ? 'All suggestions reviewed' : `${reviewed} of ${total} reviewed`}
              </span>
              <span className="text-[12px] text-[#9CA3AF]">
                {suggestions.filter(s => s.status === 'accepted').length} accepted · {suggestions.filter(s => s.status === 'dismissed').length} dismissed
              </span>
            </div>
            <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${total > 0 ? (reviewed / total) * 100 : 0}%`,
                  backgroundColor: allDone ? '#16A34A' : '#2563EB',
                }}
              />
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {suggestions.map(suggestion => {
              const cfg = SUGGESTION_CONFIG[suggestion.type];
              const TypeIcon = cfg.icon;
              const isEditing = editingId === suggestion.id;
              const isDone = suggestion.status !== 'pending';

              return (
                <div
                  key={suggestion.id}
                  className={`bg-white rounded-xl border shadow-sm transition-all ${
                    isDone
                      ? 'border-[#F3F4F6] opacity-60'
                      : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-md'
                  }`}
                >
                  {/* Card header */}
                  <div className="px-4 pt-4 pb-3 border-b border-[#F9FAFB]">
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 border"
                        style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                      >
                        <TypeIcon size={11} /> {cfg.label}
                      </span>
                      {isDone && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                          suggestion.status === 'accepted'
                            ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                            : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                        }`}>
                          {suggestion.status === 'accepted' ? <><Check size={9} /> Accepted</> : <><X size={9} /> Dismissed</>}
                        </span>
                      )}
                    </div>
                    <p className={`text-[14px] font-semibold mt-2 ${isDone ? 'text-[#9CA3AF]' : 'text-[#111827]'}`}>
                      {suggestion.title}
                    </p>
                  </div>

                  {/* Card body */}
                  <div className="px-4 py-3">
                    {/* Context snippet */}
                    <p className="text-[12px] text-[#9CA3AF] italic leading-relaxed mb-3 border-l-2 border-[#E5E7EB] pl-3">
                      {suggestion.contextSnippet}
                    </p>

                    {/* Target */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowRight size={11} className="text-[#9CA3AF] flex-shrink-0" />
                        <span className="text-[12px] text-[#6B7280]">Target:</span>
                        <span className="text-[12px] text-[#374151] font-medium">{suggestion.target}</span>
                      </div>
                    )}

                    {/* Inline edit form */}
                    {isEditing && (
                      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 mb-3 space-y-3">
                        <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Edit Details</p>

                        {suggestion.type === 'add-task' && (
                          <>
                            <EditField label="Task Name" value={suggestion.taskName ?? ''} onChange={v => updateSuggestion(suggestion.id, { taskName: v })} />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Assignee</label>
                                <select
                                  value={suggestion.assignee ?? ''}
                                  onChange={e => updateSuggestion(suggestion.id, { assignee: e.target.value })}
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] bg-white text-[#374151]"
                                >
                                  <option value="">Select...</option>
                                  {TEAM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Due Date</label>
                                <input
                                  type="text"
                                  value={suggestion.dueDate ?? ''}
                                  onChange={e => updateSuggestion(suggestion.id, { dueDate: e.target.value })}
                                  placeholder="e.g. Mar 15"
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] text-[#374151]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Target Project</label>
                              <select
                                value={suggestion.targetProject ?? ''}
                                onChange={e => updateSuggestion(suggestion.id, { targetProject: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-[12px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] bg-white text-[#374151]"
                              >
                                {PROJECT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                          </>
                        )}

                        {suggestion.type === 'log-note' && (
                          <div>
                            <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Note Text</label>
                            <textarea
                              value={suggestion.noteText ?? ''}
                              onChange={e => updateSuggestion(suggestion.id, { noteText: e.target.value })}
                              rows={3}
                              className="w-full px-2.5 py-2 text-[12px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] resize-none text-[#374151] leading-relaxed"
                            />
                          </div>
                        )}

                        {(suggestion.type === 'create-project' || suggestion.type === 'update-client') && (
                          <EditField label="Details" value={suggestion.target} onChange={v => updateSuggestion(suggestion.id, { target: v })} />
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isDone && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => isEditing ? accept(suggestion.id) : accept(suggestion.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-medium rounded-lg transition-colors"
                        >
                          <Check size={12} />
                          {isEditing ? 'Save & Accept' : 'Accept'}
                        </button>
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(suggestion.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] text-[#374151] text-[12px] font-medium rounded-lg hover:bg-[#F9FAFB] transition-colors"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] text-[#6B7280] text-[12px] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => dismiss(suggestion.id)}
                          className="ml-auto text-[12px] text-[#DC2626] hover:text-[#B91C1C] transition-colors font-medium"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Done state actions */}
                    {isDone && (
                      <button
                        onClick={() => setSuggestions(s => s.map(x => x.id === suggestion.id ? { ...x, status: 'pending' } : x))}
                        className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky bottom bar */}
          <div className="border-t border-[#E5E7EB] bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="text-[13px] text-[#6B7280]">
              {allDone ? (
                <span className="flex items-center gap-1.5 text-[#16A34A] font-medium">
                  <CheckCircle size={14} /> All suggestions reviewed
                </span>
              ) : (
                <span>{pending} remaining</span>
              )}
            </div>
            <button
              onClick={handleMarkComplete}
              disabled={!allDone && !marked}
              className={`flex items-center gap-2 px-5 py-2 text-[13px] font-medium rounded-lg transition-all ${
                marked
                  ? 'bg-[#16A34A] text-white'
                  : allDone
                    ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                    : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
              }`}
            >
              {marked ? <><Check size={14} /> Marked Complete</> : <><CheckCircle size={14} /> Mark Complete</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummarySection({ label, color, items }: { label: string; color: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-[#374151] leading-relaxed">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-[#D1D5DB] flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#6B7280] mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-[12px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] text-[#374151]"
      />
    </div>
  );
}

function highlightText(text: string, query: string) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-[#FEF08A] text-[#374151] rounded-sm">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}