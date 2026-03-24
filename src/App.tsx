import React from 'react';
import { MeetingDashboard } from './components/MeetingDashboard';
import { CreateMeeting } from './components/CreateMeeting';
import { MOMEditor } from './components/MOMEditor';
import { UserManagement } from './components/UserManagement';
import { Integrations } from './components/Integrations';
import { Availability } from './components/Availability';
import { ActionItems } from './components/ActionItems';
import { TopNavigation } from './components/TopNavigation';
import { Auth } from './components/Auth';
import { MeetingDetails } from './components/MeetingDetails';
import { OngoingMeeting } from './components/OngoingMeeting';
import { HeaderControls } from './components/HeaderControls';
import { AIAssistantFAB } from './components/AIAssistantFAB';
import { useAppState } from './hooks/useAppState';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const {
    isAuthenticated,
    activeTab,
    isDarkMode,
    currentUser,
    selectedMeeting,
    showMeetingDetails,
    showOngoingMeeting,
    integrations,
    meetings,
    followUpMeetingData,
    setActiveTab,
    handleLogin,
    handleLogout,
    toggleTheme,
    updateIntegration,
    getUserPermissions,
    handleViewMeetingDetails,
    handleBackToDashboard,
    handleJoinMeeting,
    handleLeaveMeeting,
    handleScheduleFollowUp,
    addMeeting,
    addMeetings,
    updateMeeting,
    deleteMeeting
  } = useAppState();

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  const permissions = getUserPermissions();

  const renderMainContent = () => {
    // If showing ongoing meeting, render that view
    if (showOngoingMeeting && selectedMeeting) {
      return (
        <OngoingMeeting
          meeting={{
            id: selectedMeeting.id,
            title: selectedMeeting.title,
            startTime: new Date().toISOString(),
            participants: selectedMeeting.participants || []
          }}
          currentUser={currentUser!}
          userPermissions={permissions}
          onBack={handleBackToDashboard}
          onLeaveMeeting={handleLeaveMeeting}
        />
      );
    }

    // If showing meeting details, render that instead
    if (showMeetingDetails && selectedMeeting) {
      return (
        <MeetingDetails
          meeting={selectedMeeting}
          currentUser={currentUser!}
          integrations={integrations}
          userPermissions={permissions}
          onBack={handleBackToDashboard}
          previousMeetings={meetings}
          onScheduleFollowUp={handleScheduleFollowUp}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <MeetingDashboard 
            currentUser={currentUser!} 
            integrations={integrations}
            userPermissions={permissions}
            meetings={meetings}
            onViewMeetingDetails={handleViewMeetingDetails}
            onJoinMeeting={handleJoinMeeting}
            onCreateMeeting={() => setActiveTab('create')}
          />
        );
      case 'create':
        return (
          <CreateMeeting 
            currentUser={currentUser!} 
            integrations={integrations}
            userPermissions={permissions}
            onMeetingCreated={() => setActiveTab('dashboard')}
            onAddMeeting={addMeeting}
            onAddMeetings={addMeetings}
            followUpData={followUpMeetingData}
            meetings={meetings}
          />
        );
      case 'availability':
        return (
          <Availability 
            currentUser={currentUser!} 
            userPermissions={permissions}
            integrations={integrations}
          />
        );
      case 'mom':
        return (
          <MOMEditor 
            currentUser={currentUser!} 
            integrations={integrations}
            userPermissions={permissions}
          />
        );
      case 'action-items':
        return (
          <ActionItems 
            currentUser={currentUser!} 
            userPermissions={permissions}
          />
        );
      case 'integrations':
        return (
          <Integrations 
            currentUser={currentUser!} 
            integrations={integrations}
            onUpdateIntegration={updateIntegration}
          />
        );
      case 'users':
        return (
          <UserManagement currentUser={currentUser!} />
        );
      default:
        return (
          <CreateMeeting 
            currentUser={currentUser!} 
            integrations={integrations}
            userPermissions={permissions}
            onMeetingCreated={() => setActiveTab('dashboard')}
            onAddMeeting={addMeeting}
            onAddMeetings={addMeetings}
            followUpData={followUpMeetingData}
            meetings={meetings}
          />
        );
    }
  };

  // Enhanced team members data with avatars for AI assistant
  const teamMembers = [
    { 
      id: '2', 
      name: 'Sarah Johnson', 
      email: 'sarah@company.com', 
      role: 'Product Manager',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    },
    { 
      id: '3', 
      name: 'Mike Chen', 
      email: 'mike@company.com', 
      role: 'Senior Developer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    },
    { 
      id: '4', 
      name: 'Emily Davis', 
      email: 'emily@company.com', 
      role: 'UX Designer',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
    },
    { 
      id: '5', 
      name: 'David Wilson', 
      email: 'david@company.com', 
      role: 'QA Engineer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
    },
    { 
      id: '6', 
      name: 'Lisa Park', 
      email: 'lisa@company.com', 
      role: 'Engineering Manager',
      avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face'
    },
    { 
      id: '7', 
      name: 'Alex Thompson', 
      email: 'alex@company.com', 
      role: 'Team Lead',
      avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face'
    }
  ];

  // Handler for AI-created meetings - this ensures dashboard updates immediately
  const handleAICreateMeeting = (meeting: any) => {
    // Add meeting to app state
    addMeeting(meeting);
    
    // If user is not on dashboard, show a notification about where to find the meeting
    if (activeTab !== 'dashboard') {
      setTimeout(() => {
        // Optional: Auto-navigate to dashboard to show the new meeting
        // setActiveTab('dashboard');
      }, 2000);
    }
  };

  // Handler for AI-created follow-ups
  const handleAIScheduleFollowUp = (meetingData: any) => {
    handleScheduleFollowUp(meetingData);
    
    // Add the follow-up as a regular meeting too
    if (meetingData.id) {
      addMeeting(meetingData);
    }
  };

  // If in ongoing meeting, render full-screen meeting interface
  if (showOngoingMeeting) {
    return renderMainContent();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <TopNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser!}
        userPermissions={permissions}
        actionItemsCount={5}
      />

      {/* Secondary Header with Controls */}
      <HeaderControls
        currentUser={currentUser!}
        integrations={integrations}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onUpdateIntegration={updateIntegration}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {renderMainContent()}
      </main>

      {/* AI Assistant FAB - Always visible */}
      <AIAssistantFAB
        currentUser={currentUser!}
        teamMembers={teamMembers}
        meetings={meetings}
        onCreateMeeting={handleAICreateMeeting}
        onScheduleFollowUp={handleAIScheduleFollowUp}
        onNavigateToCreate={() => setActiveTab('create')}
      />

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        closeButton
        richColors
      />
    </div>
  );
}