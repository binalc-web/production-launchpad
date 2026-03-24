import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Search, Users, Check, Calendar, ChevronDown, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import smartSuggestionsImage from 'figma:asset/84a8bee2c32e5b2c26b818c36e275f67e768996e.png';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  avatar: string;
  isConnected: boolean;
  availability: 'available' | 'busy' | 'ooo';
  workingHours: { start: string; end: string };
  meetings: Array<{
    date: string;
    startTime: string;
    endTime: string;
    title: string;
  }>;
}

interface TimeSlotSuggestion {
  startTime: string;
  endTime: string;
  availabilityScore: number;
  status: 'perfect' | 'good' | 'acceptable';
  unavailableParticipants: string[];
  description: string;
}

interface SmartMeetingSuggestionsProps {
  selectedDate: Date | null;
  duration: number;
  onParticipantsChange: (participants: string[]) => void;
  onTimeSlotSelect: (startTime: string, endTime: string) => void;
  initialParticipants?: string[];
  selectedTimeSlot?: { date: string; time: string } | null;
}

export function SmartMeetingSuggestions({ 
  selectedDate, 
  duration, 
  onParticipantsChange, 
  onTimeSlotSelect,
  initialParticipants = [],
  selectedTimeSlot
}: SmartMeetingSuggestionsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(initialParticipants);
  const [meetingType, setMeetingType] = useState<'single' | 'series'>('single');
  const [seriesType, setSeriesType] = useState<'daily' | 'weekly' | 'biweekly'>('daily');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  // Mock team members data
  const allMembers: TeamMember[] = [
    {
      id: '1',
      name: 'Alex Johnson',
      email: 'alex.johnson@company.com',
      role: 'Engineering Manager',
      team: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isConnected: true,
      availability: 'available',
      workingHours: { start: '09:00', end: '17:00' },
      meetings: [
        { date: '2025-01-23', startTime: '10:00', endTime: '11:00', title: 'Team Sync' },
        { date: '2025-01-23', startTime: '14:00', endTime: '15:00', title: 'Code Review' }
      ]
    },
    {
      id: '2',
      name: 'Sarah Chen',
      email: 'sarah.chen@company.com',
      role: 'Product Manager',
      team: 'Product',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isConnected: true,
      availability: 'available',
      workingHours: { start: '08:00', end: '16:00' },
      meetings: [
        { date: '2025-01-23', startTime: '09:00', endTime: '10:00', title: 'Product Planning' },
        { date: '2025-01-23', startTime: '16:30', endTime: '17:30', title: 'Stakeholder Meeting' }
      ]
    },
    {
      id: '3',
      name: 'Mike Wilson',
      email: 'mike.wilson@company.com',
      role: 'Senior Developer',
      team: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      isConnected: true,
      availability: 'available',
      workingHours: { start: '09:00', end: '17:00' },
      meetings: [
        { date: '2025-01-23', startTime: '11:00', endTime: '12:00', title: 'Architecture Review' }
      ]
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily.davis@company.com',
      role: 'UX Designer',
      team: 'Design',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      isConnected: true,
      availability: 'available',
      workingHours: { start: '09:00', end: '17:00' },
      meetings: [
        { date: '2025-01-23', startTime: '13:00', endTime: '14:30', title: 'Design Review' }
      ]
    },
    {
      id: '5',
      name: 'David Kim',
      email: 'david.kim@company.com',
      role: 'QA Engineer',
      team: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      isConnected: false,
      availability: 'available',
      workingHours: { start: '09:00', end: '17:00' },
      meetings: []
    },
    {
      id: '6',
      name: 'Lisa Wang',
      email: 'lisa.wang@company.com',
      role: 'Product Designer',
      team: 'Design',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isConnected: true,
      availability: 'busy',
      workingHours: { start: '10:00', end: '18:00' },
      meetings: [
        { date: '2025-01-23', startTime: '10:00', endTime: '12:00', title: 'User Research' },
        { date: '2025-01-23', startTime: '14:00', endTime: '16:00', title: 'Design Sprint' }
      ]
    },
    {
      id: '7',
      name: 'John Martinez',
      email: 'john.martinez@company.com',
      role: 'DevOps Engineer',
      team: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isConnected: true,
      availability: 'available',
      workingHours: { start: '08:00', end: '16:00' },
      meetings: []
    },
    {
      id: '8',
      name: 'Anna Thompson',
      email: 'anna.thompson@company.com',
      role: 'Marketing Lead',
      team: 'Marketing',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      isConnected: true,
      availability: 'ooo',
      workingHours: { start: '09:00', end: '17:00' },
      meetings: []
    }
  ];

  const teams = ['Engineering', 'Product', 'Design', 'Marketing', 'QA'];

  // Filter members based on search and team
  const filteredMembers = useMemo(() => {
    return allMembers.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = selectedTeam === 'all' || member.team === selectedTeam;
      return matchesSearch && matchesTeam;
    });
  }, [searchQuery, selectedTeam]);

  // Calculate smart time suggestions
  const timeSlotSuggestions = useMemo(() => {
    if (!selectedDate || selectedParticipants.length === 0) return [];

    const selectedMembers = allMembers.filter(m => selectedParticipants.includes(m.id));
    const dateStr = selectedDate.toISOString().split('T')[0];
    const suggestions: TimeSlotSuggestion[] = [];

    // Generate time slots from 9 AM to 5 PM
    for (let hour = 9; hour <= 17 - Math.ceil(duration / 60); hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endHour = hour + Math.floor((minute + duration) / 60);
        const endMinute = (minute + duration) % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        let availableCount = 0;
        const unavailableParticipants: string[] = [];

        selectedMembers.forEach(member => {
          const startMinutes = hour * 60 + minute;
          const endMinutes = endHour * 60 + endMinute;
          
          // Check working hours
          const workStart = parseInt(member.workingHours.start.split(':')[0]) * 60 + parseInt(member.workingHours.start.split(':')[1]);
          const workEnd = parseInt(member.workingHours.end.split(':')[0]) * 60 + parseInt(member.workingHours.end.split(':')[1]);
          
          if (startMinutes < workStart || endMinutes > workEnd) {
            unavailableParticipants.push(member.id);
            return;
          }

          // Check existing meetings
          const hasConflict = member.meetings.some(meeting => {
            if (meeting.date !== dateStr) return false;
            const meetingStart = parseInt(meeting.startTime.split(':')[0]) * 60 + parseInt(meeting.startTime.split(':')[1]);
            const meetingEnd = parseInt(meeting.endTime.split(':')[0]) * 60 + parseInt(meeting.endTime.split(':')[1]);
            return (startMinutes < meetingEnd && endMinutes > meetingStart);
          });

          if (!hasConflict && member.availability === 'available') {
            availableCount++;
          } else {
            unavailableParticipants.push(member.id);
          }
        });

        const availabilityScore = Math.round((availableCount / selectedMembers.length) * 100);
        
        let status: 'perfect' | 'good' | 'acceptable' = 'acceptable';
        let description = '';

        if (availabilityScore === 100) {
          status = 'perfect';
          description = 'Perfect time - everyone is available';
        } else if (availabilityScore >= 80) {
          status = 'good';
          description = `Good time - ${availableCount}/${selectedMembers.length} available`;
        } else if (availabilityScore >= 60) {
          status = 'acceptable';
          description = `Acceptable - ${availableCount}/${selectedMembers.length} available`;
        } else {
          continue; // Skip slots with low availability
        }

        suggestions.push({
          startTime,
          endTime,
          availabilityScore,
          status,
          unavailableParticipants,
          description
        });
      }
    }

    // Sort by availability score and return top 5
    return suggestions
      .sort((a, b) => b.availabilityScore - a.availabilityScore)
      .slice(0, 5);
  }, [selectedDate, selectedParticipants, duration]);

  // Sync selection with external selectedTimeSlot prop
  useEffect(() => {
    if (selectedTimeSlot && selectedDate) {
      // Find matching suggestion based on selected time slot
      const matchingSuggestion = timeSlotSuggestions.find(suggestion => 
        suggestion.startTime === selectedTimeSlot.time
      );
      
      if (matchingSuggestion) {
        const suggestionKey = `${matchingSuggestion.startTime}-${matchingSuggestion.endTime}`;
        setSelectedSuggestion(suggestionKey);
      } else {
        setSelectedSuggestion(null);
      }
    } else {
      setSelectedSuggestion(null);
    }
  }, [selectedTimeSlot, selectedDate, timeSlotSuggestions]);

  const handleParticipantToggle = (memberId: string) => {
    const newSelection = selectedParticipants.includes(memberId)
      ? selectedParticipants.filter(id => id !== memberId)
      : [...selectedParticipants, memberId];
    
    setSelectedParticipants(newSelection);
    onParticipantsChange(newSelection);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'perfect': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'acceptable': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getAvailabilityColor = (score: number) => {
    if (score === 100) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const handleSuggestionClick = (suggestion: TimeSlotSuggestion, index: number) => {
    const suggestionKey = `${suggestion.startTime}-${suggestion.endTime}`;
    
    // If clicking the same suggestion, deselect it
    if (selectedSuggestion === suggestionKey) {
      setSelectedSuggestion(null);
    } else {
      // Select the new suggestion
      setSelectedSuggestion(suggestionKey);
      
      // Create full datetime strings with the selected date
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const startDateTime = `${dateStr}T${suggestion.startTime}:00`;
        const endDateTime = `${dateStr}T${suggestion.endTime}:00`;
        onTimeSlotSelect(startDateTime, endDateTime);
      }
    }
  };

  const isSuggestionSelected = (suggestion: TimeSlotSuggestion) => {
    const suggestionKey = `${suggestion.startTime}-${suggestion.endTime}`;
    return selectedSuggestion === suggestionKey;
  };

  return (
    <div className="space-y-6">
      {/* Smart Suggestions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Smart Suggestions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedParticipants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select participants to see smart meeting suggestions</p>
            </div>
          ) : timeSlotSuggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No suitable time slots found for selected participants</p>
              <p className="text-sm mt-2">Try selecting a different date or fewer participants</p>
            </div>
          ) : (
            <div className="space-y-3">
{timeSlotSuggestions.map((suggestion, index) => {
                const isSelected = isSuggestionSelected(suggestion);
                return (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion, index)}
                    className={`w-full p-4 border rounded-lg transition-all text-left relative ${
                      isSelected 
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm' 
                        : 'border-border hover:bg-accent/50 hover:border-primary/50'
                    }`}
                  >
                    {/* Radio button indicator */}
                    <div className={`absolute top-4 right-4 w-4 h-4 rounded-full border-2 transition-colors ${
                      isSelected 
                        ? 'border-primary bg-primary' 
                        : 'border-gray-300 bg-transparent'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pr-8">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`font-medium ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}>
                            {suggestion.startTime} - {suggestion.endTime}
                          </div>
                          <Badge 
                            className={`${getAvailabilityColor(suggestion.availabilityScore)} border`}
                          >
                            {suggestion.availabilityScore}%
                          </Badge>
                          {isSelected && (
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          isSelected ? 'text-primary/80' : 'text-muted-foreground'
                        }`}>
                          {suggestion.description}
                        </p>
                        {suggestion.status === 'perfect' && (
                          <div className="flex items-center space-x-1 mt-2">
                            <Check className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Perfect match</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Type Selection */}


      {/* Participants Selection */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Participants</span>
              {selectedParticipants.length > 0 && (
                <Badge variant="secondary">{selectedParticipants.length}</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[140px]">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="All Teams" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Members List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredMembers.map(member => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                  selectedParticipants.includes(member.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-accent/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedParticipants.includes(member.id)}
                    onCheckedChange={() => handleParticipantToggle(member.id)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{member.name}</p>
                      {member.isConnected && (
                        <Calendar className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      {member.isConnected && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary"
                    className={
                      member.availability === 'available' 
                        ? 'bg-green-100 text-green-800'
                        : member.availability === 'busy'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {member.availability === 'ooo' ? 'Out of Office' : member.availability}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members found</p>
              <p className="text-sm mt-2">Try adjusting your search or team filter</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}