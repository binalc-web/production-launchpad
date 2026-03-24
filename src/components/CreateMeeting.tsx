import React, { useState } from 'react';
import { Calendar, Clock, Users, Video, MapPin, Plus, Check, X, AlertCircle, ChevronLeft, ChevronRight, Eye, Bot, ExternalLink, Zap, PlayCircle, CheckCircle2, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { SmartScheduling } from './SmartScheduling';
import { SmartMeetingSuggestions } from './SmartMeetingSuggestions';
import { toast } from "sonner@2.0.3";
import { User, UserPermissions, Meeting } from '../types';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  availability: 'available' | 'busy' | 'ooo';
  nextAvailable?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  participants: string[];
  organizer?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  zoomLink?: string;
  jiraProject?: string;
  confluenceSpace?: string;
  description?: string;
  location?: string;
}

interface ParticipantMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  participantId: string;
  type: 'meeting' | 'blocked' | 'personal';
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

interface CreateMeetingProps {
  currentUser: User;
  integrations?: Integrations;
  userPermissions?: UserPermissions;
  onMeetingCreated?: () => void;
  onAddMeeting?: (meeting: Meeting) => void;
  onAddMeetings?: (meetings: Meeting[]) => void;
  followUpData?: any;
  meetings?: Meeting[];  // Add meetings prop for real-time statistics
}

