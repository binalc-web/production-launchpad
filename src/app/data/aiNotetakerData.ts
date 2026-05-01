export type MeetingStatus = 'suggestions-ready' | 'reviewed' | 'processing' | 'no-suggestions';
export type SuggestionType = 'add-task' | 'create-project' | 'update-client' | 'log-note';
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';

export interface MeetingAttendee {
  name: string;
  initials: string;
  color: string;
  role: 'internal' | 'client';
}

export interface Meeting {
  id: string;
  title: string;
  client: string;
  date: string;
  time: string;
  duration: string;
  status: MeetingStatus;
  attendees: MeetingAttendee[];
  suggestionCount?: number;
  platform: 'zoom' | 'meet' | 'teams';
  summary?: MeetingSummary;
  transcript?: TranscriptSegment[];
  suggestions?: Suggestion[];
}

export interface MeetingSummary {
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  contextSnippet: string;
  target: string;
  status: SuggestionStatus;
  // Editable fields
  taskName?: string;
  assignee?: string;
  dueDate?: string;
  targetProject?: string;
  noteText?: string;
}

export interface ActionTaken {
  id: string;
  suggestionType: SuggestionType;
  description: string;
  outcome: string;
  accepted: boolean;
}

export interface AuditLogEntry {
  id: string;
  suggestion: string;
  action: 'Accepted' | 'Dismissed' | 'Edited & Accepted';
  user: string;
  timestamp: string;
}

// ─── Rich Meeting: Riverside Restaurant Group ───────────────────────────────

const riversideTranscript: TranscriptSegment[] = [
  {
    id: 'tr1', speaker: 'Sarah Kim', timestamp: '0:00:12',
    text: "Thanks everyone for joining. David, great to have you and Marcus on today. Let's start with a quick Q1 overview and then talk about what's coming up for Q2.",
  },
  {
    id: 'tr2', speaker: 'David Chen', timestamp: '0:01:04',
    text: "Of course. Q1 was a strong quarter. Revenue was up about 14% year-over-year, mostly from the weekend brunch program we launched in February. We hit $840K in gross revenue for the quarter.",
  },
  {
    id: 'tr3', speaker: 'Mike Beatty', timestamp: '0:02:14',
    text: "That's great. We're going to need to pull together the full Q1 financial package — P&L, balance sheet, and the cash flow summary — for your bank review. Is March 15th still the deadline David mentioned last time?",
  },
  {
    id: 'tr4', speaker: 'David Chen', timestamp: '0:02:48',
    text: "Yes, March 15th is hard. The bank needs it for the credit line renewal. Can your team have that ready?",
  },
  {
    id: 'tr5', speaker: 'Sarah Kim', timestamp: '0:03:10',
    text: "Absolutely. We'll get that queued up as a priority. Mike, let's make sure that's on the task list for this week.",
  },
  {
    id: 'tr6', speaker: 'Marcus Rivera', timestamp: '0:04:22',
    text: "On the bookkeeping side — we've been keeping up with the QuickBooks entries, but we're starting Q2 with a second location. We're signing the lease for the Westside spot next month. So we'll need a separate entity set up for that.",
  },
  {
    id: 'tr7', speaker: 'Sarah Kim', timestamp: '0:04:55',
    text: "Big news! Congratulations. We'll definitely want to set up a new project for the Westside bookkeeping. Do you know yet if it'll be a separate LLC or under the same entity?",
  },
  {
    id: 'tr8', speaker: 'David Chen', timestamp: '0:05:30',
    text: "Our attorney is recommending a new LLC — Riverside West LLC. So yes, separate entity. We'll probably do an S-Corp election on the original entity too. Our attorney brought that up last month.",
  },
  {
    id: 'tr9', speaker: 'Sarah Kim', timestamp: '0:06:02',
    text: "Good timing to discuss that. An S-Corp election could make sense given your income levels. We'd need to update your entity records on our end. I'll make a note of that transition.",
  },
  {
    id: 'tr10', speaker: 'Mike Beatty', timestamp: '0:07:15',
    text: "On payroll — are you adding staff for the new location? We should talk about whether to run them on the same payroll or separate.",
  },
  {
    id: 'tr11', speaker: 'Marcus Rivera', timestamp: '0:07:45',
    text: "Probably 8 to 10 new hires when we open. We're targeting a Q3 soft open — September or October. So we have some runway.",
  },
  {
    id: 'tr12', speaker: 'Sarah Kim', timestamp: '0:08:20',
    text: "Perfect. That gives us time to plan the payroll setup properly. Let's make sure we document all of this. I want to make sure the Q1 financial package is the immediate priority — everything else we can sequence after that.",
  },
  {
    id: 'tr13', speaker: 'David Chen', timestamp: '0:09:01',
    text: "Agreed. One more thing — the sales tax filing for Q1. We had some catering events across the county line. Does that change our nexus situation?",
  },
  {
    id: 'tr14', speaker: 'Mike Beatty', timestamp: '0:09:30',
    text: "Potentially, yes. Catering at a different location could trigger nexus. We'll look into that and include it in the Q1 review. Sarah, can we add that to the checklist?",
  },
  {
    id: 'tr15', speaker: 'Sarah Kim', timestamp: '0:09:50',
    text: "Adding it now. Alright — I think we've covered the key items. To recap: Q1 financial package by March 15, new bookkeeping project for Westside, S-Corp election review, and sales tax nexus analysis. We'll follow up with a summary.",
  },
  {
    id: 'tr16', speaker: 'David Chen', timestamp: '0:10:15',
    text: "Perfect. Thanks Sarah, thanks Mike. Really appreciate the proactive communication.",
  },
  {
    id: 'tr17', speaker: 'Sarah Kim', timestamp: '0:10:28',
    text: "Always. Talk soon everyone.",
  },
];

