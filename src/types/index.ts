export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
}

export interface UserPermissions {
  canCreateMeetings: boolean;
  canAccessAllMeetings: boolean;
  canCreateJiraTickets: boolean;
  canCreateConfluenceDocs: boolean;
  canManageIntegrations: boolean;
  canManageUsers: boolean;
  directJiraAccess: boolean;
}

export interface IntegrationData {
  connected: boolean;
  data: any;
}

export interface Integrations {
  googleCalendar: IntegrationData;
  zoom: IntegrationData;
  jira: IntegrationData;
  confluence: IntegrationData;
}

export interface Participant {
  id: string;
  name?: string;
  avatar?: string;
  role?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: 'virtual' | 'in-person' | 'standup';
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  participants: Participant[];
  organizer: { id: string; name: string };
  project?: string;
  description?: string;
  agenda?: string;
  prepNotes?: string;
  hasNotes: boolean;
  hasRecording: boolean;
  hasTranscript: boolean;
  actionItemsCount: number;
  zoomLink?: string;
  location?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
}

export interface AppState {
  isAuthenticated: boolean;
  activeTab: string;
  isDarkMode: boolean;
  smartMode: boolean;
  currentUser: User | null;
  selectedMeeting: any;
  showMeetingDetails: boolean;
  showOngoingMeeting: boolean;
  integrations: Integrations;
}