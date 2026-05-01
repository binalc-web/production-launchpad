export type Priority = 'High' | 'Medium' | 'Low';
export type ClientStatus = 'Active' | 'Inactive' | 'Prospect';
export type EntityType = 'LLC' | 'S-Corp' | 'C-Corp' | 'Partnership' | 'Individual' | 'Trust' | 'Non-Profit';
export type ProjectStatus = 'Not Started' | 'In Progress' | 'Complete' | 'Waiting on Client';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Complete';
export type LabelColor = 'pink' | 'yellow' | 'blue' | 'green' | 'gray' | 'red';

export interface Label {
  name: string;
  color: LabelColor;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isPrimary: boolean;
}

export interface Client {
  id: string;
  name: string;
  priority: Priority;
  status: ClientStatus;
  assignee: string;
  entityType: EntityType;
  fiscalYearEnd: string;
  lastEdited: string;
  notes: string;
  contacts: Contact[];
  services: string[];
  birthdate?: string;
}

export interface Task {
  id: string;
  name: string;
  dueDate: string;
  status: TaskStatus;
  budgetedTime: string;
  checklistTotal: number;
  checklistCompleted: number;
  assignee: string;
  isNext?: boolean;
  completed?: boolean;
  description?: string;
  checklistItems?: { id: string; text: string; checked: boolean }[];
  comments?: ProjectComment[];
  // Agent task extension
  agentTask?: {
    type: 'claude-excel' | 'claude-cowork';
    skillName: string;
    state: 'scheduled' | 'running' | 'completed' | 'failed';
    scheduledDate?: string;
    completedAt?: string;
    notes?: string;
    outputFile?: string;
    failureReason?: string;
  };
}

export interface ProjectComment {
  id: string;
  author: string;
  initials: string;
  color: string;
  message: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  labels: Label[];
  dueDate: string;
  status: ProjectStatus;
  nextAssignee: string;
  assignee: string;
  teamMembers: string[];
  lastEdited: string;
  tasks: Task[];
  comments: ProjectComment[];
  seriesDescription?: string;
}

export interface TemplateTask {
  id: string;
  name: string;
  cascadingDueDate: string;
  budgetedTime: string;
  assignee: string;
  checklistCount: number;
  // Agent task extension
  agentAssignee?: {
    type: 'claude-excel' | 'claude-cowork';
    skillName: string;
  };
}

export interface Template {
  id: string;
  name: string;
  taskCount: number;
  clientCount: number;
  tasks: TemplateTask[];
  clients: string[];
}

export interface Notification {
  id: string;
  type: 'next' | 'mention' | 'due_today' | 'overdue';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  project?: string;
  task?: string;
}

export const TEAM_MEMBERS: Record<string, { initials: string; color: string; name: string; email: string }> = {
  'Sarah K.': { initials: 'SK', color: '#3B82F6', name: 'Sarah Kim', email: 'sarah.kim@firmname.com' },
  'Mike B.': { initials: 'MB', color: '#10B981', name: 'Mike Beatty', email: 'mike.beatty@firmname.com' },
  'Tom H.': { initials: 'TH', color: '#8B5CF6', name: 'Tom Hughes', email: 'tom.hughes@firmname.com' },
  'Amy L.': { initials: 'AL', color: '#F59E0B', name: 'Amy Lin', email: 'amy.lin@firmname.com' },
};