const riversideSummary: MeetingSummary = {
  keyPoints: [
    'Q1 revenue for Riverside Restaurant Group was $840K gross, up 14% YoY, driven by the new weekend brunch program launched in February.',
    'Bank credit line renewal requires a Q1 financial package (P&L, balance sheet, cash flow statement) due March 15th — confirmed as a hard deadline.',
    'Client is opening a second location (Westside) in Q3 (target: September/October). Lease signing expected next month. Will operate as a new LLC ("Riverside West LLC").',
    'Client\'s attorney is recommending an S-Corp election for the original entity. Client confirmed interest in pursuing this.',
    'Catering events across county lines during Q1 may have created a new sales tax nexus — requires analysis before Q1 sales tax filing.',
    'New location will hire 8–10 staff; payroll setup TBD (separate or combined with existing entity).',
  ],
  decisions: [
    'Q1 financial package is the immediate priority — all other work to sequence after.',
    'Riverside West will be set up as a separate LLC entity.',
    'S-Corp election for original entity will be reviewed and potentially filed.',
    'Sales tax nexus analysis to be included in Q1 review deliverables.',
  ],
  actionItems: [
    'Prepare Q1 financial package (P&L, balance sheet, cash flow) — due March 15.',
    'Create new bookkeeping project for Riverside West LLC.',
    'Log note: client entity transitioning — S-Corp election pending attorney recommendation.',
    'Analyze Q1 sales tax nexus from catering events.',
  ],
};

