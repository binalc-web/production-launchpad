import { useState, useEffect } from 'react';
import { User, Integrations, UserPermissions, Meeting } from '../types';
import { ROLE_PERMISSIONS } from '../constants/rolePermissions';

export function useAppState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [smartMode, setSmartMode] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [showOngoingMeeting, setShowOngoingMeeting] = useState(false);
  const [followUpMeetingData, setFollowUpMeetingData] = useState<any>(null);
  
  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // Integration states
  const [integrations, setIntegrations] = useState<Integrations>({
    googleCalendar: { connected: true, data: null }, // Default connected for demo
    zoom: { connected: false, data: null },
    jira: { connected: false, data: null },
    confluence: { connected: false, data: null }
  });

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark';
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);

    // Check for saved auth state
    const savedAuth = localStorage.getItem('meetingTracker_auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setCurrentUser(authData.user);
      setIsAuthenticated(true);
    }

    // Load integration states from localStorage
    const savedIntegrations = localStorage.getItem('integrations');
    if (savedIntegrations) {
      setIntegrations(JSON.parse(savedIntegrations));
    }

    // Load smart mode preference
    const savedSmartMode = localStorage.getItem('smartMode');
    if (savedSmartMode !== null) {
      setSmartMode(JSON.parse(savedSmartMode));
    }

    // Load meetings from localStorage
    const savedMeetings = localStorage.getItem('meetings');
    if (savedMeetings) {
      setMeetings(JSON.parse(savedMeetings));
    } else {
      // Initialize with default meetings for demo
      const defaultMeetings: Meeting[] = [
        {
          id: '1',
          title: 'Team Standup',
          date: '2025-01-25',
          time: '09:00',
          duration: 30,
          type: 'standup',
          status: 'upcoming',
          participants: [
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
            { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' }
          ],
          organizer: { id: 'current-user-id', name: 'Current User' },
          project: 'Web Platform',
          description: 'Daily standup to sync on progress and blockers',
          hasNotes: false,
          hasRecording: false,
          hasTranscript: false,
          actionItemsCount: 0,
          zoomLink: 'https://zoom.us/j/123456789'
        },
        {
          id: '2',
          title: 'Client Review',
          date: '2025-01-25',
          time: '14:00',
          duration: 60,
          type: 'virtual',
          status: 'upcoming',
          participants: [
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
            { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' }
          ],
          organizer: { id: 'current-user-id', name: 'Current User' },
          project: 'Mobile App Redesign',
          description: 'Review project progress with client stakeholders',
          hasNotes: false,
          hasRecording: false,
          hasTranscript: false,
          actionItemsCount: 0,
          zoomLink: 'https://zoom.us/j/987654321'
        },
        {
          id: '3',
          title: 'Sprint Planning',
          date: '2025-01-26',
          time: '10:00',
          duration: 120,
          type: 'virtual',
          status: 'upcoming',
          participants: [
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
            { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' },
            { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' }
          ],
          organizer: { id: '2', name: 'Sarah Johnson' },
          project: 'Mobile App Redesign',
          description: 'Plan next sprint deliverables and assign tasks',
          hasNotes: false,
          hasRecording: false,
          hasTranscript: false,
          actionItemsCount: 0,
          zoomLink: 'https://zoom.us/j/111222333'
        },
        {
          id: '4',
          title: 'Product Strategy Session',
          date: '2025-01-23',
          time: '14:30',
          duration: 90,
          type: 'virtual',
          status: 'ongoing',
          participants: [
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
            { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' },
            { id: '5', name: 'David Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', role: 'QA Engineer' }
          ],
          organizer: { id: '2', name: 'Sarah Johnson' },
          project: 'Product Strategy',
          description: 'Deep dive into Q2 product roadmap',
          hasNotes: false,
          hasRecording: false,
          hasTranscript: false,
          actionItemsCount: 0,
          zoomLink: 'https://zoom.us/j/444555666'
        },
        {
          id: '5',
          title: 'Architecture Review',
          date: '2025-01-22',
          time: '15:00',
          duration: 75,
          type: 'virtual',
          status: 'completed',
          participants: [
            { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' },
            { id: '5', name: 'David Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', role: 'QA Engineer' }
          ],
          organizer: { id: '3', name: 'Mike Chen' },
          project: 'Mobile App Redesign',
          description: 'Review system architecture for new features',
          hasNotes: true,
          hasRecording: true,
          hasTranscript: true,
          actionItemsCount: 3
        },
        {
          id: '6',
          title: 'Design Critique',
          date: '2025-01-22',
          time: '11:00',
          duration: 45,
          type: 'in-person',
          status: 'completed',
          participants: [
            { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' },
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' }
          ],
          organizer: { id: '4', name: 'Emily Davis' },
          project: 'Mobile App Redesign',
          description: 'Review UI/UX designs for mobile app',
          location: 'Conference Room A',
          hasNotes: true,
          hasRecording: false,
          hasTranscript: false,
          actionItemsCount: 2
        },
        {
          id: '7',
          title: 'Weekly Retrospective',
          date: '2025-01-21',
          time: '16:00',
          duration: 60,
          type: 'virtual',
          status: 'completed',
          participants: [
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
            { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' },
            { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' },
            { id: '5', name: 'David Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', role: 'QA Engineer' }
          ],
          organizer: { id: 'current-user-id', name: 'Current User' },
          project: 'Web Platform',
          description: 'Team retrospective and process improvements',
          hasNotes: true,
          hasRecording: true,
          hasTranscript: true,
          actionItemsCount: 5
        },
        {
          id: '8',
          title: 'Product Roadmap Review',
          date: '2025-01-20',
          time: '13:00',
          duration: 90,
          type: 'virtual',
          status: 'completed',
          participants: [
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
            { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' },
            { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' }
          ],
          organizer: { id: '2', name: 'Sarah Johnson' },
          project: 'Mobile App Redesign',
          description: 'Quarterly roadmap planning and feature prioritization',
          hasNotes: true,
          hasRecording: true,
          hasTranscript: true,
          actionItemsCount: 4
        },
        {
          id: '9',
          title: 'Daily Standup',
          date: '2025-01-24',
          time: '09:00',
          duration: 15,
          type: 'standup',
          status: 'completed',
          participants: [
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
            { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' }
          ],
          organizer: { id: 'current-user-id', name: 'Current User' },
          project: 'Web Platform',
          description: 'Daily sync on progress and blockers',
          hasNotes: true,
          hasRecording: false,
          hasTranscript: false,
          actionItemsCount: 1
        },
        {
          id: '10',
          title: 'User Research Synthesis',
          date: '2025-01-19',
          time: '10:30',
          duration: 60,
          type: 'virtual',
          status: 'completed',
          participants: [
            { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' },
            { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' }
          ],
          organizer: { id: '4', name: 'Emily Davis' },
          project: 'Mobile App Redesign',
          description: 'Review user research findings and identify key insights',
          hasNotes: true,
          hasRecording: true,
          hasTranscript: true,
          actionItemsCount: 3
        }
      ];
      setMeetings(defaultMeetings);
      localStorage.setItem('meetings', JSON.stringify(defaultMeetings));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab('create');
    localStorage.setItem('meetingTracker_auth', JSON.stringify({ user }));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTab('create');
    localStorage.removeItem('meetingTracker_auth');
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const toggleSmartMode = () => {
    const newSmartMode = !smartMode;
    setSmartMode(newSmartMode);
    localStorage.setItem('smartMode', JSON.stringify(newSmartMode));
  };

  const updateIntegration = (service: string, data: any) => {
    const newIntegrations = {
      ...integrations,
      [service]: data
    };
    setIntegrations(newIntegrations);
    localStorage.setItem('integrations', JSON.stringify(newIntegrations));
  };

  const getUserPermissions = (): UserPermissions => {
    if (!currentUser) return ROLE_PERMISSIONS['Employee'];
    return ROLE_PERMISSIONS[currentUser.role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS['Employee'];
  };

  const handleViewMeetingDetails = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowMeetingDetails(true);
  };

  const handleBackToDashboard = () => {
    setShowMeetingDetails(false);
    setShowOngoingMeeting(false);
    setSelectedMeeting(null);
    setFollowUpMeetingData(null);
  };

  const handleScheduleFollowUp = (meeting: any) => {
    // Create pre-populated data based on current meeting
    const followUpData = {
      title: `Follow-up: ${meeting.title}`,
      description: `Follow-up meeting for "${meeting.title}" to discuss action items and next steps.`,
      participants: meeting.participants || [],
      tags: [...(meeting.tags || []), 'follow-up'],
      linkedMeetingId: meeting.id,
      previousMeetingTitle: meeting.title,
      actionItems: meeting.actionItems || [],
      decisions: meeting.decisions || [],
      project: meeting.project || '',
      type: meeting.type || 'virtual',
      duration: 60 // Default 1 hour for follow-up
    };
    
    setFollowUpMeetingData(followUpData);
    setShowMeetingDetails(false);
    setShowOngoingMeeting(false);
    setActiveTab('create');
  };

  const handleJoinMeeting = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowOngoingMeeting(true);
  };

  const handleLeaveMeeting = () => {
    setShowOngoingMeeting(false);
    setSelectedMeeting(null);
    setActiveTab('dashboard');
  };

  // Meeting management functions
  const addMeeting = (meeting: Meeting) => {
    const newMeetings = [...meetings, meeting];
    setMeetings(newMeetings);
    localStorage.setItem('meetings', JSON.stringify(newMeetings));
  };

  const addMeetings = (newMeetings: Meeting[]) => {
    const updatedMeetings = [...meetings, ...newMeetings];
    setMeetings(updatedMeetings);
    localStorage.setItem('meetings', JSON.stringify(updatedMeetings));
  };

  const updateMeeting = (meetingId: string, updates: Partial<Meeting>) => {
    const updatedMeetings = meetings.map(meeting =>
      meeting.id === meetingId ? { ...meeting, ...updates } : meeting
    );
    setMeetings(updatedMeetings);
    localStorage.setItem('meetings', JSON.stringify(updatedMeetings));
  };

  const deleteMeeting = (meetingId: string) => {
    const updatedMeetings = meetings.filter(meeting => meeting.id !== meetingId);
    setMeetings(updatedMeetings);
    localStorage.setItem('meetings', JSON.stringify(updatedMeetings));
  };

  return {
    // State
    isAuthenticated,
    activeTab,
    isDarkMode,
    smartMode,
    currentUser,
    selectedMeeting,
    showMeetingDetails,
    showOngoingMeeting,
    integrations,
    meetings,
    followUpMeetingData,
    
    // Setters
    setActiveTab,
    
    // Handlers
    handleLogin,
    handleLogout,
    toggleTheme,
    toggleSmartMode,
    updateIntegration,
    getUserPermissions,
    handleViewMeetingDetails,
    handleBackToDashboard,
    handleJoinMeeting,
    handleLeaveMeeting,
    handleScheduleFollowUp,
    
    // Meeting management
    addMeeting,
    addMeetings,
    updateMeeting,
    deleteMeeting
  };
}