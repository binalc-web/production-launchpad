export type AgentType = 'claude-excel' | 'claude-cowork';
export type AgentRunStatus = 'Completed' | 'Failed' | 'Running' | 'Scheduled' | 'Pending';
export type AgentTaskState = 'scheduled' | 'running' | 'completed' | 'failed';
export type DataSource = 'OneDrive' | 'Google Drive' | 'Manual Upload';

export interface AgentConfig {
  id: string;
  clientId: string;
  taskName: string;
  templateName: string;
  agentType: AgentType;
  skillName: string;
  dataSource: DataSource;
  filePath: string;
  newTabName: string;
  status: 'Configured' | 'Not Configured' | 'Error';
}

export interface AgentRun {
  id: string;
  clientId: string;
  clientName: string;
  taskName: string;
  templateName: string;
  agentType: AgentType;
  skillName: string;
  status: AgentRunStatus;
  date: string;
  time: string;
  duration: string;
  outputFile?: string;
  notes?: string;
  failureReason?: string;
}

export interface MorningDigestClient {
  clientName: string;
  clientId: string;
  taskName: string;
  agentType: AgentType;
  fileReady: boolean;
  fileLink?: string;
}

export interface AgentScheduledTask {
  id: string;
  clientName: string;
  taskName: string;
  agentType: AgentType;
  dueDate: string;
  status: AgentRunStatus;
  weekIndex: number; // which week in the planning view (0-4)
}

// Agent configurations per client
export const agentConfigs: AgentConfig[] = [
  {
    id: 'ac1',
    clientId: 'c4',
    taskName: 'Transaction Analysis',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    dataSource: 'OneDrive',
    filePath: '/Clients/Baker Dental/2026/Bookkeeping.xlsx',
    newTabName: 'April 2026 — Transaction Analysis',
    status: 'Configured',
  },
  {
    id: 'ac2',
    clientId: 'c4',
    taskName: 'Bank Reconciliation',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Bank Reconciliation',
    dataSource: 'OneDrive',
    filePath: '/Clients/Baker Dental/2026/Bookkeeping.xlsx',
    newTabName: 'April 2026 — Bank Recon',
    status: 'Configured',
  },
  {
    id: 'ac3',
    clientId: 'c5',
    taskName: 'Transaction Analysis',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    dataSource: 'Google Drive',
    filePath: '/Clients/Rivera RE/2026/April-Bookkeeping.xlsx',
    newTabName: 'April 2026 — Transaction Analysis',
    status: 'Configured',
  },
  {
    id: 'ac4',
    clientId: 'c9',
    taskName: 'Transaction Analysis',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    dataSource: 'OneDrive',
    filePath: '/Clients/Coastal Wine/2026/Bookkeeping.xlsx',
    newTabName: 'April 2026 — Transaction Analysis',
    status: 'Not Configured',
  },
  {
    id: 'ac5',
    clientId: 'c1',
    taskName: 'Payroll Summary',
    templateName: 'Payroll Processing',
    agentType: 'claude-cowork',
    skillName: 'Payroll Summary',
    dataSource: 'OneDrive',
    filePath: '/Clients/Smith/2026/Payroll.xlsx',
    newTabName: 'April 2026 — Payroll Summary',
    status: 'Error',
  },
];

