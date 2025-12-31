
import { supabase } from '../lib/supabase';

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
}

export interface GoogleEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  colorId?: string;
  calendarId?: string;
}

export const googleCalendarService = {

  async listCalendars(userEmail: string): Promise<GoogleCalendar[]> {
    const { data, error } = await supabase.functions.invoke('google-auth', {
      body: { action: 'list-calendars', userEmail }
    });
    if (error || (data && data.error)) throw new Error(error?.message || data?.error);
    return data.items || [];
  },

  async listEvents(userEmail: string, start: Date, end: Date, calendarId?: string): Promise<GoogleEvent[]> {
    const { data, error } = await supabase.functions.invoke('google-auth', {
      body: {
        action: 'fetch-events',
        userEmail,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        calendarId
      }
    });

    if (error || (data && data.error)) throw new Error(error?.message || data?.error);
    return data.items || [];
  },

  async createEvent(userEmail: string, event: GoogleEvent, calendarId?: string): Promise<GoogleEvent> {
    const { data, error } = await supabase.functions.invoke('google-auth', {
      body: {
        action: 'create-event',
        userEmail,
        event,
        calendarId
      }
    });

    if (error || (data && data.error)) throw new Error(error?.message || data?.error);
    return data;
  },

  async updateEvent(userEmail: string, eventId: string, event: GoogleEvent, calendarId?: string): Promise<GoogleEvent> {
    const { data, error } = await supabase.functions.invoke('google-auth', {
      body: {
        action: 'update-event',
        userEmail,
        eventId,
        event,
        calendarId
      }
    });

    if (error || (data && data.error)) throw new Error(error?.message || data?.error);
    return data;
  },

  async deleteEvent(userEmail: string, eventId: string, calendarId?: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('google-auth', {
      body: {
        action: 'delete-event',
        userEmail,
        eventId,
        calendarId
      }
    });

    if (error || (data && data.error)) throw new Error(error?.message || data?.error);
  }
};