const riversideSuggestions: Suggestion[] = [
  {
    id: 's1',
    type: 'add-task',
    title: 'Add task: Prepare Q1 financial package (P&L, balance sheet, cash flow)',
    contextSnippet: '"...she mentioned needing the package by March 15th... the bank needs it for the credit line renewal."',
    target: 'Q1 2024 Tax Return — Riverside Restaurant Group',
    status: 'pending',
    taskName: 'Prepare Q1 financial package (P&L, balance sheet, cash flow)',
    assignee: 'Mike B.',
    dueDate: 'Mar 15',
    targetProject: 'Q1 2024 Tax Return — Riverside Restaurant Group',
  },
  {
    id: 's2',
    type: 'create-project',
    title: 'Create project: Q2 Bookkeeping — Riverside West LLC',
    contextSnippet: '"...we\'re starting Q2 with a second location... Riverside West LLC. So yes, separate entity."',
    target: 'Riverside Restaurant Group (new entity)',
    status: 'pending',
    targetProject: 'Monthly Bookkeeping (template)',
  },
  {
    id: 's3',
    type: 'log-note',
    title: 'Log note: Client pursuing S-Corp election on original entity',
    contextSnippet: '"Our attorney is recommending an S-Corp election on the original entity too... last month."',
    target: 'Riverside Restaurant Group — Client Profile',
    status: 'pending',
    noteText: 'Client\'s attorney recommending S-Corp election for Riverside Restaurant Group. David confirmed interest. Follow up to initiate Form 2553 process.',
  },
  {
    id: 's4',
    type: 'update-client',
    title: 'Update client record: Note pending S-Corp entity transition',
    contextSnippet: '"...transitioning from LLC... attorney brought that up last month."',
    target: 'Riverside Restaurant Group — Entity Type field',
    status: 'pending',
  },
];

// ─── All Meetings ────────────────────────────────────────────────────────────