export function CreateMeeting({ currentUser, integrations, userPermissions, onMeetingCreated, onAddMeeting, onAddMeetings, followUpData, meetings = [] }: CreateMeetingProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: string; time: string } | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'day' | 'smart'>('month');
  const [showParticipantCalendars, setShowParticipantCalendars] = useState(true);

  const [isInMeeting, setIsInMeeting] = useState(false);

  const [meetingType, setMeetingType] = useState<'single' | 'series'>('single');
  const [seriesType, setSeriesType] = useState<'daily' | 'weekly' | 'biweekly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const [meetingData, setMeetingData] = useState({
    title: followUpData?.title || '',
    description: followUpData?.description || '',
    prepNotes: followUpData?.prepNotes || '',
    duration: followUpData?.duration || 60,
    type: (followUpData?.type as 'virtual' | 'in-person' | 'standup') || 'virtual',
    location: followUpData?.location || '',
    meetingLink: '',
    participants: followUpData?.participants?.map((p: any) => p.id) || [],
    zoomLink: '',
    jiraProject: followUpData?.jiraProject || '',
    confluenceSpace: followUpData?.confluenceSpace || ''
  });

  // Demo meetings for calendar display (these are just for showing in the calendar view)
  const demoMeetings: Meeting[] = [
    {
      id: 'demo-1',
      title: 'Team Standup',
      date: '2025-01-25',
      time: '09:00',
      duration: 30,
      participants: ['2', '3'],
      status: 'upcoming',
      organizer: currentUser.id,
      description: 'Daily standup to sync on progress and blockers'
    },
    {
      id: 'demo-2',
      title: 'Client Review',
      date: '2025-01-25',
      time: '14:00',
      duration: 60,
      participants: ['2', '4'],
      status: 'upcoming',
      organizer: currentUser.id,
      description: 'Review project progress with client stakeholders'
    }
  ];

  // Mock participant meetings data (enhanced with Google Calendar data)
  const participantMeetings: ParticipantMeeting[] = [
    // Sarah Johnson's meetings
    {
      id: 'pm1',
      title: 'Product Planning',
      date: '2025-01-23',
      time: '10:00',
      duration: 90,
      participantId: '2',
      type: 'meeting'
    },
    {
      id: 'pm2',
      title: 'Stakeholder Review',
      date: '2025-01-23',
      time: '15:00',
      duration: 60,
      participantId: '2',
      type: 'meeting'
    },
    {
      id: 'pm3',
      title: 'Focus Time',
      date: '2025-01-24',
      time: '09:00',
      duration: 120,
      participantId: '2',
      type: 'blocked'
    },
    
    // Mike Chen's meetings
    {
      id: 'pm4',
      title: 'Code Review',
      date: '2025-01-23',
      time: '11:00',
      duration: 60,
      participantId: '3',
      type: 'meeting'
    },
    {
      id: 'pm5',
      title: 'Sprint Planning',
      date: '2025-01-23',
      time: '16:00',
      duration: 90,
      participantId: '3',
      type: 'meeting'
    },
    {
      id: 'pm6',
      title: 'Lunch Break',
      date: '2025-01-24',
      time: '12:00',
      duration: 60,
      participantId: '3',
      type: 'personal'
    },

    // Emily Davis's meetings
    {
      id: 'pm7',
      title: 'Design Review',
      date: '2025-01-23',
      time: '13:00',
      duration: 75,
      participantId: '4',
      type: 'meeting'
    },
    {
      id: 'pm8',
      title: 'User Research',
      date: '2025-01-24',
      time: '10:00',
      duration: 120,
      participantId: '4',
      type: 'meeting'
    },

    // David Wilson's meetings
    {
      id: 'pm9',
      title: 'Testing Session',
      date: '2025-01-23',
      time: '14:00',
      duration: 120,
      participantId: '5',
      type: 'meeting'
    },
    {
      id: 'pm10',
      title: 'QA Review',
      date: '2025-01-24',
      time: '15:00',
      duration: 60,
      participantId: '5',
      type: 'meeting'
    }
  ];

  // Mock team members
  const teamMembers: TeamMember[] = [
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'Product Manager',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      availability: 'available'
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      role: 'Senior Developer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      availability: 'busy',
      nextAvailable: '2025-01-25 10:00'
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily.davis@company.com',
      role: 'UX Designer',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      availability: 'available'
    },
    {
      id: '5',
      name: 'David Wilson',
      email: 'david.wilson@company.com',
      role: 'QA Engineer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      availability: 'ooo',
      nextAvailable: '2025-01-26 09:00'
    },
    {
      id: '6',
      name: 'John External',
      email: 'client@external.com',
      role: 'Client',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      availability: 'available'
    }
  ];

  // Use real meetings for display counts (fallback to demo meetings for calendar display)
  const upcomingMeetings = meetings.filter(m => m.status === 'upcoming');
  const ongoingMeetings = meetings.filter(m => m.status === 'ongoing');
  const completedMeetings = meetings.filter(m => m.status === 'completed');

  // Participant colors for visual distinction
  const participantColors = {
    '2': 'bg-blue-500',
    '3': 'bg-purple-500', 
    '4': 'bg-pink-500',
    '5': 'bg-orange-500',
    '6': 'bg-green-500'
  };

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, 1 - (startingDayOfWeek - i));
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    // Add empty cells for remaining days to complete the grid
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ date: nextDate, isCurrentMonth: false });
    }

    return days;
  };

  // Generate time slots for day view
  const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 7; // Start from 7 AM
    return {
      time: `${hour.toString().padStart(2, '0')}:00`,
      display: hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`
    };
  });

  const handleDateClick = (date: Date) => {
    // Prevent selecting past dates
    if (isPastDate(date)) {
      toast.error('Cannot schedule meetings on past dates');
      return;
    }
    setSelectedDate(date);
    
    // Always keep the calendar visible and let the Smart Suggestions handle recommendations
    setViewMode('month');
  };

  const handleTimeSlotClick = (time: string) => {
    if (selectedDate) {
      // Prevent selecting past time slots
      if (isPastTimeSlot(selectedDate, time)) {
        toast.error('Cannot schedule meetings in the past');
        return;
      }
      
      // Check for conflicts with selected participants
      const conflicts = getParticipantConflicts(selectedDate, time, meetingData.duration);
      if (conflicts.length > 0) {
        const conflictNames = conflicts.map(p => teamMembers.find(m => m.id === p)?.name).join(', ');
        toast.error(`Meeting conflicts with ${conflictNames}'s schedule`);
        return;
      }
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      setSelectedTimeSlot({ date: dateStr, time });
      setMeetingData(prev => ({
        ...prev,
        // Auto-generate Zoom link if connected
        zoomLink: integrations?.zoom?.connected ? `https://zoom.us/j/${Math.random().toString().substr(2, 9)}` : '',
        // Set default Jira project if connected
        jiraProject: integrations?.jira?.connected ? integrations.jira.data?.selectedProject || '' : '',
        // Set default Confluence space if connected
        confluenceSpace: integrations?.confluence?.connected ? integrations.confluence.data?.selectedSpace || '' : ''
      }));
    }
  };

  const handleSmartTimeSlotSelect = (start: string, end: string) => {
    const startDate = new Date(start);
    const dateStr = startDate.toISOString().split('T')[0];
    const timeStr = startDate.toTimeString().substring(0, 5);
    
    // Set both selectedDate and selectedTimeSlot to properly update the UI
    setSelectedDate(startDate);
    setSelectedTimeSlot({ date: dateStr, time: timeStr });
    
    setMeetingData(prev => ({
      ...prev,
      zoomLink: integrations?.zoom?.connected ? `https://zoom.us/j/${Math.random().toString().substr(2, 9)}` : '',
      jiraProject: integrations?.jira?.connected ? integrations.jira.data?.selectedProject || '' : '',
      confluenceSpace: integrations?.confluence?.connected ? integrations.confluence.data?.selectedSpace || '' : ''
    }));

    // Provide user feedback
    toast.success('Time slot selected from smart suggestions');
  };

  const handleCreateMeeting = () => {
    // Enhanced validation
    if (!meetingData.title.trim()) {
      toast.error('Please fill in meeting title');
      return;
    }

    if (!selectedTimeSlot) {
      toast.error('Please select a date and time');
      return;
    }

    // Series-specific validation
    if (meetingType === 'series') {
      if (seriesType === 'biweekly' && selectedDays.length === 0) {
        toast.error('Please select at least one day for bi-weekly meetings');
        return;
      }
    }

    // Final validation - prevent creating meetings in the past
    const selectedDateTime = new Date(`${selectedTimeSlot.date}T${selectedTimeSlot.time}`);
    if (selectedDateTime <= new Date()) {
      toast.error('Cannot schedule meetings in the past');
      return;
    }

    const meetingsToCreate: Meeting[] = [];

    if (meetingType === 'single') {
      // Create single meeting
      const newMeeting: Meeting = {
        id: Date.now().toString(),
        title: meetingData.title,
        date: selectedTimeSlot.date,
        time: selectedTimeSlot.time,
        duration: meetingData.duration,
        participants: meetingData.participants,
        status: 'upcoming',
        organizer: currentUser.id,
        zoomLink: meetingData.zoomLink,
        jiraProject: meetingData.jiraProject,
        confluenceSpace: meetingData.confluenceSpace,
        description: meetingData.description,
        prepNotes: meetingData.prepNotes
      };
      meetingsToCreate.push(newMeeting);
    } else {
      // Create meeting series
      const startDate = new Date(selectedTimeSlot.date);
      const seriesCount = seriesType === 'daily' ? 5 : 4; // 5 days for daily, 4 instances for others
      
      for (let i = 0; i < seriesCount; i++) {
        let meetingDate = new Date(startDate);
        
        if (seriesType === 'daily') {
          meetingDate.setDate(startDate.getDate() + i);
          // Skip weekends for daily series
          if (meetingDate.getDay() === 0 || meetingDate.getDay() === 6) {
            continue;
          }
        } else if (seriesType === 'weekly') {
          meetingDate.setDate(startDate.getDate() + (i * 7));
        } else if (seriesType === 'biweekly') {
          // For bi-weekly, we handle this separately below
          break;
        }

        // Only create meetings in the future
        if (meetingDate > new Date()) {
          const newMeeting: Meeting = {
            id: `${Date.now()}-${i}`,
            title: `${meetingData.title} ${seriesType === 'daily' ? `(Day ${i + 1})` : `(${i + 1})`}`,
            date: meetingDate.toISOString().split('T')[0],
            time: selectedTimeSlot.time,
            duration: meetingData.duration,
            participants: meetingData.participants,
            status: 'upcoming',
            organizer: currentUser.id,
            zoomLink: meetingData.zoomLink,
            jiraProject: meetingData.jiraProject,
            confluenceSpace: meetingData.confluenceSpace,
            description: meetingData.description,
            prepNotes: meetingData.prepNotes
          };
          meetingsToCreate.push(newMeeting);
        }
      }

      // Handle bi-weekly meetings separately
      if (seriesType === 'biweekly' && selectedDays.length > 0) {
        let meetingCount = 0;
        for (let week = 0; week < 8 && meetingCount < 4; week++) { // Check up to 8 weeks
          for (const dayOfWeek of selectedDays) {
            if (meetingCount >= 4) break;
            
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (week * 14)); // Every 2 weeks
            
            // Find the next occurrence of the selected day
            const daysUntilTarget = (dayOfWeek - weekDate.getDay() + 7) % 7;
            const meetingDate = new Date(weekDate);
            meetingDate.setDate(weekDate.getDate() + daysUntilTarget);
            
            // Only create if it's in the future
            if (meetingDate > new Date()) {
              const newMeeting: Meeting = {
                id: `${Date.now()}-biweekly-${meetingCount}`,
                title: `${meetingData.title} (${meetingCount + 1})`,
                date: meetingDate.toISOString().split('T')[0],
                time: selectedTimeSlot.time,
                duration: meetingData.duration,
                participants: meetingData.participants,
                status: 'upcoming',
                organizer: currentUser.id,
                zoomLink: meetingData.zoomLink,
                jiraProject: meetingData.jiraProject,
                confluenceSpace: meetingData.confluenceSpace,
                description: meetingData.description,
                prepNotes: meetingData.prepNotes
              };
              meetingsToCreate.push(newMeeting);
              meetingCount++;
            }
          }
        }
      }
    }

    // Add meetings to global state
    if (meetingsToCreate.length === 1) {
      onAddMeeting?.(meetingsToCreate[0]);
    } else {
      onAddMeetings?.(meetingsToCreate);
    }
    
    // Reset form (keeping follow-up data if it exists)
    setMeetingData({
      title: followUpData?.title || '',
      description: followUpData?.description || '',
      prepNotes: followUpData?.prepNotes || '',
      duration: followUpData?.duration || 60,
      type: (followUpData?.type as 'virtual' | 'in-person' | 'standup') || 'virtual',
      location: followUpData?.location || '',
      meetingLink: '',
      participants: followUpData?.participants?.map((p: any) => p.id) || [],
      zoomLink: '',
      jiraProject: followUpData?.jiraProject || '',
      confluenceSpace: followUpData?.confluenceSpace || ''
    });
    setSelectedTimeSlot(null);
    setSelectedDate(null);
    setMeetingType('single');
    setSeriesType('weekly');
    setSelectedDays([]);
    
    // Show integration success messages
    let successMsg = meetingType === 'single' 
      ? 'Meeting created successfully!' 
      : `Meeting series created! ${meetingsToCreate.length} meetings scheduled.`;
      
    if (integrations?.zoom?.connected && meetingData.zoomLink) {
      successMsg += ' Zoom links generated.';
    }
    if (integrations?.jira?.connected && meetingData.jiraProject) {
      successMsg += ' Linked to Jira project.';
    }
    if (integrations?.googleCalendar?.connected) {
      successMsg += ' Calendar invites will be sent.';
    }
    
    toast.success(successMsg);
    
    // Navigate to dashboard after successful creation
    if (onMeetingCreated) {
      setTimeout(() => {
        onMeetingCreated();
      }, 1500); // Small delay to show the success message
    }
  };

  const handleAISuggestion = (suggestion: AISuggestion) => {
    switch (suggestion.type) {
      case 'agenda':
        // Parse agenda suggestions and apply to description
        const agendaItems = suggestion.content.split('\n')
          .filter(line => line.startsWith('•'))
          .map(line => line.substring(1).trim())
          .join('\n');
        
        setMeetingData(prev => ({
          ...prev,
          description: agendaItems
        }));
        break;
        
      case 'meeting-skip':
        toast.info('AI suggests considering alternative approaches for this meeting');
        break;
        
      default:
        break;
    }
  };

  const generateConfluenceAgenda = () => {
    if (!integrations?.confluence?.connected) {
      toast.error('Please connect Confluence first');
      return;
    }

    const mockAgenda = `Meeting Agenda (Generated from Confluence)

• Review latest architectural decisions from Engineering space
• Discuss product roadmap updates from Product space  
• Address action items from previous meeting notes
• Plan next sprint deliverables

Background Context:
- Reference: Engineering > API Design Patterns
- Reference: Product > Q1 Feature Requirements
- Reference: Meeting Notes > Previous Action Items`;

    setMeetingData(prev => ({
      ...prev,
      description: mockAgenda
    }));
    
    toast.success('Agenda generated from Confluence knowledge base');
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getMeetingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    // Use real meetings if available, otherwise fall back to demo meetings for calendar display
    const meetingsToShow = meetings.length > 0 ? meetings : demoMeetings;
    return meetingsToShow.filter(meeting => meeting.date === dateStr);
  };

  const getMeetingForTimeSlot = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0];
    // Use real meetings if available, otherwise fall back to demo meetings for calendar display
    const meetingsToShow = meetings.length > 0 ? meetings : demoMeetings;
    return meetingsToShow.find(meeting => meeting.date === dateStr && meeting.time === time);
  };

  const getParticipantMeetingsForTimeSlot = (date: Date, time: string) => {
    if (!showParticipantCalendars || meetingData.participants.length === 0) {
      return [];
    }

    const dateStr = date.toISOString().split('T')[0];
    const currentTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1] || '0');
    
    return participantMeetings.filter(meeting => {
      if (meeting.date !== dateStr) return false;
      if (!meetingData.participants.includes(meeting.participantId)) return false;
      
      const meetingStartMinutes = parseInt(meeting.time.split(':')[0]) * 60 + parseInt(meeting.time.split(':')[1] || '0');
      const meetingEndMinutes = meetingStartMinutes + meeting.duration;
      
      return currentTimeMinutes >= meetingStartMinutes && currentTimeMinutes < meetingEndMinutes;
    });
  };

  const getParticipantConflicts = (date: Date, time: string, duration: number) => {
    const dateStr = date.toISOString().split('T')[0];
    const newMeetingStart = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1] || '0');
    const newMeetingEnd = newMeetingStart + duration;
    
    const conflicts: string[] = [];
    
    meetingData.participants.forEach(participantId => {
      const participantMeetingsOnDate = participantMeetings.filter(
        meeting => meeting.date === dateStr && meeting.participantId === participantId
      );
      
      const hasConflict = participantMeetingsOnDate.some(meeting => {
        const meetingStart = parseInt(meeting.time.split(':')[0]) * 60 + parseInt(meeting.time.split(':')[1] || '0');
        const meetingEnd = meetingStart + meeting.duration;
        
        return (newMeetingStart < meetingEnd && newMeetingEnd > meetingStart);
      });
      
      if (hasConflict) {
        conflicts.push(participantId);
      }
    });
    
    return conflicts;
  };

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1: Date, date2: Date | null) => {
    if (!date2) return false;
    return date1.toDateString() === date2.toDateString();
  };

  // Helper functions for date/time validation
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const isPastTimeSlot = (date: Date, time: string) => {
    const now = new Date();
    const slotDateTime = new Date(`${date.toISOString().split('T')[0]}T${time}`);
    return slotDateTime <= now;
  };

  const isTimeSlotDisabled = (date: Date, time: string) => {
    return isPastDate(date) || isPastTimeSlot(date, time);
  };

  const getSelectedParticipants = () => {
    return teamMembers.filter(member => meetingData.participants.includes(member.id));
  };

  const getConnectedIntegrationsCount = () => {
    if (!integrations) return 0;
    return Object.values(integrations).filter(i => i.connected).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <Clock className="h-3 w-3" />;
      case 'ongoing': return <PlayCircle className="h-3 w-3" />;
      case 'completed': return <CheckCircle2 className="h-3 w-3" />;
      default: return <Calendar className="h-3 w-3" />;
    }
  };

  const formatMeetingTime = (time: string, duration: number) => {
    const startTime = new Date(`2025-01-01T${time}`);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    return `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };

  const getDayName = (dayNumber: number) => {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNumber];
  };

  const getSeriesPreview = () => {
    if (meetingType === 'single' || !selectedTimeSlot) return null;
    
    const startDate = new Date(selectedTimeSlot.date);
    const meetings = [];
    
    if (seriesType === 'daily') {
      for (let i = 0; i < 5; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
          meetings.push(date);
        }
      }
    } else if (seriesType === 'weekly') {
      for (let i = 0; i < 4; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (i * 7));
        meetings.push(date);
      }
    } else if (seriesType === 'biweekly' && selectedDays.length > 0) {
      const weeksToSchedule = 4;
      for (let week = 0; week < weeksToSchedule && meetings.length < 4; week++) {
        for (const dayOfWeek of selectedDays) {
          if (meetings.length >= 4) break;
          
          const weekDate = new Date(startDate);
          weekDate.setDate(startDate.getDate() + (week * 14));
          
          const daysUntilTarget = (dayOfWeek - weekDate.getDay() + 7) % 7;
          weekDate.setDate(weekDate.getDate() + daysUntilTarget);
          
          if (weekDate > new Date()) {
            meetings.push(weekDate);
          }
        }
      }
    }
    
    return meetings.slice(0, 4); // Limit preview to 4 meetings
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Follow-up Notice */}
      {followUpData && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Follow-up Meeting</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Creating follow-up for "{followUpData.previousMeetingTitle}". 
                  Details have been pre-filled for your convenience.
                </p>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>• {followUpData.participants?.length || 0} participants pre-selected</span>
                  <span>• {followUpData.actionItems?.length || 0} action items to follow up on</span>
                  <span>• {followUpData.decisions?.length || 0} decisions to review</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Meeting Overview Sidebar */}
        <div className="lg:col-span-1 space-y-6">
        {/* Welcome Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">Welcome back, {currentUser.name.split(' ')[0]}!</h3>
                <p className="text-sm text-muted-foreground">Ready to schedule your next meeting?</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Stats */}
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{upcomingMeetings.length}</p>
                </div>
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ongoing</p>
                  <p className="text-2xl font-bold text-green-600">{ongoingMeetings.length}</p>
                </div>
                <PlayCircle className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-gray-600">{completedMeetings.length}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ongoing Meetings */}
        {ongoingMeetings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <Timer className="h-4 w-4 text-green-600" />
                <span>Live Now</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {ongoingMeetings.map(meeting => (
                <div key={meeting.id} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 dark:text-green-100">{meeting.title}</h4>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        {formatMeetingTime(meeting.time, meeting.duration)}
                      </p>
                      <div className="flex items-center space-x-1 mt-2">
                        {meeting.participants.slice(0, 3).map(participantId => {
                          const participant = teamMembers.find(m => m.id === participantId);
                          return participant ? (
                            <Avatar key={participantId} className="h-5 w-5">
                              <AvatarImage src={participant.avatar} alt={participant.name} />
                              <AvatarFallback className="text-xs">{participant.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ) : null;
                        })}
                        {meeting.participants.length > 3 && (
                          <span className="text-xs text-green-700 dark:text-green-300">
                            +{meeting.participants.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    {meeting.zoomLink && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => window.open(meeting.zoomLink, '_blank')}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Upcoming</span>
              </div>
              <Badge variant="secondary">{upcomingMeetings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {upcomingMeetings.slice(0, 3).map(meeting => (
              <div key={meeting.id} className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{meeting.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {formatMeetingTime(meeting.time, meeting.duration)}
                    </p>
                    <div className="flex items-center space-x-1 mt-2">
                      {meeting.participants.slice(0, 3).map(participantId => {
                        const participant = teamMembers.find(m => m.id === participantId);
                        return participant ? (
                          <Avatar key={participantId} className="h-5 w-5">
                            <AvatarImage src={participant.avatar} alt={participant.name} />
                            <AvatarFallback className="text-xs">{participant.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : null;
                      })}
                      {meeting.participants.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{meeting.participants.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  {meeting.zoomLink && (
                    <Video className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              </div>
            ))}
            {upcomingMeetings.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full">
                View All ({upcomingMeetings.length - 3} more)
              </Button>
            )}
            {upcomingMeetings.length === 0 && (
              <div className="text-center py-4">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming meetings</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-gray-600" />
                <span>Recent</span>
              </div>
              <Badge variant="outline">{completedMeetings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {completedMeetings.slice(0, 2).map(meeting => (
              <div key={meeting.id} className="p-3 border border-border rounded-lg opacity-75 hover:opacity-100 transition-opacity">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{meeting.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {meeting.duration}m
                    </p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              </div>
            ))}
            {completedMeetings.length > 2 && (
              <Button variant="ghost" size="sm" className="w-full">
                View All ({completedMeetings.length - 2} more)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Create Meeting Area */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Schedule Meeting</h2>
            <p className="text-muted-foreground">
              {followUpData 
                ? 'Review and schedule your follow-up meeting'
                : integrations?.googleCalendar?.connected 
                  ? 'Smart scheduling with Google Calendar integration'
                  : 'Click on a date and time to create a meeting with AI assistance'
              }
              {getConnectedIntegrationsCount() > 0 && (
                <span className="text-primary"> • {getConnectedIntegrationsCount()} integrations active</span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {viewMode !== 'month' && (
              <Button variant="outline" onClick={() => setViewMode('month')}>
                Back to Calendar
              </Button>
            )}
            {isInMeeting && (
              <Button 
                variant="outline" 
                onClick={() => setIsInMeeting(false)}
                className="border-red-200 text-red-700 bg-red-50"
              >
                End Meeting
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">




            {/* Meeting Type Selection */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  Meeting Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <Button
                    variant={meetingType === 'single' ? 'default' : 'outline'}
                    onClick={() => setMeetingType('single')}
                    className="flex-1"
                  >
                    Single Meeting
                  </Button>
                  <Button
                    variant={meetingType === 'series' ? 'default' : 'outline'}
                    onClick={() => setMeetingType('series')}  
                    className="flex-1"
                  >
                    Meeting Series
                  </Button>
                </div>
                
                {meetingType === 'series' && (
                  <div className="space-y-4">
                    <Select value={seriesType} onValueChange={(value: 'daily' | 'weekly' | 'biweekly') => {
                      setSeriesType(value);
                      setSelectedDays([]); // Reset selected days when changing series type
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select series type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily Scrum (5 days)</SelectItem>
                        <SelectItem value="weekly">Weekly Meeting (4 weeks)</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly Check-in (4 sessions)</SelectItem>
                      </SelectContent>
                    </Select>

                    {seriesType === 'biweekly' && (
                      <div className="space-y-3">
                        <Label className="font-medium">Select Days of the Week</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: 'Sun', value: 0 },
                            { label: 'Mon', value: 1 },
                            { label: 'Tue', value: 2 },
                            { label: 'Wed', value: 3 },
                            { label: 'Thu', value: 4 },
                            { label: 'Fri', value: 5 },
                            { label: 'Sat', value: 6 }
                          ].map(day => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSelectedDays(prev => 
                                  prev.includes(day.value)
                                    ? prev.filter(d => d !== day.value)
                                    : [...prev, day.value].sort()
                                );
                              }}
                              className="h-10 px-3"
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                        {selectedDays.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Meetings will occur every 2 weeks on {selectedDays.map(d => 
                              ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]
                            ).join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {seriesType === 'daily' && (
                      <p className="text-sm text-muted-foreground">
                        Daily meetings will be scheduled Monday through Friday for 5 consecutive business days.
                      </p>
                    )}

                    {seriesType === 'weekly' && (
                      <p className="text-sm text-muted-foreground">
                        Weekly meetings will be scheduled on the same day and time for 4 consecutive weeks.
                      </p>
                    )}

                    {/* Series Preview */}
                    {selectedTimeSlot && (
                      <div className="space-y-3">
                        <Label className="font-medium">Meeting Series Preview</Label>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          {getSeriesPreview()?.map((date, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                Meeting {index + 1}
                              </span>
                              <span className="text-muted-foreground">
                                {date.toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })} at {selectedTimeSlot.time}
                              </span>
                            </div>
                          )) || (
                            <p className="text-sm text-muted-foreground text-center">
                              {seriesType === 'biweekly' && selectedDays.length === 0 
                                ? 'Select days to see preview'
                                : 'Select date and time to see preview'
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Full-Width Calendar/Scheduling Area */}
            <div className="w-full space-y-6">
                {viewMode === 'month' ? (
                  /* Month View */
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Week Headers */}
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {weekDays.map(day => (
                          <div key={day} className="p-3 text-center font-medium text-muted-foreground">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-2">
                        {days.map(({ date, isCurrentMonth }, index) => {
                          const dayMeetings = getMeetingsForDate(date);
                          const isPast = isPastDate(date);
                          const isSelected = isSameDay(date, selectedDate);
                          const isDateToday = isToday(date);
                          
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => !isPast && isCurrentMonth && handleDateClick(date)}
                              disabled={isPast || !isCurrentMonth}
                              className={`
                                min-h-[100px] p-2 border transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:z-10
                                ${isPast || !isCurrentMonth
                                  ? 'bg-muted/30 cursor-not-allowed opacity-50 border-muted' 
                                  : 'hover:bg-accent cursor-pointer border-border hover:border-primary/20 hover:shadow-sm'
                                }
                                ${isSelected ? 'bg-primary/10 border-primary ring-2 ring-primary/20' : ''}
                                ${isDateToday && !isSelected ? 'ring-1 ring-primary/40 bg-primary/5' : ''}
                              `}
                            >
                              <div className="text-left h-full flex flex-col">
                                <div className={`font-medium mb-2 ${
                                  isPast || !isCurrentMonth
                                    ? 'text-muted-foreground/50' 
                                    : isSelected
                                      ? 'text-primary font-semibold'
                                      : isDateToday
                                        ? 'text-primary'
                                        : 'text-foreground'
                                }`}>
                                  {date.getDate()}
                                  {isPast && <span className="text-xs block text-muted-foreground/50 font-normal">Past</span>}
                                  {isDateToday && !isPast && <span className="text-xs block text-primary/70 font-normal">Today</span>}
                                </div>
                                <div className="space-y-1 flex-1">
                                  {isCurrentMonth && !isPast && dayMeetings.slice(0, 2).map(meeting => (
                                    <div
                                      key={meeting.id}
                                      className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded truncate flex items-center"
                                    >
                                      {meeting.zoomLink && <Video className="h-2 w-2 mr-1 flex-shrink-0" />}
                                      <span className="truncate">{meeting.time} {meeting.title}</span>
                                    </div>
                                  ))}
                                  {isCurrentMonth && !isPast && dayMeetings.length > 2 && (
                                    <div className="text-xs text-muted-foreground font-medium">
                                      +{dayMeetings.length - 2} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : viewMode === 'smart' ? (
                  /* Smart Scheduling View */
                  selectedDate && (
                    <SmartScheduling
                      selectedDate={selectedDate}
                      duration={meetingData.duration}
                      participants={getSelectedParticipants()}
                      onTimeSlotSelect={handleSmartTimeSlotSelect}
                      isGoogleCalendarConnected={integrations?.googleCalendar?.connected || false}
                    />
                  )
                ) : (
                  /* Day View */
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          {selectedDate && formatDateHeader(selectedDate)}
                        </CardTitle>
                        {!isInMeeting && (
                          <Button 
                            onClick={() => setIsInMeeting(true)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Start Meeting
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {timeSlots.map(({ time, display }) => {
                          const meeting = selectedDate && getMeetingForTimeSlot(selectedDate, time);
                          const participantMeetings = selectedDate && getParticipantMeetingsForTimeSlot(selectedDate, time);
                          const isDisabled = selectedDate && isTimeSlotDisabled(selectedDate, time);
                          const hasConflict = selectedDate && meetingData.participants.length > 0 && 
                                            getParticipantConflicts(selectedDate, time, meetingData.duration).length > 0;
                          
                          return (
                            <div
                              key={time}
                              className={`grid grid-cols-[80px_1fr] border-b border-border transition-colors ${
                                isDisabled ? 'opacity-50' : 'hover:bg-accent/50'
                              }`}
                            >
                              <div className={`p-3 text-sm border-r border-border ${
                                isDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'
                              }`}>
                                {display}
                              </div>
                              <div className="p-3 relative">
                                {meeting ? (
                                  <div className="bg-primary text-primary-foreground p-2 rounded-md relative z-10">
                                    <div className="flex items-center space-x-2">
                                      {meeting.zoomLink && <Video className="h-3 w-3" />}
                                      {meeting.jiraProject && <Check className="h-3 w-3" />}
                                      <div className="font-medium">{meeting.title}</div>
                                    </div>
                                    <div className="text-xs opacity-90 mt-1">
                                      {meeting.duration} minutes • {teamMembers.filter(m => meeting.participants.includes(m.id)).map(m => m.name).join(', ')}
                                      {meeting.zoomLink && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-xs p-0 h-auto text-primary-foreground/80 hover:text-primary-foreground ml-2"
                                          onClick={() => window.open(meeting.zoomLink, '_blank')}
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ) : isDisabled ? (
                                  <div className="p-2">
                                    <span className="text-muted-foreground/50 text-sm">
                                      {isPastDate(selectedDate!) ? 'Past date' : 'Time has passed'}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    {/* Participant meetings overlay */}
                                    {showParticipantCalendars && participantMeetings && participantMeetings.length > 0 && (
                                      <div className="absolute inset-0 flex space-x-1 p-1">
                                        {participantMeetings.map((pMeeting, index) => (
                                          <div
                                            key={pMeeting.id}
                                            className={`flex-1 rounded p-1 ${participantColors[pMeeting.participantId as keyof typeof participantColors]} text-white opacity-75`}
                                            style={{ maxWidth: `${100 / participantMeetings.length}%` }}
                                          >
                                            <div className="text-xs font-medium truncate">{pMeeting.title}</div>
                                            <div className="text-xs opacity-90 truncate">
                                              {teamMembers.find(m => m.id === pMeeting.participantId)?.name}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    <button
                                      onClick={() => handleTimeSlotClick(time)}
                                      className={`w-full text-left hover:bg-accent p-2 rounded-md transition-colors relative z-20 ${
                                        hasConflict ? 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800' : ''
                                      }`}
                                      disabled={hasConflict}
                                    >
                                      <span className={`text-sm ${
                                        hasConflict 
                                          ? 'text-red-600 dark:text-red-400' 
                                          : participantMeetings && participantMeetings.length > 0 
                                            ? 'text-foreground font-medium'
                                            : 'text-muted-foreground'
                                      }`}>
                                        {hasConflict 
                                          ? '⚠️ Scheduling conflict' 
                                          : participantMeetings && participantMeetings.length > 0 
                                            ? 'Click to schedule (participants busy)'
                                            : 'Click to create meeting'
                                        }
                                      </span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Meeting Details Form */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    Meeting Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Integration Status */}
                  {getConnectedIntegrationsCount() > 0 && (
                    <div className="bg-gradient-to-r from-primary/8 via-primary/5 to-primary/8 border border-primary/25 rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <h4 className="font-semibold text-foreground">Smart Meeting Features</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {integrations?.zoom?.connected && (
                              <div className="flex items-center gap-3 h-12 px-4 py-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-medium text-blue-900 dark:text-blue-100">Zoom link auto-generated</span>
                              </div>
                            )}
                            {integrations?.googleCalendar?.connected && (
                              <div className="flex items-center gap-3 h-12 px-4 py-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-medium text-emerald-900 dark:text-emerald-100">Calendar invites will be sent</span>
                              </div>
                            )}
                            {integrations?.confluence?.connected && (
                              <div className="flex items-center gap-3 h-12 px-4 py-3 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                                <ExternalLink className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                <span className="font-medium text-orange-900 dark:text-orange-100">Confluence docs available</span>
                              </div>
                            )}
                            {integrations?.jira?.connected && (
                              <div className="flex items-center gap-3 h-12 px-4 py-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                                <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="font-medium text-purple-900 dark:text-purple-100">Auto-linked to project</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Meeting Title */}
                    <div className="space-y-3">
                      <Label htmlFor="title" className="font-semibold text-foreground">
                        Meeting Title *
                      </Label>
                      <Input
                        id="title"
                        placeholder="Enter a clear, descriptive meeting title"
                        value={meetingData.title}
                        onChange={(e) => setMeetingData(prev => ({ ...prev, title: e.target.value }))}
                        className="h-12 px-4 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Duration */}
                    <div className="space-y-3">
                      <Label className="font-semibold text-foreground">Duration</Label>
                      <Select 
                        value={meetingData.duration.toString()} 
                        onValueChange={(value) => setMeetingData(prev => ({ ...prev, duration: parseInt(value) }))}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>15 minutes</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="30">
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>30 minutes</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="60">
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>1 hour</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="90">
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>1.5 hours</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="120">
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>2 hours</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Meeting Type */}
                    <div className="space-y-3">
                      <Label className="font-semibold text-foreground">Meeting Type</Label>
                      <Select 
                        value={meetingData.type} 
                        onValueChange={(value: 'virtual' | 'in-person' | 'standup') => 
                          setMeetingData(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="virtual">
                            <div className="flex items-center gap-3">
                              <Video className="h-4 w-4 text-blue-600" />
                              <span>Virtual Meeting</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="in-person">
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span>In-Person</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="standup">
                            <div className="flex items-center gap-3">
                              <Users className="h-4 w-4 text-purple-600" />
                              <span>Daily Standup</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selected Date & Time Display */}
                    <div className="space-y-3">
                      <Label className="font-semibold text-foreground">Selected Time</Label>
                      <div className={`h-12 px-4 py-3 border rounded-lg flex items-center transition-all ${
                        selectedDate && selectedTimeSlot 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                          : 'border-border bg-muted/30'
                      }`}>
                        {selectedDate && selectedTimeSlot ? (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">
                              {selectedDate.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric' 
                              })} at {selectedTimeSlot.time}
                            </span>
                            <Check className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select date and time from calendar or smart suggestions</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description" className="font-semibold text-foreground">
                        Description / Agenda
                      </Label>
                      {integrations?.confluence?.connected && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={generateConfluenceAgenda}
                          className="h-8"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Generate from Confluence
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Add meeting description, agenda items, or discussion topics..."
                      value={meetingData.description}
                      onChange={(e) => setMeetingData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="px-4 py-3 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  {/* Preparation Notes */}
                  <div className="space-y-3">
                    <Label htmlFor="prepNotes" className="font-semibold text-foreground flex items-center gap-2">
                      <div className="p-1 rounded bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      Preparation Notes
                    </Label>
                    <Textarea
                      id="prepNotes"
                      placeholder="Add notes about what participants should prepare before the meeting, materials to review, decisions to be made..."
                      value={meetingData.prepNotes}
                      onChange={(e) => setMeetingData(prev => ({ ...prev, prepNotes: e.target.value }))}
                      rows={3}
                      className="px-4 py-3 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      These notes will be visible to participants in the meeting dashboard to help them prepare effectively.
                    </p>
                  </div>

                  {/* Integration Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {integrations?.jira?.connected && (
                      <div className="space-y-3">
                        <Label htmlFor="jiraProject" className="font-medium">Jira Project</Label>
                        <Select 
                          value={meetingData.jiraProject} 
                          onValueChange={(value) => setMeetingData(prev => ({ ...prev, jiraProject: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Jira project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MT">MT - Meeting Tracker</SelectItem>
                            <SelectItem value="API">API - API Gateway</SelectItem>
                            <SelectItem value="UX">UX - User Experience</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {integrations?.confluence?.connected && (
                      <div className="space-y-3">
                        <Label htmlFor="confluenceSpace" className="font-medium">Confluence Space</Label>
                        <Select 
                          value={meetingData.confluenceSpace} 
                          onValueChange={(value) => setMeetingData(prev => ({ ...prev, confluenceSpace: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Confluence space" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ENG">ENG - Engineering</SelectItem>
                            <SelectItem value="PROD">PROD - Product</SelectItem>
                            <SelectItem value="MEET">MEET - Meeting Notes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Zoom Link Display */}
                  {integrations?.zoom?.connected && meetingData.zoomLink && (
                    <div className="space-y-3">
                      <Label htmlFor="zoomLink" className="font-medium">Zoom Link</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="zoomLink"
                          placeholder="Auto-generated Zoom link"
                          value={meetingData.zoomLink}
                          readOnly
                          className="bg-muted/30"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(meetingData.zoomLink, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Smart Meeting Suggestions */}
              <SmartMeetingSuggestions
                selectedDate={selectedDate}
                duration={meetingData.duration}
                onParticipantsChange={(participants) => setMeetingData(prev => ({ ...prev, participants }))}
                onTimeSlotSelect={handleSmartTimeSlotSelect}
                initialParticipants={meetingData.participants}
                selectedTimeSlot={selectedTimeSlot}
              />

              {/* Schedule Meeting Button */}
              <div className="flex justify-center pt-6">
                <Button 
                  onClick={handleCreateMeeting} 
                  disabled={
                    !meetingData.title.trim() || 
                    !selectedTimeSlot ||
                    (meetingType === 'series' && seriesType === 'biweekly' && selectedDays.length === 0)
                  }
                  className="h-12 px-8 font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {meetingType === 'single' 
                    ? 'Schedule Meeting'
                    : `Create ${seriesType === 'daily' ? '5' : '4'} Meeting Series`
                  }
                </Button>
              </div>
              
              {/* Validation Helper Text */}
              {(!meetingData.title.trim() || !selectedTimeSlot || (meetingType === 'series' && seriesType === 'biweekly' && selectedDays.length === 0)) && (
                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground">
                    {!meetingData.title.trim() && 'Please enter a meeting title'}
                    {meetingData.title.trim() && !selectedTimeSlot && 'Please select a date and time'}
                    {meetingData.title.trim() && selectedTimeSlot && meetingType === 'series' && seriesType === 'biweekly' && selectedDays.length === 0 && 'Please select days for bi-weekly meetings'}
                  </p>
                </div>
              )}
            </div>
        </div>
      </div>
      </div>
    </div>
  );
}