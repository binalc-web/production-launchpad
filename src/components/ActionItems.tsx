import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  User, 
  Clock, 
  AlertTriangle,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  Circle,
  Play,
  CheckCircle2,
  XCircle,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus,
  Target,
  FileText,
  ExternalLink,
  Timer,
  CalendarClock,
  UserCheck,
  Zap,
  Flag,
  Tag,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';

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

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assignee: {
    id: string;
    name: string;
    avatar: string;
  };
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done' | 'overdue';
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  createdBy: string;
  createdAt: string;
  tags?: string[];
  jiraTicket?: string;
}

interface ActionItemsProps {
  currentUser: User;
  userPermissions: UserPermissions;
}

export function ActionItems({ currentUser, userPermissions }: ActionItemsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Mock action items data
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    {
      id: '1',
      title: 'Complete mobile app performance audit',
      description: 'Run comprehensive performance tests on iOS and Android platforms',
      assignee: {
        id: '2',
        name: 'Mike Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      },
      dueDate: '2025-01-25',
      priority: 'high',
      status: 'in-progress',
      meetingId: 'meeting-1',
      meetingTitle: 'Q1 Product Planning',
      meetingDate: '2025-01-23',
      createdBy: 'Sarah Johnson',
      createdAt: '2025-01-23T10:30:00Z',
      tags: ['performance', 'mobile'],
      jiraTicket: 'MT-123'
    },
    {
      id: '2',
      title: 'Research offline functionality solutions',
      description: 'Investigate and document options for offline app functionality',
      assignee: {
        id: '3',
        name: 'Emily Davis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
      },
      dueDate: '2025-01-27',
      priority: 'medium',
      status: 'todo',
      meetingId: 'meeting-1',
      meetingTitle: 'Q1 Product Planning',
      meetingDate: '2025-01-23',
      createdBy: 'Sarah Johnson',
      createdAt: '2025-01-23T10:45:00Z',
      tags: ['research', 'offline']
    },
    {
      id: '3',
      title: 'Update project timeline document',
      description: 'Reflect new priorities and resource allocation changes',
      assignee: {
        id: '1',
        name: 'John Smith',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      dueDate: '2025-01-24',
      priority: 'high',
      status: 'overdue',
      meetingId: 'meeting-2',
      meetingTitle: 'Sprint Retrospective',
      meetingDate: '2025-01-22',
      createdBy: 'Sarah Johnson',
      createdAt: '2025-01-22T15:15:00Z',
      tags: ['documentation', 'planning']
    },
    {
      id: '4',
      title: 'Schedule technical design review',
      description: 'Coordinate with architecture team for design validation',
      assignee: {
        id: '4',
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      },
      dueDate: '2025-01-26',
      priority: 'medium',
      status: 'done',
      meetingId: 'meeting-1',
      meetingTitle: 'Q1 Product Planning',
      meetingDate: '2025-01-23',
      createdBy: 'John Smith',
      createdAt: '2025-01-23T11:00:00Z',
      tags: ['meeting', 'architecture']
    },
    {
      id: '5',
      title: 'Prepare user testing scenarios',
      description: 'Create test scenarios for the new feature rollout',
      assignee: {
        id: '3',
        name: 'Emily Davis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
      },
      dueDate: '2025-01-28',
      priority: 'low',
      status: 'todo',
      meetingId: 'meeting-3',
      meetingTitle: 'UX Review Session',
      meetingDate: '2025-01-24',
      createdBy: 'Mike Chen',
      createdAt: '2025-01-24T09:30:00Z',
      tags: ['testing', 'ux']
    }
  ]);

  // Filter action items based on user role and permissions
  const getFilteredActionItems = () => {
    let filtered = actionItems;

    // Role-based filtering
    if (!userPermissions.canAccessAllMeetings) {
      // Employees can only see items assigned to them or from meetings they attended
      filtered = filtered.filter(item => 
        item.assignee.id === currentUser.id
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.meetingTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assignee.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }

    // Apply assignee filter
    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(item => item.assignee.id === assigneeFilter);
    }

    return filtered;
  };

  const filteredItems = getFilteredActionItems();

  // Get unique assignees for filter
  const uniqueAssignees = Array.from(
    new Map(actionItems.map(item => [item.assignee.id, item.assignee])).values()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
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
      case 'done': return <CheckCircle2 className="h-3 w-3" />;
      case 'in-progress': return <Play className="h-3 w-3" />;
      case 'overdue': return <AlertTriangle className="h-3 w-3" />;
      default: return <Circle className="h-3 w-3" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Flame className="h-3 w-3" />;
      case 'medium': return <ArrowUp className="h-3 w-3" />;
      case 'low': return <ArrowDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  const getTaskTypeIcon = (tags: string[] = []) => {
    if (tags.includes('meeting')) return <Calendar className="h-4 w-4" />;
    if (tags.includes('research')) return <Search className="h-4 w-4" />;
    if (tags.includes('documentation')) return <FileText className="h-4 w-4" />;
    if (tags.includes('testing')) return <Target className="h-4 w-4" />;
    if (tags.includes('performance')) return <Zap className="h-4 w-4" />;
    if (tags.includes('architecture')) return <Settings className="h-4 w-4" />;
    return <CheckSquare className="h-4 w-4" />;
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleStatusChange = (itemId: string, newStatus: ActionItem['status']) => {
    setActionItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    );
  };

  // Statistics
  const stats = {
    total: actionItems.length,
    todo: actionItems.filter(item => item.status === 'todo').length,
    inProgress: actionItems.filter(item => item.status === 'in-progress').length,
    done: actionItems.filter(item => item.status === 'done').length,
    overdue: actionItems.filter(item => item.status === 'overdue').length
  };

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Action Items</h2>
          <p className="text-muted-foreground">
            {userPermissions.canAccessAllMeetings 
              ? 'Track and manage all team action items from meetings'
              : 'Track your assigned action items and tasks'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            View All
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          {userPermissions.canCreateMeetings && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
            <Circle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.todo}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Progress */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <h4 className="font-medium">Overall Completion</h4>
            </div>
            <span className="text-2xl font-bold text-primary">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
            <span>{stats.done} of {stats.total} completed</span>
            {completionRate >= 80 && (
              <div className="flex items-center space-x-1 text-green-600">
                <Flag className="h-3 w-3" />
                <span>Great progress!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search action items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {userPermissions.canAccessAllMeetings && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {uniqueAssignees.map(assignee => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Action Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No action items found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No action items available to display'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Task Type Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className={`p-2 rounded-lg ${
                        item.status === 'done' 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                          : item.status === 'overdue' 
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                            : item.status === 'in-progress'
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {getTaskTypeIcon(item.tags)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={`font-medium ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                              {item.title}
                            </h4>
                            {/* Priority indicator */}
                            <div className={`p-1 rounded ${
                              item.priority === 'high' 
                                ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                : item.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                              {getPriorityIcon(item.priority)}
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1 capitalize">{item.status.replace('-', ' ')}</span>
                          </Badge>
                          <Badge className={getPriorityColor(item.priority)}>
                            {getPriorityIcon(item.priority)}
                            <span className="ml-1 capitalize">{item.priority}</span>
                          </Badge>
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <UserCheck className="h-3 w-3" />
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={item.assignee.avatar} alt={item.assignee.name} />
                            <AvatarFallback className="text-xs">{item.assignee.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{item.assignee.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <CalendarClock className={`h-3 w-3 ${
                            isOverdue(item.dueDate) && item.status !== 'done' 
                              ? 'text-red-500' 
                              : getDaysUntilDue(item.dueDate) <= 2 && item.status !== 'done'
                                ? 'text-yellow-500'
                                : 'text-muted-foreground'
                          }`} />
                          <span className={
                            isOverdue(item.dueDate) && item.status !== 'done' 
                              ? 'text-red-600 font-medium' 
                              : getDaysUntilDue(item.dueDate) <= 2 && item.status !== 'done'
                                ? 'text-yellow-600 font-medium'
                                : ''
                          }>
                            Due {new Date(item.dueDate).toLocaleDateString()}
                            {isOverdue(item.dueDate) && item.status !== 'done' && (
                              <span className="text-red-600 ml-1 font-medium">(Overdue)</span>
                            )}
                            {!isOverdue(item.dueDate) && item.status !== 'done' && (
                              <span className="ml-1">
                                ({getDaysUntilDue(item.dueDate)} days)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>From: {item.meetingTitle}</span>
                        </div>

                        {item.jiraTicket && (
                          <div className="flex items-center space-x-1">
                            <ExternalLink className="h-3 w-3 text-blue-600" />
                            <span className="text-blue-600">{item.jiraTicket}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {item.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      {/* Status toggle */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const newStatus = item.status === 'done' ? 'todo' : 
                                          item.status === 'todo' ? 'in-progress' : 'done';
                          handleStatusChange(item.id, newStatus);
                        }}
                      >
                        {item.status === 'done' ? (
                          <XCircle className="h-3 w-3 text-gray-500" />
                        ) : item.status === 'in-progress' ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <Play className="h-3 w-3 text-blue-600" />
                        )}
                      </Button>
                      
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                      
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}