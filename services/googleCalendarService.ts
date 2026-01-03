
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
  status?: string;
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
    // 1. Create in Google Calendar first
    const { data: googleData, error: googleError } = await supabase.functions.invoke('google-auth', {
      body: {
        action: 'create-event',
        userEmail,
        event,
        calendarId
      }
    });

    if (googleError || (googleData && googleData.error)) {
      throw new Error(googleError?.message || googleData?.error);
    }

    // 2. Mirror to Supabase 'agendamentos' table using Google's ID
    const { error: supabaseError } = await supabase
      .from('agendamentos')
      .insert({
        google_event_id: googleData.id,
        calendar_id: calendarId || 'primary',
        titulo: googleData.summary,
        data_inicio: googleData.start.dateTime || googleData.start.date,
        data_fim: googleData.end.dateTime || googleData.end.date,
        especialista_id: calendarId, // Using calendarId as specialist reference
        status: googleData.status || 'confirmed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (supabaseError) {
      console.error('Mirroring error (Create):', supabaseError);
      // We don't throw here to avoid failing the app operation since Google succeeded, 
      // but in a real prod app we might want a retry queue.
    }

    return googleData;
  },

  async updateEvent(userEmail: string, eventId: string, event: GoogleEvent, calendarId?: string): Promise<GoogleEvent> {
    // 1. Update in Google Calendar
    const { data: googleData, error: googleError } = await supabase.functions.invoke('google-auth', {
      body: {
        action: 'update-event',
        userEmail,
        eventId,
        event,
        calendarId
      }
    });

    if (googleError || (googleData && googleData.error)) {
      throw new Error(googleError?.message || googleData?.error);
    }

    // 2. Update mirror in Supabase
    const { error: supabaseError } = await supabase
      .from('agendamentos')
      .update({
        titulo: googleData.summary,
        data_inicio: googleData.start.dateTime || googleData.start.date,
        data_fim: googleData.end.dateTime || googleData.end.date,
        status: googleData.status || 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('google_event_id', eventId);

    if (supabaseError) {
      console.error('Mirroring error (Update):', supabaseError);
    }

    return googleData;
  },

  async deleteEvent(userEmail: string, eventId: string, calendarId?: string): Promise<void> {
    // 1. Delete in Google Calendar
    const { data, error: googleError } = await supabase.functions.invoke('google-auth', {
      body: {
        action: 'delete-event',
        userEmail,
        eventId,
        calendarId
      }
    });

    if (googleError || (data && data.error)) {
      throw new Error(googleError?.message || data?.error);
    }

    // 2. Delete mirror in Supabase
    const { error: supabaseError } = await supabase
      .from('agendamentos')
      .delete()
      .eq('google_event_id', eventId);

    if (supabaseError) {
      console.error('Mirroring error (Delete):', supabaseError);
    }
  }
};
