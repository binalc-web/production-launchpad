import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Mic, CheckCircle, Loader, AlertCircle, Settings,
  Clock, Calendar, ChevronRight, Edit2, ToggleLeft, ToggleRight,
  X, Zap, Users
} from 'lucide-react';
import { meetings, BOT_STATS, type Meeting } from '../../data/aiNotetakerData';

const STATUS_CONFIG = {
  'suggestions-ready': {
    label: 'Suggestions Ready',
    bg: '#EFF6FF',
    text: '#2563EB',
    border: '#BFDBFE',
    icon: Zap,
  },
  reviewed: {
    label: 'Reviewed',
    bg: '#F0FDF4',
    text: '#16A34A',
    border: '#BBF7D0',
    icon: CheckCircle,
  },
  processing: {
    label: 'Processing',
    bg: '#F9FAFB',
    text: '#6B7280',
    border: '#E5E7EB',
    icon: Loader,
  },
  'no-suggestions': {
    label: 'No Suggestions',
    bg: '#F9FAFB',
    text: '#9CA3AF',
    border: '#E5E7EB',
    icon: AlertCircle,
  },
};

const PLATFORM_ICONS: Record<string, string> = {
  zoom: 'Z',
  meet: 'G',
  teams: 'T',
};

const PLATFORM_COLORS: Record<string, string> = {
  zoom: '#2D8CFF',
  meet: '#34A853',
  teams: '#5059C9',
};

