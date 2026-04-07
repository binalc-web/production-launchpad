import { toast } from "sonner@2.0.3";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  isPrivate: boolean;
  location?: string;
  description?: string;
}

export interface ParticipantAvailability {
  email: string;
  name: string;
  events: CalendarEvent[];
  workingHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
    timezone: string;
  };
  isExternal: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  duration: number; // in minutes
  isAvailable: boolean;
  conflictingParticipants: string[];
}

export interface SchedulingSuggestion {
  start: string;
  end: string;
  confidence: number;
  availableParticipants: string[];
  conflictingParticipants: string[];
  reason: string;
}

class GoogleCalendarService {
  private mockData: { [email: string]: ParticipantAvailability } = {
    'sarah.johnson@company.com': {
      email: 'sarah.johnson@company.com',
      name: 'Sarah Johnson',
      events: [
        {
          id: '1',
          title: 'Product Strategy Meeting',
          start: '2025-01-25T10:00:00Z',
          end: '2025-01-25T11:30:00Z',
          attendees: ['team@company.com'],
          isPrivate: false,
          location: 'Conference Room A'
        },
        {
          id: '2',
          title: 'Client Call',
          start: '2025-01-25T14:00:00Z',
          end: '2025-01-25T15:00:00Z',
          attendees: ['client@external.com'],
          isPrivate: false
        },
        {
          id: '3',
          title: 'Personal Appointment',
          start: '2025-01-26T12:00:00Z',
          end: '2025-01-26T13:00:00Z',
          attendees: [],
          isPrivate: true
        }
      ],
      workingHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'America/New_York'
      },
      isExternal: false
    },
    'mike.chen@company.com': {
      email: 'mike.chen@company.com',
      name: 'Mike Chen',
      events: [
        {
          id: '4',
          title: 'Code Review Session',
          start: '2025-01-25T09:00:00Z',
          end: '2025-01-25T10:00:00Z',
          attendees: ['dev-team@company.com'],
          isPrivate: false
        },
        {
          id: '5',
          title: 'Sprint Planning',
          start: '2025-01-25T15:30:00Z',
          end: '2025-01-25T17:00:00Z',
          attendees: ['dev-team@company.com'],
          isPrivate: false,
          location: 'Conference Room B'
        },
        {
          id: '6',
          title: 'Focus Time - Development',
          start: '2025-01-26T09:00:00Z',
          end: '2025-01-26T12:00:00Z',
          attendees: [],
          isPrivate: false
        }
      ],
      workingHours: {
        start: '08:30',
        end: '16:30',
        timezone: 'America/New_York'
      },
      isExternal: false
    },
    'emily.davis@company.com': {
      email: 'emily.davis@company.com',
      name: 'Emily Davis',
      events: [
        {
          id: '7',
          title: 'Design Review',
          start: '2025-01-25T11:00:00Z',
          end: '2025-01-25T12:00:00Z',
          attendees: ['design-team@company.com'],
          isPrivate: false
        },
        {
          id: '8',
          title: 'User Research Session',
          start: '2025-01-25T13:00:00Z',
          end: '2025-01-25T14:30:00Z',
          attendees: ['research@company.com'],
          isPrivate: false,
          location: 'UX Lab'
        },
        {
          id: '9',
          title: 'Lunch with Design Team',
          start: '2025-01-26T12:00:00Z',
          end: '2025-01-26T13:00:00Z',
          attendees: ['design-team@company.com'],
          isPrivate: false
        }
      ],
      workingHours: {
        start: '09:30',
        end: '17:30',
        timezone: 'America/New_York'
      },
      isExternal: false
    },
    'client@external.com': {
      email: 'client@external.com',
      name: 'John External',
      events: [
        {
          id: '10',
          title: 'Busy',
          start: '2025-01-25T16:00:00Z',
          end: '2025-01-25T17:00:00Z',
          attendees: [],
          isPrivate: true
        },
        {
          id: '11',
          title: 'Busy',
          start: '2025-01-26T10:00:00Z',
          end: '2025-01-26T11:30:00Z',
          attendees: [],
          isPrivate: true
        }
      ],
      workingHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'America/New_York'
      },
      isExternal: true
    }
  };

  async fetchParticipantAvailability(
    emails: string[], 
    startDate: string, 
    endDate: string
  ): Promise<ParticipantAvailability[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return emails.map(email => {
      const participant = this.mockData[email];
      if (!participant) {
        // Return limited info for unknown participants
        return {
          email,
          name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          events: [],
          workingHours: {
            start: '09:00',
            end: '17:00',
            timezone: 'America/New_York'
          },
          isExternal: true
        };
      }

      // Filter events within the date range
      const filteredEvents = participant.events.filter(event => {
        const eventStart = new Date(event.start);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        return eventStart >= rangeStart && eventStart <= rangeEnd;
      });

      return {
        ...participant,
        events: filteredEvents
      };
    });
  }

  generateTimeSlots(
    date: string, 
    duration: number = 60, 
    participants: ParticipantAvailability[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dateObj = new Date(date);
    
    // Generate slots from 8 AM to 6 PM in 30-minute increments
    for (let hour = 8; hour < 18; hour++) {
      for (let minutes = 0; minutes < 60; minutes += 30) {
        const slotStart = new Date(dateObj);
        slotStart.setHours(hour, minutes, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Don't create slots that extend beyond working hours
        if (slotEnd.getHours() > 18) continue;

        const conflictingParticipants = this.checkConflicts(
          slotStart.toISOString(),
          slotEnd.toISOString(),
          participants
        );

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          duration,
          isAvailable: conflictingParticipants.length === 0,
          conflictingParticipants
        });
      }
    }

    return slots;
  }

  private checkConflicts(
    slotStart: string,
    slotEnd: string,
    participants: ParticipantAvailability[]
  ): string[] {
    const conflicting: string[] = [];
    const slotStartTime = new Date(slotStart);
    const slotEndTime = new Date(slotEnd);

    participants.forEach(participant => {
      // Check working hours first
      const slotHour = slotStartTime.getHours();
      const slotMinute = slotStartTime.getMinutes();
      const slotTimeStr = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;
      
      const workStart = participant.workingHours.start;
      const workEnd = participant.workingHours.end;
      
      if (slotTimeStr < workStart || slotTimeStr >= workEnd) {
        conflicting.push(participant.email);
        return;
      }

      // Check for event conflicts
      const hasConflict = participant.events.some(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        // Check if times overlap
        return (slotStartTime < eventEnd && slotEndTime > eventStart);
      });

      if (hasConflict) {
        conflicting.push(participant.email);
      }
    });

    return conflicting;
  }

  findOptimalMeetingTimes(
    date: string,
    duration: number,
    participants: ParticipantAvailability[],
    maxSuggestions: number = 5
  ): SchedulingSuggestion[] {
    const timeSlots = this.generateTimeSlots(date, duration, participants);
    const suggestions: SchedulingSuggestion[] = [];

    // Prioritize fully available slots
    const fullyAvailable = timeSlots.filter(slot => slot.isAvailable);
    fullyAvailable.forEach(slot => {
      suggestions.push({
        start: slot.start,
        end: slot.end,
        confidence: 100,
        availableParticipants: participants.map(p => p.email),
        conflictingParticipants: [],
        reason: 'All participants are available'
      });
    });

    // If we need more suggestions, find slots with minimal conflicts
    if (suggestions.length < maxSuggestions) {
      const partiallyAvailable = timeSlots
        .filter(slot => !slot.isAvailable && slot.conflictingParticipants.length < participants.length)
        .sort((a, b) => a.conflictingParticipants.length - b.conflictingParticipants.length);

      partiallyAvailable.forEach(slot => {
        if (suggestions.length >= maxSuggestions) return;

        const availableCount = participants.length - slot.conflictingParticipants.length;
        const confidence = Math.round((availableCount / participants.length) * 100);
        
        suggestions.push({
          start: slot.start,
          end: slot.end,
          confidence,
          availableParticipants: participants
            .filter(p => !slot.conflictingParticipants.includes(p.email))
            .map(p => p.email),
          conflictingParticipants: slot.conflictingParticipants,
          reason: `${availableCount} of ${participants.length} participants available`
        });
      });
    }

    return suggestions.slice(0, maxSuggestions);
  }

  async createCalendarEvent(eventData: {
    title: string;
    start: string;
    end: string;
    attendees: string[];
    description?: string;
    location?: string;
  }): Promise<{ success: boolean; eventId?: string; error?: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Mock successful event creation
      const eventId = `event_${Date.now()}`;
      
      toast.success('Meeting created and calendar invites sent!');
      
      return {
        success: true,
        eventId
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create calendar event'
      };
    }
  }

  formatTimeSlot(start: string, end: string): string {
    const startTime = new Date(start);
    const endTime = new Date(end);
    
    const startStr = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const endStr = endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${startStr} - ${endStr}`;
  }

  isWorkingHours(time: string, workingHours: { start: string; end: string }): boolean {
    const timeDate = new Date(time);
    const hour = timeDate.getHours();
    const minute = timeDate.getMinutes();
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    return timeStr >= workingHours.start && timeStr < workingHours.end;
  }
}

export const googleCalendarService = new GoogleCalendarService();