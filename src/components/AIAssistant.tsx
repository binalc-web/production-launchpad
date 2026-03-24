import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Clock, Users, FileText, Lightbulb, CheckCircle, AlertCircle, Mic, Play, Pause, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { toast } from "sonner@2.0.3";

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

interface MeetingTranscript {
  id: string;
  timestamp: string;
  speaker: string;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface AIAssistantProps {
  mode: 'pre-meeting' | 'during-meeting' | 'post-meeting';
  meetingId?: string;
  participants?: Array<{ id: string; name: string; role: string }>;
  onSuggestionAccept?: (suggestion: AISuggestion) => void;
  isRecording?: boolean;
  onRecordingToggle?: () => void;
}

export function AIAssistant({ 
  mode, 
  meetingId, 
  participants = [], 
  onSuggestionAccept,
  isRecording = false,
  onRecordingToggle 
}: AIAssistantProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [transcript, setTranscript] = useState<MeetingTranscript[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [currentTopic, setCurrentTopic] = useState('');
  const [topicStartTime, setTopicStartTime] = useState(0);

  // Mock AI suggestions based on mode with unique IDs
  const generateMockSuggestions = (mode: string): AISuggestion[] => {
    const timestamp = Date.now();
    
    switch (mode) {
      case 'pre-meeting':
        return [
          {
            id: `pre-${timestamp}-1`,
            type: 'agenda',
            title: 'Suggested Discussion Points',
            content: 'Based on previous meetings and recent emails:\n• Review Q3 performance metrics\n• Discuss mobile app performance issues from user feedback\n• Plan resource allocation for upcoming projects\n• Address team capacity concerns raised in last standup',
            confidence: 87,
            priority: 'high'
          },
          {
            id: `pre-${timestamp}-2`,
            type: 'agenda',
            title: 'Follow-up Items',
            content: 'Pending items from previous meetings:\n• Mike\'s performance audit results (due yesterday)\n• Emily\'s offline functionality research\n• Client feedback implementation timeline',
            confidence: 95,
            priority: 'high'
          }
        ];

      case 'during-meeting':
        return [
          {
            id: `during-${timestamp}-1`,
            type: 'time-reminder',
            title: 'Time Management Alert',
            content: 'Current topic "Mobile App Performance" has been discussed for 12 minutes. Consider moving to next agenda item to stay on schedule.',
            confidence: 90,
            priority: 'medium',
            timestamp: new Date().toISOString()
          },
          {
            id: `during-${timestamp}-2`,
            type: 'action',
            title: 'Detected Action Item',
            content: 'Mike agreed to complete the performance audit by Friday and share results with the team.',
            confidence: 92,
            speaker: 'Mike Chen',
            priority: 'high',
            timestamp: new Date().toISOString()
          }
        ];

      case 'post-meeting':
        return [
          {
            id: `post-${timestamp}-1`,
            type: 'summary',
            title: 'AI-Generated Meeting Summary',
            content: 'Key Discussion Points:\n• Mobile app performance issues identified through client feedback\n• Team discussed technical solutions and resource requirements\n• Offline functionality research prioritized for Q4\n\nDecisions Made:\n• Allocate 2 developers to performance improvements\n• Set completion target for end of Q3\n• Schedule weekly check-ins on progress',
            confidence: 88,
            priority: 'high'
          },
          {
            id: `post-${timestamp}-2`,
            type: 'action',
            title: 'Extracted Action Items',
            content: '• Mike Chen: Complete mobile app performance audit (Due: July 20)\n• Emily Davis: Research offline functionality solutions (Due: July 25)\n• Sarah Johnson: Schedule technical design review (Due: July 18)\n• John Smith: Update project timeline document (Due: July 22)',
            confidence: 91,
            priority: 'high'
          },
          {
            id: `post-${timestamp}-3`,
            type: 'meeting-skip',
            title: 'Smart Meeting Recommendation',
            content: 'Next scheduled "Weekly Status Update" meeting has no new agenda items. Consider converting to async update or skipping this week to save 30 minutes for the team.',
            confidence: 75,
            priority: 'medium'
          }
        ];

      default:
        return [];
    }
  };

  // Mock transcript generation during recording
  const generateMockTranscript = (): MeetingTranscript[] => {
    const timestamp = Date.now();
    return [
      {
        id: `transcript-${timestamp}-1`,
        timestamp: '10:30:15',
        speaker: 'John Smith',
        text: 'Let\'s start with reviewing the client feedback we received this week.',
        sentiment: 'neutral'
      },
      {
        id: `transcript-${timestamp}-2`,
        timestamp: '10:30:45',
        speaker: 'Sarah Johnson',
        text: 'The main concerns are around mobile app performance and offline functionality.',
        sentiment: 'neutral'
      },
      {
        id: `transcript-${timestamp}-3`,
        timestamp: '10:31:20',
        speaker: 'Mike Chen',
        text: 'I can run a comprehensive performance audit this week and have results by Friday.',
        sentiment: 'positive'
      },
      {
        id: `transcript-${timestamp}-4`,
        timestamp: '10:31:55',
        speaker: 'Emily Davis',
        text: 'For offline functionality, I\'ve already started researching some solutions. Should have recommendations next week.',
        sentiment: 'positive'
      }
    ];
  };

  useEffect(() => {
    // Generate initial suggestions based on mode
    setSuggestions(generateMockSuggestions(mode));

    // Simulate AI processing during meeting
    if (mode === 'during-meeting') {
      const timer = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 60000); // Update every minute

      return () => clearInterval(timer);
    }
  }, [mode]);

  useEffect(() => {
    // Simulate transcript generation when recording
    if (isRecording && mode === 'during-meeting') {
      const timer = setTimeout(() => {
        setTranscript(generateMockTranscript());
        // Generate new suggestions based on transcript with unique timestamp
        const newSuggestions = generateMockSuggestions('during-meeting');
        setSuggestions(prev => [...prev, ...newSuggestions]);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isRecording, mode]);

  const handleAcceptSuggestion = (suggestion: AISuggestion) => {
    onSuggestionAccept?.(suggestion);
    toast.success(`AI suggestion accepted: ${suggestion.title}`);
  };

  const handleGenerateContent = async () => {
    setIsProcessing(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      const newSuggestions = generateMockSuggestions(mode);
      setSuggestions(prev => [...prev, ...newSuggestions]);
      setIsProcessing(false);
      toast.success('AI analysis complete!');
    }, 2000);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400';
    if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* AI Assistant Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Meeting Assistant</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {mode === 'pre-meeting' && 'Preparing intelligent suggestions for your meeting'}
                  {mode === 'during-meeting' && 'Providing real-time insights and time management'}
                  {mode === 'post-meeting' && 'Analyzing meeting content and generating summaries'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleGenerateContent}
              disabled={isProcessing}
              className="bg-primary/5 border-primary/20 hover:bg-primary/10"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Generate Insights'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Recording Controls (During Meeting) */}
      {mode === 'during-meeting' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={onRecordingToggle}
                  className="flex items-center space-x-2"
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4" />
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      <span>Start AI Recording</span>
                    </>
                  )}
                </Button>
                {isRecording && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-sm">Recording • {formatDuration(meetingDuration)}</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                AI transcription and analysis active
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    {suggestion.type === 'agenda' && <Lightbulb className="h-4 w-4 text-yellow-500" />}
                    {suggestion.type === 'action' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {suggestion.type === 'decision' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                    {suggestion.type === 'summary' && <FileText className="h-4 w-4 text-purple-500" />}
                    {suggestion.type === 'time-reminder' && <Clock className="h-4 w-4 text-orange-500" />}
                    {suggestion.type === 'meeting-skip' && <AlertCircle className="h-4 w-4 text-gray-500" />}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{suggestion.title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority} priority
                      </Badge>
                      <span className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                        {suggestion.confidence}% confidence
                      </span>
                      {suggestion.speaker && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {suggestion.speaker}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAcceptSuggestion(suggestion)}
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                >
                  Accept
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                {suggestion.content}
              </pre>
              {suggestion.timestamp && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Generated at {new Date(suggestion.timestamp).toLocaleTimeString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Transcript (During Meeting) */}
      {mode === 'during-meeting' && transcript.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Mic className="h-4 w-4" />
              <span>Live Transcript</span>
              <Badge variant="outline" className="ml-auto">
                AI Speaker Recognition Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {transcript.map((entry) => (
                <div key={entry.id} className="border-l-2 border-primary/20 pl-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-primary">{entry.speaker}</span>
                    <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        entry.sentiment === 'positive' ? 'border-green-200 text-green-700' :
                        entry.sentiment === 'negative' ? 'border-red-200 text-red-700' :
                        'border-gray-200 text-gray-700'
                      }`}
                    >
                      {entry.sentiment}
                    </Badge>
                  </div>
                  <p className="text-sm">{entry.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Bot className="h-5 w-5 text-primary animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">AI is analyzing content...</p>
                <Progress value={75} className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length === 0 && !isProcessing && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">AI Assistant Ready</h3>
            <p className="text-muted-foreground">
              {mode === 'pre-meeting' && 'Click "Generate Insights" to get AI-powered meeting suggestions'}
              {mode === 'during-meeting' && 'Start recording to enable real-time AI analysis'}
              {mode === 'post-meeting' && 'Generate AI summary and action items from your meeting'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}