function MeetingCard({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const cfg = STATUS_CONFIG[meeting.status];
  const StatusIcon = cfg.icon;
  const isProcessing = meeting.status === 'processing';
  const isReviewed = meeting.status === 'reviewed';

  return (
    <div
      onClick={onClick}
      className={`p-4 border rounded-lg cursor-pointer group transition-all hover:shadow-sm ${
        isReviewed ? 'border-[#E5E7EB] bg-[#FAFAFA]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {/* Platform pill */}
            <span
              className="w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: PLATFORM_COLORS[meeting.platform] }}
            >
              {PLATFORM_ICONS[meeting.platform]}
            </span>
            <h3 className={`text-[13px] font-semibold truncate group-hover:text-[#2563EB] transition-colors ${isReviewed ? 'text-[#6B7280]' : 'text-[#111827]'}`}>
              {meeting.title}
            </h3>
          </div>
          <p className={`text-[12px] ${isReviewed ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>{meeting.client}</p>
        </div>

        {/* Status badge */}
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 border"
          style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
        >
          {isProcessing
            ? <span className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin" />
            : <StatusIcon size={10} />
          }
          {cfg.label}
          {meeting.suggestionCount && meeting.status === 'suggestions-ready' && (
            <span className="ml-0.5 w-4 h-4 bg-[#2563EB] text-white rounded-full text-[9px] flex items-center justify-center">
              {meeting.suggestionCount}
            </span>
          )}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF] mb-3">
        <span className="flex items-center gap-1"><Calendar size={10} /> {meeting.date}</span>
        <span className="flex items-center gap-1"><Clock size={10} /> {meeting.time}</span>
        <span className="flex items-center gap-1"><Mic size={10} /> {meeting.duration}</span>
      </div>

      {/* Attendees */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {meeting.attendees.slice(0, 4).map((a, i) => (
            <div key={i} className="relative" style={{ marginLeft: i > 0 ? '-6px' : 0, zIndex: 10 - i }}>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-white"
                style={{ backgroundColor: a.color }}
                title={a.name}
              >
                {a.initials}
              </div>
            </div>
          ))}
          {meeting.attendees.length > 4 && (
            <span className="text-[10px] text-[#9CA3AF] ml-1">+{meeting.attendees.length - 4}</span>
          )}
        </div>
        <ChevronRight size={13} className="text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors" />
      </div>
    </div>
  );
}

function StartMeetingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [meetingLink, setMeetingLink] = useState('');
  const [client, setClient] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const CLIENT_OPTIONS = [
    'Riverside Restaurant Group', 'Smith & Associates LLC', 'Baker Dental Group',
    'Greenfield Industries Inc.', 'Johnson Family Trust', 'Pacific Financial Advisors',
  ];

  const handleClientChange = (val: string) => {
    setClient(val);
    if (!meetingTitle) setMeetingTitle(`Check-in — ${val}`);
  };

  const sendBot = () => {
    if (!meetingLink || !client) return;
    setStep(2);
    // Simulate elapsed timer
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-[#2563EB]" />
            <h2 className="text-[15px] font-semibold text-[#111827]">Start New Meeting</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F3F4F6] rounded">
            <X size={14} className="text-[#9CA3AF]" />
          </button>
        </div>

        {step === 1 ? (
          <div className="px-6 py-5">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-[10px] flex items-center justify-center font-semibold">1</span>
                <span className="text-[12px] font-medium text-[#2563EB]">Meeting Setup</span>
              </div>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#F3F4F6] text-[#9CA3AF] text-[10px] flex items-center justify-center font-semibold">2</span>
                <span className="text-[12px] text-[#9CA3AF]">Bot Active</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Meeting Link</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={e => setMeetingLink(e.target.value)}
                  placeholder="Paste your Zoom, Meet, or Teams link"
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[#374151] placeholder-[#9CA3AF]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Client</label>
                <select
                  value={client}
                  onChange={e => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[#374151] bg-white appearance-none"
                >
                  <option value="">Select a client...</option>
                  {CLIENT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                  Meeting Title <span className="text-[#9CA3AF] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Q1 Review, Onboarding Call..."
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[#374151] placeholder-[#9CA3AF]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button onClick={onClose} className="px-4 py-2 text-[13px] text-[#6B7280] hover:text-[#374151]">
                Cancel
              </button>
              <button
                onClick={sendBot}
                disabled={!meetingLink || !client}
                className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Mic size={13} /> Send Bot to Meeting
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white text-[10px] flex items-center justify-center">✓</span>
                <span className="text-[12px] text-[#9CA3AF]">Meeting Setup</span>
              </div>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-[10px] flex items-center justify-center font-semibold">2</span>
                <span className="text-[12px] font-medium text-[#2563EB]">Bot Active</span>
              </div>
            </div>

            {/* Bot active card */}
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5 mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#16A34A] flex items-center justify-center">
                    <Mic size={18} className="text-white" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#16A34A] border-2 border-white rounded-full">
                    <span className="absolute inset-0 rounded-full bg-[#16A34A] animate-ping opacity-75" />
                  </span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#15803D]">Bot joined — Recording in progress</p>
                  <p className="text-[12px] text-[#16A34A]">Kessler & Flynn Assistant is active</p>
                </div>
              </div>

              <div className="space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#374151] font-medium">{meetingTitle || `Check-in — ${client}`}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#6B7280]">
                  <Users size={12} /> <span>{client}</span>
                </div>
              </div>

              {/* Timer */}
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 bg-[#DCFCE7] rounded-full h-1.5">
                  <div className="bg-[#16A34A] h-1.5 rounded-full transition-all" style={{ width: `${Math.min((elapsed / 3600) * 100, 100)}%` }} />
                </div>
                <span className="text-[14px] font-mono font-semibold text-[#15803D]">{formatTime(elapsed)}</span>
              </div>
            </div>

            <p className="text-[12px] text-[#9CA3AF] text-center mb-5">
              Summary and suggestions will be ready within 2 minutes of the call ending.
            </p>

            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-[#E5E7EB] text-[13px] text-[#6B7280] rounded-lg hover:bg-[#F9FAFB]"
              >
                End Early
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#F3F4F6] text-[13px] text-[#374151] rounded-lg hover:bg-[#E5E7EB]"
              >
                Minimize
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AINotetakerHub() {
  const navigate = useNavigate();
  const [showStartModal, setShowStartModal] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const [botName, setBotName] = useState('Kessler & Flynn Assistant');
  const [editingBotName, setEditingBotName] = useState(false);

  const handleMeetingClick = (meeting: Meeting) => {
    if (meeting.status === 'suggestions-ready') {
      navigate(`/ai-notetaker/review/${meeting.id}`);
    } else if (meeting.status === 'reviewed') {
      navigate(`/ai-notetaker/meeting/${meeting.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <Mic size={16} className="text-[#6B7280]" />
          <h1 className="text-[20px] font-semibold text-[#111827]">AI Notetaker</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate('/ai-notetaker/settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors"
          >
            <Settings size={13} /> Settings
          </button>
          <button
            onClick={() => setShowStartModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded transition-colors"
          >
            <Plus size={13} /> Start New Meeting
          </button>
        </div>
      </div>

      {/* Suggestions-ready banner */}
      {meetings.some(m => m.status === 'suggestions-ready') && (
        <div className="flex items-center gap-3 px-6 py-2.5 bg-[#EFF6FF] border-b border-[#BFDBFE] flex-shrink-0">
          <Zap size={14} className="text-[#2563EB] flex-shrink-0" />
          <p className="text-[13px] text-[#1E40AF]">
            <strong>{meetings.filter(m => m.status === 'suggestions-ready').length} meeting{meetings.filter(m => m.status === 'suggestions-ready').length > 1 ? 's' : ''}</strong> ready for review — AI suggestions are waiting for your approval.
          </p>
          <button
            onClick={() => {
              const m = meetings.find(x => x.status === 'suggestions-ready');
              if (m) navigate(`/ai-notetaker/review/${m.id}`);
            }}
            className="ml-auto text-[12px] font-medium text-[#2563EB] hover:underline flex items-center gap-1 flex-shrink-0"
          >
            Review now <ChevronRight size={11} />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Left — meetings list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-[#374151]">Recent Meetings</h2>
            <span className="text-[12px] text-[#9CA3AF]">{meetings.length} total</span>
          </div>
          <div className="space-y-2.5">
            {meetings.map(m => (
              <MeetingCard key={m.id} meeting={m} onClick={() => handleMeetingClick(m)} />
            ))}
          </div>
        </div>

        {/* Right — Bot status panel */}
        <div className="w-[300px] flex-shrink-0 border-l border-[#E5E7EB] overflow-y-auto bg-[#FAFAFA]">
          <div className="p-5">
            {/* Bot identity card */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Bot Identity</span>
                <button
                  onClick={() => navigate('/ai-notetaker/settings')}
                  className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-0.5"
                >
                  <Settings size={10} /> Settings
                </button>
              </div>

              {/* Bot avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
                  <Mic size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  {editingBotName ? (
                    <input
                      autoFocus
                      value={botName}
                      onChange={e => setBotName(e.target.value)}
                      onBlur={() => setEditingBotName(false)}
                      onKeyDown={e => e.key === 'Enter' && setEditingBotName(false)}
                      className="text-[13px] font-semibold text-[#111827] border-b border-[#2563EB] outline-none w-full bg-transparent"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingBotName(true)}
                      className="flex items-center gap-1 group"
                    >
                      <span className="text-[13px] font-semibold text-[#111827] truncate">{botName}</span>
                      <Edit2 size={11} className="text-[#D1D5DB] group-hover:text-[#9CA3AF] flex-shrink-0" />
                    </button>
                  )}
                  <span className="text-[11px] text-[#9CA3AF]">Kessler & Flynn CPA</span>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-2.5 bg-[#F9FAFB] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${botActive ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'}`} />
                  <span className="text-[12px] font-medium text-[#374151]">{botActive ? 'Active' : 'Inactive'}</span>
                </div>
                <button
                  onClick={() => setBotActive(!botActive)}
                  className="flex-shrink-0"
                >
                  {botActive
                    ? <ToggleRight size={22} className="text-[#2563EB]" />
                    : <ToggleLeft size={22} className="text-[#D1D5DB]" />
                  }
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4">
              <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider block mb-3">This Month</span>
              <div className="space-y-3">
                {[
                  { label: 'Meetings recorded', value: BOT_STATS.meetingsThisMonth, color: '#2563EB' },
                  { label: 'Tasks created', value: BOT_STATS.tasksCreated, color: '#16A34A' },
                  { label: 'Notes logged', value: BOT_STATS.notesLogged, color: '#7C3AED' },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6B7280]">{stat.label}</span>
                    <span className="text-[16px] font-bold" style={{ color: stat.color }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Go to settings */}
            <button
              onClick={() => navigate('/ai-notetaker/settings')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] text-[#374151] hover:bg-white hover:border-[#D1D5DB] transition-all"
            >
              <Settings size={13} className="text-[#6B7280]" /> Go to AI Notetaker Settings
            </button>
          </div>
        </div>
      </div>

      {showStartModal && <StartMeetingModal onClose={() => setShowStartModal(false)} />}
    </div>
  );
}