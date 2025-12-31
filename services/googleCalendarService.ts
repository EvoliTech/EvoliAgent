import { Appointment } from '../types';
import { SPECIALISTS } from '../constants';
import { supabase } from '../lib/supabase';

class GoogleCalendarService {

  // Helper to map Google Event to App Appointment
  private mapEventToAppointment(event: any): Appointment {
    const startDate = event.start?.dateTime || event.start?.date;
    const endDate = event.end?.dateTime || event.end?.date;
    const privateData = event.extendedProperties?.private || {};

    const patientName = privateData.patientName || event.summary || 'Paciente';
    const patientPhone = privateData.patientPhone || '';
    const specialistId =
      privateData.specialistId ||
      SPECIALISTS[0]?.id ||
      '';

    const description =
      privateData.description ||
      event.description ||
      '';

    const status: Appointment['status'] =
      event.status === 'cancelled' ? 'cancelled' : 'confirmed';

    return {
      id: event.id,
      title: event.summary || patientName,
      start: new Date(startDate),
      end: new Date(endDate),
      specialistId,
      patientName,
      patientPhone,
      description,
      status,
      googleEventId: event.id,
    };
  }

  async fetchEvents(start: Date, end: Date): Promise<Appointment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      console.warn('Usuário não logado, impossível buscar agenda do Google.');
      return [];
    }

    const { data, error } = await supabase.functions.invoke('google-auth', {
      body: {
        action: 'fetch-events',
        userEmail: user.email,
        timeMin: start.toISOString(),
        timeMax: end.toISOString()
      }
    });

    if (error) {
      console.error('Erro ao buscar eventos do Google via Edge Function:', error);
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    const items = data.items || [];
    return items.map((item: any) => this.mapEventToAppointment(item));
  }

  // TODO: Implement Create/Update/Delete via Edge Function
  async createEvent(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    console.warn('Create Event not implemented yet in backend.');
    throw new Error('Criação de eventos via Google Calendar em manutenção.');
  }

  async updateEvent(appointment: Appointment): Promise<Appointment> {
    console.warn('Update Event not implemented yet in backend.');
    throw new Error('Atualização de eventos via Google Calendar em manutenção.');
  }

  async deleteEvent(id: string): Promise<void> {
    console.warn('Delete Event not implemented yet in backend.');
    throw new Error('Exclusão de eventos via Google Calendar em manutenção.');
  }
}

export const googleCalendarService = new GoogleCalendarService();
