import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { 
  googleCalendarService, 
  ParticipantAvailability, 
  SchedulingSuggestion, 
  TimeSlot 
} from './GoogleCalendarService';
import { toast } from "sonner@2.0.3";

interface SmartSchedulingProps {
  selectedDate: Date;
  duration: number;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  }>;
  onTimeSlotSelect: (start: string, end: string) => void;
  isGoogleCalendarConnected: boolean;
}

export function SmartScheduling({
  selectedDate,
  duration,
  participants,
  onTimeSlotSelect,
  isGoogleCalendarConnected
}: SmartSchedulingProps) {
  const [loading, setLoading] = useState(false);
  const [participantAvailability, setParticipantAvailability] = useState<ParticipantAvailability[]>([]);
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SchedulingSuggestion | null>(null);
  const [viewMode, setViewMode] = useState<'suggestions' | 'grid'>('suggestions');

  useEffect(() => {
    if (participants.length > 0 && isGoogleCalendarConnected) {
      fetchAvailability();
    }
  }, [selectedDate, participants, duration, isGoogleCalendarConnected]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const availability = await googleCalendarService.fetchParticipantAvailability(
        participants.map(p => p.email),
        startDate.toISOString(),
        endDate.toISOString()
      );

      setParticipantAvailability(availability);

      // Generate time slots
      const slots = googleCalendarService.generateTimeSlots(
        selectedDate.toISOString(),
        duration,
        availability
      );
      setTimeSlots(slots);

      // Get suggestions
      const optimalTimes = googleCalendarService.findOptimalMeetingTimes(
        selectedDate.toISOString(),
        duration,
        availability,
        5
      );
      setSuggestions(optimalTimes);

    } catch (error) {
      toast.error('Failed to fetch availability data');
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SchedulingSuggestion) => {
    setSelectedSuggestion(suggestion);
    onTimeSlotSelect(suggestion.start, suggestion.end);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAvailabilityColor = (participant: ParticipantAvailability, timeSlot: string) => {
    const slotTime = new Date(timeSlot);
    
    // Check working hours
    if (!googleCalendarService.isWorkingHours(timeSlot, participant.workingHours)) {
      return 'bg-gray-200 dark:bg-gray-700'; // Outside working hours
    }

    // Check for conflicts
    const hasConflict = participant.events.some(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const slotEnd = new Date(slotTime.getTime() + duration * 60000);
      
      return slotTime < eventEnd && slotEnd > eventStart;
    });

    return hasConflict 
      ? 'bg-red-200 dark:bg-red-900' 
      : 'bg-green-200 dark:bg-green-900';
  };

  if (!isGoogleCalendarConnected) {
    return (
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
            Google Calendar Integration Required
          </h3>
          <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
            Connect Google Calendar to see participant availability and get smart scheduling suggestions.
          </p>
          <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
            <ExternalLink className="h-4 w-4 mr-2" />
            Connect Google Calendar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (participants.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Select Participants</h3>
          <p className="text-sm text-muted-foreground">
            Add participants to see their availability and get smart scheduling suggestions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Smart Scheduling</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Google Calendar
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedDate)} • {duration} minutes • {participants.length} participants
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'suggestions' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('suggestions')}
              >
                Suggestions
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Availability Grid
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Analyzing calendar availability...</p>
                <p className="text-sm text-muted-foreground">
                  Checking {participants.length} participants' calendars
                </p>
              </div>
            </div>
            <Progress value={75} className="mt-3 h-2" />
          </CardContent>
        </Card>
      )}

      {!loading && viewMode === 'suggestions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Recommended Times</h3>
            <Badge variant="outline">
              {suggestions.length} suggestions found
            </Badge>
          </div>

          {suggestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Perfect Times Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All participants have conflicts during standard working hours.
                </p>
                <Button variant="outline" onClick={() => setViewMode('grid')}>
                  View Availability Grid
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {suggestions.map((suggestion, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedSuggestion === suggestion 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="font-medium">
                            {formatTime(suggestion.start)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {duration} min
                          </div>
                        </div>
                        
                        <Separator orientation="vertical" className="h-8" />
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge 
                              variant={suggestion.confidence === 100 ? 'default' : 'secondary'}
                              className={
                                suggestion.confidence === 100
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : suggestion.confidence >= 75
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }
                            >
                              {suggestion.confidence === 100 ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertCircle className="h-3 w-3 mr-1" />
                              )}
                              {suggestion.confidence}% match
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {suggestion.reason}
                          </p>
                          
                          {suggestion.conflictingParticipants.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-red-600 dark:text-red-400">
                                Conflicts: {suggestion.conflictingParticipants.map(email => {
                                  const participant = participants.find(p => p.email === email);
                                  return participant?.name || email.split('@')[0];
                                }).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex -space-x-2">
                        {suggestion.availableParticipants.slice(0, 3).map(email => {
                          const participant = participants.find(p => p.email === email);
                          return participant ? (
                            <Avatar key={email} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={participant.avatar} alt={participant.name} />
                              <AvatarFallback className="text-xs">
                                {participant.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : null;
                        })}
                        {suggestion.availableParticipants.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              +{suggestion.availableParticipants.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && viewMode === 'grid' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Availability Grid</h3>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded" />
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-200 dark:bg-red-900 rounded" />
                <span>Busy</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                <span>Outside Hours</span>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Time header */}
                <div className="grid grid-cols-[120px_1fr] gap-4">
                  <div></div>
                  <div className="grid grid-cols-10 gap-1 text-xs text-center text-muted-foreground">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i}>
                        {8 + i}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* Participants and their availability */}
                {participantAvailability.map(participant => {
                  const matchingParticipant = participants.find(p => p.email === participant.email);
                  return (
                    <div key={participant.email} className="grid grid-cols-[120px_1fr] gap-4 items-center">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={matchingParticipant?.avatar} alt={participant.name} />
                          <AvatarFallback className="text-xs">
                            {participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium truncate">{participant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {participant.workingHours.start} - {participant.workingHours.end}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-20 gap-0.5">
                        {Array.from({ length: 20 }, (_, i) => {
                          const hour = Math.floor(i / 2) + 8;
                          const minute = (i % 2) * 30;
                          const timeSlot = new Date(selectedDate);
                          timeSlot.setHours(hour, minute, 0, 0);
                          
                          return (
                            <div
                              key={i}
                              className={`h-6 rounded-sm ${getAvailabilityColor(
                                participant,
                                timeSlot.toISOString()
                              )}`}
                              title={`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick actions */}
      {!loading && suggestions.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Smart Actions</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setViewMode('grid')}>
                  View Full Grid
                </Button>
                <Button size="sm" disabled={!selectedSuggestion}>
                  Schedule Meeting
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}