export type ViewType = 'month' | 'week' | 'day';
export type PageType = 'dashboard' | 'agenda' | 'appointments' | 'patients' | 'professionals' | 'settings' | 'google-callback' | 'patient-registration-update' | 'inventory' | 'financeiro' | 'gallery' | 'campaigns' | 'message-center' | 'clinic-settings' | 'plans-management' | 'integrations' | 'fees-settings' | 'prosthesis-control' | 'security';

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

export interface Campaign {
  id: string;
  empresa_id: string;
  title: string;
  type: string;
  status: 'active' | 'inactive';
  message_template: string;
  filters: any;
  created_at: string;
}

export interface CampaignLog {
  id: string;
  campaign_id: string;
  cliente_id: string;
  data_envio: string;
}

export interface ProteseLaboratorio {
  id: string;
  empresa_id: number;
  nome: string;
  telefone: string;
  created_at: string;
}

export type ProteseStatus = 'Solicitação' | 'Reenviado ao Laboratório' | 'Enviado para laboratório' | 'Retornado à Clínica' | 'Instalado';

export interface ProteseSolicitacao {
  id: string;
  empresa_id: number;
  paciente_id?: string;
  paciente_nome: string;
  responsavel_nome: string;
  laboratorio_id?: string;
  dentes?: string;
  cor?: string;
  descricao_servico?: string;
  trabalho_executado?: string;
  observacoes_internas?: string;
  status: ProteseStatus;
  data_envio?: string;
  prazo_entrega?: string;
  forma_envio?: string;
  responsavel_retirada?: string;
  observacoes_envio?: string;
  created_at: string;
  updated_at: string;
  laboratorio?: ProteseLaboratorio; // Para join
}

export interface ProteseHistorico {
  id: string;
  empresa_id: number;
  solicitacao_id: string;
  status_anterior?: string;
  status_novo: string;
  usuario_nome: string;
  created_at: string;
}