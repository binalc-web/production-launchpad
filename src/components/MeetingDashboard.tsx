import React, { useState } from 'react';
import { Calendar, Clock, Users, Video, FileText, CheckSquare, TrendingUp, Filter, Search, Eye, Plus, MapPin, AlertCircle, LayoutGrid, List, Share2, Mail, MessageSquare, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { User, UserPermissions, Integrations, Meeting } from '../types';
import { toast } from 'sonner@2.0.3';



interface MeetingDashboardProps {
  currentUser: User;
  integrations: Integrations;
  userPermissions: UserPermissions;
  meetings: Meeting[];
  onViewMeetingDetails?: (meeting: Meeting) => void;
  onJoinMeeting?: (meeting: Meeting) => void;
  onCreateMeeting?: () => void;
}

export function MeetingDashboard({ currentUser, integrations, userPermissions, meetings: propMeetings, onViewMeetingDetails, onJoinMeeting, onCreateMeeting }: MeetingDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock meeting data with role-based filtering
  const allMeetings: Meeting[] = propMeetings.length > 0 ? propMeetings : [
    {
      id: '1',
      title: 'Q1 Product Planning',
      date: '2025-01-25',
      time: '10:00',
      duration: 90,
      type: 'virtual',
      status: 'ongoing',
      participants: [
        { id: '1', name: 'John Smith', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', role: 'Team Lead' },
        { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
        { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' }
      ],
      organizer: { id: '2', name: 'Sarah Johnson' },
      project: 'Mobile App Redesign',
      description: 'Quarterly planning session to review objectives, resource allocation, and strategic priorities for the upcoming quarter.',
      agenda: 'Review Q4 performance, Define Q1 objectives, Resource planning, Strategic initiatives discussion',
      prepNotes: 'Please review Q4 performance metrics dashboard and prepare your team resource requirements for Q1. Come with 3 strategic initiative proposals.',
      hasNotes: false,
      hasRecording: false,
      hasTranscript: false,
      actionItemsCount: 0,
      zoomLink: 'https://zoom.us/j/123456789',
      recordingUrl: undefined,
      transcriptUrl: undefined
    },
    {
      id: '5',
      title: 'Design System Review',
      date: '2025-01-25',
      time: '14:30',
      duration: 60,
      type: 'virtual',
      status: 'ongoing',
      participants: [
        { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' },
        { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' }
      ],
      organizer: { id: '4', name: 'Emily Davis' },
      project: 'Design System',
      description: 'Review and update design system components and guidelines.',
      agenda: 'Component review, Color palette updates, Typography guidelines, Icon library updates',
      hasNotes: false,
      hasRecording: false,
      hasTranscript: false,
      actionItemsCount: 0,
      zoomLink: 'https://zoom.us/j/987654321',
      recordingUrl: undefined,
      transcriptUrl: undefined
    },
    {
      id: '6',
      title: 'Team Standup',
      date: '2025-01-26',
      time: '09:00',
      duration: 15,
      type: 'standup',
      status: 'upcoming',
      participants: [
        { id: '1', name: 'John Smith', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', role: 'Team Lead' },
        { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' },
        { id: '5', name: 'David Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', role: 'QA Engineer' }
      ],
      organizer: { id: '1', name: 'John Smith' },
      project: 'Web Platform',
      description: 'Daily standup meeting to share progress updates and coordinate team activities.',
      agenda: 'Yesterday\'s progress, Today\'s goals, Blockers discussion',
      hasNotes: false,
      hasRecording: false,
      hasTranscript: false,
      actionItemsCount: 0,
      zoomLink: 'https://zoom.us/j/111222333',
      recordingUrl: undefined,
      transcriptUrl: undefined
    },
    {
      id: '2',
      title: 'Sprint Retrospective',
      date: '2025-01-23',
      time: '15:00',
      duration: 60,
      type: 'virtual',
      status: 'completed',
      participants: [
        { id: '1', name: 'John Smith', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', role: 'Team Lead' },
        { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' },
        { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' }
      ],
      organizer: { id: '1', name: 'John Smith' },
      project: 'Web Platform',
      description: 'Sprint retrospective to review team performance, identify improvements, and plan for the next sprint cycle.',
      agenda: 'Sprint review, What went well, Areas for improvement, Action items, Next sprint planning',
      hasNotes: true,
      hasRecording: true,
      hasTranscript: true,
      actionItemsCount: 5,
      recordingUrl: 'https://zoom.us/rec/play/recording123',
      transcriptUrl: 'https://zoom.us/rec/transcript123'
    },
    {
      id: '3',
      title: 'Client Demo Preparation',
      date: '2025-01-24',
      time: '14:00',
      duration: 45,
      type: 'in-person',
      status: 'completed',
      participants: [
        { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' },
        { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'Designer' }
      ],
      organizer: { id: '2', name: 'Sarah Johnson' },
      project: 'Client Portal',
      description: 'Preparation session for upcoming client demonstration, including demo script review and technical setup.',
      agenda: 'Demo script review, Technical setup verification, Q&A preparation, Backup plan discussion',
      hasNotes: true,
      hasRecording: false,
      hasTranscript: false,
      actionItemsCount: 3,
      location: 'Conference Room A',
      recordingUrl: undefined,
      transcriptUrl: undefined
    },
    {
      id: '4',
      title: 'Daily Standup',
      date: '2025-01-24',
      time: '09:00',
      duration: 15,
      type: 'standup',
      status: 'completed',
      participants: [
        { id: '1', name: 'John Smith', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', role: 'Team Lead' },
        { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'Developer' },
        { id: '5', name: 'David Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', role: 'QA Engineer' }
      ],
      organizer: { id: '1', name: 'John Smith' },
      project: 'Mobile App Redesign',
      description: 'Daily standup meeting to share progress updates, discuss blockers, and coordinate team activities.',
      agenda: 'Yesterday\'s progress, Today\'s goals, Blockers and concerns, Team coordination',
      hasNotes: true,
      hasRecording: false,
      hasTranscript: false,
      actionItemsCount: 2,
      recordingUrl: undefined,
      transcriptUrl: undefined
    }
  ];

  // Filter meetings based on user role
  const getFilteredMeetings = () => {
    let meetings = allMeetings;

    // Role-based filtering
    if (!userPermissions.canAccessAllMeetings) {
      // Employees can only see meetings they're participating in
      meetings = meetings.filter(meeting => 
        meeting.participants.some(p => p.id === currentUser.id) ||
        meeting.organizer.id === currentUser.id
      );
    }

    // Apply search filter
    if (searchTerm) {
      meetings = meetings.filter(meeting =>
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.project?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.participants.some(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      meetings = meetings.filter(meeting => meeting.status === filterStatus);
    }

    // Apply type filter
    if (filterType !== 'all') {
      meetings = meetings.filter(meeting => meeting.type === filterType);
    }

    return meetings;
  };

  const meetings = getFilteredMeetings();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'virtual': return <Video className="h-4 w-4" />;
      case 'in-person': return <MapPin className="h-4 w-4" />;
      case 'standup': return <Users className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'upcoming');
  const ongoingMeetings = meetings.filter(m => m.status === 'ongoing');
  const completedMeetings = meetings.filter(m => m.status === 'completed');
  const totalActionItems = meetings.reduce((sum, m) => sum + m.actionItemsCount, 0);

  // Share meeting functionality
  const handleShareMeeting = (meeting: Meeting, method: string) => {
    const meetingUrl = `${window.location.origin}/meeting/${meeting.id}`;
    const meetingDetails = `Join "${meeting.title}" on ${new Date(meeting.date).toLocaleDateString()} at ${meeting.time}`;
    
    switch (method) {
      case 'slack':
        // Open Slack share - this would typically integrate with Slack API
        const slackUrl = `https://slack.com/intl/en-in/help/articles/115004844268-Share-links-in-Slack`;
        window.open(slackUrl, '_blank');
        toast.success('Opening Slack share...');
        break;
      case 'gmail':
        const gmailUrl = `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(`Meeting Invitation: ${meeting.title}`)}&body=${encodeURIComponent(`${meetingDetails}\n\nJoin here: ${meetingUrl}`)}`;
        window.open(gmailUrl, '_blank');
        toast.success('Opening Gmail...');
        break;
      case 'teams':
        // Open Microsoft Teams - this would typically integrate with Teams API
        const teamsUrl = `https://teams.microsoft.com/share?href=${encodeURIComponent(meetingUrl)}&msgText=${encodeURIComponent(meetingDetails)}`;
        window.open(teamsUrl, '_blank');
        toast.success('Opening Microsoft Teams...');
        break;
      case 'copy':
        const textToCopy = `${meetingDetails}\n\nJoin here: ${meetingUrl}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
          toast.success('Meeting link copied to clipboard!');
        }).catch(() => {
          toast.error('Failed to copy to clipboard');
        });
        break;
      default:
        break;
    }
  };

  // Helper function to render meetings in list view
  const renderMeetingsList = (meetingsList: Meeting[], highlightUpcoming = false) => {
    if (meetingsList.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No meetings found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'Try adjusting your filters or search terms'
                : currentUser.role === 'Employee'
                  ? 'You\'ll see meetings here when you\'re invited to participate'
                  : 'Create your first meeting to get started'
              }
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {meetingsList.map((meeting) => (
          <Card key={meeting.id} className={`hover:shadow-md transition-shadow ${highlightUpcoming ? 'border-primary/20 bg-primary/5' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  {/* Main meeting info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">{meeting.title}</h3>
                        <Badge variant="secondary" className={getStatusColor(meeting.status)}>
                          {meeting.status}
                        </Badge>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          {getTypeIcon(meeting.type)}
                          <span>{meeting.type}</span>
                        </div>
                      </div>
                      {meeting.project && (
                        <p className="text-sm text-muted-foreground mt-1">{meeting.project}</p>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      {meeting.status === 'completed' && (
                        <div className="flex items-center space-x-2 mr-4">
                          {meeting.hasNotes && (
                            <div className="flex items-center space-x-1 text-green-600 text-xs">
                              <FileText className="h-3 w-3" />
                              <span>Notes</span>
                            </div>
                          )}
                          {meeting.hasRecording && (
                            <div className="flex items-center space-x-1 text-blue-600 text-xs">
                              <Video className="h-3 w-3" />
                              <span>Recording</span>
                            </div>
                          )}
                          {meeting.hasTranscript && (
                            <div className="flex items-center space-x-1 text-purple-600 text-xs">
                              <FileText className="h-3 w-3" />
                              <span>Transcript</span>
                            </div>
                          )}
                          {meeting.actionItemsCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {meeting.actionItemsCount} actions
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onViewMeetingDetails?.(meeting)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Share2 className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleShareMeeting(meeting, 'slack')}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Share on Slack
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareMeeting(meeting, 'gmail')}>
                            <Mail className="h-4 w-4 mr-2" />
                            Share via Gmail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareMeeting(meeting, 'teams')}>
                            <Users className="h-4 w-4 mr-2" />
                            Share on Teams
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareMeeting(meeting, 'copy')}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {meeting.status === 'upcoming' && meeting.zoomLink && (
                        <Button size="sm">
                          <Video className="h-3 w-3 mr-1" />
                          Join
                        </Button>
                      )}
                      
                      {meeting.status === 'ongoing' && (
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => onJoinMeeting?.(meeting)}
                        >
                          <Video className="h-3 w-3 mr-1" />
                          Join Now
                        </Button>
                      )}
                      
                      {meeting.status === 'completed' && meeting.hasNotes && (
                        <Button variant="outline" size="sm">
                          <FileText className="h-3 w-3 mr-1" />
                          Notes
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Meeting details row */}
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(meeting.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{meeting.time} ({meeting.duration}m)</span>
                    </div>
                    
                    {(meeting.location || meeting.zoomLink) && (
                      <div className="flex items-center space-x-2">
                        {meeting.type === 'in-person' ? (
                          <>
                            <MapPin className="h-4 w-4" />
                            <span>{meeting.location}</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4" />
                            <span>Zoom Meeting</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Participants */}
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <div className="flex -space-x-1">
                        {meeting.participants.slice(0, 3).map((participant) => (
                          <Avatar key={participant.id} className="h-5 w-5 border border-background">
                            <AvatarImage src={participant.avatar} alt={participant.name || 'User'} />
                            <AvatarFallback className="text-xs">{(participant.name || 'U').charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {meeting.participants.length > 3 && (
                          <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">+{meeting.participants.length - 3}</span>
                          </div>
                        )}
                      </div>
                      <span>{meeting.participants.length} participants</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Helper function to render meetings in grid view
  const renderMeetingsGrid = (meetingsList: Meeting[], highlightUpcoming = false) => {
    if (meetingsList.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No meetings found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'Try adjusting your filters or search terms'
                : currentUser.role === 'Employee'
                  ? 'You\'ll see meetings here when you\'re invited to participate'
                  : 'Create your first meeting to get started'
              }
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meetingsList.map((meeting) => (
          <Card key={meeting.id} className={`hover:shadow-md transition-shadow ${highlightUpcoming ? 'border-primary/20 bg-primary/5' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base line-clamp-2">{meeting.title}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className={getStatusColor(meeting.status)}>
                      {meeting.status}
                    </Badge>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      {getTypeIcon(meeting.type)}
                      <span>{meeting.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(meeting.date).toLocaleDateString()}</span>
                  <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                  <span>{meeting.time} ({meeting.duration}m)</span>
                </div>
                
                {meeting.project && (
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{meeting.project}</span>
                  </div>
                )}

                {(meeting.location || meeting.zoomLink) && (
                  <div className="flex items-center space-x-2 text-sm">
                    {meeting.type === 'in-person' ? (
                      <>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{meeting.location}</span>
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground truncate">Zoom Meeting</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-muted-foreground">Participants:</span>
                </div>
                <div className="flex -space-x-2">
                  {meeting.participants.slice(0, 4).map((participant) => (
                    <Avatar key={participant.id} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={participant.avatar} alt={participant.name || 'User'} />
                      <AvatarFallback className="text-xs">{(participant.name || 'U').charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {meeting.participants.length > 4 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">+{meeting.participants.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>

              {meeting.status === 'completed' && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    {meeting.hasNotes && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <FileText className="h-3 w-3" />
                        <span>Notes</span>
                      </div>
                    )}
                    {meeting.hasRecording && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <Video className="h-3 w-3" />
                        <span>Recording</span>
                      </div>
                    )}
                    {meeting.hasTranscript && (
                      <div className="flex items-center space-x-1 text-purple-600">
                        <FileText className="h-3 w-3" />
                        <span>Transcript</span>
                      </div>
                    )}
                  </div>
                  {meeting.actionItemsCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {meeting.actionItemsCount} actions
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onViewMeetingDetails?.(meeting)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Share2 className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShareMeeting(meeting, 'slack')}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Share on Slack
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareMeeting(meeting, 'gmail')}>
                      <Mail className="h-4 w-4 mr-2" />
                      Share via Gmail
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareMeeting(meeting, 'teams')}>
                      <Users className="h-4 w-4 mr-2" />
                      Share on Teams
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareMeeting(meeting, 'copy')}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {meeting.status === 'upcoming' && meeting.zoomLink && (
                  <Button size="sm" className="flex-1">
                    <Video className="h-3 w-3 mr-1" />
                    Join
                  </Button>
                )}
                {meeting.status === 'ongoing' && (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => onJoinMeeting?.(meeting)}
                  >
                    <Video className="h-3 w-3 mr-1" />
                    Join Now
                  </Button>
                )}
                {meeting.status === 'completed' && meeting.hasNotes && (
                  <Button variant="outline" size="sm" className="flex-1">
                    <FileText className="h-3 w-3 mr-1" />
                    View Notes
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {currentUser.role === 'Employee' ? 'My Meetings' : 'Meeting Dashboard'}
          </h2>
          <p className="text-muted-foreground">
            {currentUser.role === 'Employee' 
              ? 'Track your meeting participation and access notes'
              : 'Track, analyze, and manage team meetings'
            }
          </p>
        </div>
        {userPermissions.canCreateMeetings && (
          <Button onClick={onCreateMeeting}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {currentUser.role === 'Employee' ? 'My Upcoming' : 'Upcoming Meetings'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingMeetings.length === 1 ? 'meeting' : 'meetings'} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongoing Meetings</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ongoingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">
              currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Week</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedMeetings.length}</div>
            <p className="text-xs text-muted-foreground">
              with {totalActionItems} action items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meeting Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(meetings.reduce((sum, m) => sum + m.duration, 0) / 60 * 10) / 10}h
            </div>
            <p className="text-xs text-muted-foreground">
              total tracked time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="in-person">In-person</SelectItem>
              <SelectItem value="standup">Standup</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meeting Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Meetings</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {viewMode === 'grid' ? renderMeetingsGrid(meetings) : renderMeetingsList(meetings)}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4">
          {ongoingMeetings.length > 0 ? (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="font-medium text-green-800 dark:text-green-300">Live Meetings</h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                {ongoingMeetings.length} meeting{ongoingMeetings.length !== 1 ? 's' : ''} currently in progress
              </p>
            </div>
          ) : null}
          {viewMode === 'grid' ? renderMeetingsGrid(ongoingMeetings) : renderMeetingsList(ongoingMeetings)}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMeetings.length > 0 ? (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-blue-800 dark:text-blue-300">Upcoming Schedule</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                You have {upcomingMeetings.length} meeting{upcomingMeetings.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
          ) : null}
          {viewMode === 'grid' ? renderMeetingsGrid(upcomingMeetings, true) : renderMeetingsList(upcomingMeetings, true)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedMeetings.length > 0 && totalActionItems > 0 ? (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="h-4 w-4 text-gray-600" />
                  <h3 className="font-medium text-gray-800 dark:text-gray-300">Completed Meetings</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {totalActionItems} action items
                </Badge>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                {completedMeetings.length} meeting{completedMeetings.length !== 1 ? 's' : ''} completed with notes and recordings
              </p>
            </div>
          ) : null}
          {viewMode === 'grid' ? renderMeetingsGrid(completedMeetings) : renderMeetingsList(completedMeetings)}
        </TabsContent>
      </Tabs>
    </div>
  );
}