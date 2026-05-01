import { useState, type ElementType } from 'react';
import {
  Bell, AtSign, Clock, AlertCircle, ChevronRight,
  Settings, Check, ExternalLink, X, Bot, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { Link } from 'react-router';
import { notifications as initialNotifications, type Notification } from '../../data/mockData';
import { morningDigest } from '../../data/aiAgentData';
import { AgentBadge } from '../ui/AgentAvatar';

const NOTIFICATION_CONFIG: Record<string, { icon: ElementType; color: string; bg: string; label: string }> = {
  next: { icon: ChevronRight, color: '#7C3AED', bg: '#F5F3FF', label: 'Next in workflow' },
  mention: { icon: AtSign, color: '#2563EB', bg: '#EFF6FF', label: 'Mention' },
  due_today: { icon: Clock, color: '#CA8A04', bg: '#FEFCE8', label: 'Due today' },
  overdue: { icon: AlertCircle, color: '#DC2626', bg: '#FEF2F2', label: 'Overdue' },
};

const NOTIFICATION_SETTINGS = [
  { type: 'Task is "Next" in workflow', inApp: true, email: false },
  { type: '@mention received', inApp: true, email: true },
  { type: 'Task due today', inApp: true, email: true },
  { type: 'Task overdue', inApp: true, email: true },
  { type: 'Project status changed', inApp: true, email: false },
  { type: 'New comment on project', inApp: true, email: false },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeView, setActiveView] = useState<'inbox' | 'settings'>('inbox');
  const [digestExpanded, setDigestExpanded] = useState(false);
  const [digestDismissed, setDigestDismissed] = useState(false);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <h1 className="text-[20px] font-semibold text-[#111827]">Notifications</h1>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 bg-[#2563EB] text-white text-[11px] font-semibold rounded-full">
            {unreadCount} new
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
            >
              <Check size={13} /> Mark all read
            </button>
          )}
          <button
            onClick={() => setActiveView(v => v === 'inbox' ? 'settings' : 'inbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-[13px] transition-colors ${
              activeView === 'settings'
                ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]'
            }`}
          >
            <Settings size={13} /> Notification Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeView === 'inbox' ? (
          <div className="max-w-[760px] mx-auto px-6 py-6">
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                  <Bell size={24} className="text-[#D1D5DB]" />
                </div>
                <p className="text-[15px] font-medium text-[#374151] mb-1">All caught up!</p>
                <p className="text-[13px] text-[#9CA3AF]">No new notifications.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Morning Digest Card */}
                {!digestDismissed && (
                  <div className="mb-4 rounded-lg border border-[#E0E7FF] bg-white overflow-hidden shadow-sm">
                    <div className="flex items-start gap-0">
                      {/* Accent bar */}
                      <div className="w-1 self-stretch bg-[#4F46E5] flex-shrink-0 rounded-l-lg" />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Bot size={16} className="text-[#4F46E5]" />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-[#111827]">Today's Agent Work — {morningDigest.length} clients ready</p>
                              <p className="text-[12px] text-[#6B7280] mt-0.5 leading-snug">
                                Tasks have been prepared and are ready for agent execution. Review before your agents run.
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                                  <Calendar size={10} /> Sent at 7:00 AM · Apr 1, 2026
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setDigestDismissed(true)}
                            className="p-1 hover:bg-[#F3F4F6] rounded flex-shrink-0"
                          >
                            <X size={12} className="text-[#9CA3AF]" />
                          </button>
                        </div>

                        {/* Expandable table */}
                        {digestExpanded && (
                          <div className="mt-3 border border-[#E5E7EB] rounded-md overflow-hidden">
                            <table className="w-full border-collapse">
                              <thead className="bg-[#F9FAFB]">
                                <tr>
                                  {['Client', 'Task', 'Agent', 'File Ready', 'Action'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase tracking-wider">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {morningDigest.map((item, i) => (
                                  <tr key={i} className="border-t border-[#F3F4F6]">
                                    <td className="px-3 py-2 text-[12px] text-[#2563EB] font-medium">{item.clientName}</td>
                                    <td className="px-3 py-2 text-[12px] text-[#374151]">{item.taskName}</td>
                                    <td className="px-3 py-2">
                                      <AgentBadge agentType={item.agentType} size="xs" />
                                    </td>
                                    <td className="px-3 py-2">
                                      {item.fileReady
                                        ? <span className="text-[#16A34A] text-[12px]">✓ Ready</span>
                                        : <span className="text-[#CA8A04] text-[12px]">⚠ Not ready</span>
                                      }
                                    </td>
                                    <td className="px-3 py-2">
                                      {item.fileLink && (
                                        <button className="text-[12px] text-[#4F46E5] hover:underline flex items-center gap-1">
                                          <ExternalLink size={10} /> Open File
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => setDigestExpanded(!digestExpanded)}
                            className="flex items-center gap-1 text-[12px] text-[#4F46E5] hover:underline"
                          >
                            {digestExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {digestExpanded ? 'Collapse' : `Show all ${morningDigest.length} clients`}
                          </button>
                          <Link
                            to="/ai-agents"
                            className="flex-1 flex items-center justify-center py-1.5 bg-[#4F46E5] text-white text-[12px] font-medium rounded hover:bg-[#4338CA] transition-colors"
                          >
                            Review All in AI Agents →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unread */}
                {notifications.filter(n => !n.read).length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Unread</span>
                      <div className="flex-1 h-px bg-[#F3F4F6]" />
                    </div>
                    {notifications.filter(n => !n.read).map(n => (
                      <NotificationItem key={n.id} notification={n} onRead={markRead} onDismiss={dismiss} />
                    ))}
                  </>
                )}

                {/* Read */}
                {notifications.filter(n => n.read).length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-5 mb-3">
                      <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Earlier</span>
                      <div className="flex-1 h-px bg-[#F3F4F6]" />
                    </div>
                    {notifications.filter(n => n.read).map(n => (
                      <NotificationItem key={n.id} notification={n} onRead={markRead} onDismiss={dismiss} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-[640px] mx-auto px-6 py-6">
            <div className="mb-5">
              <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Notification Preferences</h2>
              <p className="text-[13px] text-[#6B7280]">Choose which notifications you receive in-app and via email.</p>
            </div>

            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_100px] bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <div className="px-4 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Notification Type</div>
                <div className="px-4 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider text-center">In-App</div>
                <div className="px-4 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider text-center">Email</div>
              </div>
              {NOTIFICATION_SETTINGS.map((setting, i) => (
                <div key={setting.type} className={`grid grid-cols-[1fr_100px_100px] border-b border-[#F3F4F6] last:border-0 ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}>
                  <div className="px-4 py-3">
                    <span className="text-[13px] text-[#374151]">{setting.type}</span>
                  </div>
                  <div className="px-4 py-3 flex justify-center items-center">
                    <Toggle defaultChecked={setting.inApp} />
                  </div>
                  <div className="px-4 py-3 flex justify-center items-center">
                    <Toggle defaultChecked={setting.email} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded hover:bg-[#1D4ED8]">
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notification, onRead, onDismiss }: {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const config = NOTIFICATION_CONFIG[notification.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer group transition-colors ${
        notification.read
          ? 'border-[#F3F4F6] bg-white hover:bg-[#FAFAFA]'
          : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] shadow-sm'
      }`}
      onClick={() => onRead(notification.id)}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: config.bg }}>
        <Icon size={15} style={{ color: config.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[12px] font-semibold`} style={{ color: config.color }}>
                {config.label}
              </span>
              {!notification.read && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] flex-shrink-0" />
              )}
            </div>
            <p className={`text-[13px] leading-snug ${notification.read ? 'text-[#6B7280]' : 'text-[#374151]'}`}>
              {notification.description}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-[#9CA3AF]">{notification.timestamp}</span>
              {notification.project && (
                <button className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-1">
                  <ExternalLink size={10} /> {notification.project}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#F3F4F6] rounded flex-shrink-0 transition-opacity"
          >
            <X size={12} className="text-[#9CA3AF]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ defaultChecked }: { defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  );
}