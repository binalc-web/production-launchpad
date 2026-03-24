import React, { useState } from 'react';
import { 
  Calendar, Clock, Users, Video, FileText, CheckSquare, ArrowLeft, 
  Play, Download, ExternalLink, Plus, Edit, Share, MessageCircle,
  Bot, Zap, Target, User, MapPin, Link as LinkIcon, Share2, Mail, MessageSquare, Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AIPrepNotes } from './AIPrepNotes';
import { JiraTicketCreation } from './JiraTicketCreation';
import { toast } from "sonner@2.0.3";

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
}

interface UserPermissions {
  canCreateMeetings: boolean;
  canAccessAllMeetings: boolean;
  canCreateJiraTickets: boolean;
  canCreateConfluenceDocs: boolean;
  canManageIntegrations: boolean;
  canManageUsers: boolean;
  directJiraAccess: boolean;
}

interface IntegrationData {
  connected: boolean;
  data: any;
}

interface Integrations {
  googleCalendar: IntegrationData;
  zoom: IntegrationData;
  jira: IntegrationData;
  confluence: IntegrationData;
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface Meeting {
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

interface MeetingDetailsProps {
  meeting: Meeting;
  currentUser: User;
  integrations: Integrations;
  userPermissions: UserPermissions;
  onBack: () => void;
  previousMeetings?: Meeting[];
  onScheduleFollowUp: (meeting: any) => void;
}

export function MeetingDetails({ meeting, currentUser, integrations, userPermissions, onBack, previousMeetings = [], onScheduleFollowUp }: MeetingDetailsProps) {
  const [notes, setNotes] = useState('');
  const [newActionItem, setNewActionItem] = useState('');
  const [showJiraModal, setShowJiraModal] = useState(false);

  // Mock data for demonstration
  const mockActionItems = [
    {
      id: '1',
      text: 'Update project timeline based on discussed milestones',
      assignee: 'Sarah Johnson',
      dueDate: '2025-01-30',
      status: 'pending' as const,
      priority: 'high' as const
    },
    {
      id: '2', 
      text: 'Review and approve design mockups for mobile interface',
      assignee: 'Mike Chen',
      dueDate: '2025-01-28',
      status: 'pending' as const,
      priority: 'medium' as const
    },
    {
      id: '3',
      text: 'Schedule follow-up meeting with stakeholders',
      assignee: 'Emily Davis',
      dueDate: '2025-01-26',
      status: 'completed' as const,
      priority: 'low' as const
    },
    {
      id: '4',
      text: 'Prepare technical documentation for API endpoints',
      assignee: 'David Wilson',
      dueDate: '2025-02-02',
      status: 'pending' as const,
      priority: 'high' as const
    },
    {
      id: '5',
      text: 'Conduct user testing sessions for new features',
      assignee: 'Sarah Johnson',
      dueDate: '2025-02-05',
      status: 'pending' as const,
      priority: 'medium' as const
    }
  ];

  const mockDecisions = [
    {
      id: '1',
      decision: 'Proceed with mobile-first approach for the redesign',
      context: 'Based on user analytics showing 70% mobile usage',
      impact: 'Will require additional 2 weeks for mobile optimization',
      decidedBy: 'Sarah Johnson',
      timestamp: '2025-01-23T15:30:00Z'
    },
    {
      id: '2',
      decision: 'Implement dark mode as a priority feature',
      context: 'High demand from user feedback and competitive analysis',
      impact: 'Adds 1 week to development timeline but increases user satisfaction',
      decidedBy: 'Team Consensus',
      timestamp: '2025-01-23T15:45:00Z'
    },
    {
      id: '3',
      decision: 'Use TypeScript for all new components',
      context: 'To improve code quality and reduce runtime errors',
      impact: 'Slight learning curve but better long-term maintainability',
      decidedBy: 'Mike Chen',
      timestamp: '2025-01-23T16:00:00Z'
    }
  ];

  const mockMeetingNotes = `Meeting Summary - Sprint Retrospective

**What Went Well:**
• Team collaboration improved significantly this sprint
• All major features were delivered on time
• Code quality metrics showed marked improvement
• User feedback was overwhelmingly positive

**Areas for Improvement:**
• Communication during standups could be more focused
• Need better estimation for complex tasks
• More frequent code reviews would help catch issues earlier
• Documentation needs to be updated more consistently

**Action Items Discussed:**
• Update project timeline based on discussed milestones
• Review and approve design mockups for mobile interface
• Schedule follow-up meeting with stakeholders
• Prepare technical documentation for API endpoints
• Conduct user testing sessions for new features

**Key Decisions Made:**
• Proceed with mobile-first approach for the redesign
• Implement dark mode as a priority feature
• Use TypeScript for all new components

**Next Steps:**
• Begin implementation of mobile-first design approach
• Start development of dark mode feature
• Schedule training session for TypeScript adoption
• Update project documentation with new decisions

**Participants' Feedback:**
• Sarah: Excited about the mobile-first approach, will help with user research
• Mike: Supportive of TypeScript adoption, will lead training session
• Emily: Will work on dark mode design specifications
• David: Will focus on improving testing procedures`;

  const handleCreateConfluenceDoc = () => {
    if (!integrations.confluence.connected) {
      toast.error('Please connect Confluence first');
      return;
    }

    // Mock the Confluence doc creation
    toast.success('Creating Confluence document...', {
      description: 'Meeting notes will be automatically formatted and saved to your Confluence space.'
    });

    // Simulate API call delay
    setTimeout(() => {
      toast.success('Confluence document created!', {
        description: 'Document saved to Engineering space with meeting notes and action items.',
        action: {
          label: 'View Document',
          onClick: () => window.open('https://company.atlassian.net/wiki/spaces/ENG/pages/123456', '_blank')
        }
      });
    }, 2000);
  };

  const handleCreateGoogleDoc = () => {
    if (!integrations.googleCalendar.connected) {
      toast.error('Please connect Google Workspace first');
      return;
    }

    // Mock the Google Doc creation
    toast.success('Creating Google Document...', {
      description: 'Meeting summary will be formatted and saved to your Google Drive.'
    });

    // Simulate API call delay
    setTimeout(() => {
      toast.success('Google Document created!', {
        description: 'Document saved to Meeting Notes folder with full formatting.',
        action: {
          label: 'Open Document',
          onClick: () => window.open('https://docs.google.com/document/d/mock-document-id', '_blank')
        }
      });
    }, 2000);
  };

  const handleCreateJiraTickets = () => {
    if (!integrations.jira.connected) {
      toast.error('Please connect Jira first');
      return;
    }
    setShowJiraModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string, duration: number) => {
    const startTime = new Date(`2025-01-01T${timeStr}`);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    return `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckSquare className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Share meeting functionality
  const handleShareMeeting = (method: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{meeting.title}</h1>
            <p className="text-muted-foreground">
              {formatDate(meeting.date)} • {formatTime(meeting.time, meeting.duration)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className={getStatusColor(meeting.status)}>
            {meeting.status}
          </Badge>
          <div className="flex items-center space-x-1 text-muted-foreground">
            {getTypeIcon(meeting.type)}
            <span className="text-sm">{meeting.type}</span>
          </div>
        </div>
      </div>

      {/* AI Prep Notes for Upcoming Meetings */}
      {meeting.status === 'upcoming' && (
        <AIPrepNotes 
          currentMeeting={meeting}
          previousMeetings={previousMeetings}
          currentUser={currentUser}
        />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Meeting Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meeting Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Meeting Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                    <p className="text-sm">{formatDate(meeting.date)}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(meeting.time, meeting.duration)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <p className="text-sm">{meeting.duration} minutes</p>
                  </div>

                  {meeting.location && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Location</label>
                      <p className="text-sm flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{meeting.location}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Organizer</label>
                    <p className="text-sm">{meeting.organizer.name}</p>
                  </div>

                  {meeting.project && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Project</label>
                      <p className="text-sm">{meeting.project}</p>
                    </div>
                  )}

                  {meeting.zoomLink && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Meeting Link</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(meeting.zoomLink, '_blank')}
                        className="text-sm h-8"
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Join Zoom
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {meeting.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm mt-1 leading-relaxed">{meeting.description}</p>
                </div>
              )}

              {meeting.prepNotes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Preparation Notes</label>
                  <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm leading-relaxed">{meeting.prepNotes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Content Tabs */}
          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="actions">Action Items</TabsTrigger>
              <TabsTrigger value="decisions">Decisions</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Meeting Summary</span>
                    </CardTitle>
                    {meeting.status === 'completed' && (
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Share2 className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleShareMeeting('slack')}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Share on Slack
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShareMeeting('gmail')}>
                              <Mail className="h-4 w-4 mr-2" />
                              Share via Gmail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShareMeeting('teams')}>
                              <Users className="h-4 w-4 mr-2" />
                              Share on Teams
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShareMeeting('copy')}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {meeting.status === 'completed' ? (
                    <div className="space-y-6">
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-line text-sm leading-relaxed">
                          {mockMeetingNotes}
                        </div>
                      </div>
                      
                      {/* Documentation CTAs */}
                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium">Create Documentation</h4>
                            <p className="text-sm text-muted-foreground">
                              Save meeting notes and action items to your documentation platform
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          {/* Confluence Doc CTA */}
                          <Button
                            onClick={handleCreateConfluenceDoc}
                            disabled={!integrations.confluence.connected}
                            variant="outline"
                            className="flex-1"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Create Confluence Doc
                            {!integrations.confluence.connected && (
                              <span className="ml-2 text-xs opacity-75">(Connect first)</span>
                            )}
                          </Button>
                          
                          {/* Google Doc CTA */}
                          <Button
                            onClick={handleCreateGoogleDoc}
                            disabled={!integrations.googleCalendar.connected}
                            variant="outline"
                            className="flex-1"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Create Google Doc
                            {!integrations.googleCalendar.connected && (
                              <span className="ml-2 text-xs opacity-75">(Connect first)</span>
                            )}
                          </Button>

                          {/* Jira Tickets CTA */}
                          {userPermissions.canCreateJiraTickets && (
                            <Button
                              onClick={handleCreateJiraTickets}
                              disabled={!integrations.jira.connected}
                              variant="outline"
                              className="flex-1"
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Create Jira Tickets
                              {!integrations.jira.connected && (
                                <span className="ml-2 text-xs opacity-75">(Connect first)</span>
                              )}
                            </Button>
                          )}
                        </div>
                        
                        {(!integrations.confluence.connected || !integrations.googleCalendar.connected) && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Connect your integrations in settings to enable documentation export
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Meeting Summary Not Available</h3>
                      <p className="text-sm text-muted-foreground">
                        Summary will be generated automatically after the meeting is completed.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <CheckSquare className="h-5 w-5" />
                      <span>Action Items ({mockActionItems.length})</span>
                    </CardTitle>
                    {userPermissions.canCreateJiraTickets && (
                      <Button size="sm">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Action Item
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockActionItems.map((item) => (
                      <div key={item.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(item.status)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium">{item.text}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{item.assignee}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due {new Date(item.dueDate).toLocaleDateString()}</span>
                            </div>
                            <Badge variant="outline" className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          {userPermissions.canCreateJiraTickets && (
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="decisions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Key Decisions ({mockDecisions.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockDecisions.map((decision) => (
                      <div key={decision.id} className="p-4 border border-border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm">{decision.decision}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(decision.timestamp).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit', 
                              hour12: true 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{decision.context}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            <strong>Impact:</strong> {decision.impact}
                          </span>
                          <span className="text-muted-foreground">
                            <strong>Decided by:</strong> {decision.decidedBy}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transcript">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <MessageCircle className="h-5 w-5" />
                      <span>Meeting Transcript</span>
                    </CardTitle>
                    {meeting.hasTranscript && (
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Bot className="h-3 w-3 mr-1" />
                          AI Summary
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {meeting.hasTranscript ? (
                    <div className="space-y-4">
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">
                          AI-generated transcript with speaker identification
                        </p>
                        <Progress value={100} className="w-full h-2" />
                      </div>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face" />
                            <AvatarFallback>SJ</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs text-muted-foreground">Sarah Johnson • 15:02</p>
                            <p className="text-sm">Welcome everyone to today's sprint retrospective. Let's start by discussing what went well this sprint.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" />
                            <AvatarFallback>MC</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs text-muted-foreground">Mike Chen • 15:03</p>
                            <p className="text-sm">I think our collaboration improved significantly. The new code review process really helped catch issues early.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face" />
                            <AvatarFallback>ED</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs text-muted-foreground">Emily Davis • 15:04</p>
                            <p className="text-sm">Absolutely! And the user feedback on our recent features has been really positive. The satisfaction scores are up 15%.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Transcript Not Available</h3>
                      <p className="text-sm text-muted-foreground">
                        {meeting.status === 'completed' 
                          ? 'No transcript was recorded for this meeting.'
                          : 'Transcript will be available after the meeting is completed.'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Participants & Quick Actions */}
        <div className="space-y-6">
          {/* Participants Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Participants ({meeting.participants.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meeting.participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.avatar} alt={participant.name} />
                      <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">{participant.role}</p>
                    </div>
                    {participant.id === meeting.organizer.id && (
                      <Badge variant="secondary" className="text-xs">
                        Organizer
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meeting.status === 'upcoming' && meeting.zoomLink && (
                <Button className="w-full">
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
              )}
              
              {meeting.status === 'ongoing' && (
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Video className="h-4 w-4 mr-2" />
                  Join Now
                </Button>
              )}

              {meeting.hasRecording && (
                <Button variant="outline" className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Watch Recording
                </Button>
              )}

              {userPermissions.canCreateJiraTickets && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCreateJiraTickets}
                  disabled={!integrations.jira.connected}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Jira Ticket
                  {!integrations.jira.connected && (
                    <span className="ml-2 text-xs opacity-75">(Connect first)</span>
                  )}
                </Button>
              )}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onScheduleFollowUp(meeting)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Meeting
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleShareMeeting('slack')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Share on Slack
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShareMeeting('gmail')}>
                    <Mail className="h-4 w-4 mr-2" />
                    Share via Gmail
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShareMeeting('teams')}>
                    <Users className="h-4 w-4 mr-2" />
                    Share on Teams
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShareMeeting('copy')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          {/* Meeting Resources */}
          {(meeting.hasRecording || meeting.hasTranscript || meeting.hasNotes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Resources</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {meeting.hasNotes && (
                  <Button variant="ghost" className="w-full justify-start h-auto p-2">
                    <FileText className="h-4 w-4 mr-2 text-green-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Meeting Notes</p>
                      <p className="text-xs text-muted-foreground">Auto-generated summary</p>
                    </div>
                  </Button>
                )}

                {meeting.hasRecording && (
                  <Button variant="ghost" className="w-full justify-start h-auto p-2">
                    <Video className="h-4 w-4 mr-2 text-blue-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Recording</p>
                      <p className="text-xs text-muted-foreground">Full meeting video</p>
                    </div>
                  </Button>
                )}

                {meeting.hasTranscript && (
                  <Button variant="ghost" className="w-full justify-start h-auto p-2">
                    <MessageCircle className="h-4 w-4 mr-2 text-purple-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Transcript</p>
                      <p className="text-xs text-muted-foreground">AI-generated transcript</p>
                    </div>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Jira Ticket Creation Modal */}
      <JiraTicketCreation
        isOpen={showJiraModal}
        onClose={() => setShowJiraModal(false)}
        meetingData={{
          title: meeting.title,
          notes: mockMeetingNotes,
          actionItems: mockActionItems,
          decisions: mockDecisions,
          participants: meeting.participants
        }}
        currentUser={currentUser}
        userPermissions={userPermissions}
      />
    </div>
  );
}