import { Appointment } from '../types';
import { SPECIALISTS } from '../constants';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CALENDAR_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID || 'primary';
const SCOPE = 'https://www.googleapis.com/auth/calendar';

// Light helper to load the Google Identity Services script once
const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

class GoogleCalendarService {
  private accessToken: string | null = null;
  private expiresAt: number | null = null;
  private loadingPromise: Promise<void> | null = null;

  private async ensureToken(): Promise<string> {
    if (!CLIENT_ID) {
      throw new Error('VITE_GOOGLE_CLIENT_ID nÇœo configurada.');
    }

    // If token is valid, reuse it
    const now = Date.now();
    if (this.accessToken && this.expiresAt && now < this.expiresAt - 60_000) {
      return this.accessToken;
    }

    // Load GIS script if needed
    await this.loadGis();

    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services nÇœo carregou.'));
        return;
      }

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        prompt: this.accessToken ? '' : 'consent',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          this.accessToken = response.access_token;
          const expiresIn = (response.expires_in || 3600) * 1000;
          this.expiresAt = Date.now() + expiresIn;
          resolve(this.accessToken);
        },
      });

      tokenClient.requestAccessToken();
    });
  }

  private async loadGis() {
    if ((window as any).google?.accounts?.oauth2) return;
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = loadScript('https://accounts.google.com/gsi/client');
    await this.loadingPromise;
  }

  private async authFetch(url: string, options: RequestInit = {}) {
    const token = await this.ensureToken();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  }

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

  private buildEventBody(appointment: Omit<Appointment, 'id'>) {
    return {
      summary: appointment.title,
      description: appointment.description,
      start: { dateTime: appointment.start.toISOString() },
      end: { dateTime: appointment.end.toISOString() },
      extendedProperties: {
        private: {
          patientName: appointment.patientName,
          patientPhone: appointment.patientPhone,
          specialistId: appointment.specialistId,
          status: appointment.status,
          description: appointment.description || '',
        },
      },
    };
  }

  async fetchEvents(start: Date, end: Date): Promise<Appointment[]> {
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const res = await this.authFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`
    );

    if (!res.ok) {
      throw new Error('Falha ao sincronizar com Google Calendar');
    }

    const data = await res.json();
    return (data.items || []).map((item: any) => this.mapEventToAppointment(item));
  }

  async createEvent(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const res = await this.authFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(this.buildEventBody(appointment)),
      }
    );

    if (!res.ok) throw new Error('Falha ao criar evento no Google Calendar');
    const event = await res.json();
    return this.mapEventToAppointment(event);
  }

  async updateEvent(appointment: Appointment): Promise<Appointment> {
    const eventId = appointment.googleEventId || appointment.id;
    const res = await this.authFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(this.buildEventBody(appointment)),
      }
    );

    if (!res.ok) throw new Error('Falha ao atualizar evento no Google Calendar');
    const event = await res.json();
    return this.mapEventToAppointment(event);
  }

  async deleteEvent(id: string): Promise<void> {
    const res = await this.authFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );

    if (!res.ok) throw new Error('Falha ao excluir evento no Google Calendar');
  }
}

export const googleCalendarService = new GoogleCalendarService();