export const meetings: Meeting[] = [
  {
    id: 'm1',
    title: 'Q1 Review — Riverside Restaurant Group',
    client: 'Riverside Restaurant Group',
    date: 'Apr 1, 2026',
    time: '10:00 AM',
    duration: '42 min',
    status: 'suggestions-ready',
    platform: 'zoom',
    attendees: [
      { name: 'Sarah Kim', initials: 'SK', color: '#3B82F6', role: 'internal' },
      { name: 'Mike Beatty', initials: 'MB', color: '#10B981', role: 'internal' },
      { name: 'David Chen', initials: 'DC', color: '#F59E0B', role: 'client' },
      { name: 'Marcus Rivera', initials: 'MR', color: '#EF4444', role: 'client' },
    ],
    suggestionCount: 4,
    summary: riversideSummary,
    transcript: riversideTranscript,
    suggestions: riversideSuggestions,
  },
  {
    id: 'm2',
    title: 'Annual Tax Planning — Smith & Associates LLC',
    client: 'Smith & Associates LLC',
    date: 'Mar 28, 2026',
    time: '2:00 PM',
    duration: '58 min',
    status: 'reviewed',
    platform: 'meet',
    attendees: [
      { name: 'Sarah Kim', initials: 'SK', color: '#3B82F6', role: 'internal' },
      { name: 'Robert Smith', initials: 'RS', color: '#8B5CF6', role: 'client' },
    ],
    suggestionCount: 3,
    summary: {
      keyPoints: [
        'Client expects 2024 taxable income of approx. $320K, up from $260K in 2023.',
        'Client interested in maximizing SEP-IRA contribution for 2024.',
        'Client asking about QBI deduction eligibility and pass-through optimization.',
        'Partnership K-1s may be delayed — one partner has international income.',
      ],
      decisions: [
        'Proceed with SEP-IRA contribution analysis — target max contribution.',
        'Begin QBI deduction eligibility review for 2024 return.',
        'Client will provide international income documentation by April 5th.',
      ],
      actionItems: [
        'Prepare SEP-IRA contribution analysis for 2024.',
        'Flag K-1 delay risk and communicate extension strategy to client.',
        'Document QBI deduction planning memo.',
      ],
    },
    transcript: [],
    suggestions: [
      { id: 'sm2s1', type: 'add-task', title: 'Add task: SEP-IRA contribution analysis for 2024', contextSnippet: '"...maximize SEP-IRA for 2024..."', target: 'Q1 2024 Tax Return — Smith & Associates LLC', status: 'accepted' },
      { id: 'sm2s2', type: 'log-note', title: 'Log note: K-1 delay risk — international income', contextSnippet: '"...one partner has international income, K-1s may be delayed..."', target: 'Smith & Associates LLC — Client Profile', status: 'accepted' },
      { id: 'sm2s3', type: 'add-task', title: 'Add task: QBI deduction eligibility review', contextSnippet: '"...asking about QBI deduction..."', target: 'Q1 2024 Tax Return — Smith & Associates LLC', status: 'dismissed' },
    ],
  },
  {
    id: 'm3',
    title: 'Onboarding Call — Pacific Financial Advisors',
    client: 'Pacific Financial Advisors',
    date: 'Apr 1, 2026',
    time: '11:30 AM',
    duration: '31 min',
    status: 'processing',
    platform: 'zoom',
    attendees: [
      { name: 'Tom Hughes', initials: 'TH', color: '#8B5CF6', role: 'internal' },
      { name: 'Hiroshi Tanaka', initials: 'HT', color: '#0EA5E9', role: 'client' },
    ],
  },
  {
    id: 'm4',
    title: 'Monthly Check-in — Baker Dental Group',
    client: 'Baker Dental Group',
    date: 'Mar 25, 2026',
    time: '9:00 AM',
    duration: '24 min',
    status: 'reviewed',
    platform: 'teams',
    attendees: [
      { name: 'Tom Hughes', initials: 'TH', color: '#8B5CF6', role: 'internal' },
      { name: 'James Baker', initials: 'JB', color: '#06B6D4', role: 'client' },
    ],
    suggestionCount: 2,
    summary: {
      keyPoints: [
        'March bookkeeping is on track. QBO is reconciled through March 22nd.',
        'Client wants to discuss adding a 3rd office location — Naperville.',
        'Payroll for March processed correctly. One employee termination needs 941 update.',
      ],
      decisions: [
        'Add Naperville location to next month\'s agenda for entity and payroll structure.',
        'Update Q1 941 for terminated employee.',
      ],
      actionItems: [
        'Update Q1 941 for terminated employee.',
        'Flag Naperville expansion for next planning call.',
      ],
    },
    transcript: [],
    suggestions: [
      { id: 'sm4s1', type: 'add-task', title: 'Add task: Update Q1 941 for terminated employee', contextSnippet: '"...one employee termination needs 941 update..."', target: 'Monthly Bookkeeping — March', status: 'accepted' },
      { id: 'sm4s2', type: 'log-note', title: 'Log note: Client considering Naperville 3rd location', contextSnippet: '"...discussing adding a 3rd office location..."', target: 'Baker Dental Group — Client Profile', status: 'accepted' },
    ],
  },
  {
    id: 'm5',
    title: 'Estate Planning Discussion — Johnson Family Trust',
    client: 'Johnson Family Trust',
    date: 'Mar 20, 2026',
    time: '3:30 PM',
    duration: '19 min',
    status: 'no-suggestions',
    platform: 'zoom',
    attendees: [
      { name: 'Mike Beatty', initials: 'MB', color: '#10B981', role: 'internal' },
      { name: 'Margaret Johnson', initials: 'MJ', color: '#F59E0B', role: 'client' },
    ],
    summary: {
      keyPoints: ['Brief check-in. Client confirmed receipt of trust documents. No new action items identified.'],
      decisions: [],
      actionItems: [],
    },
  },
  {
    id: 'm6',
    title: 'Greenfield Year-End Close — Greenfield Industries Inc.',
    client: 'Greenfield Industries Inc.',
    date: 'Mar 18, 2026',
    time: '1:00 PM',
    duration: '67 min',
    status: 'reviewed',
    platform: 'meet',
    attendees: [
      { name: 'Sarah Kim', initials: 'SK', color: '#3B82F6', role: 'internal' },
      { name: 'Amy Lin', initials: 'AL', color: '#F59E0B', role: 'internal' },
      { name: 'David Greenfield', initials: 'DG', color: '#EF4444', role: 'client' },
      { name: 'Paula Chen', initials: 'PC', color: '#6366F1', role: 'client' },
    ],
    suggestionCount: 5,
    transcript: [],
    suggestions: [],
  },
];