// Agent run history (recent runs across all clients)
export const agentRuns: AgentRun[] = [
  {
    id: 'run1',
    clientId: 'c4',
    clientName: 'Baker Dental Group',
    taskName: 'Transaction Analysis — March',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    status: 'Completed',
    date: 'Apr 1, 2026',
    time: '9:42 AM',
    duration: '4m 12s',
    outputFile: '/Clients/Baker Dental/2026/Bookkeeping.xlsx',
    notes: 'Analyzed 847 transactions across 3 accounts. Categorized into 12 expense types. Flagged 4 items for manual review. Output written to tab \'March 2026 — Transaction Analysis\'.',
  },
  {
    id: 'run2',
    clientId: 'c4',
    clientName: 'Baker Dental Group',
    taskName: 'Bank Reconciliation — March',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Bank Reconciliation',
    status: 'Completed',
    date: 'Apr 1, 2026',
    time: '9:51 AM',
    duration: '2m 48s',
    outputFile: '/Clients/Baker Dental/2026/Bookkeeping.xlsx',
    notes: 'Reconciled 3 bank accounts. All balances matched. No discrepancies found.',
  },
  {
    id: 'run3',
    clientId: 'c5',
    clientName: 'Rivera Real Estate Holdings',
    taskName: 'Transaction Analysis — March',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    status: 'Completed',
    date: 'Mar 31, 2026',
    time: '8:15 AM',
    duration: '3m 22s',
    outputFile: '/Clients/Rivera RE/2026/April-Bookkeeping.xlsx',
    notes: 'Analyzed 312 transactions across 2 accounts. Categorized into 8 expense types. Output written to \'March 2026 — Transaction Analysis\'.',
  },
  {
    id: 'run4',
    clientId: 'c1',
    clientName: 'Smith & Associates LLC',
    taskName: 'Payroll Summary — Q1',
    templateName: 'Payroll Processing',
    agentType: 'claude-cowork',
    skillName: 'Payroll Summary',
    status: 'Failed',
    date: 'Mar 28, 2026',
    time: '10:00 AM',
    duration: '0m 43s',
    failureReason: 'File at /Clients/Smith/2026/Payroll.xlsx could not be located. Check file path or upload correct file.',
  },
  {
    id: 'run5',
    clientId: 'c4',
    clientName: 'Baker Dental Group',
    taskName: 'Transaction Analysis — February',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    status: 'Completed',
    date: 'Mar 3, 2026',
    time: '9:30 AM',
    duration: '4m 05s',
    outputFile: '/Clients/Baker Dental/2026/Bookkeeping.xlsx',
    notes: 'Analyzed 791 transactions. Categorized into 11 expense types. Flagged 2 items for manual review.',
  },
  {
    id: 'run6',
    clientId: 'c4',
    clientName: 'Baker Dental Group',
    taskName: 'Transaction Analysis — April',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    status: 'Running',
    date: 'Apr 1, 2026',
    time: '11:08 AM',
    duration: '—',
    notes: 'Started 2 min ago',
  },
  {
    id: 'run7',
    clientId: 'c9',
    clientName: 'Coastal Wine & Spirits',
    taskName: 'Transaction Analysis — March',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    status: 'Scheduled',
    date: 'Apr 5, 2026',
    time: '—',
    duration: '—',
  },
  {
    id: 'run8',
    clientId: 'c5',
    clientName: 'Rivera Real Estate Holdings',
    taskName: 'Transaction Analysis — April',
    templateName: 'Monthly Bookkeeping',
    agentType: 'claude-excel',
    skillName: 'Transaction Analysis',
    status: 'Scheduled',
    date: 'May 3, 2026',
    time: '—',
    duration: '—',
  },
];

