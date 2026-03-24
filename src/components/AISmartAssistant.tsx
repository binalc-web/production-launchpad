import React, { useState, useEffect } from 'react';
import { Bot, Calendar, Users, Clock, Zap, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from "sonner@2.0.3";

interface AICapability {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
  category: 'scheduling' | 'management' | 'analysis' | 'automation';
}

interface SmartSuggestion {
  id: string;
  type: 'time_conflict' | 'participant_availability' | 'meeting_optimization' | 'follow_up_reminder';
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

interface AISmartAssistantProps {
  currentContext?: {
    activeTab: string;
    recentMeetings: any[];
    upcomingMeetings: any[];
    teamAvailability: any[];
  };
  onExecuteAction: (action: string, data: any) => void;
}

export function AISmartAssistant({ currentContext, onExecuteAction }: AISmartAssistantProps) {
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);

  const aiCapabilities: AICapability[] = [
    {
      id: 'smart-scheduling',
      title: 'Smart Scheduling',
      description: 'Find optimal meeting times based on participant availability',
      icon: <Calendar className="h-4 w-4" />,
      examples: [
        'Schedule a team meeting when everyone is free',
        'Find the best time for a client call this week',
        'Suggest meeting times avoiding lunch hours'
      ],
      category: 'scheduling'
    },
    {
      id: 'conflict-resolution',
      title: 'Conflict Resolution',
      description: 'Automatically detect and resolve scheduling conflicts',
      icon: <AlertTriangle className="h-4 w-4" />,
      examples: [
        'Move conflicting meetings to available slots',
        'Suggest alternative times for double-booked participants',
        'Optimize back-to-back meeting schedules'
      ],
      category: 'management'
    },
    {
      id: 'meeting-optimization',
      title: 'Meeting Optimization',
      description: 'Analyze and improve meeting efficiency',
      icon: <Zap className="h-4 w-4" />,
      examples: [
        'Suggest shorter meeting durations',
        'Recommend breaking long meetings into focused sessions',
        'Identify recurring meetings that could be async'
      ],
      category: 'analysis'
    },
    {
      id: 'automated-follow-ups',
      title: 'Automated Follow-ups',
      description: 'Create follow-up meetings and track action items',
      icon: <CheckCircle className="h-4 w-4" />,
      examples: [
        'Schedule follow-ups based on meeting outcomes',
        'Track action item completion rates',
        'Send automated reminders for pending tasks'
      ],
      category: 'automation'
    }
  ];

  useEffect(() => {
    // Generate smart suggestions based on current context
    generateSmartSuggestions();
  }, [currentContext]);

  const generateSmartSuggestions = () => {
    const suggestions: SmartSuggestion[] = [];

    // Example suggestions based on context
    if (currentContext?.activeTab === 'dashboard') {
      suggestions.push({
        id: '1',
        type: 'meeting_optimization',
        title: 'Optimize Today\'s Schedule',
        description: 'You have 3 back-to-back meetings. I can suggest 15-minute buffers between them.',
        action: 'optimize_schedule',
        priority: 'medium'
      });
    }

    if (currentContext?.upcomingMeetings && currentContext.upcomingMeetings.length > 5) {
      suggestions.push({
        id: '2',
        type: 'time_conflict',
        title: 'Heavy Meeting Day Detected',
        description: 'Consider rescheduling non-critical meetings to balance your workload.',
        action: 'reschedule_meetings',
        priority: 'high'
      });
    }

    suggestions.push({
      id: '3',
      type: 'follow_up_reminder',
      title: 'Missing Follow-ups',
      description: 'Last week\'s client review needs a follow-up meeting. Shall I schedule it?',
      action: 'schedule_followup',
      priority: 'medium'
    });

    setSmartSuggestions(suggestions);
  };

  const handleSuggestionAction = (suggestion: SmartSuggestion) => {
    switch (suggestion.action) {
      case 'optimize_schedule':
        toast.success('Schedule optimization applied! Buffer times added.');
        onExecuteAction('optimize_schedule', {});
        break;
      case 'reschedule_meetings':
        toast.info('Opening meeting rescheduling assistant...');
        onExecuteAction('reschedule_meetings', {});
        break;
      case 'schedule_followup':
        toast.success('Follow-up meeting scheduled for next week.');
        onExecuteAction('schedule_followup', { meetingType: 'follow-up' });
        break;
      default:
        break;
    }

    // Remove executed suggestion
    setSmartSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      case 'medium': return <Clock className="h-3 w-3" />;
      case 'low': return <Info className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Capabilities Overview */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">AI Assistant Capabilities</h3>
              <p className="text-muted-foreground mb-4">
                I can help you with intelligent meeting management, scheduling optimization, and automated workflows.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiCapabilities.map((capability) => (
                  <div key={capability.id} className="p-4 bg-background rounded-lg border">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded">
                        {capability.icon}
                      </div>
                      <h4 className="font-medium">{capability.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{capability.description}</p>
                    <div className="space-y-1">
                      {capability.examples.slice(0, 2).map((example, index) => (
                        <p key={index} className="text-xs text-muted-foreground italic">
                          "• {example}"
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-primary" />
              Smart Suggestions
            </h3>
            <div className="space-y-4">
              {smartSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                        {getPriorityIcon(suggestion.priority)}
                        <span className="ml-1 capitalize">{suggestion.priority}</span>
                      </Badge>
                      <h4 className="font-medium">{suggestion.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSuggestionAction(suggestion)}
                    className="ml-4 flex-shrink-0"
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Quick AI Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start" onClick={() => onExecuteAction('analyze_patterns', {})}>
              <Zap className="h-4 w-4 mr-2" />
              Analyze Meeting Patterns
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onExecuteAction('suggest_times', {})}>
              <Calendar className="h-4 w-4 mr-2" />
              Suggest Optimal Times
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onExecuteAction('team_availability', {})}>
              <Users className="h-4 w-4 mr-2" />
              Check Team Availability
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}