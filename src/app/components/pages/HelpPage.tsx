import { HelpCircle, BookOpen, MessageCircle, Video, ExternalLink, ChevronRight } from 'lucide-react';

const HELP_ITEMS = [
  {
    icon: BookOpen,
    color: '#2563EB',
    bg: '#EFF6FF',
    title: 'Documentation',
    description: 'Browse guides, tutorials, and API references for Jetpack Workflow.',
    link: 'Visit docs →',
  },
  {
    icon: Video,
    color: '#7C3AED',
    bg: '#F5F3FF',
    title: 'Video Tutorials',
    description: 'Watch step-by-step walkthroughs of key features and workflows.',
    link: 'Watch videos →',
  },
  {
    icon: MessageCircle,
    color: '#059669',
    bg: '#F0FDF4',
    title: 'Live Chat Support',
    description: 'Chat with our support team — available Mon–Fri, 9AM–6PM CT.',
    link: 'Start chat →',
  },
];

const FAQS = [
  { q: 'How do I create a recurring project series?', a: 'Go to Projects → Create Project → enable the "Recurring" toggle and set the frequency.' },
  { q: 'How do templates work?', a: 'Templates define a reusable set of tasks with cascading due dates. Apply them to any client and push updates to all associated clients at once.' },
  { q: 'How do I reassign tasks in bulk?', a: 'In the Tasks tab, check the boxes next to the tasks you want to reassign, then click the "Edit" button and select a new assignee.' },
  { q: 'Can clients access Jetpack Workflow?', a: 'Jetpack Workflow is a firm-side tool. Clients do not have access. Use the client portal integration for client-facing communication.' },
  { q: 'How does Planning capacity work?', a: 'The Planning tab shows allocated hours per team member per week based on active tasks and their budgeted times.' },
];

export default function HelpPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 flex-shrink-0 bg-white">
        <h1 className="text-[20px] font-semibold text-[#111827]">Help & Support</h1>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-[760px] mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {HELP_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-4 border border-[#E5E7EB] rounded-lg hover:border-[#D1D5DB] hover:shadow-sm transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: item.bg }}>
                    <Icon size={16} style={{ color: item.color }} />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#111827] mb-1">{item.title}</h3>
                  <p className="text-[12px] text-[#6B7280] leading-relaxed mb-2">{item.description}</p>
                  <span className="text-[12px] font-medium" style={{ color: item.color }}>{item.link}</span>
                </div>
              );
            })}
          </div>

          <div className="mb-2">
            <h2 className="text-[15px] font-semibold text-[#111827] mb-4">Frequently Asked Questions</h2>
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden divide-y divide-[#F3F4F6]">
              {FAQS.map((faq, i) => (
                <details key={i} className="group">
                  <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-[#FAFAFA] select-none list-none">
                    <span className="text-[13px] font-medium text-[#374151]">{faq.q}</span>
                    <ChevronRight size={14} className="text-[#9CA3AF] group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-5 pb-3.5 text-[13px] text-[#6B7280] leading-relaxed bg-[#FAFAFA]">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
