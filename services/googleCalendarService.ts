import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { SPECIALISTS } from '../constants';

class GoogleCalendarService {

  async getProviderToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();

    // First try: Check if provider_token is in session (client-side flow)
    if (session?.provider_token) {
      return session.provider_token;
    }

    // Second try: Call Edge Function to retrieve token from DB/Auth store
    const { data, error } = await supabase.functions.invoke('get_google_token');

    if (error || !data?.provider_token) {
      // It is possible that the user is logged in but the token is not available 
      // (e.g. email login or expired/missing consent).
      return null;
    }

    return data.provider_token;
  }

  async fetchEvents(start: Date, end: Date): Promise<Appointment[]> {
    const token = await this.getProviderToken();

    // Always fetch local events as backup or base
    const localEvents = await this.fetchLocalEvents(start, end);

    if (!token) {
      console.warn("No Google Token found. Returning local events.");
      return localEvents;
    }

    try {
      const timeMin = start.toISOString();
      const timeMax = end.toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Prompt requirement: "garanta que o tratamento de erro exiba um alerta caso o token do Google expire"
          alert("Sessão do Google expirada. Por favor, faça login novamente.");
        }
        console.error("Google API Error", response.statusText);
        return localEvents;
      }

      const data = await response.json();
      const googleEvents = data.items || [];

      // Map Google events to Appointment interface
      const mappedEvents: Appointment[] = googleEvents.map((ev: any) => ({
        id: ev.id, // Using Google ID
        title: ev.summary || '(Sem título)',
        start: new Date(ev.start.dateTime || ev.start.date),
        end: new Date(ev.end.dateTime || ev.end.date),
        specialistId: SPECIALISTS[0].id, // Default assignment
        patientName: 'Agenda Google',
        patientPhone: '',
        description: ev.description,
        status: 'confirmed',
        googleEventId: ev.id
      }));

      // Persistence: Save to Supabase
      await this.saveEventsToSupabase(mappedEvents);

      return mappedEvents;

    } catch (error) {
      console.error("Fetch Events Error", error);
      // Alert already handled for 401 if caught above, but for network errors:
      if (error instanceof Error && error.message.includes("expirada")) {
        alert(error.message);
      }
      return localEvents;
    }
  }

  async fetchLocalEvents(start: Date, end: Date): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .gte('start_time', start.toISOString())
      .lte('end_time', end.toISOString());

    if (error) {
      console.error("DB Fetch Error", error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      title: row.summary,
      start: new Date(row.start_time),
      end: new Date(row.end_time),
      specialistId: SPECIALISTS[0].id,
      patientName: 'Agenda Google',
      patientPhone: '',
      status: 'confirmed',
      googleEventId: row.google_event_id
    }));
  }

  async saveEventsToSupabase(events: Appointment[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates = events.map((evt) => ({
      summary: evt.title,
      start_time: evt.start.toISOString(),
      end_time: evt.end.toISOString(),
      google_event_id: evt.googleEventId,
      user_id: user.id
    }));

    if (updates.length > 0) {
      const { error } = await supabase
        .from('agendamentos')
        .upsert(updates, { onConflict: 'google_event_id' });

      if (error) console.error("Save Error", error);
    }
  }

  // --- CRUD Stubs for basic compatibility with UI ---

  async createEvent(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    // Basic local only implementation to prevent UI crash
    const newId = crypto.randomUUID();
    const newEvent = { ...appointment, id: newId };

    // Save to local DB 
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('agendamentos').insert({
        id: newId,
        summary: appointment.title,
        start_time: appointment.start.toISOString(),
        end_time: appointment.end.toISOString(),
        user_id: user.id,
        google_event_id: `local_${newId}`
      });
    }
    return newEvent as Appointment;
  }

  async updateEvent(appointment: Appointment): Promise<Appointment> {
    // Update local DB
    await supabase.from('agendamentos').update({
      summary: appointment.title,
      start_time: appointment.start.toISOString(),
      end_time: appointment.end.toISOString()
    }).eq('id', appointment.id);

    return appointment;
  }

  async deleteEvent(id: string): Promise<void> {
    await supabase.from('agendamentos').delete().eq('id', id);
  }
}

export const googleCalendarService = new GoogleCalendarService();
