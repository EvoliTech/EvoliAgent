import { Specialist, Appointment, DashboardStats, Patient } from './types';

// Lista global de tratamentos disponíveis na clínica para seleção
export const AVAILABLE_TREATMENTS = [
  'Odontologia Geral',
  'Endodontia',
  'Prótese Dentária',
  'Implantodontia',
  'Ortodontia',
  'Odontologia Estética',
  'Laserterapia',
  'Harmonização Orofacial'
];

export const SPECIALISTS: Specialist[] = [
  {
    id: '1',
    name: 'Dr. Ricardo Silva',
    specialty: 'Cardiologia',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    avatarUrl: 'https://picsum.photos/100/100?random=1',
    email: 'ricardo.silva@clinica.com',
    phone: '(11) 99999-1001',
    treatments: ['Consulta Geral', 'Eletrocardiograma']
  },
  {
    id: '2',
    name: 'Dra.        Costa',
    specialty: 'Dermatologia',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    avatarUrl: 'https://picsum.photos/100/100?random=2',
    email: 'open.evertonai@gmail.com',
    phone: '(11) 99999-1002',
    treatments: ['Consulta Geral', 'Botox', 'Preenchimento Labial', 'Limpeza de Pele', 'Peeling Químico']
  },
  {
    id: '3',
    name: 'Dr. Lucas Pereira',
    specialty: 'Pediatria',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    avatarUrl: 'https://picsum.photos/100/100?random=3',
    email: 'lucas.pereira@clinica.com',
    phone: '(11) 99999-1003',
    treatments: ['Pediatria Rotina', 'Vacinação']
  },
];

// MOCK_PATIENTS removidos para usar sincronização com Supabase (Cliente table)
export const MOCK_PATIENTS: Patient[] = [];


const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '101',
    title: 'Consulta de Rotina',
    start: new Date(today.setHours(9, 0, 0, 0)),
    end: new Date(today.setHours(10, 0, 0, 0)),
    specialistId: '1',
    patientName: 'João Santos',
    patientPhone: '11999999999',
    description: 'Paciente relatou dores no peito leves.',
    status: 'confirmed'
  },
  {
    id: '102',
    title: 'Retorno Tratamento',
    start: new Date(today.setHours(11, 0, 0, 0)),
    end: new Date(today.setHours(11, 30, 0, 0)),
    specialistId: '2',
    patientName: 'Maria Oliveira',
    patientPhone: '11988888888',
    status: 'pending'
  },
  {
    id: '103',
    title: 'Vacinação',
    start: new Date(tomorrow.setHours(14, 0, 0, 0)),
    end: new Date(tomorrow.setHours(14, 30, 0, 0)),
    specialistId: '3',
    patientName: 'Pedro Jr.',
    patientPhone: '11977777777',
    description: 'Trazer carteirinha.',
    status: 'confirmed'
  }
];

export const DASHBOARD_STATS: DashboardStats = {
  totalPatients: 1248,
  todayAppointments: MOCK_APPOINTMENTS.filter(a => a.start.getDate() === new Date().getDate()).length + 5, // Mock +5
  tomorrowAppointments: 8,
  recentPatients: 12
};

export const RECENT_PATIENTS = [
  { id: 1, name: 'Ana Beatriz Souza', date: 'Hoje', phone: '(11) 99876-5432', status: 'Novo' },
  { id: 2, name: 'Carlos Eduardo', date: 'Ontem', phone: '(11) 98765-4321', status: 'Retorno' },
  { id: 3, name: 'Fernanda Lima', date: '25 Out', phone: '(11) 97654-3210', status: 'Novo' },
  { id: 4, name: 'Roberto Campos', date: '24 Out', phone: '(11) 96543-2109', status: 'Exame' },
];

export const CHART_DATA_MONTHLY = [
  { month: 'Jun', visits: 120 },
  { month: 'Jul', visits: 135 },
  { month: 'Ago', visits: 128 },
  { month: 'Set', visits: 142 },
  { month: 'Out', visits: 150 },
  { month: 'Nov', visits: 165 },
];

export const CHART_DATA_INSURANCE = [
  { name: 'Unimed', value: 35, color: '#3b82f6' }, // blue-500
  { name: 'Amil', value: 25, color: '#ec4899' },   // pink-500
  { name: 'Bradesco', value: 20, color: '#8b5cf6' }, // violet-500
  { name: 'Particular', value: 20, color: '#10b981' }, // emerald-500
];
