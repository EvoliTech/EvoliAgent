export type ViewType = 'month' | 'week' | 'day';
export type PageType = 'dashboard' | 'agenda' | 'appointments' | 'patients' | 'professionals' | 'settings' | 'google-callback';

export interface Specialist {
  id: string;
  name: string;
  specialty: string; // Especialidade principal (título)
  color: string; // Tailwind color class or hex
  avatarUrl?: string; // Mantido opcional caso queira reverter futuramente
  calendarId?: string; // Google Calendar ID
  email?: string; // E-mail do especialista (editável)
  phone?: string;
  treatments?: string[]; // Lista de tratamentos habilitados
  created_by?: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  plano?: string;
  status: 'Ativo' | 'Inativo';
  lastVisit?: string;
  createdAt?: Date;
}

// Raw Supabase Table Interface
export interface SupabaseCustomer {
  id: number;
  created_at: string;
  nome?: string;
  nome_completo?: string;
  telefoneWhatsapp?: string;
  botAtivo?: string; // TBD: check actual values
  status_lead_no_crm?: string;
  email?: string; // Not in schema list but good to have if added later
  plano?: string;
}

export interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  specialistId: string;
  patientName: string;
  patientPhone: string; // E.164 format preferably
  description?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  googleEventId?: string; // For sync reference
}

export interface CalendarState {
  currentDate: Date;
  view: ViewType;
  selectedSpecialistIds: string[];
}

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  tomorrowAppointments: number;
  recentPatients: number;
}