// Morning digest data
export const morningDigest: MorningDigestClient[] = [
  { clientName: 'Baker Dental Group', clientId: 'c4', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', fileReady: true, fileLink: '#' },
  { clientName: 'Rivera Real Estate Holdings', clientId: 'c5', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', fileReady: true, fileLink: '#' },
  { clientName: 'Johnson Family Trust', clientId: 'c2', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', fileReady: true, fileLink: '#' },
  { clientName: 'Greenfield Industries Inc.', clientId: 'c3', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', fileReady: true, fileLink: '#' },
  { clientName: 'Northside Medical Practice', clientId: 'c10', taskName: 'Bank Reconciliation — April', agentType: 'claude-excel', fileReady: true, fileLink: '#' },
  { clientName: 'Thornton Manufacturing', clientId: 'c11', taskName: 'Bank Reconciliation — April', agentType: 'claude-excel', fileReady: false },
  { clientName: 'Baker Dental Group', clientId: 'c4', taskName: 'Payroll Summary — April', agentType: 'claude-cowork', fileReady: true, fileLink: '#' },
  { clientName: 'Smith & Associates LLC', clientId: 'c1', taskName: 'Payroll Summary — Q1', agentType: 'claude-cowork', fileReady: false },
];

// Agent-assigned tasks for planning view (per week, 0-indexed)
export const agentScheduledTasks: AgentScheduledTask[] = [
  // Week 0: Mar 24–28
  { id: 'ast1', clientName: 'Baker Dental Group', taskName: 'Transaction Analysis — March', agentType: 'claude-excel', dueDate: 'Mar 28', status: 'Completed', weekIndex: 0 },
  { id: 'ast2', clientName: 'Rivera Real Estate Holdings', taskName: 'Transaction Analysis — March', agentType: 'claude-excel', dueDate: 'Mar 27', status: 'Completed', weekIndex: 0 },
  { id: 'ast3', clientName: 'Johnson Family Trust', taskName: 'Transaction Analysis — March', agentType: 'claude-excel', dueDate: 'Mar 28', status: 'Completed', weekIndex: 0 },
  { id: 'ast4', clientName: 'Northside Medical Practice', taskName: 'Bank Reconciliation — March', agentType: 'claude-excel', dueDate: 'Mar 27', status: 'Completed', weekIndex: 0 },
  // Week 1: Mar 31–Apr 4
  { id: 'ast5', clientName: 'Baker Dental Group', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', dueDate: 'Apr 1', status: 'Running', weekIndex: 1 },
  { id: 'ast6', clientName: 'Baker Dental Group', taskName: 'Bank Reconciliation — April', agentType: 'claude-excel', dueDate: 'Apr 2', status: 'Scheduled', weekIndex: 1 },
  { id: 'ast7', clientName: 'Smith & Associates LLC', taskName: 'Payroll Summary — Q1', agentType: 'claude-cowork', dueDate: 'Apr 1', status: 'Failed', weekIndex: 1 },
  { id: 'ast8', clientName: 'Greenfield Industries Inc.', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', dueDate: 'Apr 3', status: 'Scheduled', weekIndex: 1 },
  { id: 'ast9', clientName: 'Northside Medical Practice', taskName: 'Bank Reconciliation — April', agentType: 'claude-excel', dueDate: 'Apr 2', status: 'Scheduled', weekIndex: 1 },
  { id: 'ast10', clientName: 'Thornton Manufacturing', taskName: 'Bank Reconciliation — April', agentType: 'claude-excel', dueDate: 'Apr 2', status: 'Scheduled', weekIndex: 1 },
  // Week 2: Apr 7–11
  { id: 'ast11', clientName: 'Rivera Real Estate Holdings', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', dueDate: 'Apr 7', status: 'Scheduled', weekIndex: 2 },
  { id: 'ast12', clientName: 'Chen Technology Solutions', taskName: 'Payroll Summary', agentType: 'claude-cowork', dueDate: 'Apr 8', status: 'Scheduled', weekIndex: 2 },
  { id: 'ast13', clientName: 'Baker Dental Group', taskName: 'Payroll Summary — April', agentType: 'claude-cowork', dueDate: 'Apr 8', status: 'Scheduled', weekIndex: 2 },
  { id: 'ast14', clientName: 'Coastal Wine & Spirits', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', dueDate: 'Apr 10', status: 'Scheduled', weekIndex: 2 },
  // Week 3: Apr 14–18
  { id: 'ast15', clientName: 'Anderson Family Office', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', dueDate: 'Apr 15', status: 'Scheduled', weekIndex: 3 },
  { id: 'ast16', clientName: 'Johnson Family Trust', taskName: 'Transaction Analysis — April', agentType: 'claude-excel', dueDate: 'Apr 15', status: 'Scheduled', weekIndex: 3 },
  { id: 'ast17', clientName: 'Metropolitan Hospitality Group', taskName: 'Transaction Analysis — Q1', agentType: 'claude-excel', dueDate: 'Apr 17', status: 'Scheduled', weekIndex: 3 },
  // Week 4: Apr 21–25
  { id: 'ast18', clientName: 'Northside Medical Practice', taskName: 'Payroll Summary — April', agentType: 'claude-cowork', dueDate: 'Apr 22', status: 'Scheduled', weekIndex: 4 },
  { id: 'ast19', clientName: 'Baker Dental Group', taskName: 'Transaction Analysis — May Preview', agentType: 'claude-excel', dueDate: 'Apr 24', status: 'Scheduled', weekIndex: 4 },
  { id: 'ast20', clientName: 'Greenfield Industries Inc.', taskName: 'Transaction Analysis — Q2', agentType: 'claude-excel', dueDate: 'Apr 25', status: 'Scheduled', weekIndex: 4 },
];

export const AGENT_LABELS: Record<AgentType, { label: string; color: string; bg: string }> = {
  'claude-excel': { label: 'Claude Excel', color: '#4F46E5', bg: '#EEF2FF' },
  'claude-cowork': { label: 'Claude Cowork', color: '#7C3AED', bg: '#F5F3FF' },
};
