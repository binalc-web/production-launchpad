import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Filter, 
  Search,
  Eye,
  Video,
  MapPin,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


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

interface TeamMemberAvailability {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'available' | 'busy' | 'in-meeting' | 'offline';
  currentActivity?: string;
  nextAvailable?: string;
  workingHours: string;
  timezone: string;
  upcomingMeetings: Array<{
    title: string;
    time: string;
    duration: number;
    isPrivate?: boolean;
  }>;
}

interface AvailabilityProps {
  currentUser: User;
  userPermissions: UserPermissions;
  integrations: Integrations;
}

export function Availability({ currentUser, userPermissions, integrations }: AvailabilityProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Mock team availability data
  const teamAvailability: TeamMemberAvailability[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'Product Manager',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      status: 'available',
      workingHours: '9:00 AM - 5:00 PM',
      timezone: 'EST',
      upcomingMeetings: [
        { title: 'Product Review', time: '2:00 PM', duration: 60 },
        { title: 'Client Call', time: '4:00 PM', duration: 30 }
      ]
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      role: 'Senior Developer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      status: 'in-meeting',
      currentActivity: 'Sprint Planning',
      nextAvailable: '3:30 PM',
      workingHours: '8:30 AM - 4:30 PM',
      timezone: 'EST',
      upcomingMeetings: [
        { title: 'Code Review', time: '11:00 AM', duration: 45, isPrivate: false },
        { title: 'Private', time: '3:30 PM', duration: 60, isPrivate: true }
      ]
    },
    {
      id: '3',
      name: 'Emily Davis',
      email: 'emily.davis@company.com',
      role: 'UX Designer',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      status: 'busy',
      currentActivity: 'Focus Time - Design Review',
      nextAvailable: '1:00 PM',
      workingHours: '9:30 AM - 5:30 PM',
      timezone: 'EST',
      upcomingMeetings: [
        { title: 'Design Sync', time: '1:00 PM', duration: 30 },
        { title: 'User Research', time: '2:30 PM', duration: 90 }
      ]
    },
    {
      id: '4',
      name: 'David Wilson',
      email: 'david.wilson@company.com',
      role: 'QA Engineer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      status: 'offline',
      nextAvailable: 'Tomorrow 9:00 AM',
      workingHours: '9:00 AM - 5:00 PM',
      timezone: 'EST',
      upcomingMeetings: []
    }
  ];

  const filteredTeam = teamAvailability.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    
    // Role-based filtering for employees
    if (!userPermissions.canAccessAllMeetings) {
      // Employees can only see their own availability and public info of others
      return member.id === currentUser.id || matchesSearch && matchesStatus;
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'busy': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'in-meeting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'offline': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-3 w-3" />;
      case 'busy': return <Clock className="h-3 w-3" />;
      case 'in-meeting': return <Video className="h-3 w-3" />;
      case 'offline': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const refreshAvailability = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Team Availability</h2>
          <p className="text-muted-foreground">
            {userPermissions.canAccessAllMeetings 
              ? 'View real-time availability and upcoming meetings for your team'
              : 'View your availability and public team schedules'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={refreshAvailability}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Integration Status */}
      {integrations.googleCalendar.connected ? (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">Google Calendar Connected</h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Real-time availability data is being synced from Google Calendar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <h4 className="font-medium text-orange-900 dark:text-orange-100">Limited Availability Data</h4>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Connect Google Calendar for real-time availability updates
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Connect Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="in-meeting">In Meeting</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Availability List */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeam.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{member.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(member.status)}>
                    {getStatusIcon(member.status)}
                    <span className="ml-1 capitalize">{member.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Current Activity */}
                {member.currentActivity && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Current: </span>
                    <span className="font-medium">{member.currentActivity}</span>
                  </div>
                )}

                {/* Next Available */}
                {member.nextAvailable && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Next available: </span>
                    <span className="font-medium">{member.nextAvailable}</span>
                  </div>
                )}

                {/* Working Hours */}
                <div className="text-sm">
                  <span className="text-muted-foreground">Hours: </span>
                  <span>{member.workingHours} ({member.timezone})</span>
                </div>

                {/* Upcoming Meetings */}
                {member.upcomingMeetings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Upcoming Today:</p>
                    <div className="space-y-1">
                      {member.upcomingMeetings.slice(0, 2).map((meeting, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className={meeting.isPrivate ? 'text-muted-foreground' : ''}>
                            {meeting.title}
                          </span>
                          <span className="text-muted-foreground">
                            {meeting.time} ({meeting.duration}m)
                          </span>
                        </div>
                      ))}
                      {member.upcomingMeetings.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{member.upcomingMeetings.length - 2} more meetings
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {userPermissions.canCreateMeetings && member.status === 'available' && (
                  <div className="pt-2">
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Schedule Meeting
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTeam.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No team members found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No team members available to display'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}