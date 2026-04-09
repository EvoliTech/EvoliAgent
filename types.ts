export type ViewType = 'month' | 'week' | 'day';
export type PageType = 'dashboard' | 'agenda' | 'appointments' | 'patients' | 'professionals' | 'settings' | 'google-callback' | 'patient-registration-update' | 'inventory' | 'financeiro' | 'gallery' | 'campaigns' | 'message-center' | 'clinic-settings' | 'plans-management' | 'integrations' | 'fees-settings';

export interface TreatmentItem {
  id: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  receiveDays?: number;
  active: boolean;
}

export interface HealthPlan {
  id: string;
  name: string;
  isDefault?: boolean;
  treatments: TreatmentItem[];
}

export interface CommissionRule {
  id: string;
  quandoRecebe: string;
  tipoComissao: string;
  valor: string;
  convenio: string;
  especialidade: string;
  treatments?: Record<string, string>; // Map of treatment id to commission value
}

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
  comissoes?: CommissionRule[];
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