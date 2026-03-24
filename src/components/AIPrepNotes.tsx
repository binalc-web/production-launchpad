import React, { useState, useEffect } from 'react';
import { Bot, Lightbulb, Users, CheckSquare, Calendar, TrendingUp, ArrowRight, Sparkles, Clock, Target, X, ExternalLink, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner@2.0.3';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: 'virtual' | 'in-person' | 'standup';
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  participants: Array<{
    id: string;
    name: string;
    avatar: string;
    role: string;
  }>;
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

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
}

interface PrepNote {
  id: string;
  type: 'context' | 'action_item' | 'decision' | 'participant' | 'project';
  title: string;
  content: string;
  source: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
}

interface AIPrepNotesProps {
  currentMeeting: Meeting;
  previousMeetings: Meeting[];
  currentUser: User;
}

export function AIPrepNotes({ currentMeeting, previousMeetings, currentUser }: AIPrepNotesProps) {
  const [prepNotes, setPrepNotes] = useState<PrepNote[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedNote, setSelectedNote] = useState<PrepNote | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    generatePrepNotes();
  }, [currentMeeting, previousMeetings]);

  const generatePrepNotes = () => {
    setIsGenerating(true);
    
    // Simulate AI processing delay
    setTimeout(() => {
      const notes = analyzePreviousMeetings();
      setPrepNotes(notes);
      setIsGenerating(false);
    }, 2000);
  };

  const analyzePreviousMeetings = (): PrepNote[] => {
    const notes: PrepNote[] = [];

    // Find meetings with same participants
    const participantIds = currentMeeting.participants.map(p => p.id);
    const meetingsWithSimilarParticipants = previousMeetings.filter(meeting => 
      meeting.status === 'completed' &&
      meeting.participants.some(p => participantIds.includes(p.id))
    );

    // Find meetings on same project
    const projectMeetings = previousMeetings.filter(meeting => 
      meeting.project === currentMeeting.project && 
      meeting.status === 'completed' &&
      meeting.id !== currentMeeting.id
    );

    // Generate context notes from recent meetings
    if (meetingsWithSimilarParticipants.length > 0) {
      const recentMeeting = meetingsWithSimilarParticipants[0];
      notes.push({
        id: '1',
        type: 'context',
        title: 'Previous Meeting Context',
        content: `Last meeting with this group was "${recentMeeting.title}" on ${new Date(recentMeeting.date).toLocaleDateString()}. Key topics likely to continue from previous discussion.`,
        source: recentMeeting.title,
        priority: 'high',
        icon: <Calendar className="h-4 w-4" />
      });
    }

    // Generate action item follow-ups
    const meetingsWithActionItems = previousMeetings.filter(m => 
      m.actionItemsCount > 0 && 
      m.status === 'completed' &&
      (m.participants.some(p => participantIds.includes(p.id)) || m.project === currentMeeting.project)
    );

    if (meetingsWithActionItems.length > 0) {
      notes.push({
        id: '2',
        type: 'action_item',
        title: 'Outstanding Action Items',
        content: `There are ${meetingsWithActionItems.reduce((sum, m) => sum + m.actionItemsCount, 0)} action items from recent meetings. Review progress on key deliverables before this meeting.`,
        source: 'Previous Meetings',
        priority: 'high',
        icon: <CheckSquare className="h-4 w-4" />
      });
    }

    // Generate participant insights
    const frequentParticipants = currentMeeting.participants.filter(p => 
      meetingsWithSimilarParticipants.some(m => m.participants.some(mp => mp.id === p.id))
    );

    if (frequentParticipants.length > 0) {
      notes.push({
        id: '3',
        type: 'participant',
        title: 'Participant Insights',
        content: `Regular attendees include ${frequentParticipants.slice(0, 2).map(p => p.name).join(', ')}. They've been actively involved in recent project decisions.`,
        source: 'Team Analysis',
        priority: 'medium',
        icon: <Users className="h-4 w-4" />
      });
    }

    // Generate project continuity notes
    if (projectMeetings.length > 0) {
      notes.push({
        id: '4',
        type: 'project',
        title: 'Project Continuity',
        content: `This is part of the ongoing ${currentMeeting.project} project. Previous meetings covered planning, design reviews, and implementation progress.`,
        source: currentMeeting.project || 'Project',
        priority: 'medium',
        icon: <Target className="h-4 w-4" />
      });
    }

    // Generate trending topics
    notes.push({
      id: '5',
      type: 'context',
      title: 'Current Focus Areas',
      content: 'Recent team meetings have emphasized mobile-first design, performance optimization, and user experience improvements. Consider how these themes apply to today\'s discussion.',
      source: 'Team Trends',
      priority: 'low',
      icon: <TrendingUp className="h-4 w-4" />
    });

    // Generate meeting type specific suggestions
    if (currentMeeting.type === 'standup') {
      notes.push({
        id: '6',
        type: 'context',
        title: 'Standup Preparation',
        content: 'Prepare updates on: What you completed yesterday, what you\'re working on today, and any blockers you\'re facing.',
        source: 'Meeting Format',
        priority: 'high',
        icon: <Clock className="h-4 w-4" />
      });
    }

    return notes.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleRegeneratePrepNotes = () => {
    toast.success('Regenerating prep notes with latest meeting data...');
    generatePrepNotes();
  };

  const handleReviewDetails = (note: PrepNote) => {
    setSelectedNote(note);
    setShowDetailsModal(true);
  };

  const getDetailedContent = (note: PrepNote) => {
    switch (note.type) {
      case 'context':
        return {
          title: 'Meeting Context Details',
          sections: [
            {
              title: 'Previous Meeting Summary',
              content: 'The last meeting with this group covered key topics including mobile-first design approach, user research findings, and technical architecture decisions. The team made significant progress on the redesign project with positive feedback from stakeholders.',
              icon: <Calendar className="h-4 w-4" />
            },
            {
              title: 'Key Discussion Points',
              content: '• Mobile-first approach approved for implementation\n• User analytics showed 70% mobile usage\n• Design system updates needed for responsive components\n• Performance optimization requirements identified',
              icon: <Target className="h-4 w-4" />
            },
            {
              title: 'Decisions Made',
              content: '• Proceed with mobile-first development strategy\n• Allocate additional 2 weeks for mobile optimization\n• Update design system with responsive components\n• Schedule follow-up for technical architecture review',
              icon: <CheckSquare className="h-4 w-4" />
            }
          ]
        };
      case 'action_item':
        return {
          title: 'Outstanding Action Items Details',
          sections: [
            {
              title: 'High Priority Actions',
              content: '• Update project timeline with mobile-first milestones (Due: Jan 30)\n• Review and approve mobile interface mockups (Due: Jan 28)\n• Prepare API documentation for mobile endpoints (Due: Feb 2)',
              icon: <Clock className="h-4 w-4" />
            },
            {
              title: 'Team Assignments',
              content: '• Sarah Johnson: Timeline updates and stakeholder communication\n• Mike Chen: Mobile interface design review\n• David Wilson: API documentation and technical specs\n• Emily Davis: User testing coordination',
              icon: <Users className="h-4 w-4" />
            },
            {
              title: 'Dependencies & Blockers',
              content: '• Mobile mockups pending design system updates\n• API documentation waiting for architecture decisions\n• User testing requires prototype completion\n• Timeline updates need stakeholder approval',
              icon: <TrendingUp className="h-4 w-4" />
            }
          ]
        };
      case 'participant':
        return {
          title: 'Participant Insights Details',
          sections: [
            {
              title: 'Team Collaboration History',
              content: 'Sarah and Mike have been working together on the mobile redesign project for 3 months. They have excellent collaboration patterns and have delivered all major milestones on time.',
              icon: <Users className="h-4 w-4" />
            },
            {
              title: 'Individual Contributions',
              content: '• Sarah: Product strategy, stakeholder management, user research coordination\n• Mike: Technical implementation, code reviews, architecture decisions\n• Emily: UI/UX design, user testing, design system maintenance',
              icon: <Target className="h-4 w-4" />
            },
            {
              title: 'Communication Preferences',
              content: '• Sarah prefers detailed written updates before meetings\n• Mike likes to discuss technical details during meetings\n• Emily values visual presentations and prototypes\n• Team responds well to collaborative decision-making',
              icon: <Lightbulb className="h-4 w-4" />
            }
          ]
        };
      case 'project':
        return {
          title: 'Project Continuity Details',
          sections: [
            {
              title: 'Project Timeline',
              content: 'Mobile App Redesign project started in October 2024. Current phase focuses on responsive design implementation and user experience optimization. Target completion: March 2025.',
              icon: <Calendar className="h-4 w-4" />
            },
            {
              title: 'Recent Milestones',
              content: '• ✅ User research completed (Dec 2024)\n• ✅ Design system updated (Jan 2025)\n• 🔄 Mobile prototypes in progress\n• ⏳ User testing scheduled for Feb 2025',
              icon: <TrendingUp className="h-4 w-4" />
            },
            {
              title: 'Upcoming Deliverables',
              content: '• Mobile interface prototypes (Jan 30)\n• User testing results (Feb 15)\n• Performance optimization plan (Feb 28)\n• Final design approval (Mar 15)',
              icon: <Target className="h-4 w-4" />
            }
          ]
        };
      default:
        return {
          title: 'Additional Details',
          sections: [
            {
              title: 'Context',
              content: note.content,
              icon: <FileText className="h-4 w-4" />
            }
          ]
        };
    }
  };

  if (currentMeeting.status !== 'upcoming') {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <span>AI Meeting Preparation</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Based on {previousMeetings.filter(m => m.status === 'completed').length} previous meetings
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Personalized insights and preparation notes based on your previous meetings with this team
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {isGenerating ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Bot className="h-4 w-4 animate-spin" />
                <span>Analyzing previous meetings and generating insights...</span>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {prepNotes.map((note, index) => (
                <div key={note.id} className="group">
                  <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-shrink-0 mt-0.5 text-primary">
                      {note.icon}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{note.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={getPriorityColor(note.priority)}>
                            {note.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Source: {note.source}
                        </span>
                        {note.priority === 'high' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => handleReviewDetails(note)}
                          >
                            Review Details
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < prepNotes.length - 1 && (
                    <Separator className="my-2 opacity-30" />
                  )}
                </div>
              ))}

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Lightbulb className="h-3 w-3" />
                    <span>AI insights updated based on latest meeting data</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRegeneratePrepNotes}>
                    <Bot className="h-3 w-3 mr-1" />
                    Refresh Insights
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
      
      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-primary" />
                {selectedNote?.icon}
              </div>
              <span>{selectedNote ? getDetailedContent(selectedNote).title : 'Details'}</span>
            </DialogTitle>
            <DialogDescription>
              Comprehensive preparation details and recommendations based on AI analysis of your previous meetings.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedNote && (
              <div className="space-y-6">
                {/* Original Note Summary */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>AI Analysis Summary</span>
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedNote.content}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className={getPriorityColor(selectedNote.priority)}>
                      {selectedNote.priority} priority
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Source: {selectedNote.source}
                    </span>
                  </div>
                </div>

                {/* Detailed Sections */}
                {getDetailedContent(selectedNote).sections.map((section, index) => (
                  <div key={index} className="space-y-3">
                    <h4 className="font-medium flex items-center space-x-2">
                      <div className="text-primary">
                        {section.icon}
                      </div>
                      <span>{section.title}</span>
                    </h4>
                    <div className="pl-6 border-l-2 border-primary/20">
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </div>
                    {index < getDetailedContent(selectedNote).sections.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}

                {/* Action Recommendations */}
                <div className="p-4 bg-accent/50 rounded-lg border">
                  <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span>Recommended Actions</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedNote.type === 'action_item' && (
                      <>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Review the status of outstanding action items before the meeting</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Prepare updates on blockers and dependencies</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Come with solutions or alternative approaches for delayed items</span>
                        </div>
                      </>
                    )}
                    {selectedNote.type === 'context' && (
                      <>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Review previous meeting notes and decisions</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Prepare follow-up questions on unresolved topics</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Bring relevant updates since the last discussion</span>
                        </div>
                      </>
                    )}
                    {selectedNote.type === 'participant' && (
                      <>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Prepare materials that align with participant preferences</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Consider individual working styles in your presentation</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Plan for collaborative discussion and decision-making</span>
                        </div>
                      </>
                    )}
                    {selectedNote.type === 'project' && (
                      <>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Review project timeline and upcoming milestones</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Prepare status updates on current deliverables</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                          <span>Identify any risks or dependencies that need discussion</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Related Meetings */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Related Meetings</span>
                  </h4>
                  <div className="space-y-2">
                    {previousMeetings
                      .filter(m => m.status === 'completed')
                      .slice(0, 3)
                      .map((meeting) => (
                        <div key={meeting.id} className="flex items-center justify-between p-2 bg-background rounded border">
                          <div>
                            <p className="text-sm font-medium">{meeting.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(meeting.date).toLocaleDateString()} • {meeting.participants.length} participants
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}