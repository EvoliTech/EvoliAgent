import { Appointment } from '../types';
import { MOCK_APPOINTMENTS } from '../constants';

// In a real app, this would use the gapi client library or a backend proxy.
// Here we simulate async operations and latency.

const LATENCY = 600;

class GoogleCalendarService {
  private appointments: Appointment[] = [...MOCK_APPOINTMENTS];

  async fetchEvents(start: Date, end: Date): Promise<Appointment[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simple mock filtering
        const filtered = this.appointments.filter(apt => 
          apt.start >= start && apt.end <= end
        );
        console.log(`[Google Calendar] Synced ${filtered.length} events.`);
        resolve(filtered);
      }, LATENCY);
    });
  }

  async createEvent(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newAppointment: Appointment = {
          ...appointment,
          id: Math.random().toString(36).substr(2, 9),
          googleEventId: `gcal_${Math.random().toString(36).substr(2, 9)}`
        };
        this.appointments.push(newAppointment);
        console.log(`[Google Calendar] Created event: ${newAppointment.title}`);
        resolve(newAppointment);
      }, LATENCY);
    });
  }

  async updateEvent(appointment: Appointment): Promise<Appointment> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.appointments = this.appointments.map(a => 
          a.id === appointment.id ? appointment : a
        );
        console.log(`[Google Calendar] Updated event: ${appointment.title}`);
        resolve(appointment);
      }, LATENCY);
    });
  }

  async deleteEvent(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.appointments = this.appointments.filter(a => a.id !== id);
        console.log(`[Google Calendar] Deleted event ID: ${id}`);
        resolve();
      }, LATENCY);
    });
  }
}

export const googleCalendarService = new GoogleCalendarService();
