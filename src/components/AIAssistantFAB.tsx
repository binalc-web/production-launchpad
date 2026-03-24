import React, { useState } from 'react';
import { Bot, MessageCircle, X, Send, Loader2, Sparkles, Calendar, Users, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { toast } from "sonner@2.0.3";
import { User, Meeting, Participant } from '../types';

interface AIMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  action?: {
    type: 'meeting_created' | 'meeting_scheduled' | 'task_created' | 'participants_added' | 'time_suggested';
    data?: any;
    meetingId?: string;
  };
}

interface AIAssistantFABProps {
  currentUser: User;
  onCreateMeeting?: (meeting: Meeting) => void;
  onScheduleFollowUp?: (meetingData: any) => void;
  onNavigateToCreate?: () => void;
  teamMembers?: any[];
  meetings?: Meeting[];
}

export function AIAssistantFAB({ 
  currentUser, 
  onCreateMeeting, 
  onScheduleFollowUp, 
  onNavigateToCreate,
  teamMembers = [],
  meetings = []
}: AIAssistantFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      text: "Hi! I'm your AI Meeting Assistant. I can help you create meetings, schedule follow-ups, find available times, and manage your calendar. Just tell me what you need in natural language!\n\nTry saying: \"Create a meeting with Sarah tomorrow at 2pm\" or \"Schedule follow-up with Mike on Friday morning\"",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock team members if not provided
  const defaultTeamMembers = [
    { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Product Manager' },
    { id: '3', name: 'Mike Chen', email: 'mike@company.com', role: 'Senior Developer' },
    { id: '4', name: 'Emily Davis', email: 'emily@company.com', role: 'UX Designer' },
    { id: '5', name: 'David Wilson', email: 'david@company.com', role: 'QA Engineer' },
    { id: '6', name: 'Lisa Park', email: 'lisa@company.com', role: 'Engineering Manager' },
    { id: '7', name: 'Alex Thompson', email: 'alex@company.com', role: 'Team Lead' }
  ];

  const availableTeamMembers = teamMembers.length > 0 ? teamMembers : defaultTeamMembers;

  // Helper function to find team members by name
  const findTeamMembers = (names: string[]): Participant[] => {
    const participants: Participant[] = [];
    names.forEach(name => {
      const lowerName = name.toLowerCase();
      const member = availableTeamMembers.find(m => {
        const fullName = m.name.toLowerCase();
        const firstName = m.name.split(' ')[0].toLowerCase();
        const lastName = m.name.split(' ')[1]?.toLowerCase() || '';
        return fullName.includes(lowerName) || 
               firstName === lowerName || 
               lastName === lowerName ||
               lowerName.includes(firstName);
      });
      if (member) {
        participants.push({
          id: member.id,
          name: member.name,
          role: member.role,
          avatar: member.avatar || `https://images.unsplash.com/photo-1${Math.random().toString().substr(2, 8)}?w=150&h=150&fit=crop&crop=face`
        });
      }
    });
    return participants;
  };

  // Enhanced time parsing
  const parseDateTime = (text: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Default values
    let targetDate = today;
    let targetTime = '09:00';

    const lowerText = text.toLowerCase();

    // Day parsing
    if (lowerText.includes('tomorrow')) {
      targetDate = tomorrow;
    } else if (lowerText.includes('today')) {
      targetDate = today;
    } else {
      // Look for specific days
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayMatch = days.find(day => lowerText.includes(day));
      if (dayMatch) {
        const dayIndex = days.indexOf(dayMatch);
        const currentDay = today.getDay();
        let daysToAdd = dayIndex - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
      }
    }

    // Time parsing
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/i,
      /(\d{1,2})\s*(am|pm)/i,
      /morning/i,
      /afternoon/i,
      /evening/i
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes('morning')) {
          targetTime = '09:00';
        } else if (pattern.source.includes('afternoon')) {
          targetTime = '14:00';
        } else if (pattern.source.includes('evening')) {
          targetTime = '18:00';
        } else if (match[3]) {
          // Has AM/PM
          let hour = parseInt(match[1]);
          const minute = match[2] ? parseInt(match[2]) : 0;
          const period = match[3].toLowerCase();
          
          if (period === 'pm' && hour !== 12) hour += 12;
          if (period === 'am' && hour === 12) hour = 0;
          
          targetTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        } else {
          // Just hour
          const hour = parseInt(match[1]);
          targetTime = `${hour.toString().padStart(2, '0')}:00`;
        }
        break;
      }
    }

    return {
      date: targetDate.toISOString().split('T')[0],
      time: targetTime
    };
  };

  // Enhanced natural language parsing
  const parseNaturalLanguage = (text: string) => {
    const lowerText = text.toLowerCase();
    
    // Extract participants
    const participantNames: string[] = [];
    availableTeamMembers.forEach(member => {
      const firstName = member.name.split(' ')[0].toLowerCase();
      const lastName = member.name.split(' ')[1]?.toLowerCase() || '';
      const fullName = member.name.toLowerCase();
      
      if (lowerText.includes(firstName) || lowerText.includes(fullName) || lowerText.includes(lastName)) {
        participantNames.push(member.name);
      }
    });

    // Handle "team" keyword
    if (lowerText.includes('team') && !lowerText.includes('with team member')) {
      // Add multiple team members for team meetings
      const teamSelection = availableTeamMembers.slice(0, 4).map(m => m.name);
      participantNames.push(...teamSelection);
    }

    // Extract meeting duration
    let duration = 60; // default
    const durationPatterns = [
      /(\d+)\s*minutes?/i,
      /(\d+)\s*hours?/i,
      /(\d+)h/i,
      /(\d+)m/i
    ];

    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (pattern.source.includes('hour') || pattern.source.includes('h')) {
          duration = value * 60;
        } else {
          duration = value;
        }
        break;
      }
    }

    // Meeting type detection
    let meetingType: 'virtual' | 'in-person' | 'standup' = 'virtual';
    if (lowerText.includes('standup') || lowerText.includes('daily')) {
      meetingType = 'standup';
      duration = 30; // Default standup duration
    } else if (lowerText.includes('in person') || lowerText.includes('office')) {
      meetingType = 'in-person';
    }

    // Extract action intent
    let intent = 'unknown';
    if (lowerText.includes('create') || lowerText.includes('schedule') || lowerText.includes('set up') || lowerText.includes('book')) {
      intent = 'create_meeting';
    } else if (lowerText.includes('follow up') || lowerText.includes('follow-up')) {
      intent = 'schedule_followup';
    } else if (lowerText.includes('available') || lowerText.includes('free') || lowerText.includes('when can')) {
      intent = 'check_availability';
    } else if (lowerText.includes('task') || lowerText.includes('action item') || lowerText.includes('todo')) {
      intent = 'create_task';
    }

    const dateTime = parseDateTime(text);

    return {
      intent,
      participants: participantNames,
      dateTime,
      duration,
      meetingType,
      originalText: text
    };
  };

  // Create a proper Meeting object
  const createMeetingObject = (parsedData: any, title: string): Meeting => {
    const participants = findTeamMembers(parsedData.participants);
    
    return {
      id: `ai-meeting-${Date.now()}`,
      title,
      date: parsedData.dateTime.date,
      time: parsedData.dateTime.time,
      duration: parsedData.duration,
      type: parsedData.meetingType,
      status: 'upcoming' as const,
      participants,
      organizer: { 
        id: currentUser.id, 
        name: currentUser.name 
      },
      description: `Meeting created via AI Assistant: ${parsedData.originalText}`,
      hasNotes: false,
      hasRecording: false,
      hasTranscript: false,
      actionItemsCount: 0,
      zoomLink: parsedData.meetingType === 'virtual' ? `https://zoom.us/j/${Math.random().toString().substr(2, 9)}` : undefined
    };
  };

  const generateAIResponse = (parsedData: any) => {
    const { intent, participants, dateTime, duration, meetingType, originalText } = parsedData;

    switch (intent) {
      case 'create_meeting':
        if (participants.length > 0) {
          const participantList = participants.join(', ');
          const meetingTitle = `Meeting with ${participantList}`;
          const newMeeting = createMeetingObject(parsedData, meetingTitle);
          
          return {
            text: `✅ Perfect! I've created a ${duration}-minute ${meetingType} meeting with ${participantList} on ${new Date(dateTime.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${dateTime.time}.\n\nThe meeting has been added to your dashboard and ${meetingType === 'virtual' ? 'a Zoom link has been generated' : 'location details can be added later'}.`,
            action: {
              type: 'meeting_created' as const,
              data: newMeeting,
              meetingId: newMeeting.id
            }
          };
        }
        
        return {
          text: "I'd be happy to help you create a meeting! Could you tell me who you'd like to invite?\n\nFor example: \"Create a meeting with Sarah and Mike tomorrow at 2pm\"",
          action: undefined
        };

      case 'schedule_followup':
        const followUpTitle = participants.length > 0 
          ? `Follow-up with ${participants.join(', ')}`
          : 'Follow-up Meeting';
        const followUpMeeting = createMeetingObject(parsedData, followUpTitle);
        
        return {
          text: `📅 I've scheduled a follow-up meeting${participants.length > 0 ? ` with ${participants.join(', ')}` : ''} for ${new Date(dateTime.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${dateTime.time}.\n\nThe meeting is now visible on your dashboard with all the necessary details.`,
          action: {
            type: 'meeting_scheduled' as const,
            data: followUpMeeting,
            meetingId: followUpMeeting.id
          }
        };

      case 'check_availability':
        if (participants.length > 0) {
          return {
            text: `🔍 I'm checking availability for ${participants.join(', ')}...\n\nBased on current schedules, here are some suggestions:\n• Tomorrow 10:00 AM (all available)\n• Friday 2:00 PM (most available)\n• Next Monday 9:00 AM (optimal time)\n\nWould you like me to schedule a meeting at any of these times?`,
            action: {
              type: 'time_suggested' as const,
              data: { participants }
            }
          };
        }
        return {
          text: "I can help you check team availability! Who would you like to schedule a meeting with?\n\nFor example: \"Check Mike and Sarah's availability this week\"",
          action: undefined
        };

      case 'create_task':
        return {
          text: `📋 I've noted your task: \"${originalText}\"\n\nTask created and will be visible in your Action Items. Would you like me to assign it to anyone specific or set a due date?`,
          action: {
            type: 'task_created' as const,
            data: { 
              title: originalText, 
              assignee: currentUser.name,
              dueDate: dateTime.date,
              status: 'pending'
            }
          }
        };

      default:
        return {
          text: "I can help you with meeting management! Here are some things you can try:\n\n📅 **Create meetings:**\n• \"Create a meeting with Sarah tomorrow at 2pm\"\n• \"Schedule team standup for Monday morning\"\n• \"Book a client call on Friday afternoon\"\n\n🔄 **Follow-ups:**\n• \"Schedule follow-up with Mike on Friday\"\n• \"Create follow-up meeting for next week\"\n\n👥 **Check availability:**\n• \"When is the team free this week?\"\n• \"Check Sarah's availability tomorrow\"\n\n✅ **Tasks:**\n• \"Create a task to review project specs\"\n• \"Add action item for code review\"",
          action: undefined
        };
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const originalInput = inputText;
    setInputText('');
    setIsProcessing(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const parsedData = parseNaturalLanguage(originalInput);
      const aiResponse = generateAIResponse(parsedData);

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.text,
        isUser: false,
        timestamp: new Date(),
        action: aiResponse.action
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsProcessing(false);

      // Handle actions
      if (aiResponse.action) {
        handleAIAction(aiResponse.action);
      }
    }, 1500);
  };

  const handleAIAction = (action: any) => {
    switch (action.type) {
      case 'meeting_created':
      case 'meeting_scheduled':
        // Add the meeting to the app state
        if (action.data && onCreateMeeting) {
          onCreateMeeting(action.data);
          toast.success(`Meeting "${action.data.title}" added to your dashboard!`, {
            description: `${new Date(action.data.date).toLocaleDateString()} at ${action.data.time}`,
            duration: 4000,
          });
        }
        break;

      case 'task_created':
        toast.success('Task created successfully!', {
          description: 'Check your Action Items to manage the task.',
          duration: 3000,
        });
        break;

      case 'time_suggested':
        toast.info('Availability checked! Review the suggestions above.', {
          duration: 3000,
        });
        break;

      default:
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const exampleCommands = [
    "Create a meeting with Sarah tomorrow at 2pm",
    "Schedule follow-up with Mike on Friday morning", 
    "Book team standup for Monday at 9am",
    "Check Emily's availability this week",
    "Create a 30-minute review meeting with the team",
    "Schedule client call for next Tuesday afternoon"
  ];

  return (
    <>
      {/* FAB Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50 group transition-all duration-200 hover:scale-110"
        size="lg"
      >
        <div className="relative">
          <Bot className="h-6 w-6 text-primary-foreground" />
          <Sparkles className="h-3 w-3 text-primary-foreground absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Button>

      {/* AI Assistant Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-end p-6">
          <Card className="w-full max-w-md h-[600px] flex flex-col shadow-2xl">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI Meeting Assistant</CardTitle>
                    <p className="text-sm text-muted-foreground">Create meetings instantly!</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          message.isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        {message.action && (
                          <Badge className="mt-2 text-xs" variant="secondary">
                            {message.action.type === 'meeting_created' && <Calendar className="h-3 w-3 mr-1" />}
                            {message.action.type === 'meeting_scheduled' && <Clock className="h-3 w-3 mr-1" />}
                            {message.action.type === 'task_created' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {message.action.type === 'time_suggested' && <Users className="h-3 w-3 mr-1" />}
                            ✨ {message.action.type.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2 flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">AI is processing your request...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick Examples */}
              {messages.length <= 1 && (
                <div className="p-4 border-t bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Try these examples:</p>
                  <div className="space-y-1">
                    {exampleCommands.slice(0, 3).map((command, index) => (
                      <button
                        key={index}
                        onClick={() => setInputText(command)}
                        className="w-full text-left text-xs p-2 bg-background rounded border hover:bg-accent transition-colors"
                      >
                        "{command}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Create a meeting with Sarah tomorrow at 2pm..."
                    className="flex-1"
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isProcessing}
                    size="icon"
                    className="h-10 w-10 flex-shrink-0"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}