import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft, Mic, Upload, Check, Lock, X, Plus, ToggleLeft, ToggleRight,
  AlertCircle, ChevronDown
} from 'lucide-react';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex-shrink-0"
    >
      {checked
        ? <ToggleRight size={24} className="text-[#2563EB]" />
        : <ToggleLeft size={24} className="text-[#D1D5DB]" />
      }
    </button>
  );
}

const PREVIEW_EMAIL_HTML = `
  <div style="font-family:Inter,sans-serif;font-size:13px;color:#374151;padding:16px;border:1px solid #E5E7EB;border-radius:8px;background:#FAFAFA">
    <div style="font-weight:600;color:#111827;margin-bottom:8px">📋 Meeting Summary — Q1 Review</div>
    <div style="color:#6B7280;font-size:12px;margin-bottom:12px">Kessler & Flynn Assistant · Apr 1, 2026 · 42 min</div>
    <div style="font-weight:500;color:#374151;margin-bottom:4px">Key Points</div>
    <ul style="margin:0 0 8px 16px;padding:0;color:#6B7280;font-size:12px">
      <li>Q1 revenue up 14% YoY — $840K gross</li>
      <li>Financial package due March 15 for bank review</li>
      <li>Second location (Westside) planned for Q3</li>
    </ul>
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF">
      Sent by Kessler & Flynn Assistant · Powered by Jetpack Workflow
    </div>
  </div>
`;