export const clients: Client[] = [
  {
    id: 'c1',
    name: 'Smith & Associates LLC',
    priority: 'High',
    status: 'Active',
    assignee: 'Sarah K.',
    entityType: 'LLC',
    fiscalYearEnd: '12/31',
    lastEdited: '2h ago',
    notes: 'Long-standing client since 2018. Prefers email communication. Primary contact is Robert Smith who is available Mon-Thu.',
    contacts: [
      { id: 'co1', name: 'Robert Smith', email: 'rsmith@smithassoc.com', phone: '(555) 210-4422', address: '482 Commerce Blvd, Suite 200, Chicago, IL 60601', isPrimary: true },
      { id: 'co2', name: 'Linda Smith', email: 'lsmith@smithassoc.com', phone: '(555) 210-4425', address: '482 Commerce Blvd, Suite 200, Chicago, IL 60601', isPrimary: false },
    ],
    services: ['Tax Preparation', 'Bookkeeping', 'Advisory'],
    birthdate: '06/15/1968',
  },
  {
    id: 'c2',
    name: 'Johnson Family Trust',
    priority: 'Medium',
    status: 'Active',
    assignee: 'Mike B.',
    entityType: 'Trust',
    fiscalYearEnd: '6/30',
    lastEdited: '1d ago',
    notes: 'Trust established 2020. Complex estate situation. Do not discuss tax liability figures over phone.',
    contacts: [
      { id: 'co3', name: 'Margaret Johnson', email: 'mjohnson@email.com', phone: '(555) 334-8812', address: '1240 Lakeshore Dr, Apt 14B, Chicago, IL 60611', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Estate Planning', 'Advisory'],
    birthdate: '03/22/1952',
  },
  {
    id: 'c3',
    name: 'Greenfield Industries Inc.',
    priority: 'High',
    status: 'Active',
    assignee: 'Sarah K.',
    entityType: 'C-Corp',
    fiscalYearEnd: '3/31',
    lastEdited: '3h ago',
    notes: 'Manufacturing client. Multi-state operations. Sales tax nexus in IL, IN, WI, OH.',
    contacts: [
      { id: 'co5', name: 'David Greenfield', email: 'david@greenfieldind.com', phone: '(555) 445-9921', address: '7800 Industrial Pkwy, Elk Grove Village, IL 60007', isPrimary: true },
      { id: 'co6', name: 'Paula Chen', email: 'pchen@greenfieldind.com', phone: '(555) 445-9930', address: '7800 Industrial Pkwy, Elk Grove Village, IL 60007', isPrimary: false },
    ],
    services: ['Audit', 'Tax Preparation', 'Payroll', 'Advisory'],
  },
  {
    id: 'c4',
    name: 'Baker Dental Group',
    priority: 'Medium',
    status: 'Active',
    assignee: 'Tom H.',
    entityType: 'S-Corp',
    fiscalYearEnd: '12/31',
    lastEdited: '2d ago',
    notes: 'Multi-location dental practice. 3 offices. Uses Quickbooks Online — access shared via LastPass.',
    contacts: [
      { id: 'co7', name: 'Dr. James Baker', email: 'jbaker@bakerdentalgroup.com', phone: '(555) 667-1234', address: '255 N. Michigan Ave, Suite 1100, Chicago, IL 60601', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Bookkeeping', 'Payroll'],
  },
  {
    id: 'c5',
    name: 'Rivera Real Estate Holdings',
    priority: 'Low',
    status: 'Active',
    assignee: 'Amy L.',
    entityType: 'LLC',
    fiscalYearEnd: '12/31',
    lastEdited: '5d ago',
    notes: 'Residential rental portfolio. 14 properties. All on Schedule E.',
    contacts: [
      { id: 'co9', name: 'Carlos Rivera', email: 'crivera@riverare.com', phone: '(555) 778-5544', address: '900 N. State St, Chicago, IL 60610', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Bookkeeping'],
  },
  {
    id: 'c6',
    name: 'Metropolitan Hospitality Group',
    priority: 'High',
    status: 'Prospect',
    assignee: 'Mike B.',
    entityType: 'C-Corp',
    fiscalYearEnd: '9/30',
    lastEdited: '1w ago',
    notes: 'Referred by Robert Smith. Owns 4 hotel properties. Currently with a Big 4 firm.',
    contacts: [
      { id: 'co10', name: 'Sandra Cho', email: 'scho@methosp.com', phone: '(555) 889-6677', address: '310 W. Superior St, Chicago, IL 60654', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Advisory'],
  },
  {
    id: 'c7',
    name: 'Chen Technology Solutions',
    priority: 'Medium',
    status: 'Active',
    assignee: 'Tom H.',
    entityType: 'S-Corp',
    fiscalYearEnd: '12/31',
    lastEdited: '3d ago',
    notes: 'Software company. R&D tax credit eligible. Need to review Section 174 changes for 2024.',
    contacts: [
      { id: 'co11', name: 'Kevin Chen', email: 'kchen@chentech.io', phone: '(555) 990-2211', address: '600 W. Chicago Ave, Suite 400, Chicago, IL 60654', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Advisory', 'R&D Tax Credit'],
  },
  {
    id: 'c8',
    name: 'Anderson Family Office',
    priority: 'Low',
    status: 'Active',
    assignee: 'Sarah K.',
    entityType: 'Trust',
    fiscalYearEnd: '12/31',
    lastEdited: '1w ago',
    notes: 'High net worth family. 3 trusts + 2 LLCs. Annual planning meeting in October.',
    contacts: [
      { id: 'co13', name: 'William Anderson III', email: 'wanderson@andersonfamily.com', phone: '(555) 112-3344', address: '1500 N. Astor St, Chicago, IL 60610', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Estate Planning', 'Advisory', 'Bookkeeping'],
  },
  {
    id: 'c9',
    name: 'Coastal Wine & Spirits',
    priority: 'Medium',
    status: 'Inactive',
    assignee: 'Amy L.',
    entityType: 'LLC',
    fiscalYearEnd: '12/31',
    lastEdited: '2w ago',
    notes: 'Retail liquor store. Inactive pending new ownership transfer.',
    contacts: [
      { id: 'co14', name: 'Teresa Marino', email: 'tmarino@coastalwine.com', phone: '(555) 223-4455', address: '4521 N. Broadway, Chicago, IL 60640', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Bookkeeping'],
  },
  {
    id: 'c10',
    name: 'Northside Medical Practice',
    priority: 'High',
    status: 'Active',
    assignee: 'Mike B.',
    entityType: 'S-Corp',
    fiscalYearEnd: '12/31',
    lastEdited: '4d ago',
    notes: 'Multi-physician practice. 8 doctors. Handles all partners\' personal returns as well.',
    contacts: [
      { id: 'co15', name: 'Dr. Patricia Walters', email: 'pwalters@northsidemedical.com', phone: '(555) 334-5566', address: '3500 N. Ravenswood Ave, Chicago, IL 60613', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Payroll', 'Advisory'],
  },
  {
    id: 'c11',
    name: 'Thornton Manufacturing',
    priority: 'Medium',
    status: 'Active',
    assignee: 'Tom H.',
    entityType: 'C-Corp',
    fiscalYearEnd: '6/30',
    lastEdited: '6d ago',
    notes: 'Steel fabrication company. Capital-intensive. Has NOL carryforward of approx $2.1M.',
    contacts: [
      { id: 'co16', name: 'Greg Thornton', email: 'gthornton@thorntonmfg.com', phone: '(555) 445-6677', address: '14500 S. Cicero Ave, Midlothian, IL 60445', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Audit', 'Bookkeeping'],
  },
  {
    id: 'c12',
    name: 'Pacific Financial Advisors',
    priority: 'Low',
    status: 'Prospect',
    assignee: 'Sarah K.',
    entityType: 'LLC',
    fiscalYearEnd: '12/31',
    lastEdited: '3w ago',
    notes: 'RIA firm. 3 partners. Looking for a new CPA after current firm merged.',
    contacts: [
      { id: 'co17', name: 'Hiroshi Tanaka', email: 'htanaka@pacificfa.com', phone: '(555) 556-7788', address: '70 W. Madison St, Suite 1400, Chicago, IL 60602', isPrimary: true },
    ],
    services: ['Tax Preparation', 'Advisory'],
  },
];

const q1TaxTasks: Task[] = [
  {
    id: 't1', name: 'Gather client documents', dueDate: 'Mar 15', status: 'Complete',
    budgetedTime: '1h', checklistTotal: 3, checklistCompleted: 3, assignee: 'Sarah K.', completed: true,
    checklistItems: [
      { id: 'ci1', text: 'W-2 forms received', checked: true },
      { id: 'ci2', text: '1099 forms received', checked: true },
      { id: 'ci3', text: 'Prior year return filed', checked: true },
    ],
    comments: [{ id: 'cm1', author: 'Sarah K.', initials: 'SK', color: '#3B82F6', message: 'All documents received from client.', timestamp: '3/16 9:14 AM' }],
  },
  {
    id: 't2', name: 'Review prior year return', dueDate: 'Mar 18', status: 'Complete',
    budgetedTime: '45m', checklistTotal: 2, checklistCompleted: 2, assignee: 'Sarah K.', completed: true,
    checklistItems: [
      { id: 'ci4', text: 'Check carryforward items', checked: true },
      { id: 'ci5', text: 'Note any open IRS items', checked: true },
    ],
  },
  {
    id: 't3', name: 'Prepare federal return', dueDate: 'Mar 25', status: 'In Progress',
    budgetedTime: '3h', checklistTotal: 4, checklistCompleted: 1, assignee: 'Sarah K.', isNext: true,
    checklistItems: [
      { id: 'ci6', text: 'Income schedule complete', checked: true },
      { id: 'ci7', text: 'Deductions schedule complete', checked: false },
      { id: 'ci8', text: 'Credits applied', checked: false },
      { id: 'ci9', text: 'Estimated tax reconciled', checked: false },
    ],
    comments: [
      { id: 'cm2', author: 'Mike B.', initials: 'MB', color: '#10B981', message: 'Still waiting on the 1099-B from Merrill Lynch. Client says it\'s been mailed.', timestamp: '3/20 2:33 PM' },
      { id: 'cm3', author: 'Sarah K.', initials: 'SK', color: '#3B82F6', message: '@Mike B. I\'ll follow up with them directly. Can you start on the state apportionment in the meantime?', timestamp: '3/20 3:15 PM' },
    ],
  },
  {
    id: 't4', name: 'Prepare state return (IL)', dueDate: 'Apr 1', status: 'Not Started',
    budgetedTime: '1.5h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Tom H.',
    checklistItems: [
      { id: 'ci10', text: 'Apportion federal income', checked: false },
      { id: 'ci11', text: 'Apply IL modifications', checked: false },
      { id: 'ci12', text: 'Compute IL estimated taxes', checked: false },
    ],
  },
  {
    id: 't5', name: 'Internal review', dueDate: 'Apr 5', status: 'Not Started',
    budgetedTime: '1h', checklistTotal: 2, checklistCompleted: 0, assignee: 'Mike B.',
    checklistItems: [
      { id: 'ci13', text: 'Senior review sign-off', checked: false },
      { id: 'ci14', text: 'Tick & tie workpapers', checked: false },
    ],
  },
  {
    id: 't6', name: 'Client approval & e-signature', dueDate: 'Apr 10', status: 'Not Started',
    budgetedTime: '30m', checklistTotal: 1, checklistCompleted: 0, assignee: 'Sarah K.',
    checklistItems: [
      { id: 'ci15', text: '8879 signed and received', checked: false },
    ],
  },
  {
    id: 't7', name: 'E-file submission', dueDate: 'Apr 12', status: 'Not Started',
    budgetedTime: '30m', checklistTotal: 2, checklistCompleted: 0, assignee: 'Sarah K.',
    checklistItems: [
      { id: 'ci16', text: 'Federal return e-filed', checked: false },
      { id: 'ci17', text: 'State return e-filed', checked: false },
    ],
  },
  {
    id: 't8', name: 'Follow-up confirmation & filing', dueDate: 'Apr 14', status: 'Not Started',
    budgetedTime: '15m', checklistTotal: 1, checklistCompleted: 0, assignee: 'Sarah K.',
    checklistItems: [
      { id: 'ci18', text: 'E-file acceptance confirmed', checked: false },
    ],
  },
];

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Q1 2024 Tax Return',
    client: 'Smith & Associates LLC',
    labels: [{ name: 'Missing Information', color: 'pink' }],
    dueDate: 'Apr 15',
    status: 'In Progress',
    nextAssignee: 'Sarah K.',
    assignee: 'Sarah K.',
    teamMembers: ['Sarah K.', 'Mike B.', 'Tom H.'],
    lastEdited: '2h ago',
    seriesDescription: 'Occurs annually, due 3rd month after fiscal year end',
    tasks: q1TaxTasks,
    comments: [
      { id: 'pc1', author: 'Mike B.', initials: 'MB', color: '#10B981', message: 'Just received the W-2s from client. Still waiting on the 1099-B from their brokerage.', timestamp: '3/20 2:33 PM' },
      { id: 'pc2', author: 'Sarah K.', initials: 'SK', color: '#3B82F6', message: '@Mike B. I\'ll follow up with them today. Can you start on the state apportionment?', timestamp: '3/20 3:15 PM' },
      { id: 'pc3', author: 'Tom H.', initials: 'TH', color: '#8B5CF6', message: 'The estimated payments for last year were $12,000 total. Added details to the workpaper.', timestamp: '3/21 10:02 AM' },
    ],
  },
  {
    id: 'p2',
    name: 'Monthly Bookkeeping — March',
    client: 'Baker Dental Group',
    labels: [{ name: 'Follow Up', color: 'yellow' }],
    dueDate: 'Mar 31',
    status: 'In Progress',
    nextAssignee: 'Tom H.',
    assignee: 'Tom H.',
    teamMembers: ['Tom H.'],
    lastEdited: '4h ago',
    seriesDescription: 'Occurs every month on last business day',
    tasks: [
      { id: 'bt1', name: 'Download bank statements', dueDate: 'Mar 28', status: 'Complete', budgetedTime: '30m', checklistTotal: 2, checklistCompleted: 2, assignee: 'Tom H.', completed: true },
      { id: 'bt2', name: 'Categorize transactions', dueDate: 'Mar 29', status: 'In Progress', budgetedTime: '2h', checklistTotal: 3, checklistCompleted: 1, assignee: 'Tom H.', isNext: true },
      { id: 'bt3', name: 'Reconcile accounts', dueDate: 'Mar 30', status: 'Not Started', budgetedTime: '1h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Tom H.' },
      { id: 'bt4', name: 'Prepare P&L and Balance Sheet', dueDate: 'Mar 31', status: 'Not Started', budgetedTime: '45m', checklistTotal: 2, checklistCompleted: 0, assignee: 'Tom H.' },
      { id: 'bt5', name: 'Send reports to client', dueDate: 'Mar 31', status: 'Not Started', budgetedTime: '15m', checklistTotal: 1, checklistCompleted: 0, assignee: 'Tom H.' },
    ],
    comments: [
      { id: 'pc4', author: 'Tom H.', initials: 'TH', color: '#8B5CF6', message: 'Client has not sent the merchant processing statements yet. Following up now.', timestamp: '3/25 11:45 AM' },
    ],
  },
  {
    id: 'p3',
    name: 'Annual Audit Preparation',
    client: 'Greenfield Industries Inc.',
    labels: [{ name: 'Client Review', color: 'blue' }],
    dueDate: 'Apr 30',
    status: 'Not Started',
    nextAssignee: 'Sarah K.',
    assignee: 'Sarah K.',
    teamMembers: ['Sarah K.', 'Amy L.'],
    lastEdited: '1d ago',
    tasks: [
      { id: 'at1', name: 'Send PBC list to client', dueDate: 'Apr 3', status: 'Not Started', budgetedTime: '30m', checklistTotal: 1, checklistCompleted: 0, assignee: 'Sarah K.', isNext: true },
      { id: 'at2', name: 'Review internal controls documentation', dueDate: 'Apr 10', status: 'Not Started', budgetedTime: '4h', checklistTotal: 4, checklistCompleted: 0, assignee: 'Sarah K.' },
      { id: 'at3', name: 'Test revenue transactions', dueDate: 'Apr 18', status: 'Not Started', budgetedTime: '6h', checklistTotal: 5, checklistCompleted: 0, assignee: 'Amy L.' },
      { id: 'at4', name: 'Test expense transactions', dueDate: 'Apr 18', status: 'Not Started', budgetedTime: '4h', checklistTotal: 4, checklistCompleted: 0, assignee: 'Amy L.' },
      { id: 'at5', name: 'Draft audit report', dueDate: 'Apr 25', status: 'Not Started', budgetedTime: '3h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Sarah K.' },
    ],
    comments: [],
  },
  {
    id: 'p4',
    name: 'Q4 Payroll Reconciliation',
    client: 'Rivera Real Estate Holdings',
    labels: [],
    dueDate: 'Mar 28',
    status: 'Complete',
    nextAssignee: 'Amy L.',
    assignee: 'Amy L.',
    teamMembers: ['Amy L.'],
    lastEdited: '3d ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p5',
    name: 'Financial Statement Review — Q1',
    client: 'Metropolitan Hospitality Group',
    labels: [{ name: 'Urgent', color: 'red' }, { name: 'Follow Up', color: 'yellow' }],
    dueDate: 'Apr 10',
    status: 'In Progress',
    nextAssignee: 'Mike B.',
    assignee: 'Mike B.',
    teamMembers: ['Mike B.', 'Sarah K.'],
    lastEdited: '30m ago',
    tasks: [
      { id: 'ft1', name: 'Obtain management representations', dueDate: 'Apr 3', status: 'In Progress', budgetedTime: '1h', checklistTotal: 2, checklistCompleted: 1, assignee: 'Mike B.', isNext: true },
      { id: 'ft2', name: 'Analytical procedures', dueDate: 'Apr 7', status: 'Not Started', budgetedTime: '3h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Mike B.' },
      { id: 'ft3', name: 'Draft review report', dueDate: 'Apr 8', status: 'Not Started', budgetedTime: '2h', checklistTotal: 2, checklistCompleted: 0, assignee: 'Sarah K.' },
    ],
    comments: [
      { id: 'pc6', author: 'Mike B.', initials: 'MB', color: '#10B981', message: 'Prospect wants financials for a loan application. Board meeting April 11 — we MUST deliver by April 10.', timestamp: '3/22 9:00 AM' },
    ],
  },
  {
    id: 'p6',
    name: 'Quarterly Tax Planning — Q2',
    client: 'Chen Technology Solutions',
    labels: [],
    dueDate: 'Apr 15',
    status: 'Not Started',
    nextAssignee: 'Tom H.',
    assignee: 'Tom H.',
    teamMembers: ['Tom H.'],
    lastEdited: '2d ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p7',
    name: 'Estate Plan Review — 2024',
    client: 'Johnson Family Trust',
    labels: [{ name: 'Missing Information', color: 'pink' }],
    dueDate: 'May 1',
    status: 'In Progress',
    nextAssignee: 'Mike B.',
    assignee: 'Mike B.',
    teamMembers: ['Mike B.', 'Sarah K.'],
    lastEdited: '1d ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p8',
    name: 'Business Valuation Report',
    client: 'Anderson Family Office',
    labels: [],
    dueDate: 'May 15',
    status: 'Not Started',
    nextAssignee: 'Mike B.',
    assignee: 'Mike B.',
    teamMembers: ['Mike B.'],
    lastEdited: '5d ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p9',
    name: 'Sales Tax Return — Q1',
    client: 'Coastal Wine & Spirits',
    labels: [{ name: 'On Hold', color: 'gray' }],
    dueDate: 'Apr 20',
    status: 'Not Started',
    nextAssignee: 'Amy L.',
    assignee: 'Amy L.',
    teamMembers: ['Amy L.'],
    lastEdited: '1w ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p10',
    name: 'Workers Comp Audit Support',
    client: 'Northside Medical Practice',
    labels: [{ name: 'Follow Up', color: 'yellow' }],
    dueDate: 'Mar 30',
    status: 'In Progress',
    nextAssignee: 'Mike B.',
    assignee: 'Mike B.',
    teamMembers: ['Mike B.'],
    lastEdited: '6h ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p11',
    name: '1099 Preparation',
    client: 'Thornton Manufacturing',
    labels: [],
    dueDate: 'Mar 31',
    status: 'Complete',
    nextAssignee: 'Tom H.',
    assignee: 'Tom H.',
    teamMembers: ['Tom H.'],
    lastEdited: '4d ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p12',
    name: 'S-Corp Election Filing',
    client: 'Chen Technology Solutions',
    labels: [{ name: 'Urgent', color: 'red' }],
    dueDate: 'Apr 1',
    status: 'In Progress',
    nextAssignee: 'Sarah K.',
    assignee: 'Sarah K.',
    teamMembers: ['Sarah K.'],
    lastEdited: '1h ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p13',
    name: 'Partnership Tax Return',
    client: 'Smith & Associates LLC',
    labels: [],
    dueDate: 'Apr 15',
    status: 'Not Started',
    nextAssignee: 'Tom H.',
    assignee: 'Tom H.',
    teamMembers: ['Tom H.', 'Amy L.'],
    lastEdited: '3d ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p14',
    name: 'IRS Notice CP2000 Response',
    client: 'Baker Dental Group',
    labels: [{ name: 'Urgent', color: 'red' }, { name: 'Missing Information', color: 'pink' }],
    dueDate: 'Mar 25',
    status: 'In Progress',
    nextAssignee: 'Mike B.',
    assignee: 'Mike B.',
    teamMembers: ['Mike B.', 'Sarah K.'],
    lastEdited: '45m ago',
    tasks: [],
    comments: [],
  },
  {
    id: 'p15',
    name: 'Franchise Tax Filing — IL',
    client: 'Greenfield Industries Inc.',
    labels: [],
    dueDate: 'May 15',
    status: 'Not Started',
    nextAssignee: 'Amy L.',
    assignee: 'Amy L.',
    teamMembers: ['Amy L.'],
    lastEdited: '1w ago',
    tasks: [],
    comments: [],
  },
];

export const templates: Template[] = [
  {
    id: 'tmpl1',
    name: 'Individual Tax Return (1040)',
    taskCount: 8,
    clientCount: 34,
    clients: ['Smith & Associates LLC', 'Johnson Family Trust', 'Anderson Family Office', 'Pacific Financial Advisors'],
    tasks: [
      { id: 'tt1', name: 'Send tax organizer to client', cascadingDueDate: '60 days before deadline', budgetedTime: '15m', assignee: 'Sarah K.', checklistCount: 1 },
      { id: 'tt2', name: 'Gather & review client documents', cascadingDueDate: '30 days before deadline', budgetedTime: '1h', assignee: 'Sarah K.', checklistCount: 5 },
      { id: 'tt3', name: 'Prepare federal return', cascadingDueDate: '14 days before deadline', budgetedTime: '3h', assignee: 'Sarah K.', checklistCount: 6 },
      { id: 'tt4', name: 'Prepare state return', cascadingDueDate: '12 days before deadline', budgetedTime: '1.5h', assignee: 'Tom H.', checklistCount: 3 },
      { id: 'tt5', name: 'Internal review', cascadingDueDate: '8 days before deadline', budgetedTime: '1h', assignee: 'Mike B.', checklistCount: 2 },
      { id: 'tt6', name: 'Client approval / e-signature', cascadingDueDate: '5 days before deadline', budgetedTime: '30m', assignee: 'Sarah K.', checklistCount: 1 },
      { id: 'tt7', name: 'E-file submission', cascadingDueDate: '2 days before deadline', budgetedTime: '30m', assignee: 'Sarah K.', checklistCount: 2 },
      { id: 'tt8', name: 'Confirm e-file acceptance', cascadingDueDate: 'On deadline', budgetedTime: '15m', assignee: 'Sarah K.', checklistCount: 1 },
    ],
  },
  {
    id: 'tmpl2',
    name: 'Monthly Bookkeeping',
    taskCount: 5,
    clientCount: 12,
    clients: ['Baker Dental Group', 'Rivera Real Estate Holdings', 'Coastal Wine & Spirits'],
    tasks: [
      { id: 'tt9', name: 'Download bank & credit card statements', cascadingDueDate: '3 days after month end', budgetedTime: '30m', assignee: 'Tom H.', checklistCount: 2 },
      { id: 'tt10', name: 'Categorize transactions in QBO', cascadingDueDate: '5 days after month end', budgetedTime: '2h', assignee: 'Tom H.', checklistCount: 3 },
      { id: 'tt11', name: 'Bank reconciliation', cascadingDueDate: '6 days after month end', budgetedTime: '1h', assignee: 'Tom H.', checklistCount: 3 },
      { id: 'tt12', name: 'Prepare financial reports', cascadingDueDate: '8 days after month end', budgetedTime: '45m', assignee: 'Tom H.', checklistCount: 2 },
      { id: 'tt13', name: 'Send reports to client', cascadingDueDate: '10 days after month end', budgetedTime: '15m', assignee: 'Tom H.', checklistCount: 1 },
    ],
  },
  {
    id: 'tmpl3',
    name: 'Corporate Tax Return (1120-S)',
    taskCount: 9,
    clientCount: 8,
    clients: ['Baker Dental Group', 'Chen Technology Solutions', 'Northside Medical Practice'],
    tasks: [
      { id: 'tt14', name: 'Request trial balance & supporting docs', cascadingDueDate: '45 days before deadline', budgetedTime: '30m', assignee: 'Sarah K.', checklistCount: 3 },
      { id: 'tt15', name: 'Review books & make adjusting entries', cascadingDueDate: '30 days before deadline', budgetedTime: '3h', assignee: 'Sarah K.', checklistCount: 4 },
      { id: 'tt16', name: 'Prepare federal corporate return', cascadingDueDate: '21 days before deadline', budgetedTime: '4h', assignee: 'Sarah K.', checklistCount: 6 },
      { id: 'tt17', name: 'Prepare state return', cascadingDueDate: '18 days before deadline', budgetedTime: '2h', assignee: 'Tom H.', checklistCount: 3 },
      { id: 'tt18', name: 'Prepare K-1s for shareholders', cascadingDueDate: '14 days before deadline', budgetedTime: '1h', assignee: 'Amy L.', checklistCount: 2 },
      { id: 'tt19', name: 'Internal review', cascadingDueDate: '10 days before deadline', budgetedTime: '1.5h', assignee: 'Mike B.', checklistCount: 2 },
      { id: 'tt20', name: 'Client approval', cascadingDueDate: '6 days before deadline', budgetedTime: '30m', assignee: 'Sarah K.', checklistCount: 1 },
      { id: 'tt21', name: 'E-file submission', cascadingDueDate: '2 days before deadline', budgetedTime: '30m', assignee: 'Sarah K.', checklistCount: 2 },
      { id: 'tt22', name: 'Confirm e-file acceptance', cascadingDueDate: 'On deadline', budgetedTime: '15m', assignee: 'Sarah K.', checklistCount: 1 },
    ],
  },
  {
    id: 'tmpl4',
    name: 'Quarterly Financial Review',
    taskCount: 6,
    clientCount: 5,
    clients: ['Metropolitan Hospitality Group', 'Greenfield Industries Inc.'],
    tasks: [
      { id: 'tt23', name: 'Obtain trial balance', cascadingDueDate: '15 days after quarter end', budgetedTime: '30m', assignee: 'Amy L.', checklistCount: 2 },
      { id: 'tt24', name: 'Perform analytical procedures', cascadingDueDate: '20 days after quarter end', budgetedTime: '3h', assignee: 'Mike B.', checklistCount: 4 },
      { id: 'tt25', name: 'Obtain management representations', cascadingDueDate: '22 days after quarter end', budgetedTime: '1h', assignee: 'Mike B.', checklistCount: 2 },
      { id: 'tt26', name: 'Draft review report', cascadingDueDate: '25 days after quarter end', budgetedTime: '2h', assignee: 'Sarah K.', checklistCount: 3 },
      { id: 'tt27', name: 'Partner review & sign-off', cascadingDueDate: '28 days after quarter end', budgetedTime: '1h', assignee: 'Mike B.', checklistCount: 1 },
      { id: 'tt28', name: 'Deliver report to client', cascadingDueDate: '30 days after quarter end', budgetedTime: '15m', assignee: 'Sarah K.', checklistCount: 1 },
    ],
  },
  {
    id: 'tmpl5',
    name: 'Payroll Processing (Biweekly)',
    taskCount: 4,
    clientCount: 6,
    clients: ['Baker Dental Group', 'Northside Medical Practice'],
    tasks: [
      { id: 'tt29', name: 'Collect timesheets & changes', cascadingDueDate: '3 days before pay date', budgetedTime: '30m', assignee: 'Amy L.', checklistCount: 2 },
      { id: 'tt30', name: 'Process payroll in system', cascadingDueDate: '2 days before pay date', budgetedTime: '1h', assignee: 'Amy L.', checklistCount: 3 },
      { id: 'tt31', name: 'Review payroll register', cascadingDueDate: '2 days before pay date', budgetedTime: '30m', assignee: 'Tom H.', checklistCount: 2 },
      { id: 'tt32', name: 'Submit & confirm deposit', cascadingDueDate: '1 day before pay date', budgetedTime: '15m', assignee: 'Amy L.', checklistCount: 1 },
    ],
  },
  {
    id: 'tmpl6',
    name: 'Annual Audit',
    taskCount: 12,
    clientCount: 3,
    clients: ['Greenfield Industries Inc.', 'Thornton Manufacturing'],
    tasks: [
      { id: 'tt33', name: 'Send engagement letter', cascadingDueDate: '90 days before deadline', budgetedTime: '30m', assignee: 'Mike B.', checklistCount: 1 },
      { id: 'tt34', name: 'Send PBC request list', cascadingDueDate: '60 days before deadline', budgetedTime: '30m', assignee: 'Sarah K.', checklistCount: 2 },
      { id: 'tt35', name: 'Planning & risk assessment', cascadingDueDate: '45 days before deadline', budgetedTime: '4h', assignee: 'Mike B.', checklistCount: 5 },
      { id: 'tt36', name: 'Test internal controls', cascadingDueDate: '35 days before deadline', budgetedTime: '8h', assignee: 'Amy L.', checklistCount: 8 },
      { id: 'tt37', name: 'Substantive testing — revenue', cascadingDueDate: '25 days before deadline', budgetedTime: '6h', assignee: 'Amy L.', checklistCount: 6 },
      { id: 'tt38', name: 'Substantive testing — expenses', cascadingDueDate: '22 days before deadline', budgetedTime: '5h', assignee: 'Tom H.', checklistCount: 5 },
      { id: 'tt39', name: 'Inventory observation', cascadingDueDate: '20 days before deadline', budgetedTime: '4h', assignee: 'Amy L.', checklistCount: 3 },
      { id: 'tt40', name: 'Wrap-up & review open items', cascadingDueDate: '15 days before deadline', budgetedTime: '2h', assignee: 'Mike B.', checklistCount: 4 },
      { id: 'tt41', name: 'Draft financial statements', cascadingDueDate: '12 days before deadline', budgetedTime: '4h', assignee: 'Sarah K.', checklistCount: 5 },
      { id: 'tt42', name: 'Draft audit report', cascadingDueDate: '10 days before deadline', budgetedTime: '2h', assignee: 'Mike B.', checklistCount: 3 },
      { id: 'tt43', name: 'Partner review', cascadingDueDate: '7 days before deadline', budgetedTime: '2h', assignee: 'Mike B.', checklistCount: 2 },
      { id: 'tt44', name: 'Issue final report', cascadingDueDate: 'On deadline', budgetedTime: '30m', assignee: 'Mike B.', checklistCount: 1 },
    ],
  },
];

export const allTasks: (Task & { project: string; client: string })[] = [
  { id: 'at1', name: 'Prepare federal return', dueDate: 'Mar 25', status: 'In Progress', budgetedTime: '3h', checklistTotal: 4, checklistCompleted: 1, assignee: 'Sarah K.', project: 'Q1 2024 Tax Return', client: 'Smith & Associates LLC', isNext: true },
  { id: 'at2', name: 'IRS CP2000 — draft response letter', dueDate: 'Mar 25', status: 'In Progress', budgetedTime: '2h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Mike B.', project: 'IRS Notice CP2000 Response', client: 'Baker Dental Group', isNext: true },
  { id: 'at3', name: 'Workers comp — compile payroll summary', dueDate: 'Mar 28', status: 'In Progress', budgetedTime: '1.5h', checklistTotal: 2, checklistCompleted: 1, assignee: 'Mike B.', project: 'Workers Comp Audit Support', client: 'Northside Medical Practice' },
  { id: 'at4', name: 'Categorize transactions in QBO', dueDate: 'Mar 29', status: 'In Progress', budgetedTime: '2h', checklistTotal: 3, checklistCompleted: 1, assignee: 'Tom H.', project: 'Monthly Bookkeeping — March', client: 'Baker Dental Group', isNext: true },
  { id: 'at5', name: 'Bank reconciliation', dueDate: 'Mar 30', status: 'Not Started', budgetedTime: '1h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Tom H.', project: 'Monthly Bookkeeping — March', client: 'Baker Dental Group' },
  { id: 'at6', name: 'S-Corp election — draft Form 2553', dueDate: 'Mar 31', status: 'In Progress', budgetedTime: '1h', checklistTotal: 2, checklistCompleted: 1, assignee: 'Sarah K.', project: 'S-Corp Election Filing', client: 'Chen Technology Solutions', isNext: true },
  { id: 'at7', name: 'Obtain management representations', dueDate: 'Apr 3', status: 'In Progress', budgetedTime: '1h', checklistTotal: 2, checklistCompleted: 1, assignee: 'Mike B.', project: 'Financial Statement Review — Q1', client: 'Metropolitan Hospitality Group', isNext: true },
  { id: 'at8', name: 'Send PBC list to Greenfield', dueDate: 'Apr 3', status: 'Not Started', budgetedTime: '30m', checklistTotal: 1, checklistCompleted: 0, assignee: 'Sarah K.', project: 'Annual Audit Preparation', client: 'Greenfield Industries Inc.' },
  { id: 'at9', name: 'Prepare state return (IL)', dueDate: 'Apr 1', status: 'Not Started', budgetedTime: '1.5h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Tom H.', project: 'Q1 2024 Tax Return', client: 'Smith & Associates LLC' },
  { id: 'at10', name: 'Internal review — Q1 Tax', dueDate: 'Apr 5', status: 'Not Started', budgetedTime: '1h', checklistTotal: 2, checklistCompleted: 0, assignee: 'Mike B.', project: 'Q1 2024 Tax Return', client: 'Smith & Associates LLC' },
  { id: 'at11', name: 'Analytical procedures', dueDate: 'Apr 7', status: 'Not Started', budgetedTime: '3h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Mike B.', project: 'Financial Statement Review — Q1', client: 'Metropolitan Hospitality Group' },
  { id: 'at12', name: 'Draft review report', dueDate: 'Apr 8', status: 'Not Started', budgetedTime: '2h', checklistTotal: 2, checklistCompleted: 0, assignee: 'Sarah K.', project: 'Financial Statement Review — Q1', client: 'Metropolitan Hospitality Group' },
  { id: 'at13', name: 'Client approval & e-signature', dueDate: 'Apr 10', status: 'Not Started', budgetedTime: '30m', checklistTotal: 1, checklistCompleted: 0, assignee: 'Sarah K.', project: 'Q1 2024 Tax Return', client: 'Smith & Associates LLC' },
  { id: 'at14', name: 'Obtain estate docs from client', dueDate: 'Apr 12', status: 'In Progress', budgetedTime: '1h', checklistTotal: 3, checklistCompleted: 1, assignee: 'Mike B.', project: 'Estate Plan Review — 2024', client: 'Johnson Family Trust' },
  { id: 'at15', name: 'E-file submission', dueDate: 'Apr 12', status: 'Not Started', budgetedTime: '30m', checklistTotal: 2, checklistCompleted: 0, assignee: 'Sarah K.', project: 'Q1 2024 Tax Return', client: 'Smith & Associates LLC' },
  { id: 'at16', name: 'Quarterly tax projections — K. Chen', dueDate: 'Apr 15', status: 'Not Started', budgetedTime: '2h', checklistTotal: 2, checklistCompleted: 0, assignee: 'Tom H.', project: 'Quarterly Tax Planning — Q2', client: 'Chen Technology Solutions' },
  { id: 'at17', name: 'Partnership return — K-1 prep', dueDate: 'Apr 15', status: 'Not Started', budgetedTime: '2h', checklistTotal: 3, checklistCompleted: 0, assignee: 'Amy L.', project: 'Partnership Tax Return', client: 'Smith & Associates LLC' },
  { id: 'at18', name: 'Sales tax nexus analysis', dueDate: 'Apr 18', status: 'Not Started', budgetedTime: '2h', checklistTotal: 2, checklistCompleted: 0, assignee: 'Amy L.', project: 'Sales Tax Return — Q1', client: 'Coastal Wine & Spirits' },
  { id: 'at19', name: 'Sales tax return filing', dueDate: 'Apr 20', status: 'Not Started', budgetedTime: '1h', checklistTotal: 2, checklistCompleted: 0, assignee: 'Amy L.', project: 'Sales Tax Return — Q1', client: 'Coastal Wine & Spirits' },
  { id: 'at20', name: 'Business valuation — engagement scope', dueDate: 'Apr 22', status: 'Not Started', budgetedTime: '1h', checklistTotal: 1, checklistCompleted: 0, assignee: 'Mike B.', project: 'Business Valuation Report', client: 'Anderson Family Office' },
];

export const notifications: Notification[] = [
  { id: 'n1', type: 'next', title: 'Task is next in workflow', description: '"Prepare federal return" is the next task in Q1 2024 Tax Return for Smith & Associates.', timestamp: '2h ago', read: false, project: 'Q1 2024 Tax Return', task: 'Prepare federal return' },
  { id: 'n2', type: 'mention', title: 'Mike B. mentioned you', description: '"@Sarah K. I\'ll follow up with them today. Can you start on the state apportionment?"', timestamp: '3h ago', read: false, project: 'Q1 2024 Tax Return' },
  { id: 'n3', type: 'due_today', title: 'Task due today', description: '"IRS CP2000 — draft response letter" for Baker Dental Group is due today.', timestamp: '6h ago', read: false, task: 'IRS CP2000 — draft response letter' },
  { id: 'n4', type: 'overdue', title: 'Task overdue', description: '"Workers comp — compile payroll summary" for Northside Medical was due Mar 26.', timestamp: '1d ago', read: true, task: 'Workers comp — compile payroll summary' },
  { id: 'n5', type: 'next', title: 'Task is next in workflow', description: '"Categorize transactions in QBO" is the next task in Monthly Bookkeeping for Baker Dental.', timestamp: '1d ago', read: true, project: 'Monthly Bookkeeping — March' },
  { id: 'n6', type: 'mention', title: 'Tom H. mentioned you', description: '"@Sarah K. check the apportionment on Greenfield — I think the OH nexus changed this year."', timestamp: '2d ago', read: true },
  { id: 'n7', type: 'due_today', title: 'Task due today', description: '"S-Corp election — draft Form 2553" for Chen Technology Solutions is due today.', timestamp: '3d ago', read: true, task: 'S-Corp election — draft Form 2553' },
  { id: 'n8', type: 'next', title: 'Task is next in workflow', description: '"Send PBC list to Greenfield" is the next task in Annual Audit Preparation.', timestamp: '3d ago', read: true, project: 'Annual Audit Preparation' },
];

export const planningData = {
  weeks: ['Mar 24–28', 'Mar 31–Apr 4', 'Apr 7–11', 'Apr 14–18', 'Apr 21–25'],
  currentWeekIndex: 1,
  teamRows: [
    {
      member: 'Sarah K.',
      hours: ['12h 30m', '18h 45m', '14h 20m', '16h 0m', '8h 30m'],
      tasks: [
        ['Gather docs — Smith', 'Prepare federal — Smith'],
        ['S-Corp election — Chen', 'Federal return — Smith', 'Draft review — Metro'],
        ['Internal review — Smith', 'Client approval — Smith', 'PBC list — Greenfield'],
        ['E-file — Smith', 'Review controls — Greenfield', 'Estate docs — Johnson'],
        ['Partnership K-1s — Smith'],
      ],
    },
    {
      member: 'Mike B.',
      hours: ['9h 50m', '14h 20m', '11h 30m', '8h 0m', '12h 15m'],
      tasks: [
        ['CP2000 response — Baker', 'Mgmt reps — Metro'],
        ['Workers comp — Northside', 'Analytical — Metro', 'Internal review — Smith'],
        ['Draft report — Metro', 'Estate plan — Johnson'],
        ['Business valuation scope — Anderson'],
        ['Business valuation report — Anderson'],
      ],
    },
    {
      member: 'Tom H.',
      hours: ['14h 0m', '10h 15m', '9h 0m', '13h 45m', '6h 0m'],
      tasks: [
        ['Categorize txn — Baker', 'Bank recon — Baker', 'State return — Smith'],
        ['Financial reports — Baker', 'Send reports — Baker', 'Quarterly planning — Chen'],
        ['K-1 prep — Chen'],
        ['Partnership return — Smith', 'Test expenses — Greenfield'],
        ['Franchise tax — Greenfield'],
      ],
    },
    {
      member: 'Amy L.',
      hours: ['6h 0m', '7h 30m', '12h 45m', '10h 30m', '14h 20m'],
      tasks: [
        ['Payroll — Baker', 'Payroll — Northside'],
        ['Partnership K-1s — Smith', 'Sales tax nexus — Coastal'],
        ['Test revenue — Greenfield', 'Test expenses — Greenfield'],
        ['Sales tax filing — Coastal', 'Inventory obs — Greenfield'],
        ['Franchise tax — Greenfield'],
      ],
    },
  ],
};