// Actions taken for reviewed meetings
export const reviewedActions: Record<string, ActionTaken[]> = {
  m2: [
    { id: 'a1', suggestionType: 'add-task', description: 'Task added: SEP-IRA contribution analysis for 2024', outcome: 'Q1 2024 Tax Return — Smith & Associates LLC', accepted: true },
    { id: 'a2', suggestionType: 'log-note', description: 'Note logged to Smith & Associates LLC client profile', outcome: 'Client profile updated with K-1 delay risk note', accepted: true },
    { id: 'a3', suggestionType: 'add-task', description: 'Dismissed: Add task: QBI deduction eligibility review', outcome: 'No action taken', accepted: false },
  ],
  m4: [
    { id: 'a4', suggestionType: 'add-task', description: 'Task added: Update Q1 941 for terminated employee', outcome: 'Monthly Bookkeeping — March (Baker Dental)', accepted: true },
    { id: 'a5', suggestionType: 'log-note', description: 'Note logged to Baker Dental Group client profile', outcome: 'Client profile updated — Naperville expansion flag', accepted: true },
  ],
};

export const auditLog: Record<string, AuditLogEntry[]> = {
  m2: [
    { id: 'al1', suggestion: 'Add task: SEP-IRA contribution analysis', action: 'Accepted', user: 'Sarah Kim', timestamp: 'Mar 28, 2026 3:04 PM' },
    { id: 'al2', suggestion: 'Log note: K-1 delay risk', action: 'Accepted', user: 'Sarah Kim', timestamp: 'Mar 28, 2026 3:05 PM' },
    { id: 'al3', suggestion: 'Add task: QBI deduction review', action: 'Dismissed', user: 'Sarah Kim', timestamp: 'Mar 28, 2026 3:06 PM' },
  ],
  m4: [
    { id: 'al4', suggestion: 'Update Q1 941 for terminated employee', action: 'Accepted', user: 'Tom Hughes', timestamp: 'Mar 25, 2026 9:28 AM' },
    { id: 'al5', suggestion: 'Log note: Naperville expansion', action: 'Edited & Accepted', user: 'Tom Hughes', timestamp: 'Mar 25, 2026 9:30 AM' },
  ],
};

// Client meeting history for the Clients page Meetings tab
export const clientMeetings: Record<string, { date: string; title: string; duration: string; snippet: string; meetingId: string }[]> = {
  'Smith & Associates LLC': [
    { date: 'Mar 28, 2026', title: 'Annual Tax Planning', duration: '58 min', snippet: 'Discussed 2024 income projections, SEP-IRA maximization, and K-1 delay risk due to international partner income.', meetingId: 'm2' },
    { date: 'Feb 14, 2026', title: 'Q4 Close Review', duration: '35 min', snippet: 'Year-end adjusting entries reviewed. Partnership return timeline confirmed for April 15 deadline.', meetingId: 'm_hist1' },
  ],
  'Johnson Family Trust': [
    { date: 'Mar 20, 2026', title: 'Estate Planning Discussion', duration: '19 min', snippet: 'Brief check-in. Client confirmed receipt of trust documents. No new action items.', meetingId: 'm5' },
  ],
  'Baker Dental Group': [
    { date: 'Mar 25, 2026', title: 'Monthly Check-in', duration: '24 min', snippet: 'March bookkeeping on track. 941 update needed for terminated employee. Naperville 3rd location flagged for future planning.', meetingId: 'm4' },
    { date: 'Feb 25, 2026', title: 'February Bookkeeping Review', duration: '22 min', snippet: 'February reconciled cleanly. Discussed merchant processing timing differences.', meetingId: 'm_hist2' },
  ],
  'Greenfield Industries Inc.': [
    { date: 'Mar 18, 2026', title: 'Year-End Close Meeting', duration: '67 min', snippet: 'Full year-end close review. Multi-state apportionment, capital asset additions, and audit preparation timeline discussed.', meetingId: 'm6' },
  ],
};

export const BOT_STATS = {
  meetingsThisMonth: 6,
  tasksCreated: 11,
  notesLogged: 8,
};
