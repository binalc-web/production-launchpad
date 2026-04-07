import React, { useState } from 'react';
import { FileText, Plus, User, Calendar, Clock, Tag, Save, Send, Trash2, Edit, Check, X, Bot, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AIAssistant } from './AIAssistant';
import { toast } from "sonner@2.0.3";

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
}

interface ActionItem {
  id: string;
  description: string;
  assignee: {
    id: string;
    name: string;
    avatar: string;
  };
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  tags: string[];
}

interface MeetingMOM {
  id: string;
  meetingId: string;
  meetingTitle: string;
  date: string;
  time: string;
  duration: number;
  participants: Array<{
    id: string;
    name: string;
    avatar: string;
    role: string;
  }>;
  agenda: string[];
  keyDiscussions: string;
  decisions: string[];
  actionItems: ActionItem[];
  nextSteps: string;
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  lastUpdated: string;
  createdBy: User;
}

interface AISuggestion {
  id: string;
  type: 'agenda' | 'action' | 'decision' | 'summary' | 'time-reminder' | 'meeting-skip';
  title: string;
  content: string;
  confidence: number;
  timestamp?: string;
  speaker?: string;
  priority: 'low' | 'medium' | 'high';
}

interface MOMEditorProps {
  currentUser: User;
}

export function MOMEditor({ currentUser }: MOMEditorProps) {
  const [selectedMOM, setSelectedMOM] = useState<string>('1');
  const [isEditing, setIsEditing] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [newActionItem, setNewActionItem] = useState({
    description: '',
    assigneeId: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    tags: [] as string[]
  });

  // Mock team members for action item assignment
  const teamMembers = [
    { id: '1', name: 'John Smith', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
    { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' },
    { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
    { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' }
  ];

  // Mock MOMs data
  const moms: MeetingMOM[] = [
    {
      id: '1',
      meetingId: '3',
      meetingTitle: 'Client Feedback Review',
      date: '2025-07-12',
      time: '10:30',
      duration: 60,
      participants: [
        { id: '1', name: 'John Smith', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', role: 'Team Lead' },
        { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', role: 'Product Manager' }
      ],
      agenda: [
        'Review client feedback from Q2',
        'Discuss improvement priorities',
        'Plan implementation timeline'
      ],
      keyDiscussions: 'Clients highlighted issues with the mobile app performance and requested better offline functionality. Team discussed technical solutions and resource requirements.',
      decisions: [
        'Prioritize mobile app performance improvements',
        'Allocate 2 developers for offline functionality',
        'Set target completion for end of Q3'
      ],
      actionItems: [
        {
          id: '1',
          description: 'Conduct performance audit of mobile app',
          assignee: { id: '3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
          dueDate: '2025-07-20',
          priority: 'high',
          status: 'in-progress',
          tags: ['mobile', 'performance']
        },
        {
          id: '2',
          description: 'Research offline functionality solutions',
          assignee: { id: '4', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
          dueDate: '2025-07-25',
          priority: 'medium',
          status: 'pending',
          tags: ['offline', 'research']
        }
      ],
      nextSteps: 'Follow up on action items in next weekly standup. Schedule technical design review for offline functionality.',
      attachments: [
        { id: '1', name: 'Client_Feedback_Report.pdf', type: 'pdf', url: '#' },
        { id: '2', name: 'Performance_Metrics.xlsx', type: 'excel', url: '#' }
      ],
      lastUpdated: '2025-07-12 15:30',
      createdBy: currentUser
    }
  ];

  const [currentMOM, setCurrentMOM] = useState<MeetingMOM>(moms[0]);

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleAISuggestion = (suggestion: AISuggestion) => {
    switch (suggestion.type) {
      case 'summary':
        // Parse and apply AI-generated summary
        const summaryLines = suggestion.content.split('\n').filter(line => line.trim());
        const discussionsStart = summaryLines.findIndex(line => line.includes('Key Discussion'));
        const decisionsStart = summaryLines.findIndex(line => line.includes('Decisions Made'));
        
        if (discussionsStart !== -1 && decisionsStart !== -1) {
          const discussions = summaryLines.slice(discussionsStart + 1, decisionsStart)
            .filter(line => line.startsWith('•'))
            .map(line => line.substring(1).trim())
            .join('\n');
          
          const decisions = summaryLines.slice(decisionsStart + 1)
            .filter(line => line.startsWith('•'))
            .map(line => line.substring(1).trim());
          
          setCurrentMOM(prev => ({
            ...prev,
            keyDiscussions: discussions,
            decisions
          }));
        }
        break;
        
      case 'action':
        // Parse and apply AI-extracted action items
        const actionLines = suggestion.content.split('\n')
          .filter(line => line.startsWith('•'))
          .map(line => line.substring(1).trim());
        
        actionLines.forEach((actionText, index) => {
          const [description, assigneeText, dueText] = actionText.split(/\((Due:|:)/);
          if (description && assigneeText) {
            const assigneeName = assigneeText.trim();
            const assignee = teamMembers.find(member => assigneeName.includes(member.name));
            
            if (assignee) {
              const newActionItem: ActionItem = {
                id: `ai-${Date.now()}-${index}`,
                description: description.replace(/^\w+ \w+:/, '').trim(),
                assignee,
                dueDate: dueText ? dueText.replace(')', '').trim() : '',
                priority: 'medium',
                status: 'pending',
                tags: []
              };
              
              setCurrentMOM(prev => ({
                ...prev,
                actionItems: [...prev.actionItems, newActionItem]
              }));
            }
          }
        });
        break;
        
      default:
        break;
    }
  };

  const addActionItem = () => {
    if (!newActionItem.description || !newActionItem.assigneeId || !newActionItem.dueDate) {
      toast.error('Please fill in all required fields for the action item');
      return;
    }

    const assignee = teamMembers.find(member => member.id === newActionItem.assigneeId);
    if (!assignee) return;

    const actionItem: ActionItem = {
      id: Date.now().toString(),
      description: newActionItem.description,
      assignee,
      dueDate: newActionItem.dueDate,
      priority: newActionItem.priority,
      status: 'pending',
      tags: newActionItem.tags
    };

    setCurrentMOM(prev => ({
      ...prev,
      actionItems: [...prev.actionItems, actionItem]
    }));

    setNewActionItem({
      description: '',
      assigneeId: '',
      dueDate: '',
      priority: 'medium',
      tags: []
    });

    toast.success('Action item added successfully');
  };

  const updateActionItemStatus = (actionItemId: string, status: ActionItem['status']) => {
    setCurrentMOM(prev => ({
      ...prev,
      actionItems: prev.actionItems.map(item =>
        item.id === actionItemId ? { ...item, status } : item
      )
    }));
    toast.success('Action item status updated');
  };

  const deleteActionItem = (actionItemId: string) => {
    setCurrentMOM(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter(item => item.id !== actionItemId)
    }));
    toast.success('Action item deleted');
  };

  const saveMOM = () => {
    toast.success('Minutes of Meeting saved successfully');
    setIsEditing(false);
  };

  const shareMOM = () => {
    toast.success('MOM shared with all participants');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Minutes of Meeting</h2>
          <p className="text-muted-foreground">Create and manage meeting minutes with AI assistance</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className={showAIAssistant ? 'bg-primary/10 border-primary/20 text-primary' : ''}
          >
            <Bot className="h-4 w-4 mr-2" />
            AI Assistant
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? 'View Mode' : 'Edit Mode'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">MOM Editor</TabsTrigger>
          <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* MOM Selection Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent MOMs</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {moms.map((mom) => (
                      <Button
                        key={mom.id}
                        variant={selectedMOM === mom.id ? "secondary" : "ghost"}
                        className="w-full justify-start p-3 h-auto"
                        onClick={() => {
                          setSelectedMOM(mom.id);
                          setCurrentMOM(mom);
                        }}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{mom.meetingTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(mom.date).toLocaleDateString()}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                New MOM
              </Button>

              {/* AI Quick Actions */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    AI Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <FileText className="h-3 w-3 mr-2" />
                    Generate Summary
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <Check className="h-3 w-3 mr-2" />
                    Extract Actions
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <Bot className="h-3 w-3 mr-2" />
                    Analyze Decisions
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main MOM Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* MOM Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{currentMOM.meetingTitle}</CardTitle>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(currentMOM.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{currentMOM.time} ({currentMOM.duration}m)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={saveMOM}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" onClick={shareMOM}>
                        <Send className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Participants</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentMOM.participants.map((participant) => (
                          <div key={participant.id} className="flex items-center space-x-2 bg-muted rounded-full pl-1 pr-3 py-1">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={participant.avatar} alt={participant.name} />
                              <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{participant.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI-Enhanced Sections */}
              {/* Agenda */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Agenda</CardTitle>
                    {isEditing && (
                      <Button variant="outline" size="sm" className="text-primary border-primary/20 bg-primary/5">
                        <Sparkles className="h-3 w-3 mr-2" />
                        AI Suggest
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-2">
                      {currentMOM.agenda.map((item, index) => (
                        <Input
                          key={index}
                          value={item}
                          onChange={(e) => {
                            const newAgenda = [...currentMOM.agenda];
                            newAgenda[index] = e.target.value;
                            setCurrentMOM(prev => ({ ...prev, agenda: newAgenda }));
                          }}
                        />
                      ))}
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Agenda Item
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {currentMOM.agenda.map((item, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-muted-foreground mt-1">{index + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Key Discussions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Key Discussions</CardTitle>
                    {isEditing && (
                      <Button variant="outline" size="sm" className="text-primary border-primary/20 bg-primary/5">
                        <Bot className="h-3 w-3 mr-2" />
                        AI Generate
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={currentMOM.keyDiscussions}
                      onChange={(e) => setCurrentMOM(prev => ({ ...prev, keyDiscussions: e.target.value }))}
                      rows={4}
                      placeholder="Summarize the key discussions and points raised during the meeting..."
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{currentMOM.keyDiscussions}</p>
                  )}
                </CardContent>
              </Card>

              {/* Decisions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Decisions Made</CardTitle>
                    {isEditing && (
                      <Button variant="outline" size="sm" className="text-primary border-primary/20 bg-primary/5">
                        <Check className="h-3 w-3 mr-2" />
                        AI Extract
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-2">
                      {currentMOM.decisions.map((decision, index) => (
                        <Input
                          key={index}
                          value={decision}
                          onChange={(e) => {
                            const newDecisions = [...currentMOM.decisions];
                            newDecisions[index] = e.target.value;
                            setCurrentMOM(prev => ({ ...prev, decisions: newDecisions }));
                          }}
                        />
                      ))}
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Decision
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {currentMOM.decisions.map((decision, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Check className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Action Items</CardTitle>
                    {isEditing && (
                      <Button variant="outline" size="sm" className="text-primary border-primary/20 bg-primary/5">
                        <Sparkles className="h-3 w-3 mr-2" />
                        AI Extract Actions
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add New Action Item */}
                  {isEditing && (
                    <div className="border border-dashed border-border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Add New Action Item</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="actionDescription">Description *</Label>
                          <Input
                            id="actionDescription"
                            placeholder="Describe the action item"
                            value={newActionItem.description}
                            onChange={(e) => setNewActionItem(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="assignee">Assignee *</Label>
                          <Select value={newActionItem.assigneeId} onValueChange={(value) => setNewActionItem(prev => ({ ...prev, assigneeId: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={member.avatar} alt={member.name} />
                                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{member.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="dueDate">Due Date *</Label>
                          <Input
                            id="dueDate"
                            type="date"
                            value={newActionItem.dueDate}
                            onChange={(e) => setNewActionItem(prev => ({ ...prev, dueDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select value={newActionItem.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewActionItem(prev => ({ ...prev, priority: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Button onClick={addActionItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Action Item
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing Action Items */}
                  <div className="space-y-3">
                    {currentMOM.actionItems.map((actionItem) => (
                      <div key={actionItem.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <p className="font-medium">{actionItem.description}</p>
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={actionItem.assignee.avatar} alt={actionItem.assignee.name} />
                                  <AvatarFallback>{actionItem.assignee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{actionItem.assignee.name}</span>
                              </div>
                              <span className="text-muted-foreground">
                                Due: {new Date(actionItem.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className={getPriorityColor(actionItem.priority)}>
                                {actionItem.priority.charAt(0).toUpperCase() + actionItem.priority.slice(1)}
                              </Badge>
                              <Badge variant="secondary" className={getStatusColor(actionItem.status)}>
                                {actionItem.status.charAt(0).toUpperCase() + actionItem.status.replace('-', ' ').slice(1)}
                              </Badge>
                              {actionItem.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Select 
                              value={actionItem.status} 
                              onValueChange={(value: ActionItem['status']) => updateActionItemStatus(actionItem.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                            {isEditing && (
                              <Button variant="ghost" size="sm" onClick={() => deleteActionItem(actionItem.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Next Steps</CardTitle>
                    {isEditing && (
                      <Button variant="outline" size="sm" className="text-primary border-primary/20 bg-primary/5">
                        <Bot className="h-3 w-3 mr-2" />
                        AI Generate
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={currentMOM.nextSteps}
                      onChange={(e) => setCurrentMOM(prev => ({ ...prev, nextSteps: e.target.value }))}
                      rows={3}
                      placeholder="Outline the next steps and follow-up actions..."
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{currentMOM.nextSteps}</p>
                  )}
                </CardContent>
              </Card>

              {/* Attachments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentMOM.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 border border-border rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{attachment.name}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                      </div>
                    ))}
                    {isEditing && (
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Attachment
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai-assistant" className="space-y-6">
          <AIAssistant
            mode="post-meeting"
            meetingId={currentMOM.meetingId}
            participants={currentMOM.participants}
            onSuggestionAccept={handleAISuggestion}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}