export default function AINotetakerSettings() {
  const navigate = useNavigate();

  // Card 1 — Bot Identity
  const [botName, setBotName] = useState('Kessler & Flynn Assistant');
  const [brandColor, setBrandColor] = useState('#2563EB');

  // Card 2 — Meeting Platforms
  const [zoomConnected, setZoomConnected] = useState(true);
  const [meetConnected, setMeetConnected] = useState(false);
  const [teamsConnected, setTeamsConnected] = useState(false);

  // Card 4 — Summary Email
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [emailRecipients, setEmailRecipients] = useState(['sarah.kim@firmname.com']);
  const [newEmail, setNewEmail] = useState('');

  // Card 5 — Default Behaviors
  const [autoSuggestProject, setAutoSuggestProject] = useState(true);
  const [autoLogNote, setAutoLogNote] = useState(true);
  const [confirmationLevel, setConfirmationLevel] = useState('always');

  const addEmail = () => {
    if (newEmail && !emailRecipients.includes(newEmail)) {
      setEmailRecipients([...emailRecipients, newEmail]);
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    setEmailRecipients(emailRecipients.filter(e => e !== email));
  };

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
        <h1 className="text-[20px] font-semibold text-[#111827]">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-6 py-6 space-y-5">

          {/* Card 1 — Bot Identity */}
          <SettingsCard title="Bot Identity" description="Customize how your AI assistant appears to meeting participants.">
            <div className="space-y-4">
              <FormRow label="Bot Display Name">
                <input
                  value={botName}
                  onChange={e => setBotName(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[#374151]"
                />
              </FormRow>

              <FormRow label="Upload Logo">
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-4 text-center hover:border-[#D1D5DB] cursor-pointer transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center mx-auto mb-2">
                    <Mic size={16} className="text-white" />
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors">
                    Drag & drop your firm logo, or <span className="text-[#2563EB]">browse</span>
                  </p>
                  <p className="text-[11px] text-[#D1D5DB] mt-1">PNG, SVG, or JPG · Max 2MB · 1:1 ratio recommended</p>
                </div>
              </FormRow>

              <FormRow label="Brand Color">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md border border-[#E5E7EB] flex-shrink-0 cursor-pointer" style={{ backgroundColor: brandColor }} />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={e => setBrandColor(e.target.value)}
                    className="w-[120px] px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] font-mono text-[#374151]"
                  />
                  <p className="text-[12px] text-[#9CA3AF]">Used for bot avatar and email accents</p>
                </div>
              </FormRow>
            </div>
            <SaveButton />
          </SettingsCard>

          {/* Card 2 — Meeting Platforms */}
          <SettingsCard title="Meeting Platforms" description="Your bot joins meetings via link. Paste a link manually or connect your calendar for auto-join.">
            <div className="space-y-2">
              <PlatformRow
                name="Zoom"
                icon="Z"
                color="#2D8CFF"
                connected={zoomConnected}
                onToggle={() => setZoomConnected(!zoomConnected)}
              />
              <PlatformRow
                name="Google Meet"
                icon="G"
                color="#34A853"
                connected={meetConnected}
                onToggle={() => setMeetConnected(!meetConnected)}
              />
              <PlatformRow
                name="Microsoft Teams"
                icon="T"
                color="#5059C9"
                connected={teamsConnected}
                onToggle={() => setTeamsConnected(!teamsConnected)}
              />
            </div>
          </SettingsCard>

          {/* Card 3 — Calendar Integration (Coming Soon) */}
          <SettingsCard
            title="Calendar Integration"
            description="Connect your calendar so the bot automatically joins scheduled client calls."
            badge="Coming Soon"
          >
            <div className="space-y-2 opacity-50 pointer-events-none">
              <CalendarRow name="Google Calendar" />
              <CalendarRow name="Microsoft Outlook" />
            </div>
          </SettingsCard>

          {/* Card 4 — Summary Email */}
          <SettingsCard title="Summary Email" description="Automatically send a meeting summary to your team when a call ends.">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#374151]">Auto-send summary email when call ends</p>
                  <p className="text-[12px] text-[#9CA3AF] mt-0.5">Sends to all recipients listed below</p>
                </div>
                <Toggle checked={autoSendEmail} onChange={setAutoSendEmail} />
              </div>

              <FormRow label="Recipients">
                <div className={`transition-opacity ${!autoSendEmail ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex flex-wrap gap-1.5 p-2 border border-[#E5E7EB] rounded-lg min-h-[40px] focus-within:border-[#2563EB]">
                    {emailRecipients.map(email => (
                      <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-[12px] rounded-md">
                        {email}
                        <button onClick={() => removeEmail(email)}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ',') && addEmail()}
                      placeholder="Add email address..."
                      className="flex-1 min-w-[160px] text-[13px] outline-none text-[#374151] placeholder-[#9CA3AF] bg-transparent"
                    />
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">Press Enter or comma to add</p>
                </div>
              </FormRow>

              <div className={`transition-opacity ${!autoSendEmail ? 'opacity-40' : ''}`}>
                <p className="text-[12px] font-medium text-[#374151] mb-2">Email Preview</p>
                <div dangerouslySetInnerHTML={{ __html: PREVIEW_EMAIL_HTML }} />
              </div>
            </div>
            <SaveButton />
          </SettingsCard>

          {/* Card 5 — Default Behaviors */}
          <SettingsCard title="Default Behaviors" description="Control how the AI surfaces and handles suggestions after each meeting.">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-[13px] font-medium text-[#374151]">Auto-suggest creating project from meeting</p>
                  <p className="text-[12px] text-[#9CA3AF] mt-0.5">AI will suggest a new project if a multi-step engagement is discussed</p>
                </div>
                <Toggle checked={autoSuggestProject} onChange={setAutoSuggestProject} />
              </div>
              <div className="h-px bg-[#F3F4F6]" />
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-[13px] font-medium text-[#374151]">Auto-suggest logging call note to client</p>
                  <p className="text-[12px] text-[#9CA3AF] mt-0.5">AI will always suggest a note log for every completed call</p>
                </div>
                <Toggle checked={autoLogNote} onChange={setAutoLogNote} />
              </div>
              <div className="h-px bg-[#F3F4F6]" />
              <div>
                <p className="text-[13px] font-medium text-[#374151] mb-1.5">Suggestion confirmation level</p>
                <div className="relative">
                  <select
                    value={confirmationLevel}
                    onChange={e => setConfirmationLevel(e.target.value)}
                    className="w-full appearance-none px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] text-[#374151] bg-white pr-8 cursor-pointer"
                  >
                    <option value="always">Always require review (recommended)</option>
                    <option value="notes">Auto-accept notes only</option>
                    <option value="none">Auto-accept all suggestions</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
                {confirmationLevel !== 'always' && (
                  <div className="mt-2 flex items-start gap-2 p-2.5 bg-[#FEFCE8] border border-[#FDE68A] rounded-lg">
                    <AlertCircle size={13} className="text-[#CA8A04] flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#92400E]">
                      Auto-accept will write to client records without human review. Use with care.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <SaveButton />
          </SettingsCard>

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ title, description, badge, children }: {
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
            {badge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#9CA3AF] text-[10px] font-medium rounded-full">
                <Lock size={9} /> {badge}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#374151] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SaveButton() {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="pt-2 border-t border-[#F3F4F6] mt-4">
      <button
        onClick={handleSave}
        className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all flex items-center gap-1.5 ${
          saved ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]' : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
        }`}
      >
        {saved ? <><Check size={13} /> Saved</> : 'Save Changes'}
      </button>
    </div>
  );
}

function PlatformRow({ name, icon, color, connected, onToggle }: {
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border border-[#F3F4F6] rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <span className="text-[13px] font-medium text-[#374151]">{name}</span>
      </div>
      {connected ? (
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] text-[12px] font-medium rounded-lg hover:bg-[#DCFCE7] transition-colors"
        >
          <Check size={12} /> Connected
        </button>
      ) : (
        <button
          onClick={onToggle}
          className="px-3 py-1 bg-white border border-[#E5E7EB] text-[#374151] text-[12px] font-medium rounded-lg hover:bg-[#F9FAFB] transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );
}

function CalendarRow({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between p-3 border border-[#F3F4F6] rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
          <Lock size={12} className="text-[#9CA3AF]" />
        </div>
        <span className="text-[13px] text-[#9CA3AF]">{name}</span>
      </div>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F3F4F6] text-[#9CA3AF] text-[11px] font-medium rounded-full border border-[#E5E7EB]">
        <Lock size={9} /> Coming Soon
      </span>
    </div>
  );
}