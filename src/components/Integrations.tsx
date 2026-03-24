import React, { useState } from 'react';
import { 
  Settings, 
  Calendar as CalendarIcon, 
  Video, 
  BookOpen, 
  CheckSquare, 
  Plus, 
  Zap, 
  Users, 
  Clock, 
  FileText,
  ExternalLink,
  Shield,
  AlertCircle,
  Check,
  X,
  RotateCcw,
  Download,
  Upload,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from "sonner@2.0.3";

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
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

interface IntegrationsProps {
  currentUser: User;
  integrations: Integrations;
  onUpdateIntegration: (service: string, data: IntegrationData) => void;
}

interface ImportedMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  attendees: string[];
  source: 'google' | 'zoom';
  hasTranscript?: boolean;
  hasRecording?: boolean;
  client?: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  type: string;
  lead: string;
}

interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  description: string;
  pageCount: number;
}

export function Integrations({ currentUser, integrations, onUpdateIntegration }: IntegrationsProps) {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedImportService, setSelectedImportService] = useState<string>('');
  const [importProgress, setImportProgress] = useState(0);
  const [selectedJiraProject, setSelectedJiraProject] = useState<string>('');
  const [selectedConfluenceSpace, setSelectedConfluenceSpace] = useState<string>('');

  // Mock data for demonstrations
  const mockGoogleMeetings: ImportedMeeting[] = [
    {
      id: 'gcal-1',
      title: 'Weekly Product Review',
      date: '2025-01-20',
      time: '14:00',
      duration: 60,
      attendees: ['sarah.j@company.com', 'mike.c@company.com'],
      source: 'google',
      client: 'TechCorp Inc.'
    },
    {
      id: 'gcal-2',
      title: 'Q1 Planning Session',
      date: '2025-01-22',
      time: '10:00',
      duration: 120,
      attendees: ['emily.d@company.com', 'david.w@company.com'],
      source: 'google',
      client: 'InnovateLabs'
    }
  ];

  const mockZoomMeetings: ImportedMeeting[] = [
    {
      id: 'zoom-1',
      title: 'Client Feedback Session',
      date: '2025-01-18',
      time: '15:30',
      duration: 90,
      attendees: ['client@techcorp.com', 'john.s@company.com'],
      source: 'zoom',
      hasTranscript: true,
      hasRecording: true,
      client: 'TechCorp Inc.'
    },
    {
      id: 'zoom-2',
      title: 'Team Standup',
      date: '2025-01-19',
      time: '09:00',
      duration: 30,
      attendees: ['team@company.com'],
      source: 'zoom',
      hasTranscript: true,
      hasRecording: false
    }
  ];

  const mockJiraProjects: JiraProject[] = [
    {
      id: 'proj-1',
      key: 'MT',
      name: 'Meeting Tracker',
      type: 'Software',
      lead: 'John Smith'
    },
    {
      id: 'proj-2',
      key: 'API',
      name: 'API Gateway',
      type: 'Software',
      lead: 'Sarah Johnson'
    },
    {
      id: 'proj-3',
      key: 'UX',
      name: 'User Experience',
      type: 'Design',
      lead: 'Emily Davis'
    }
  ];

  const mockConfluenceSpaces: ConfluenceSpace[] = [
    {
      id: 'space-1',
      key: 'ENG',
      name: 'Engineering',
      description: 'Technical documentation and architecture decisions',
      pageCount: 156
    },
    {
      id: 'space-2',
      key: 'PROD',
      name: 'Product',
      description: 'Product requirements and roadmap documentation',
      pageCount: 89
    },
    {
      id: 'space-3',
      key: 'MEET',
      name: 'Meeting Notes',
      description: 'Centralized meeting documentation and decisions',
      pageCount: 234
    }
  ];

  const handleConnect = async (service: string) => {
    setIsConnecting(service);
    
    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 2000));

    let mockData = {};
    switch (service) {
      case 'googleCalendar':
        mockData = {
          connected: true,
          data: {
            account: 'john.smith@company.com',
            calendars: ['Primary', 'Work', 'Meetings'],
            lastSync: new Date().toISOString(),
            meetingsImported: mockGoogleMeetings.length
          }
        };
        break;
      case 'zoom':
        mockData = {
          connected: true,
          data: {
            account: 'john.smith@company.com',
            plan: 'Pro',
            lastSync: new Date().toISOString(),
            meetingsImported: mockZoomMeetings.length,
            transcriptFeatures: true,
            recordingFeatures: true
          }
        };
        break;
      case 'jira':
        mockData = {
          connected: true,
          data: {
            instance: 'company.atlassian.net',
            account: 'john.smith@company.com',
            projects: mockJiraProjects,
            selectedProject: selectedJiraProject || mockJiraProjects[0].id
          }
        };
        break;
      case 'confluence':
        mockData = {
          connected: true,
          data: {
            instance: 'company.atlassian.net',
            account: 'john.smith@company.com',
            spaces: mockConfluenceSpaces,
            selectedSpace: selectedConfluenceSpace || mockConfluenceSpaces[0].id
          }
        };
        break;
    }

    onUpdateIntegration(service, mockData);
    setIsConnecting(null);
    toast.success(`${getServiceName(service)} connected successfully!`);
  };

  const handleDisconnect = (service: string) => {
    onUpdateIntegration(service, { connected: false, data: null });
    toast.success(`${getServiceName(service)} disconnected`);
  };

  const handleImportData = async (service: string) => {
    setSelectedImportService(service);
    setShowImportDialog(true);
    setImportProgress(0);

    // Simulate import progress
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setShowImportDialog(false);
          toast.success(`Data imported from ${getServiceName(service)}`);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getServiceName = (service: string): string => {
    const names: { [key: string]: string } = {
      googleCalendar: 'Google Calendar',
      zoom: 'Zoom',
      jira: 'Jira',
      confluence: 'Confluence'
    };
    return names[service] || service;
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'googleCalendar': return <CalendarIcon className="h-5 w-5" />;
      case 'zoom': return <Video className="h-5 w-5" />;
      case 'jira': return <CheckSquare className="h-5 w-5" />;
      case 'confluence': return <BookOpen className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getServiceColor = (service: string): string => {
    switch (service) {
      case 'googleCalendar': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
      case 'zoom': return 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
      case 'jira': return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
      case 'confluence': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Integrations</h2>
          <p className="text-muted-foreground">Connect your favorite tools to enhance your meeting experience</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {Object.values(integrations).filter(i => i.connected).length}/4 Connected
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Integration Overview</TabsTrigger>
          <TabsTrigger value="data">Data & Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Calendar */}
            <Card className={`border-2 transition-colors ${integrations.googleCalendar.connected ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-border'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getServiceColor('googleCalendar')}`}>
                      {getServiceIcon('googleCalendar')}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Google Calendar</CardTitle>
                      <p className="text-sm text-muted-foreground">Sync meetings and track client interactions</p>
                    </div>
                  </div>
                  {integrations.googleCalendar.connected && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {integrations.googleCalendar.connected ? (
                  <div className="space-y-3">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account:</span>
                        <span>{integrations.googleCalendar.data?.account}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Calendars:</span>
                        <span>{integrations.googleCalendar.data?.calendars?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Sync:</span>
                        <span>
                          {integrations.googleCalendar.data?.lastSync 
                            ? new Date(integrations.googleCalendar.data.lastSync).toLocaleString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleImportData('googleCalendar')}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Import Meetings
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDisconnect('googleCalendar')}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center"><Zap className="h-3 w-3 mr-2" />Import past and upcoming meetings</p>
                      <p className="flex items-center"><Users className="h-3 w-3 mr-2" />Track client interactions and contacts</p>
                      <p className="flex items-center"><Clock className="h-3 w-3 mr-2" />Auto-sync meeting schedules</p>
                    </div>
                    <Button 
                      onClick={() => handleConnect('googleCalendar')}
                      disabled={isConnecting === 'googleCalendar'}
                      className="w-full"
                    >
                      {isConnecting === 'googleCalendar' ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Connect Google Calendar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Zoom */}
            <Card className={`border-2 transition-colors ${integrations.zoom.connected ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-border'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getServiceColor('zoom')}`}>
                      {getServiceIcon('zoom')}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Zoom</CardTitle>
                      <p className="text-sm text-muted-foreground">Create meetings and access AI-powered transcripts</p>
                    </div>
                  </div>
                  {integrations.zoom.connected && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {integrations.zoom.connected ? (
                  <div className="space-y-3">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account:</span>
                        <span>{integrations.zoom.data?.account}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan:</span>
                        <span>{integrations.zoom.data?.plan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">AI Features:</span>
                        <span>{integrations.zoom.data?.transcriptFeatures ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleImportData('zoom')}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Import Transcripts
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDisconnect('zoom')}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center"><Video className="h-3 w-3 mr-2" />Create meetings directly from app</p>
                      <p className="flex items-center"><FileText className="h-3 w-3 mr-2" />Access AI transcripts and summaries</p>
                      <p className="flex items-center"><Zap className="h-3 w-3 mr-2" />Auto-generate meeting insights</p>
                    </div>
                    <Button 
                      onClick={() => handleConnect('zoom')}
                      disabled={isConnecting === 'zoom'}
                      className="w-full"
                    >
                      {isConnecting === 'zoom' ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Connect Zoom
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Jira */}
            <Card className={`border-2 transition-colors ${integrations.jira.connected ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-border'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getServiceColor('jira')}`}>
                      {getServiceIcon('jira')}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Jira</CardTitle>
                      <p className="text-sm text-muted-foreground">Link projects and manage meeting action items</p>
                    </div>
                  </div>
                  {integrations.jira.connected && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {integrations.jira.connected ? (
                  <div className="space-y-3">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Instance:</span>
                        <span>{integrations.jira.data?.instance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Projects:</span>
                        <span>{integrations.jira.data?.projects?.length || 0}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jiraProject">Default Project</Label>
                      <Select 
                        value={selectedJiraProject || integrations.jira.data?.selectedProject}
                        onValueChange={setSelectedJiraProject}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockJiraProjects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">{project.key}</Badge>
                                <span>{project.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleImportData('jira')}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        View Projects
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDisconnect('jira')}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center"><CheckSquare className="h-3 w-3 mr-2" />Auto-create tasks from action items</p>
                      <p className="flex items-center"><Users className="h-3 w-3 mr-2" />Link meetings to project context</p>
                      <p className="flex items-center"><Zap className="h-3 w-3 mr-2" />Track meeting outcomes in tickets</p>
                    </div>
                    <Button 
                      onClick={() => handleConnect('jira')}
                      disabled={isConnecting === 'jira'}
                      className="w-full"
                    >
                      {isConnecting === 'jira' ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Connect Jira
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Confluence */}
            <Card className={`border-2 transition-colors ${integrations.confluence.connected ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-border'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getServiceColor('confluence')}`}>
                      {getServiceIcon('confluence')}
                    </div>
                    <div>
                      <CardTitle className="text-lg">Confluence</CardTitle>
                      <p className="text-sm text-muted-foreground">Access knowledge base and create documentation</p>
                    </div>
                  </div>
                  {integrations.confluence.connected && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {integrations.confluence.connected ? (
                  <div className="space-y-3">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Instance:</span>
                        <span>{integrations.confluence.data?.instance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Spaces:</span>
                        <span>{integrations.confluence.data?.spaces?.length || 0}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confluenceSpace">Default Space</Label>
                      <Select 
                        value={selectedConfluenceSpace || integrations.confluence.data?.selectedSpace}
                        onValueChange={setSelectedConfluenceSpace}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select space" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockConfluenceSpaces.map(space => (
                            <SelectItem key={space.id} value={space.id}>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">{space.key}</Badge>
                                <span>{space.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleImportData('confluence')}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        Browse Spaces
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDisconnect('confluence')}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center"><BookOpen className="h-3 w-3 mr-2" />Access team knowledge base</p>
                      <p className="flex items-center"><FileText className="h-3 w-3 mr-2" />Auto-create pages from MOMs</p>
                      <p className="flex items-center"><ExternalLink className="h-3 w-3 mr-2" />Link meeting context to docs</p>
                    </div>
                    <Button 
                      onClick={() => handleConnect('confluence')}
                      disabled={isConnecting === 'confluence'}
                      className="w-full"
                    >
                      {isConnecting === 'confluence' ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Connect Confluence
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Benefits Section */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Integration Benefits</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Enhanced Meeting Creation</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Import participant availability from Google Calendar</li>
                    <li>• Generate Zoom links automatically</li>
                    <li>• Suggest meeting topics from Jira project context</li>
                    <li>• Pre-populate agendas from Confluence documentation</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Intelligent Documentation</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Auto-generate MOMs from Zoom transcripts</li>
                    <li>• Create Jira tickets from action items</li>
                    <li>• Publish meeting notes to Confluence spaces</li>
                    <li>• Track client interactions across platforms</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {/* Data Import Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Google Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Meetings Imported:</span>
                    <span className="font-medium">{integrations.googleCalendar.connected ? mockGoogleMeetings.length : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Clients Tracked:</span>
                    <span className="font-medium">{integrations.googleCalendar.connected ? 2 : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Sync:</span>
                    <span className="text-muted-foreground text-xs">
                      {integrations.googleCalendar.connected ? 'Just now' : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Zoom</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Recordings:</span>
                    <span className="font-medium">{integrations.zoom.connected ? 1 : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Transcripts:</span>
                    <span className="font-medium">{integrations.zoom.connected ? 2 : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>AI Summaries:</span>
                    <span className="font-medium">{integrations.zoom.connected ? 2 : 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Confluence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pages Created:</span>
                    <span className="font-medium">{integrations.confluence.connected ? 5 : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Spaces Linked:</span>
                    <span className="font-medium">{integrations.confluence.connected ? 3 : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Templates Used:</span>
                    <span className="font-medium">{integrations.confluence.connected ? 2 : 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Imported Data */}
          {(integrations.googleCalendar.connected || integrations.zoom.connected) && (
            <Card>
              <CardHeader>
                <CardTitle>Recently Imported Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integrations.googleCalendar.connected && mockGoogleMeetings.map(meeting => (
                    <div key={meeting.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                            {meeting.client && ` • ${meeting.client}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Google</Badge>
                    </div>
                  ))}
                  
                  {integrations.zoom.connected && mockZoomMeetings.map(meeting => (
                    <div key={meeting.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Video className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                            {meeting.hasTranscript && ' • Transcript available'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {meeting.hasTranscript && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Transcript
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">Zoom</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Data Encryption</h4>
                    <p className="text-sm text-muted-foreground">All integration data is encrypted in transit and at rest using industry-standard protocols.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">OAuth 2.0 Authentication</h4>
                    <p className="text-sm text-muted-foreground">Secure authentication without storing your passwords. You can revoke access anytime.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Eye className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Minimal Data Access</h4>
                    <p className="text-sm text-muted-foreground">We only access the minimum data required for functionality. Review permissions during connection.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Progress Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importing Data from {getServiceName(selectedImportService)}</DialogTitle>
            <DialogDescription>
              Please wait while we import your data. This may take a few moments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Progress value={importProgress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {importProgress < 100 ? `${importProgress}% complete` : 'Import completed successfully!'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}