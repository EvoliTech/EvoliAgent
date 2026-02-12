export type ViewType = 'month' | 'week' | 'day';
export type PageType = 'dashboard' | 'agenda' | 'appointments' | 'patients' | 'professionals' | 'settings' | 'google-callback' | 'patient-registration-update';

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
  // New registration fields
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  genero?: string;
  estadoCivil?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTelefone?: string;
  cep?: string;
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoEstado?: string;
  enderecoComplemento?: string;
  carteirinhaNumero?: string;
  carteirinhaValidade?: string;
  possuiAlergias?: boolean;
  alergiasObservacoes?: string;
}

// Raw Supabase Table Interface
export interface SupabaseCustomer {
  id: number;
  created_at: string;
  nome?: string;
  nome_completo?: string;
  telefoneWhatsapp?: string;
  botAtivo?: string;
  status_lead_no_crm?: string;
  email?: string;
  plano?: string;
  // New columns in DB
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  genero?: string;
  estado_civil?: string;
  contato_emergencia_nome?: string;
  contato_emergencia_telefone?: string;
  cep?: string;
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_complemento?: string;
  carteirinha_numero?: string;
  carteirinha_validade?: string;
  possui_alergias?: boolean;
  alergias_observacoes?: string;
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