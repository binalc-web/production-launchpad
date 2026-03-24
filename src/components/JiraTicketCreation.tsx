import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit, Trash2, Bot, CheckSquare, User, Calendar, 
  Clock, Flag, Lightbulb, Target, Users, FileText, Sparkles,
  ArrowRight, ChevronDown, ChevronUp, Filter, Search
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';

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

interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface Decision {
  id: string;
  decision: string;
  context: string;
  impact: string;
  decidedBy: string;
  timestamp: string;
}

interface MeetingData {
  title: string;
  notes: string;
  actionItems: ActionItem[];
  decisions: Decision[];
  participants: Participant[];
}

interface JiraStory {
  id: string;
  type: 'Epic' | 'Story' | 'Task' | 'Bug';
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  assignee: string;
  storyPoints: number;
  labels: string[];
  source: 'action_item' | 'decision' | 'discussion' | 'ai_generated';
  originalContent: string;
  status: 'draft' | 'reviewed' | 'approved' | 'discarded';
  aiConfidence: number;
  linkedItems: string[];
}

interface JiraTicketCreationProps {
  isOpen: boolean;
  onClose: () => void;
  meetingData: MeetingData;
  currentUser: User;
  userPermissions: UserPermissions;
}

export function JiraTicketCreation({ 
  isOpen, 
  onClose, 
  meetingData, 
  currentUser, 
  userPermissions 
}: JiraTicketCreationProps) {
  const [stories, setStories] = useState<JiraStory[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [editingStory, setEditingStory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIInsights, setShowAIInsights] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Generate AI stories from meeting data
  useEffect(() => {
    if (isOpen) {
      generateJiraStories();
    }
  }, [isOpen, meetingData]);

  const generateJiraStories = async () => {
    setIsGenerating(true);
    setCurrentStep(0);
    setProgress(0);
    
    // Simulate progressive loading steps
    const steps = [
      { delay: 500, step: 0, progress: 20, message: 'Processing meeting notes' },
      { delay: 800, step: 1, progress: 60, message: 'Analyzing action items' },
      { delay: 700, step: 2, progress: 90, message: 'Generating stories' },
      { delay: 400, step: 3, progress: 100, message: 'Finalizing results' }
    ];

    for (const { delay, step, progress: stepProgress } of steps) {
      await new Promise(resolve => setTimeout(resolve, delay));
      setCurrentStep(step);
      setProgress(stepProgress);
    }
    
    const generatedStories: JiraStory[] = [
      // Epic from overall meeting theme
      {
        id: 'epic-1',
        type: 'Epic',
        title: 'Mobile-First Redesign Initiative',
        description: `Based on the sprint retrospective discussion, implement a comprehensive mobile-first approach for the application redesign.

This epic encompasses the strategic decision made during the meeting to prioritize mobile users (70% of our user base) and includes all related development work, design updates, and user experience improvements.

**Meeting Context:**
"${meetingData.notes.substring(0, 200)}..."

**Key Decisions:**
• Proceed with mobile-first approach for the redesign
• Allocate additional 2 weeks for mobile optimization
• Update design system with responsive components`,
        acceptanceCriteria: [
          'All new features must be designed mobile-first',
          'Existing components updated to be fully responsive',
          'Performance metrics meet mobile optimization standards',
          'User testing shows improved mobile experience',
          'Design system documentation updated'
        ],
        priority: 'Highest',
        assignee: 'Sarah Johnson',
        storyPoints: 21,
        labels: ['mobile', 'redesign', 'epic', 'user-experience'],
        source: 'decision',
        originalContent: meetingData.decisions[0]?.decision || '',
        status: 'draft',
        aiConfidence: 95,
        linkedItems: ['story-1', 'story-2', 'task-1']
      },

      // Stories from action items
      {
        id: 'story-1',
        type: 'Story',
        title: 'Update Project Timeline for Mobile-First Development',
        description: `As a project manager, I need to update the project timeline to reflect the mobile-first approach decision so that all stakeholders understand the new milestones and delivery dates.

**From Meeting Action Item:**
"${meetingData.actionItems[0]?.text}"

**Business Value:**
• Ensures team alignment on new priorities
• Provides clear expectations to stakeholders
• Enables proper resource allocation

**Technical Considerations:**
• Review current sprint commitments
• Assess impact on existing deadlines
• Coordinate with design team on mobile mockups`,
        acceptanceCriteria: [
          'Timeline updated to include 2 additional weeks for mobile optimization',
          'All stakeholders notified of changes',
          'New milestones clearly defined with mobile-first checkpoints',
          'Resource allocation adjusted for mobile development',
          'Risk assessment completed for timeline changes'
        ],
        priority: 'High',
        assignee: 'Sarah Johnson',
        storyPoints: 5,
        labels: ['planning', 'timeline', 'mobile', 'stakeholder-communication'],
        source: 'action_item',
        originalContent: meetingData.actionItems[0]?.text || '',
        status: 'draft',
        aiConfidence: 88,
        linkedItems: ['epic-1']
      },

      {
        id: 'story-2',
        type: 'Story',
        title: 'Design Mobile Interface Mockups with Responsive Components',
        description: `As a UX designer, I need to create mobile interface mockups that align with the new mobile-first strategy so that developers can implement responsive components effectively.

**From Meeting Action Item:**
"${meetingData.actionItems[1]?.text}"

**Design Requirements:**
• Mobile-first responsive design approach
• Consistent with existing design system
• Optimized for touch interactions
• Accessible across devices

**Success Metrics:**
• Mobile usability score improvement
• Reduced development time for responsive implementation
• Positive feedback from stakeholder review`,
        acceptanceCriteria: [
          'Mobile mockups created for all major user flows',
          'Responsive breakpoints defined and documented',
          'Design system updated with mobile components',
          'Stakeholder review completed and approved',
          'Developer handoff documentation provided'
        ],
        priority: 'High',
        assignee: 'Mike Chen',
        storyPoints: 8,
        labels: ['design', 'mobile', 'mockups', 'responsive'],
        source: 'action_item',
        originalContent: meetingData.actionItems[1]?.text || '',
        status: 'draft',
        aiConfidence: 92,
        linkedItems: ['epic-1', 'task-2']
      },

      // Task from action item
      {
        id: 'task-1',
        type: 'Task',
        title: 'Prepare API Documentation for Mobile Endpoints',
        description: `Technical task to document API endpoints that will be used by the mobile interface, including response formats optimized for mobile consumption.

**From Meeting Action Item:**
"${meetingData.actionItems[3]?.text}"

**Technical Scope:**
• Document existing API endpoints
• Identify mobile-specific optimizations needed
• Create response format specifications
• Include authentication and error handling

**Deliverables:**
• API documentation updated
• Mobile optimization recommendations
• Developer integration guide`,
        acceptanceCriteria: [
          'All mobile-relevant API endpoints documented',
          'Response formats optimized for mobile bandwidth',
          'Authentication flows clearly explained',
          'Error handling scenarios documented',
          'Code examples provided for common use cases'
        ],
        priority: 'Medium',
        assignee: 'David Wilson',
        storyPoints: 3,
        labels: ['api', 'documentation', 'mobile', 'technical'],
        source: 'action_item',
        originalContent: meetingData.actionItems[3]?.text || '',
        status: 'draft',
        aiConfidence: 85,
        linkedItems: ['epic-1']
      },

      // Story from decision
      {
        id: 'story-3',
        type: 'Story',
        title: 'Implement Dark Mode Feature with Mobile Optimization',
        description: `As a user, I want to use dark mode on both desktop and mobile devices so that I can have a comfortable viewing experience in different lighting conditions.

**From Meeting Decision:**
"${meetingData.decisions[1]?.decision}"

**User Value:**
• Improved user experience in low-light conditions
• Reduced eye strain for extended usage
• Modern, professional appearance
• Battery saving on mobile devices with OLED screens

**Technical Implementation:**
• CSS custom properties for theme switching
• Mobile-optimized dark mode colors
• System preference detection
• User preference persistence`,
        acceptanceCriteria: [
          'Dark mode toggle available on all devices',
          'All UI components support dark mode',
          'System preference automatically detected',
          'User preference saved and persisted',
          'Mobile-optimized dark mode colors implemented',
          'Accessibility standards met for contrast ratios'
        ],
        priority: 'Medium',
        assignee: 'Emily Davis',
        storyPoints: 13,
        labels: ['dark-mode', 'mobile', 'accessibility', 'user-experience'],
        source: 'decision',
        originalContent: meetingData.decisions[1]?.decision || '',
        status: 'draft',
        aiConfidence: 90,
        linkedItems: ['epic-1']
      },

      // Task from decision
      {
        id: 'task-2',
        type: 'Task',
        title: 'Set Up TypeScript Configuration for New Components',
        description: `Technical setup task to configure TypeScript for all new mobile components as decided in the meeting.

**From Meeting Decision:**
"${meetingData.decisions[2]?.decision}"

**Technical Requirements:**
• TypeScript configuration optimized for React components
• Type definitions for mobile-specific props
• ESLint and Prettier integration
• Build process optimization

**Benefits:**
• Improved code quality and maintainability
• Better developer experience with IDE support
• Reduced runtime errors
• Enhanced team collaboration`,
        acceptanceCriteria: [
          'TypeScript configuration file updated',
          'Type definitions created for mobile components',
          'ESLint rules configured for TypeScript',
          'Build process supports TypeScript compilation',
          'Developer documentation updated with TypeScript guidelines'
        ],
        priority: 'Medium',
        assignee: 'Mike Chen',
        storyPoints: 2,
        labels: ['typescript', 'configuration', 'development', 'tooling'],
        source: 'decision',
        originalContent: meetingData.decisions[2]?.decision || '',
        status: 'draft',
        aiConfidence: 80,
        linkedItems: ['story-2']
      },

      // AI-generated story from meeting notes analysis
      {
        id: 'story-4',
        type: 'Story',
        title: 'Implement User Testing Framework for Mobile Features',
        description: `As a product team, we need a systematic approach to user testing for mobile features so that we can validate design decisions and measure user satisfaction improvements.

**AI Analysis:**
Based on the meeting discussion about user feedback being "overwhelmingly positive" and the need for mobile optimization, implementing a structured user testing framework will help maintain quality as we expand mobile features.

**Strategic Value:**
• Validate mobile-first design decisions
• Measure user satisfaction improvements
• Identify usability issues early
• Support data-driven product decisions

**Implementation Approach:**
• Set up mobile testing infrastructure
• Define testing protocols for mobile UX
• Create feedback collection mechanisms
• Establish success metrics and KPIs`,
        acceptanceCriteria: [
          'Mobile user testing framework implemented',
          'Testing protocols documented and approved',
          'Feedback collection system operational',
          'Success metrics defined and trackable',
          'First round of mobile user testing completed',
          'Results integrated into development process'
        ],
        priority: 'Low',
        assignee: 'Sarah Johnson',
        storyPoints: 8,
        labels: ['user-testing', 'mobile', 'framework', 'data-driven'],
        source: 'ai_generated',
        originalContent: 'AI analysis of meeting discussion themes',
        status: 'draft',
        aiConfidence: 75,
        linkedItems: ['epic-1', 'story-2']
      }
    ];

    setStories(generatedStories);
    setSelectedStories(new Set(generatedStories.filter(s => s.aiConfidence >= 85).map(s => s.id)));
    setIsGenerating(false);
  };

  const handleStoryAction = (storyId: string, action: 'add' | 'discard' | 'edit') => {
    switch (action) {
      case 'add':
        setSelectedStories(prev => new Set([...prev, storyId]));
        toast.success('Story added to creation queue');
        break;
      case 'discard':
        setSelectedStories(prev => {
          const newSet = new Set(prev);
          newSet.delete(storyId);
          return newSet;
        });
        setStories(prev => prev.map(s => 
          s.id === storyId ? { ...s, status: 'discarded' } : s
        ));
        toast.success('Story discarded');
        break;
      case 'edit':
        setEditingStory(storyId);
        break;
    }
  };

  const handleStoryUpdate = (storyId: string, updates: Partial<JiraStory>) => {
    setStories(prev => prev.map(s => 
      s.id === storyId ? { ...s, ...updates, status: 'reviewed' } : s
    ));
    setEditingStory(null);
    toast.success('Story updated');
  };

  const handleCreateTickets = async () => {
    const selectedStoryList = stories.filter(s => selectedStories.has(s.id));
    
    if (selectedStoryList.length === 0) {
      toast.error('Please select at least one story to create');
      return;
    }

    toast.success('Creating Jira tickets...', {
      description: `Processing ${selectedStoryList.length} stories`
    });

    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 3000));

    toast.success(`Successfully created ${selectedStoryList.length} Jira tickets!`, {
      description: 'Tickets have been added to your project backlog',
      action: {
        label: 'View in Jira',
        onClick: () => window.open('https://yourcompany.atlassian.net/jira/software/projects/PROJ/boards/1', '_blank')
      }
    });

    onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Epic': return <Target className="h-4 w-4 text-purple-600" />;
      case 'Story': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'Task': return <CheckSquare className="h-4 w-4 text-green-600" />;
      case 'Bug': return <Flag className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Highest': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300';
      case 'Lowest': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredStories = stories.filter(story => {
    const matchesStatus = filterStatus === 'all' || story.status === filterStatus;
    const matchesType = filterType === 'all' || story.type === filterType;
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  const StoryCard = ({ story }: { story: JiraStory }) => {
    const isSelected = selectedStories.has(story.id);
    const isEditing = editingStory === story.id;

    if (isEditing) {
      return (
        <Card className="border-primary/60 ring-2 ring-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10 h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1">
                  {getTypeIcon(story.type)}
                  <span className="text-xs font-medium text-muted-foreground">{story.type}</span>
                </div>
                <Badge variant="outline" className={`text-xs ${getPriorityColor(story.priority)}`}>
                  {story.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleStoryUpdate(story.id, {})}
                  className="h-8 px-3"
                >
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEditingStory(null)}
                  className="h-8 px-3"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
              <Input
                defaultValue={story.title}
                placeholder="Story title"
                className="h-9"
                onChange={(e) => {
                  // In a real implementation, you'd update the story title
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
              <Textarea
                defaultValue={story.description}
                placeholder="Story description"
                rows={4}
                className="resize-none"
                onChange={(e) => {
                  // In a real implementation, you'd update the story description
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Assignee</label>
                <Select defaultValue={story.assignee}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingData.participants.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Story Points</label>
                <Select defaultValue={story.storyPoints.toString()}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 8, 13, 21].map(points => (
                      <SelectItem key={points} value={points.toString()}>{points}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`
        group relative transition-all duration-300 ease-out cursor-pointer h-fit
        ${isSelected 
          ? 'border-primary/60 shadow-lg shadow-primary/20 bg-gradient-to-br from-primary/5 to-primary/10' 
          : story.status === 'discarded' 
            ? 'opacity-50 grayscale' 
            : 'border-border/60 hover:border-primary/40 hover:shadow-md bg-card'
        }
        ${isSelected ? 'ring-2 ring-primary/20' : ''}
      `}>
        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg border-2 border-background">
              <CheckSquare className="h-3 w-3" />
            </div>
          </div>
        )}

        <CardHeader className="pb-4 space-y-3">
          {/* Type and Badges Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1">
                {getTypeIcon(story.type)}
                <span className="text-xs font-medium text-muted-foreground">{story.type}</span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${getPriorityColor(story.priority)}`}
              >
                {story.priority}
              </Badge>
              {story.source === 'ai_generated' && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-purple-200 dark:from-purple-900/20 dark:to-blue-900/20 dark:text-purple-300"
                >
                  <Bot className="h-3 w-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className={`
                text-xs font-medium px-2 py-1 rounded-md
                ${story.aiConfidence >= 90 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : story.aiConfidence >= 80 
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }
              `}>
                {story.aiConfidence}%
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold leading-tight text-foreground line-clamp-2 pr-2">
            {story.title}
          </h3>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-0">
          {/* Description */}
          <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {story.description}
          </div>
          
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">{story.assignee}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                <span className="font-medium">{story.storyPoints} pts</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs">From {story.source.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Labels */}
          <div className="flex flex-wrap gap-1.5">
            {story.labels.slice(0, 4).map(label => (
              <Badge 
                key={label} 
                variant="secondary" 
                className="text-xs px-2 py-0.5 bg-muted/60 text-muted-foreground hover:bg-muted/80"
              >
                {label}
              </Badge>
            ))}
            {story.labels.length > 4 && (
              <Badge 
                variant="secondary" 
                className="text-xs px-2 py-0.5 bg-muted/60 text-muted-foreground"
              >
                +{story.labels.length - 4}
              </Badge>
            )}
          </div>

          {/* Action Bar */}
          {story.status !== 'discarded' && (
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-3">
                <Switch
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleStoryAction(story.id, 'add');
                    } else {
                      handleStoryAction(story.id, 'discard');
                    }
                  }}
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  {isSelected ? 'Selected' : 'Add to queue'}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStoryAction(story.id, 'edit')}
                  className="h-8 w-8 p-0 hover:bg-muted/80"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStoryAction(story.id, 'discard')}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  AI-Generated Jira Stories
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  Review and customize stories generated from your meeting • {filteredStories.length} found
                </DialogDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-9 w-9 p-0 rounded-lg hover:bg-muted/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {isGenerating ? (
            <div className="flex items-center justify-center min-h-[500px] px-6">
              <div className="text-center space-y-8 max-w-md">
                {/* Animated Bot Icon with Glow */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative bg-primary/10 rounded-full p-6 border border-primary/20">
                    <Bot className="h-12 w-12 text-primary animate-bounce" />
                  </div>
                </div>

                {/* Main Heading */}
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    AI is Analyzing Your Meeting
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Our AI is carefully reviewing your meeting notes, action items, and decisions to generate relevant user stories and tasks.
                  </p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-4">
                  {[
                    { title: 'Processing meeting notes', subtitle: 'Extracting key insights and themes' },
                    { title: 'Analyzing action items', subtitle: 'Converting tasks into user stories' },
                    { title: 'Generating stories', subtitle: 'Creating epics, stories, and tasks' }
                  ].map((step, index) => {
                    const isCompleted = currentStep > index;
                    const isCurrent = currentStep === index;
                    const isPending = currentStep < index;

                    return (
                      <div 
                        key={index}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-500 ${
                          isCompleted 
                            ? 'bg-primary/5 border-primary/20' 
                            : isCurrent 
                              ? 'bg-muted/50 border-border' 
                              : 'bg-muted/30 border-border/50 opacity-60'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : isCurrent 
                              ? 'bg-primary/20 border-2 border-primary animate-spin' 
                              : 'bg-muted border border-border'
                        }`}>
                          {isCompleted ? (
                            <span className="text-xs font-medium">✓</span>
                          ) : isCurrent ? (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          ) : (
                            <div className="w-2 h-2 bg-muted-foreground rounded-full opacity-50" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium transition-colors duration-300 ${
                            isPending ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-primary">{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>

                {/* Estimated Time */}
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Estimated time: {Math.max(1, Math.ceil((100 - progress) / 100 * 30))} seconds remaining</span>
                </div>

                {/* Fun Facts */}
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground mb-1">Did you know?</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Our AI can identify patterns in your meetings and suggest relevant story types based on similar discussions from other successful projects.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* AI Insights Panel */}
              {showAIInsights && (
                <div className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                  <Card className="border-primary/20 bg-transparent shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-foreground">AI Analysis Summary</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowAIInsights(false)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                            <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span><span className="font-semibold text-foreground">{stories.length}</span> stories found</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30">
                            <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <span><span className="font-semibold text-foreground">{selectedStories.size}</span> pre-selected</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span><span className="font-semibold text-foreground">85%+</span> avg confidence</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        High-confidence stories are pre-selected. Review and adjust as needed before creating.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filters and Search */}
              <div className="flex-shrink-0 px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-36 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="Epic">Epic</SelectItem>
                          <SelectItem value="Story">Story</SelectItem>
                          <SelectItem value="Task">Task</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-36 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="discarded">Discarded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search stories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Stories Grid */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredStories.map(story => (
                      <StoryCard key={story.id} story={story} />
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Action Bar */}
              <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="font-medium text-foreground">{selectedStories.size}</span>
                      <span>selected</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{filteredStories.length} total stories</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      onClick={onClose}
                      className="h-10 px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateTickets}
                      disabled={selectedStories.size === 0}
                      className="h-10 px-6 min-w-[160px] bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create {selectedStories.size} Ticket{selectedStories.size !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}