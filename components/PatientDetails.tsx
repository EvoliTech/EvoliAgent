import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Patient } from '../types';
import {
  ChevronLeft, Edit2, MessageCircle, Tag, CheckSquare, Plus,
  MapPin, Phone, Calendar, User, FileText, ChevronRight, X,
  ChevronDown, MoreVertical, Copy, Printer, Trash2, Mic, Smile, Frown, Sparkles, Undo2, Square,
  Check, ArrowDownRight, ArrowDown, CreditCard, AlertTriangle
} from 'lucide-react';
import { Odontogram, OdontogramProcedure } from './Odontogram';
import { NewBudgetModal } from './NewBudgetModal';
import { ErrorBoundary } from './ErrorBoundary';
import { PaymentModal, PaymentData } from './PaymentModal';
import { PaymentDetailsModal } from './PaymentDetailsModal';
import { AnamneseTab } from './AnamneseTab';
import { DocumentosTab } from './DocumentosTab';
import { ArquivosTab } from './ArquivosTab';
import { TarefasModal } from './TarefasModal';
import { tarefaService, Tarefa } from '../services/tarefaService';

interface PatientDetailsProps {
  patient: any; // Using any for Patient to avoid circular dependency complaints here
  onBack: () => void;
  onEdit: () => void;
  onNavigateToSchedule?: () => void;
}

type TabType = 'Visão Geral' | 'Anamneses' | 'Orçamentos' | 'Tratamentos' | 'Pagamentos' | 'Evoluções' | 'Documentos' | 'Arquivos';

import { useCompany } from '../contexts/CompanyContext';
import { budgetService } from '../services/budgetService';
import { evolutionService, Evolucao } from '../services/evolutionService';
import { supabase } from '../lib/supabase';
import { anamneseService } from '../services/anamneseService';
import { ANAMNESE_QUESTIONS } from './AnamneseTab';
import { googleCalendarService, GoogleEvent } from '../services/googleCalendarService';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { NewAppointmentModal } from './NewAppointmentModal';
import { userService } from '../services/userService';

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Budget {
  id: string;
  name: string;
  date: string;
  total: number;
  status: 'Pendente' | 'Aprovado';
  treatments: any[];
}

export const PatientDetails: React.FC<PatientDetailsProps> = ({ patient, onBack, onEdit, onNavigateToSchedule }) => {
  const [activeTab, setActiveTab] = React.useState<TabType>('Visão Geral');

  const location = useLocation();
  const navigate = useNavigate();

  const tabToPath: Record<string, string> = {
    'Visão Geral': 'visao-geral',
    'Anamneses': 'anamneses',
    'Orçamentos': 'orcamentos',
    'Tratamentos': 'tratamentos',
    'Pagamentos': 'pagamentos',
    'Evoluções': 'evolucoes',
    'Documentos': 'documentos',
    'Arquivos': 'arquivos'
  };

  const pathToTab = Object.entries(tabToPath).reduce((acc, [tab, path]) => {
    acc[path] = tab as TabType;
    return acc;
  }, {} as Record<string, TabType>);

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'pacientes' && parts[2] === patient.id) {
       const tabPath = parts[3];
       if (tabPath && pathToTab[tabPath]) {
          if (activeTab !== pathToTab[tabPath]) {
             setActiveTab(pathToTab[tabPath]);
          }
       }
    }
  }, [location.pathname, patient.id]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/pacientes/${patient.id}/${tabToPath[tab]}`, { replace: true });
  };

  const { empresaId } = useCompany();

  // Tarefas state
  const [tarefas, setTarefas] = React.useState<Tarefa[]>([]);
  const [isTarefasOpen, setIsTarefasOpen] = React.useState(false);

  // Shared Procedures State (DB Sync)
  const [procedures, setProcedures] = React.useState<Record<number, OdontogramProcedure[]>>({});
  // Budgets State (DB Sync)
  const [budgets, setBudgets] = React.useState<Budget[]>([]);

  // Health Alerts State
  const [healthAlerts, setHealthAlerts] = React.useState<string[]>([]);

  // Appointment History State
  const [appointmentHistory, setAppointmentHistory] = React.useState<any[]>([]);
  const [specialists, setSpecialists] = React.useState<any[]>([]);

  // Appointment Modals State
  const [isApptModalOpen, setIsApptModalOpen] = React.useState(false);
  const [isApptDetailsOpen, setIsApptDetailsOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<GoogleEvent | null>(null);
  const [editingEvent, setEditingEvent] = React.useState<GoogleEvent | undefined>(undefined);
  const [isFetchingEvent, setIsFetchingEvent] = React.useState(false);

  // Evolutions State
  const [evolutions, setEvolutions] = React.useState<Evolucao[]>([]);
  const [newEvoTratamentoId, setNewEvoTratamentoId] = React.useState<string>('');
  const [newEvoData, setNewEvoData] = React.useState(new Date().toISOString().split('T')[0]);
  const [newEvoProfissional, setNewEvoProfissional] = React.useState('Everton Oliveira');
  const [newEvoTexto, setNewEvoTexto] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [isImproving, setIsImproving] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Erro ao parar reconhecimento de voz no desmonte:", e);
        }
      }
    };
  }, []);

  // Payments State
  const [payingTreatments, setPayingTreatments] = React.useState<any[]>([]);
  const [pagamentosFilter, setPagamentosFilter] = React.useState('Todos');
  const [selectedPayments, setSelectedPayments] = React.useState<string[]>([]);
  const [dateFilter, setDateFilter] = React.useState<{ start: string, end: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [cancelingPayments, setCancelingPayments] = React.useState<any[]>([]);
  const [cancelJustification, setCancelJustification] = React.useState('');
  const [openPaymentMenuId, setOpenPaymentMenuId] = React.useState<string | null>(null);
  const [editingPaymentBudget, setEditingPaymentBudget] = React.useState<any | null>(null);

  const printReceipt = (treatments: any[], payment: PaymentData | null) => {
    const w = window.open('', '_blank');
    if (!w) return;

    const treatmentNames = treatments.map(t => `${t.treatmentName || t.tratamento} ${t.dente ? `(Dente ${t.dente})` : ''}`).join('<br/>');
    const amount = payment ? payment.amount : treatments.reduce((sum, t) => sum + parseFloat(t.valor || '0'), 0);

    const html = `
      <html>
      <head>
          <title>Comprovante de Pagamento</title>
          <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; max-width: 600px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
              .title { font-size: 22px; font-weight: bold; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
              .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f8fafc; padding-bottom: 8px; }
              .label { font-weight: 600; color: #475569; font-size: 14px; min-width: 120px; }
              .value { font-weight: 500; color: #0f172a; font-size: 14px; text-align: right; max-width: 60%; }
              .total { font-size: 20px; font-weight: bold; margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px; text-align: right; color: #0f172a; }
              .total span { color: #10b981; }
              .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1 class="title">Recibo de Pagamento</h1>
              <p class="subtitle">Documento Auxiliar</p>
          </div>
          
          <div class="row">
              <span class="label">Paciente</span>
              <span class="value">${patient.name}</span>
          </div>
          <div class="row">
              <span class="label">CPF</span>
              <span class="value">${patient.cpf || 'Não informado'}</span>
          </div>
          <div class="row">
              <span class="label">Procedimentos</span>
              <span class="value" style="text-align: right;">${treatmentNames}</span>
          </div>
          <div class="row">
              <span class="label">Data Lançamento</span>
              <span class="value">${payment ? new Date(payment.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="row">
              <span class="label">Forma de Pagto.</span>
              <span class="value">${payment ? payment.method : 'Diversos'}</span>
          </div>
          ${payment && payment.observations ? `
          <div class="row">
              <span class="label">Observações</span>
              <span class="value">${payment.observations}</span>
          </div>` : ''}
          
          <div class="total">
              Valor Recebido: <span>R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="footer">
              <p>Este recibo é válido como comprovante do pagamento referente ao procedimento acima descrito.</p>
              <p>Emitido de forma digital em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
          
          <script>
              window.onload = function() { window.print(); }
          </script>
      </body>
      </html>
      `;
    w.document.write(html);
    w.document.close();
  };

  const handleImproveWithAI = async () => {
    if (!newEvoTexto.trim() || !empresaId) return;

    setIsImproving(true);
    try {
      let configData = null;
      const res = await supabase.from('integrations_config').select('client_secret, is_active').eq('service', 'OpenAi').eq('IDEmpresa', empresaId).maybeSingle();
      configData = res.data;
      if (res.error && res.error.code === '42703') {
        const fallback = await supabase.from('integrations_config').select('client_secret').in('service', ['openai', 'OpenAi']).eq('IDEmpresa', empresaId).maybeSingle();
        configData = fallback.data;
      }

      const apiKey = (configData && configData.is_active !== false) ? configData.client_secret : null;
      const finalKey = apiKey || (import.meta as any).env.VITE_OPENAI_API_KEY;

      if (!finalKey) {
        alert("Sua chave de API da IA não foi informada. Vá até Menu > Configurações > Integrações, e salve a sua chave OpenAI.");
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente especializado em odontologia. Sua tarefa é receber um texto de evolução clínica (frequentemente transcrito por voz, podendo conter erros ou falta de formatação), corrigir erros, melhorar a coesão, usar terminologia técnica adequada e formatar o texto em tom altamente profissional. Mantenha o sentido original e seja direto e objetivo sem blábláblá. Não adicione informações clínicas não citadas no original.'
            },
            {
              role: 'user',
              content: newEvoTexto
            }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sua chave de API OpenAI salva nas configurações é inválida ou incorreta.");
        }
        throw new Error("Erro na comunicação com a IA. Tente novamente.");
      }

      const apiData = await response.json();
      const improvedText = apiData.choices[0].message.content;
      setNewEvoTexto(improvedText.trim());

    } catch (error: any) {
      alert("Erro ao melhorar o texto com IA: " + error.message);
    } finally {
      setIsImproving(false);
    }
  };

  const fetchAppointmentsHistory = async () => {
    try {
      const patientIdNum = Number(patient.id);
      const { data: appts } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('IDEmpresa', empresaId)
        .order('data_inicio', { ascending: false });
        
      if (appts) {
        const cleanPhone = patient.phone ? patient.phone.replace(/\D/g, '') : null;
        const filteredAppts = appts.filter(a => {
          const matchedId = String(a.cliente_id) === String(patientIdNum);
          const matchedPhone = cleanPhone && String(a.cliente_id) === cleanPhone;
          const matchesTitle = a.titulo && a.titulo.toLowerCase().includes(patient.name.toLowerCase());
          return matchedId || matchedPhone || matchesTitle;
        });
        setAppointmentHistory(filteredAppts);
      }
    } catch (e) {}
  };

  const fetchCompleteGoogleEvent = async (appt: any) => {
    try {
      setIsFetchingEvent(true);
      const email = await userService.getConnectedGoogleEmail(empresaId!);
      if (!email) throw new Error("Email não conectado");
      
      const start = new Date(appt.data_inicio);
      const end = new Date(appt.data_fim);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      
      const events = await googleCalendarService.listEvents(empresaId!, email, start, end, appt.calendar_id || appt.especialista_id);
      const specificEvent = events.find(e => e.id === appt.google_event_id);
      
      if (!specificEvent) throw new Error("Evento não encontrado");
      return { ...specificEvent, calendarId: appt.calendar_id || appt.especialista_id };
    } catch (e) {
      console.error("Error fetching google event:", e);
      return {
          id: appt.google_event_id,
          summary: appt.titulo,
          start: { dateTime: appt.data_inicio },
          end: { dateTime: appt.data_fim },
          calendarId: appt.calendar_id || appt.especialista_id,
          status: appt.status,
          description: `Paciente: ${patient.name}\nContato: ${patient.phone?.replace(/\D/g, '') || ''}`
      };
    } finally {
      setIsFetchingEvent(false);
    }
  };

  const handleOpenApptDetails = async (appt: any) => {
      const gEvent = await fetchCompleteGoogleEvent(appt);
      setSelectedEvent(gEvent as GoogleEvent);
      setIsApptDetailsOpen(true);
  };

  const handleEditAppt = async (appt: any) => {
      const gEvent = await fetchCompleteGoogleEvent(appt);
      setEditingEvent(gEvent as GoogleEvent);
      setIsApptModalOpen(true);
  };

  const handleCreateEvent = async (eventData: any) => {
    const email = await userService.getConnectedGoogleEmail(empresaId!);
    if (!email) return;

    const { calendarId, id, cliente_id, ...googleEventData } = eventData;
    try {
      if (id) {
        await googleCalendarService.updateEvent(empresaId!, email, id, googleEventData, calendarId, cliente_id);
      } else {
        await googleCalendarService.createEvent(empresaId!, email, googleEventData, calendarId, cliente_id);
      }
      setIsApptModalOpen(false);
      await fetchAppointmentsHistory();
    } catch (error: any) {
      alert('Erro ao salvar agendamento: ' + error.message);
    }
  };
  
  const handleDeleteEvent = async (event: GoogleEvent) => {
    const email = await userService.getConnectedGoogleEmail(empresaId!);
    if (!email) return;
    if (confirm('Tem certeza que deseja excluir?')) {
      try {
        await googleCalendarService.deleteEvent(empresaId!, email, event.id!, event.calendarId);
        setIsApptDetailsOpen(false);
        await fetchAppointmentsHistory();
      } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (empresaId && patient?.id) {
      const load = async () => {
        const patientIdNum = Number(patient.id);
        const procs = await budgetService.fetchOdontogram(patientIdNum);
        setProcedures(procs);
        const fetchedBudgets = await budgetService.fetchBudgets(empresaId, patientIdNum);
        setBudgets(fetchedBudgets as Budget[]);

        const evos = await evolutionService.fetchEvolutions(empresaId, patientIdNum);
        setEvolutions(evos);

        // Load tarefas from Supabase
        const fetchedTarefas = await tarefaService.fetch(empresaId, Number(patient.id));
        setTarefas(fetchedTarefas);

        // Load Anamnese for Health Alerts
        const anamneseRecords = await anamneseService.fetchAnamneses(empresaId, patientIdNum);
        let anamneseRecord = anamneseRecords.find(a => a.respostas?._is_default === true) || null;
        if (!anamneseRecord && anamneseRecords.length > 0) {
          anamneseRecord = anamneseRecords[anamneseRecords.length - 1]; // Oldest is default explicitly
        }
        
        if (anamneseRecord && anamneseRecord.respostas) {
          const alerts: string[] = [];
          for (const q of ANAMNESE_QUESTIONS) {
            if (anamneseRecord.respostas[q.id]?.value === 'Sim') {
              alerts.push(q.label);
            }
          }
          setHealthAlerts(alerts);
        }

        // Load Specialists for appointment history mapping
        let loadedSpecs: any[] = [];
        try {
          const { data: specs } = await supabase.from('Especialista').select('*').eq('IDEmpresa', empresaId);
          if (specs) {
            loadedSpecs = specs;
            setSpecialists(specs);
          }
        } catch (e) {}

        // Load Appointment History
        await fetchAppointmentsHistory();

        setIsLoaded(true);
      };
      load();
    }
  }, [empresaId, patient?.id]);

  React.useEffect(() => {
    if (isLoaded && patient?.id) {
      budgetService.saveOdontogram(Number(patient.id), procedures);
    }
  }, [procedures, patient?.id, isLoaded]);

  const [openBudgetMenuId, setOpenBudgetMenuId] = React.useState<string | null>(null);
  const [openTreatmentMenuId, setOpenTreatmentMenuId] = React.useState<string | null>(null);
  const [expandedBudgets, setExpandedBudgets] = React.useState<Record<string, boolean>>({});

  // Budget Modal State
  const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = React.useState(false);
  const [budgetToEdit, setBudgetToEdit] = React.useState<Budget | null>(null);

  const handleAppendToBudgetFromOdontogram = async (newTreatments: any[]) => {
    let targetBudget: Budget | undefined;
    let isNew = false;

    setBudgets(prev => {
      const existingIdx = prev.findIndex(b => b.name === `Plano de tratamento de ${patient.name}` && b.status === 'Pendente');

      if (existingIdx >= 0) {
        const draft = prev[existingIdx];
        const mergedTreatments = [...draft.treatments, ...newTreatments];
        const total = mergedTreatments.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
        targetBudget = { ...draft, treatments: mergedTreatments, total };
        return prev; // We will update after DB call
      } else {
        const total = newTreatments.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
        targetBudget = {
          id: Math.floor(Math.random() * 10000000).toString(),
          name: `Plano de tratamento de ${patient.name}`,
          date: new Date().toLocaleDateString('pt-BR'),
          total,
          status: 'Pendente',
          treatments: newTreatments
        };
        isNew = true;
        return prev; // We will update after DB call
      }
    });

    if (targetBudget && empresaId && patient?.id) {
      const saved = await budgetService.saveBudget(empresaId, Number(patient.id), targetBudget);
      if (saved) {
        setBudgets(prev => {
          if (isNew) return [saved, ...prev];
          return prev.map(b => b.id === saved.id || b.id === targetBudget!.id ? saved : b);
        });
        alert(`Procedimentos enviados para a aba Orçamentos com sucesso!`);
      } else {
        alert('Erro ao sincronizar orçamento no banco de dados.');
      }
    }
  };

  // Categories state (Persisted)
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(`draft_categories_${patient.id}`);
      if (saved) return JSON.parse(saved);
    } catch { }
    return [
      { id: '1', name: 'Cirurgia', color: '#ef4444' },
      { id: '2', name: 'Endodontia', color: '#3b82f6' },
      { id: '3', name: 'Falecido', color: '#94a3b8' },
      { id: '4', name: 'HOF', color: '#f97316' },
      { id: '5', name: 'Implante', color: '#8b5cf6' },
      { id: '6', name: 'Inativo', color: '#94a3b8' },
      { id: '7', name: 'Necessita cuidado especial', color: '#ef4444' },
      { id: '8', name: 'Ortodontia', color: '#22c55e' },
    ];
  });

  // Selected categories for THIS patient (persisted per patient)
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`selected_categories_${patient.id}`);
      if (saved) return JSON.parse(saved);
    } catch { }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem(`draft_categories_${patient.id}`, JSON.stringify(categories));
  }, [categories, patient.id]);

  React.useEffect(() => {
    localStorage.setItem(`selected_categories_${patient.id}`, JSON.stringify(selectedCategoryIds));
  }, [selectedCategoryIds, patient.id]);

  const toggleSelectedCategory = (catId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [editCatName, setEditCatName] = React.useState('');
  const [editCatColor, setEditCatColor] = React.useState('');

  const openEditCategory = (cat: Category, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
    setIsCategoryMenuOpen(false);
  };

  const handleSaveCategory = () => {
    if (!editCatName.trim()) return;

    if (editingCategory?.id === 'new') {
      setCategories(prev => [...prev, { id: Math.random().toString(), name: editCatName, color: editCatColor || '#cbd5e1' }]);
    } else if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: editCatName, color: editCatColor } : c));
    }
    setEditingCategory(null);
  };

  const tabs: TabType[] = [
    'Visão Geral', 'Anamneses', 'Orçamentos', 'Tratamentos',
    'Pagamentos', 'Evoluções', 'Documentos', 'Arquivos'
  ];

  // Helper to calculate age nicely
  const getAgeText = (birthDateStr?: string) => {
    if (!birthDateStr) return '';
    // Assume format YYYY-MM-DD or parseable by Date
    // If it comes as DD/MM/YYYY from BR input, we need to convert to parseable
    let isoStr = birthDateStr;
    if (birthDateStr.includes('/')) {
      const [d, m, y] = birthDateStr.split('/');
      isoStr = `${y}-${m}-${d}`;
    }
    const birth = new Date(isoStr);
    if (isNaN(birth.getTime())) return '';

    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (now.getDate() < birth.getDate()) {
      months--;
    }
    if (months < 0) {
      months = 11;
    }
    return `${years} anos${months > 0 ? ` e ${months} meses` : ''}`;
  };

  const getFormattedPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 11) { // 5511999999999
      let noCountry = clean;
      if (clean.startsWith('55') && clean.length > 11) {
        noCountry = clean.substring(2);
      }
      return `(${noCountry.substring(0, 2)}) ${noCountry.substring(2, 7)}-${noCountry.substring(7)}`;
    }
    return phone;
  };

  const pendingPaymentsCount = React.useMemo(() => {
    return budgets.filter(b => b.status === "Aprovado")
      .flatMap(b => b.treatments)
      .filter((t: any) => (t.status === 'Em andamento' || t.status === 'Finalizado') && t.paymentStatus !== 'Pago')
      .length;
  }, [budgets]);
  const ageText = getAgeText(patient.dataNascimento);
  const displayPhone = getFormattedPhone(patient.phone);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 w-full h-full flex flex-col bg-[#f1f5f9] min-h-full pb-10 overflow-x-hidden">
      {/* Top Banner & Header */}
      <div className="bg-white px-4 md:px-6 pt-4 md:pt-6 pb-0 border-b border-gray-200">
        <button onClick={onBack} className="flex items-center text-[#64748b] hover:text-[#334155] text-[13px] font-medium mb-4 transition-colors">
          <ChevronLeft size={16} className="mr-1" />
          Voltar para lista
        </button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 md:h-16 md:w-16 bg-[#f1f5f9] text-[#cbd5e1] rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mt-4"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>

            <div className="flex flex-col pt-0.5 relative">
              <h1 className="text-lg md:text-xl font-bold text-[#1e293b] flex flex-wrap items-center gap-2 md:gap-3">
                {patient.name}
                {healthAlerts.length > 0 && (
                  <div className="relative group flex items-center">
                    <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-[12px] font-semibold cursor-help border border-red-100">
                      <AlertTriangle size={14} className="text-red-500" />
                      {healthAlerts.length} Alerta{healthAlerts.length > 1 ? 's' : ''} de Saúde
                    </div>
                    
                    <div className="absolute top-full left-0 mt-2 w-max max-w-xs bg-[#1e293b] text-white text-[12px] rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                       <div className="font-semibold mb-2 text-red-300">Condições relatadas:</div>
                       <ul className="flex flex-col gap-1.5">
                         {healthAlerts.map((alert, idx) => (
                           <li key={idx} className="flex items-start gap-2">
                             <span className="text-red-400 mt-0.5">•</span>
                             <span className="leading-tight">{alert}</span>
                           </li>
                         ))}
                       </ul>
                       <div className="absolute -top-1 left-6 w-2 h-2 bg-[#1e293b] rotate-45"></div>
                    </div>
                  </div>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-[13px] text-[#64748b]">
                <div className="flex items-center gap-1.5 font-medium">
                  <a href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#10b981] transition-colors">
                    <MessageCircle size={14} className="text-[#94a3b8]" />
                  </a>
                  {displayPhone}
                </div>
                {ageText && (
                  <span className="font-medium text-[#475569]">{ageText}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <button
                  onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                  className={`flex items-center gap-1.5 text-[12.5px] transition-colors cursor-pointer w-fit p-1 -ml-1 rounded ${isCategoryMenuOpen ? 'text-[#3b82f6] bg-blue-50' : 'text-[#64748b] hover:text-[#3b82f6] hover:bg-slate-50'}`}
                >
                  <Tag size={13} /> Categorizar
                </button>
                {/* Active category tags */}
                {selectedCategoryIds.map(id => {
                  const cat = categories.find(c => c.id === id);
                  if (!cat) return null;
                  return (
                    <span
                      key={cat.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.name}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelectedCategory(cat.id); }}
                        className="ml-0.5 hover:opacity-70 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Categorizar Dropdown */}
              {isCategoryMenuOpen && (
                <div className="absolute top-20 left-0 mt-1 w-72 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100/80 z-[60] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-slate-50/50">
                    <h3 className="font-semibold text-gray-700 text-sm">Categorizar paciente</h3>
                    <button onClick={() => setIsCategoryMenuOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleSelectedCategory(cat.id)}
                          className={`flex items-center justify-between w-full px-4 py-2.5 transition-colors text-left group ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Checkbox indicator */}
                            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                            </span>
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className={`text-[13px] font-medium ${
                              isSelected ? 'text-blue-700' : 'text-gray-600 group-hover:text-gray-900'
                            }`}>{cat.name}</span>
                          </div>
                          <button
                            onClick={(e) => openEditCategory(cat, e)}
                            className="text-gray-300 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all p-1 rounded hover:bg-blue-50"
                            title="Editar categoria"
                          >
                            <Edit2 size={13} />
                          </button>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-3 border-t border-gray-100 bg-white">
                    <button
                      onClick={() => openEditCategory({ id: 'new', name: '', color: '#3b82f6' })}
                      className="flex items-center justify-center gap-2 w-full py-2 text-[13px] font-semibold text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus size={15} /> Criar nova categoria
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onEdit}
            className="flex items-center border border-[#cbd5e1] text-[#475569] px-3 py-1.5 rounded-md hover:bg-[#f8fafc] transition-colors space-x-2 text-[13px] font-semibold self-start md:self-auto"
          >
            <Edit2 size={14} />
            <span>Editar</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="relative flex items-center mt-4 md:mt-8 -mx-4 md:mx-0">
          {/* Left Arrow */}
          <button
            className="md:hidden flex items-center justify-center w-7 h-7 shrink-0 text-gray-400 hover:text-gray-700 bg-gradient-to-r from-white via-white to-transparent z-10"
            onClick={() => {
              const el = document.getElementById('patient-tabs-scroll');
              if (el) el.scrollBy({ left: -120, behavior: 'smooth' });
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <div id="patient-tabs-scroll" className="flex overflow-x-auto gap-4 md:gap-8 border-b border-white hide-scrollbar px-2 md:px-0 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`pb-3 text-[13px] md:text-[14.5px] font-semibold transition-colors relative whitespace-nowrap ${activeTab === tab
                    ? 'text-[#2563eb]'
                    : 'text-[#64748b] hover:text-[#475569]'
                  }`}
              >
                <div className="flex items-center gap-2">
                  {tab}
                  {tab === 'Pagamentos' && pendingPaymentsCount > 0 && (
                    <span className="flex items-center justify-center bg-red-100 text-red-600 font-bold text-[11px] h-5 min-w-[20px] px-1.5 rounded-full">
                      {pendingPaymentsCount}
                    </span>
                  )}
                </div>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
          {/* Right Arrow */}
          <button
            className="md:hidden flex items-center justify-center w-7 h-7 shrink-0 text-gray-400 hover:text-gray-700 bg-gradient-to-l from-white via-white to-transparent z-10"
            onClick={() => {
              const el = document.getElementById('patient-tabs-scroll');
              if (el) el.scrollBy({ left: 120, behavior: 'smooth' });
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 md:p-6">
        {activeTab === 'Anamneses' && (
          <AnamneseTab
            empresaId={empresaId!}
            patient={patient}
            onBack={() => setActiveTab('Visão Geral')}
          />
        )}

        {activeTab === 'Documentos' && (
          <DocumentosTab
            empresaId={empresaId!}
            patient={patient}
            budgets={budgets}
          />
        )}

        {activeTab === 'Arquivos' && (
          <ArquivosTab
            empresaId={empresaId!}
            patient={patient}
          />
        )}

        {activeTab === 'Visão Geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full max-w-[1400px] mx-auto">
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-5">

              {/* Tarefas Box */}
              {(() => {
                const pendentes = tarefas.filter(t => !t.concluida).length;
                const temTarefas = tarefas.length > 0;
                const tudoEmDia = temTarefas && pendentes === 0;

                return (
                  <div
                    onClick={() => setIsTarefasOpen(true)}
                    className={`border rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all group ${tudoEmDia
                        ? 'bg-green-50 border-green-200 hover:border-green-300'
                        : pendentes > 0
                          ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${tudoEmDia
                          ? 'bg-green-100 text-green-600'
                          : pendentes > 0
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-[#f1f5f9] text-[#94a3b8] group-hover:text-blue-500 group-hover:bg-blue-50'
                        }`}>
                        <CheckSquare size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-[#334155]">Tarefas</span>
                        {tudoEmDia ? (
                          <span className="text-[12px] font-semibold text-green-600">Tudo em dia</span>
                        ) : pendentes > 0 ? (
                          <span className="text-[12px] font-semibold text-yellow-600">{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-[12px] text-[#94a3b8]">Nenhuma tarefa cadastrada</span>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 text-[13px] font-semibold transition-colors ${tudoEmDia ? 'text-green-500' : pendentes > 0 ? 'text-yellow-500' : 'text-[#94a3b8] group-hover:text-blue-500'
                      }`}>
                      <span>+ Nova</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })()}

              {/* Informações Box */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative">
                <h3 className="text-[17px] font-bold text-[#1e293b] mb-6">Informações</h3>

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Código do paciente</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.id}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Preferência de lembretes</span>
                    <span className="text-[14px] font-medium text-[#334155]">WhatsApp</span>
                  </div>

                  <div className="flex flex-col border-b border-gray-100 pb-5">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Celular</span>
                    <span className="text-[14px] font-medium text-[#334155]">{displayPhone}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Data de nascimento</span>
                    <span className="text-[14px] font-medium text-[#334155]">
                      {patient.dataNascimento ? `${patient.dataNascimento} - ${ageText.split(' ')[0]} anos` : '-'}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Gênero</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.genero || 'Masculino'}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Convênio</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.plano || 'Particular'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="lg:col-span-8 flex flex-col gap-5">

              {/* Odontogram Section */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50 border-b border-gray-100 p-4">
                  <h3 className="font-bold text-gray-800">Odontograma</h3>
                </div>
                <div className="p-4 sm:p-6 lg:p-8 bg-blue-50/30 flex justify-center items-center">
                  <Odontogram
                    patientName={patient.name}
                    procedures={procedures}
                    setProcedures={setProcedures}
                    onAppendToBudget={handleAppendToBudgetFromOdontogram}
                  />
                </div>
              </div>

              {/* Últimas Evoluções Box */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[17px] font-bold text-[#1e293b]">Últimas Evoluções</h3>
                  <div className="flex items-center gap-2">
                    {evolutions.length > 3 && (
                      <button
                        onClick={() => setActiveTab('Evoluções')}
                        className="text-[12px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        Ver todas ({evolutions.length})
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('Evoluções')}
                      className="flex items-center gap-2 border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] hover:border-[#94a3b8] transition-colors rounded-md px-3 py-1.5 text-[13px] font-semibold"
                    >
                      <FileText size={14} /> Adicionar
                    </button>
                  </div>
                </div>

                {evolutions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 py-10">
                    <div className="relative w-24 h-24 mb-4">
                      <span className="absolute -top-2 -left-2 text-yellow-400 text-2xl">⭐</span>
                      <span className="absolute bottom-2 right-0 text-yellow-200 text-xl">🌙</span>
                      <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mt-4 border-[3px] border-blue-200"></div>
                    </div>
                    <p className="text-[14px] text-[#64748b]">Nenhum registro nas evoluções ainda.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {evolutions.slice(0, 3).map(evo => (
                      <div
                        key={evo.id}
                        onClick={() => setActiveTab('Evoluções')}
                        className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                      >
                        <p className="text-[13.5px] text-gray-700 line-clamp-2 leading-relaxed mb-2">
                          {evo.texto}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11.5px] font-semibold text-gray-500 truncate">
                            {evo.tratamento_nome}{evo.dente ? ` · Dente ${evo.dente}` : ''}
                          </span>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            {evo.data_evolucao}
                          </span>
                        </div>
                      </div>
                    ))}

                    {evolutions.length > 3 && (
                      <button
                        onClick={() => setActiveTab('Evoluções')}
                        className="text-center text-[12.5px] font-semibold text-blue-500 hover:text-blue-700 py-2 border border-dashed border-blue-200 rounded-xl hover:bg-blue-50/40 transition-all"
                      >
                        + {evolutions.length - 3} evoluções a mais → Ver histórico completo
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Histórico de consultas Box */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[17px] font-bold text-[#1e293b]">Histórico de consultas</h3>
                  <button
                    onClick={() => { if (onNavigateToSchedule) onNavigateToSchedule(); }}
                    className="flex items-center gap-2 border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] hover:border-[#94a3b8] transition-colors rounded-md px-3 py-1.5 text-[13px] font-semibold"
                  >
                    <Calendar size={14} /> Adicionar
                  </button>
                </div>

                {appointmentHistory.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 py-6">
                    <p className="text-[14px] text-[#64748b]">Nenhum agendamento encontrado para este paciente.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0 divide-y divide-gray-100">
                    {appointmentHistory.map((appt, idx) => {
                      const startDate = new Date(appt.data_inicio);
                      const dateStr = startDate.toLocaleDateString('pt-BR');
                      const timeStr = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      const spec = specialists.find(s => s.calendarId === appt.especialista_id || s.id === appt.especialista_id);
                      
                      const getStatusInfo = (rawStatus: string) => {
                        const statusStr = (rawStatus || '').toLowerCase();
                        if (statusStr.includes('confirmed') || statusStr.includes('confirmado')) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Agendada' };
                        if (statusStr.includes('concluido')) return { bg: 'bg-green-100', text: 'text-green-700', label: 'Concluída' };
                        if (statusStr.includes('cancelled') || statusStr.includes('cancelado')) return { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' };
                        return { bg: 'bg-gray-100', text: 'text-gray-700', label: rawStatus || 'Agendada' };
                      };

                      const statusBadge = getStatusInfo(appt.status);

                      return (
                        <div key={appt.id || idx} className="py-3 flex items-center justify-between group hover:bg-slate-50 transition-colors -mx-2 px-2 rounded-lg">
                          <div className="flex items-center gap-4 text-[13.5px] text-gray-700">
                            <span className="font-medium min-w-[80px]">{dateStr}</span>
                            <span className="text-gray-500 w-[45px]">{timeStr}</span>
                            <span className="font-medium text-gray-800">{spec ? spec.name : appt.titulo}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-opacity">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${statusBadge.bg} ${statusBadge.text}`}>
                              {statusBadge.label}
                            </span>
                            <div className="flex gap-1.5 text-gray-400">
                              <button onClick={() => handleEditAppt(appt)} className="hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => handleOpenApptDetails(appt)} className="hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-colors" title="Ver detalhes">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Orçamentos Tab */}
        {activeTab === 'Orçamentos' && (
          <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1e293b]">Orçamentos e Planos de Tratamento</h2>
              <button
                onClick={() => setIsNewBudgetModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-[13px] shadow-sm transition-colors"
              >
                <Plus size={16} /> Novo Orçamento
              </button>
            </div>

            {budgets.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                <img src="/orcamento.png" alt="Sem orçamentos" className="w-64 h-auto opacity-80 mb-6 drop-shadow-sm" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  Nenhum orçamento foi criado para esse paciente.
                </h3>
                <p className="text-gray-500 font-medium mb-6">
                  Vamos começar?
                </p>
                <button
                  onClick={() => setIsNewBudgetModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-[14px] shadow-md transition-all"
                >
                  <Plus size={18} /> Novo Orçamento
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2 animate-in fade-in">
                {budgets.map(budget => (
                  <div key={budget.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <button
                          className="text-gray-400 hover:text-gray-600 mt-0.5"
                          onClick={() => setExpandedBudgets(prev => ({ ...prev, [budget.id]: !prev[budget.id] }))}
                        >
                          <ChevronDown size={20} className={`transition-transform duration-200 ${expandedBudgets[budget.id] ? 'rotate-180' : ''}`} />
                        </button>
                        <div
                          className="flex flex-col cursor-pointer group/title"
                          onClick={() => { setBudgetToEdit(budget); setIsNewBudgetModalOpen(true); }}
                        >
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-gray-800 tracking-tight text-[15px] group-hover/title:text-blue-600 transition-colors">{budget.name}</h4>
                            {budget.treatments?.filter((t: any) => t.status === 'Pendente').length > 0 && (
                              <span className="bg-orange-100/80 text-orange-700 text-[11px] px-2 py-0.5 rounded shadow-sm font-bold tracking-wide border border-orange-200/60">
                                {budget.treatments.filter((t: any) => t.status === 'Pendente').length} {budget.treatments.filter((t: any) => t.status === 'Pendente').length === 1 ? 'Pendência' : 'Pendências'}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500 font-medium mt-0.5">
                            {budget.date} <span className="mx-1 text-gray-300">|</span> #{budget.numero || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-800 mr-2 text-[15px]">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total)}
                        </span>

                        {budget.status !== 'Aprovado' ? (
                          <button
                            onClick={async () => {
                              if (!empresaId || !patient?.id) return;
                              const pendingCount = budget.treatments?.filter((t: any) => t.status === 'Pendente').length || 0;
                              if (pendingCount > 0) {
                                alert("Não é possível aprovar um orçamento com tratamentos pendentes de preenchimento.");
                                return;
                              }

                              const upd = {
                                ...budget,
                                status: 'Aprovado',
                                treatments: budget.treatments.map((t: any) => ({
                                  ...t,
                                  status: t.status === 'Aguardando' || t.status === 'Adicionado' ? 'Em andamento' : t.status
                                }))
                              };
                              const saved = await budgetService.saveBudget(empresaId, Number(patient.id), upd);
                              if (saved) {
                                setBudgets(prev => prev.map(b => b.id === budget.id ? saved : b));
                                setActiveTab('Tratamentos');
                              }
                            }}
                            className="border border-gray-200 rounded-lg px-4 py-1.5 font-bold text-gray-700 hover:bg-gray-50 text-[13px] shadow-sm transition-all"
                          >
                            Aprovar
                          </button>
                        ) : (
                          <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
                            Aprovado
                          </span>
                        )}

                        <div className="relative">
                          <button
                            onClick={() => setOpenBudgetMenuId(openBudgetMenuId === budget.id ? null : budget.id)}
                            className="p-1.5 bg-gray-50 rounded border border-gray-100 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openBudgetMenuId === budget.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenBudgetMenuId(null)} />
                              <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2 animate-in fade-in zoom-in-95">
                                <button className="w-full text-left px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                  <Copy size={14} className="text-gray-400" /> Duplicar orçamento
                                </button>
                                <button
                                  onClick={() => { setBudgetToEdit(budget); setIsNewBudgetModalOpen(true); setOpenBudgetMenuId(null); }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit2 size={14} className="text-gray-400" /> Editar
                                </button>
                                <button className="w-full text-left px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                  <Printer size={14} className="text-gray-400" /> Imprimir
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!window.confirm("Você tem certeza que deseja excluir esse orçamento permanentemente? (Isso limpará os dentes vinculados a ele)")) return;
                                    const success = await budgetService.deleteBudget(budget.id);
                                    if (success) {
                                      setBudgets(prev => prev.filter(b => b.id !== budget.id));
                                      // Clean up linked odontogram entries robustly (handles old data without matching IDs as well)
                                      setProcedures(prev => {
                                        const idsToRemove = new Set(budget.treatments?.map((t: any) => t.id));

                                        // Build a map of tooth -> names to remove (fallback for old unlinked data)
                                        const namesToRemoveByTooth: Record<number, Set<string>> = {};
                                        budget.treatments?.forEach((t: any) => {
                                          const num = parseInt(t.dente);
                                          if (!isNaN(num)) {
                                            if (!namesToRemoveByTooth[num]) namesToRemoveByTooth[num] = new Set();
                                            namesToRemoveByTooth[num].add(t.treatmentName || t.tratamento);
                                          }
                                        });

                                        const newState = { ...prev };
                                        let changed = false;
                                        for (const toothStr in newState) {
                                          const tooth = Number(toothStr);
                                          const procs = newState[tooth] || [];
                                          const fallbackNames = namesToRemoveByTooth[tooth] || new Set();

                                          const filtered = procs.filter(p => !idsToRemove.has(p.id) && !fallbackNames.has(p.treatmentName));
                                          if (filtered.length !== procs.length) {
                                            if (filtered.length === 0) delete newState[tooth];
                                            else newState[tooth] = filtered;
                                            changed = true;
                                          }
                                        }
                                        return changed ? newState : prev;
                                      });
                                    }
                                    else alert("Erro ao excluir orçamento!");
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 mt-1 border-t border-gray-50 pt-2"
                                >
                                  <Trash2 size={14} className="text-red-400" /> Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedBudgets[budget.id] && budget.treatments && budget.treatments.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-50/50 rounded-lg overflow-hidden border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/50 border-b border-slate-200">
                                <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tratamento</th>
                                <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dente/Face</th>
                                <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Profissional/Convênio</th>
                                <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {budget.treatments.map((t: any, i: number) => (
                                <tr key={i} className="hover:bg-white transition-colors">
                                  <td className="px-4 py-2.5 text-sm font-semibold text-slate-700">{t?.treatmentName || 'Desconhecido'}</td>
                                  <td className="px-4 py-2.5 text-sm text-slate-500">
                                    Dente {t?.dente || '-'} {t?.faces ? `- ${t.faces}` : ''}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-slate-500">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-slate-600">{t?.profissional || '-'}</span>
                                      <span className="text-[10px] uppercase text-slate-400">{t?.convenio || '-'}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-sm font-bold text-slate-700 text-right">
                                    {t?.valor ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(t.valor)) : '--'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Tratamentos' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 animate-in fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-between">
              Tratamentos em Andamento/Concluídos
              <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{budgets.filter(b => b.status === 'Aprovado').length} Orçamentos Aprovados</span>
            </h3>

            <Odontogram
              patientName={patient.name}
              procedures={(() => {
                const result: Record<number, OdontogramProcedure[]> = {};
                budgets.filter(b => b.status === 'Aprovado' || (b.status as any) === 'Odontograma').forEach(b => {
                  b.treatments?.forEach(t => {
                    const num = parseInt(t.dente);
                    if (!isNaN(num)) {
                      if (!result[num]) result[num] = [];

                      result[num].push({
                        id: t.id,
                        treatmentName: t.treatmentName || t.tratamento,
                        isExtraction: !!t.isExtraction,
                        notes: t.observacoes || '',
                        sourceTreatment: t,
                        sourceBudget: b
                      } as any);
                    }
                  });
                });
                return result;
              })()}
              setProcedures={setProcedures}
              viewMode={true}
              onUpdateTreatment={async (budget, treatmentId, updates) => {
                if (!empresaId || !patient?.id) return;
                const upd = {
                  ...budget,
                  treatments: budget.treatments.map((t: any) => t.id === treatmentId ? { ...t, ...updates } : t)
                };
                const saved = await budgetService.saveBudget(empresaId, Number(patient.id), upd);
                if (saved) {
                  setBudgets(prev => prev.map(b => b.id === budget.id ? saved : b));
                }
              }}
              onToggleExtraction={async (tooth, extracted) => {
                if (!empresaId || !patient?.id) return;

                let odontogramaBudget: any = budgets.find(b => (b.status as any) === 'Odontograma');
                if (!odontogramaBudget) {
                  if (!extracted) return;
                  odontogramaBudget = {
                    name: 'Paciente Odontograma Base',
                    date: new Date().toISOString(),
                    status: 'Odontograma',
                    total: 0,
                    treatments: []
                  };
                }

                let treatments = [...(odontogramaBudget.treatments || [])];
                const existingIdx = treatments.findIndex((t: any) => t.dente === String(tooth) && t.isExtraction);

                let changed = false;
                if (extracted && existingIdx === -1) {
                  treatments.push({
                    id: Math.random().toString(36).substring(2, 9),
                    treatmentName: 'Remoção / Ausente',
                    dente: String(tooth),
                    isExtraction: true,
                    status: 'Concluído',
                    valor: '',
                    convenio: 'N/A',
                    profissional: 'N/A'
                  });
                  changed = true;
                } else if (!extracted && existingIdx >= 0) {
                  treatments.splice(existingIdx, 1);
                  changed = true;
                }

                if (changed) {
                  const upd = { ...odontogramaBudget, treatments };
                  const saved = await budgetService.saveBudget(empresaId, Number(patient.id), upd);
                  if (saved) {
                    setBudgets(prev => {
                      const out = [...prev];
                      const i = out.findIndex(b => b.id === saved.id);
                      if (i >= 0) out[i] = saved;
                      else out.push(saved);
                      return out;
                    });
                  }
                }
              }}
            />

            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="grid grid-cols-[100px_1fr_60px_60px_120px_150px] gap-6 px-6 border-b border-gray-100 pb-3 mb-4 text-[14px] font-semibold text-slate-700">
                <div>Data</div>
                <div>Tratamento</div>
                <div className="text-center">Dente</div>
                <div className="text-center">Faces</div>
                <div>Valor</div>
                <div></div>
              </div>

              <div className="flex flex-col gap-3">
                {budgets.filter(b => b.status === 'Aprovado').flatMap(b => b.treatments.map((t: any) => ({ ...t, budget: b }))).map((t: any) => (
                  <div key={t.id} className="grid grid-cols-[100px_1fr_60px_60px_120px_150px] gap-6 items-center bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[14px] text-gray-600 font-medium">{t.budget.date}</span>
                      <span className="text-[11px] text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-md font-semibold font-mono border border-gray-200/50">Orç. #{t.budget.numero || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[15px] text-[#2c3e50] font-semibold">{t.treatmentName || t.tratamento}</span>
                      <span className="text-[13px] text-gray-500 flex items-center gap-2">
                        {t.convenio || 'Particular'}
                        <span className="w-px h-3 bg-gray-300"></span>
                        {t.valor ? `R$ ${t.valor}` : '--'}
                        {t.profissional && <span className="w-px h-3 bg-gray-300"></span>}
                        {t.profissional && `Dr(a) ${t.profissional.replace('Dr. ', '').replace('Dra. ', '')}`}
                      </span>
                    </div>
                    <div className="text-center text-[14px] text-gray-500 font-medium">{t.dente || '-'}</div>
                    <div className="text-center text-[14px] text-gray-500 font-medium">{t.faces || '-'}</div>
                    <div className="text-[14px] text-slate-700 font-semibold">{t.valor ? `R$ ${t.valor}` : '--'}</div>

                    <div className="flex items-center justify-end gap-1 relative">
                      {t.status === 'Finalizado' || t.status === 'Concluído' ? (
                        <span className="px-5 py-2 text-[13px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">Finalizado</span>
                      ) : (
                        <button className="px-5 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-slate-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-colors" onClick={async () => {
                          const now = new Date();
                          const offset = now.getTimezoneOffset() * 60000;
                          const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, -1);
                          const upd = { ...t.budget, treatments: t.budget.treatments.map((x: any) => x.id === t.id ? { ...x, status: 'Finalizado', data_finalizacao: localISOTime } : x) };
                          const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), upd);
                          if (saved) setBudgets(prev => prev.map(b => b.id === t.budget.id ? saved : b));
                        }}>Finalizar</button>
                      )}

                      <button className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ml-1" onClick={() => setOpenTreatmentMenuId(openTreatmentMenuId === t.id ? null : t.id)}>
                        <MoreVertical size={20} />
                      </button>

                      {openTreatmentMenuId === t.id && (
                        <div className="absolute top-[110%] right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          {t.paymentStatus !== 'Pago' && (
                            <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 transition-colors border-b border-gray-50 bg-blue-50/30"
                              onClick={() => {
                                setPayingTreatments([t]);
                                setOpenTreatmentMenuId(null);
                              }}
                            >
                              <CreditCard size={16} /> Realizar pagamento
                            </button>
                          )}
                          <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                            onClick={async () => {
                              const newName = window.prompt("Editar nome do tratamento:", t.treatmentName || t.tratamento);
                              if (newName) {
                                const upd = { ...t.budget, treatments: t.budget.treatments.map((x: any) => x.id === t.id ? { ...x, treatmentName: newName } : x) };
                                const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), upd);
                                if (saved) setBudgets(prev => prev.map(b => b.id === t.budget.id ? saved : b));
                              }
                              setOpenTreatmentMenuId(null);
                            }}
                          >
                            <Edit2 size={16} className="text-gray-400" /> Editar
                          </button>
                          <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                            onClick={async () => {
                              const newCost = window.prompt("Alterar custo (apenas número):", t.valor);
                              if (newCost !== null) {
                                const upd = { ...t.budget, treatments: t.budget.treatments.map((x: any) => x.id === t.id ? { ...x, valor: newCost } : x) };
                                const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), upd);
                                if (saved) setBudgets(prev => prev.map(b => b.id === t.budget.id ? saved : b));
                              }
                              setOpenTreatmentMenuId(null);
                            }}
                          >
                            <span className="text-gray-400 font-bold px-1">$</span> Alterar custo
                          </button>
                          <div className="h-px bg-gray-100 my-1"></div>
                          <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                            onClick={async () => {
                              if (!window.confirm("Deseja realmente cancelar este tratamento e enviá-lo de volta ao orçamento pendente?")) return;
                              setOpenTreatmentMenuId(null);

                              const remainingTreatments = t.budget.treatments.filter((x: any) => x.id !== t.id);
                              const updOriginal = { ...t.budget, treatments: remainingTreatments };

                              let success = false;
                              if (remainingTreatments.length === 0) {
                                success = await budgetService.deleteBudget(t.budget.id);
                              } else {
                                const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), updOriginal);
                                success = !!saved;
                              }

                              if (success) {
                                if (remainingTreatments.length === 0) {
                                  setBudgets(prev => prev.filter(b => b.id !== t.budget.id));
                                } else {
                                  const saved = await budgetService.fetchBudgets(empresaId!, Number(patient.id));
                                  setBudgets(saved as Budget[]);
                                }

                                const restoredTreatment = { ...t, status: 'Pendente' };
                                delete restoredTreatment.budget;
                                await handleAppendToBudgetFromOdontogram([restoredTreatment]);
                              }
                            }}
                          >
                            <span className="rotate-180 text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg></span> Cancelar tratamento
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {budgets.filter(b => b.status === 'Aprovado').flatMap(b => b.treatments).length === 0 && (
                  <div className="text-center py-12 text-sm text-gray-500 bg-gray-50/50 rounded-xl border border-gray-100">Nenhum tratamento aprovado ainda.</div>
                )}
              </div>

              {/* Nova Camada: Dentes Ausentes */}
              {(() => {
                const ausentes = budgets.filter(b => b.status === 'Aprovado' || (b.status as any) === 'Odontograma').flatMap(b => b.treatments).filter(t => t && t.isExtraction);
                if (ausentes.length === 0) return null;
                return (
                  <div className="mt-8 pt-8 border-t border-gray-100 animate-in fade-in">
                    <h4 className="text-lg font-bold text-gray-800 flex flex-wrap items-center gap-2 mb-4">
                      <X size={20} className="text-red-500" />
                      Dentes Ausentes / Removidos
                      <span className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full font-bold">
                        {ausentes.length} identificados
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {ausentes.map((t: any, i: number) => (
                        <div key={t.id || i} className="bg-red-50/40 border border-red-100 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative group overflow-hidden">
                          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-red-500">
                              <path d="M7,2 C5,2 4,3 4,5 L4,10 C4,13 6,15 8,16 L8,21 C8,22 9,23 10,23 C11,23 12,22 12,21 L12,18 L12,21 C12,22 13,23 14,23 C15,23 16,22 16,21 L16,16 C18,15 20,13 20,10 L20,5 C20,3 19,2 17,2 C15,2 14,3 13,4 L12,6 L11,4 C10,3 9,2 7,2 Z" />
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-gray-800 mb-1 z-10">Dente {t.dente}</span>
                          <span className="text-xs text-red-600 font-semibold uppercase z-10">{t.treatmentName || 'Removido/Ausente'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'Pagamentos' && (() => {
          const paymentTreatments = budgets.filter(b => b.status === "Aprovado")
            .flatMap(b => b.treatments.map((t: any) => ({ ...t, budget: b })))
            .filter(t => t.status === 'Em andamento' || t.status === 'Finalizado');

          // total paid would be where paymentStatus === 'Pago'
          const totalPago = paymentTreatments.filter(t => t.paymentStatus === 'Pago').reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
          const aReceber = paymentTreatments.filter(t => t.paymentStatus !== 'Pago').reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);

          return (
            <div className="flex flex-col gap-6 animate-in fade-in max-w-[1200px] mx-auto w-full">
              <h2 className="text-2xl font-bold text-gray-800">Pagamentos</h2>

              {/* Top Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border text-gray-800 border-gray-200 rounded-xl p-6 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-[#10b981] font-semibold text-lg mb-2">Total pago</p>
                    <p className="text-2xl font-bold">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <Check size={20} strokeWidth={3} />
                  </div>
                </div>

                <div className="bg-white border text-gray-800 border-gray-200 rounded-xl p-6 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-[#ef4444] font-semibold text-lg mb-2">A receber</p>
                    <p className="text-2xl font-bold">R$ {aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-orange-100 p-2 rounded-full text-orange-500">
                    <ArrowDownRight size={20} strokeWidth={3} />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <div className="relative">
                  <button onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors cursor-pointer">
                    <Calendar size={16} /> {dateFilter ? `${new Date(dateFilter.start).toLocaleDateString('pt-BR')} até ${new Date(dateFilter.end).toLocaleDateString('pt-BR')}` : 'Selecionar período'}
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-[110%] left-0 bg-white border border-gray-200 shadow-xl rounded-xl p-4 z-50 flex items-end gap-3 animate-in fade-in zoom-in-95">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Início</label>
                        <input type="date" className="border px-2 py-1.5 rounded-lg text-sm" onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value } as any))} value={dateFilter?.start || ''} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Fim</label>
                        <input type="date" className="border px-2 py-1.5 rounded-lg text-sm" onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value } as any))} value={dateFilter?.end || ''} />
                      </div>
                      <button onClick={() => setShowDatePicker(false)} className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 cursor-pointer">OK</button>
                      {dateFilter && <button onClick={() => { setDateFilter(null); setShowDatePicker(false); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-200 cursor-pointer">Limpar</button>}
                    </div>
                  )}
                </div>
                {['Todos', 'Pagos', 'Aguardando', 'Em aberto', 'Em atraso'].map(f => (
                  <button
                    key={f}
                    onClick={() => setPagamentosFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${pagamentosFilter === f ? 'bg-[#64748b] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 text-sm font-semibold text-gray-600 mt-2">
                <div className="col-span-1 flex items-center">
                  <input type="checkbox"
                    checked={paymentTreatments.length > 0 && selectedPayments.length === paymentTreatments.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = paymentTreatments.map(t => t.id);
                        setSelectedPayments(allIds);
                      } else {
                        setSelectedPayments([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <div className="col-span-5 flex items-center gap-2">Descrição <ArrowDown size={14} /></div>
                <div className="col-span-1 text-center text-[13px]">Aprovado em</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-3 text-right pr-12">Valor</div>
              </div>
              
              {/* Mobile Select All */}
              <div className="md:hidden flex items-center gap-2 px-2 mt-2 mb-2">
                  <input type="checkbox"
                    id="selectAllMobile"
                    checked={paymentTreatments.length > 0 && selectedPayments.length === paymentTreatments.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = paymentTreatments.map(t => t.id);
                        setSelectedPayments(allIds);
                      } else {
                        setSelectedPayments([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="selectAllMobile" className="text-sm font-semibold text-gray-600">Selecionar todos</label>
              </div>

              {/* List */}
              <div className="flex flex-col gap-3">
                {(() => {
                  const mappedTreatments = paymentTreatments.map(t => {
                    const isPaid = t.paymentStatus === 'Pago';
                    let dueDate: Date | null = null;
                    let approvalDate: Date | null = null;
                    let paymentDate: Date | null = null;
                    let isLate = false;
                    const bDate = t.budget.date || t.budget.created_at;

                    if (bDate) {
                      let parsedStr = bDate;
                      if (typeof bDate === 'string' && bDate.includes('/') && bDate.split('/')[0].length === 2) {
                        const parts = bDate.split(' ')[0].split('/');
                        if (parts.length === 3) parsedStr = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`;
                      }
                      const parsed = new Date(parsedStr);
                      if (!isNaN(parsed.getTime())) {
                        approvalDate = parsed;
                        const dueDateObj = new Date(parsed.getTime() + 30 * 24 * 60 * 60 * 1000);
                        if (!isPaid && dueDateObj.getTime() < new Date().getTime()) {
                          isLate = true;
                        }
                      }
                    }

                    if (t.payments && t.payments.length > 0) {
                      const payStr = t.payments[t.payments.length - 1].date;
                      const parsedPay = new Date(payStr.includes('T') ? payStr : payStr + 'T12:00:00');
                      if (!isNaN(parsedPay.getTime())) paymentDate = parsedPay;
                    }

                    return { ...t, isPaid, isLate, approvalDate, paymentDate };
                  }).filter(t => {
                    if (dateFilter) {
                      if (!t.approvalDate) return false;
                      const dStr = t.approvalDate.toISOString().split('T')[0];
                      if (dStr < dateFilter.start || dStr > dateFilter.end) return false;
                    }
                    if (pagamentosFilter === 'Todos') return true;
                    if (pagamentosFilter === 'Pagos') return t.isPaid;
                    if (pagamentosFilter === 'Aguardando' || pagamentosFilter === 'Em aberto') return !t.isPaid && !t.isLate;
                    if (pagamentosFilter === 'Em atraso') return t.isLate;
                    return true;
                  });

                  const selectedObjs = mappedTreatments.filter(t => selectedPayments.includes(t.id));
                  const canPay = selectedObjs.every(t => !t.isPaid); // Cannot pay if any are already paid
                  const canCancel = selectedObjs.every(t => (t.payments && t.payments.length > 0) || t.paymentStatus === 'Pago' || t.paymentStatus === 'Pago parcialmente');
                  const canReceipt = selectedObjs.every(t => (t.payments && t.payments.length > 0) || t.paymentStatus === 'Pago' || t.paymentStatus === 'Pago parcialmente');

                  return (
                    <>
                      {selectedPayments.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg py-3 px-5 flex items-center justify-between animate-in fade-in slide-in-from-top-2 mb-2">
                          <span className="text-sm font-semibold text-blue-800">{selectedPayments.length} selecionado(s)</span>
                          <div className="flex items-center gap-2">
                            <button
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-colors ${canCancel ? 'text-red-600 bg-white border border-red-200 hover:bg-red-50' : 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'}`}
                              disabled={!canCancel}
                              title={!canCancel ? "Apenas tratamentos com pagamentos podem ser cancelados" : ""}
                              onClick={() => setCancelingPayments(selectedObjs)}>
                              Cancelar pagamento
                            </button>
                            <button
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-colors ${canReceipt ? 'text-blue-600 bg-white border border-blue-200 hover:bg-blue-50' : 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'}`}
                              disabled={!canReceipt}
                              title={!canReceipt ? "Apenas tratamentos com pagamentos podem emitir recibo" : ""}
                              onClick={() => printReceipt(selectedObjs, null)}>
                              Emitir Recibo
                            </button>
                            <button
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-colors ${canPay ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-gray-400 bg-gray-200 cursor-not-allowed'}`}
                              disabled={!canPay}
                              title={!canPay ? "Você selecionou itens já pagos" : ""}
                              onClick={() => setPayingTreatments(selectedObjs)}>
                              Pagar selecionados
                            </button>
                          </div>
                        </div>
                      )}

                      {mappedTreatments.length === 0 ? (
                        <div className="text-center py-12 text-sm text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">Nenhum pagamento correspondente para "{pagamentosFilter}".</div>
                      ) : mappedTreatments.map(t => (
                        <div key={t.id || Math.random()} className={`bg-white border rounded-xl p-4 flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 transition-colors shadow-sm relative ${selectedPayments.includes(t.id) ? 'border-blue-400 bg-blue-50/20' : 'border-gray-200 hover:border-blue-300'}`}>
                          <div className="col-span-1 flex items-center pl-0 md:pl-2">
                            <input type="checkbox"
                              checked={selectedPayments.includes(t.id)}
                              onChange={(e) => setSelectedPayments(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                              className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          <div className="col-span-5 flex flex-col justify-center">
                            <span className="text-[14px] font-semibold text-gray-800 leading-tight">{t.treatmentName || t.tratamento}</span>
                            <div className="flex flex-col mt-1.5 gap-1">
                              {t.isPaid && t.paymentDate && (
                                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded w-fit mb-1">Pago em {t.paymentDate.toLocaleDateString('pt-BR')}</span>
                              )}
                              <div className="flex items-center gap-3 text-[12px] text-gray-500 font-medium">
                                {(t.dente || t.faces) && <span>Dente {t.dente} {t.faces ? `- ${t.faces}` : ''}</span>}
                                <span className="text-gray-400">Orc #{t.budget.numero || t.budget.id.substring(0, 8)}</span>
                              </div>
                            </div>
                            {t.paymentCancellationReason && (
                              <div className="mt-1.5 text-[11px] text-red-600 font-medium bg-red-50 border border-red-100 px-2 py-0.5 rounded flex w-fit max-w-full items-center gap-1">
                                Cancelamento: {t.paymentCancellationReason}
                              </div>
                            )}
                          </div>
                          <div className="col-span-1 flex md:flex-col items-center justify-between md:justify-center text-center w-full">
                            <span className="md:hidden text-xs text-gray-500 font-semibold">Aprovado em:</span>
                            {t.approvalDate ? (
                              <span className="text-[12px] md:text-[13px] font-semibold text-gray-700">{t.approvalDate.toLocaleDateString('pt-BR')}</span>
                            ) : (
                              <span className="text-[12px] text-gray-400">--</span>
                            )}
                          </div>
                          <div className="col-span-2 flex items-center justify-between md:justify-center gap-3 w-full">
                            <span className="md:hidden text-xs text-gray-500 font-semibold">Status:</span>
                            <div className="flex items-center gap-2">
                               {!t.isPaid && (
                                 <button
                                   className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 bg-white shadow-sm"
                                   onClick={() => setPayingTreatments([t])}
                                 >
                                   <CreditCard size={14} /> Pagar
                                 </button>
                               )}
                               <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${t.isPaid ? 'bg-green-50 text-green-700 border-green-200' : t.isLate ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                 {t.isPaid ? 'Pago' : t.isLate ? 'Em atraso' : 'Em aberto'}
                               </span>
                            </div>
                          </div>
                          <div className="col-span-3 flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-0 border-gray-100 w-full mt-1 md:mt-0">
                            <span className="md:hidden text-xs text-gray-500 font-semibold">Valor:</span>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-800">
                                  R$ {parseFloat(t.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="relative">
                                  <button
                                    className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                                    onClick={() => setOpenPaymentMenuId(openPaymentMenuId === t.id ? null : t.id)}
                                  >
                                    <MoreVertical size={18} />
                                  </button>

                                  {openPaymentMenuId === t.id && (
                                    <div className="absolute top-[80%] right-[30px] mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                                      <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                                        onClick={() => { setEditingPaymentBudget(t.budget); setOpenPaymentMenuId(null); }}
                                      >
                                        <Edit2 size={16} className="text-gray-400" /> Editar e Detalhes
                                      </button>
                                      <div className="h-px bg-gray-100 my-1"></div>
                                      <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5"
                                        onClick={() => { setCancelingPayments([t]); setOpenPaymentMenuId(null); }}
                                      >
                                        <X size={16} className="text-red-400" /> Cancelar pagamento
                                      </button>
                                    </div>
                                  )}
                                </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {activeTab === 'Evoluções' && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Evoluções</h3>

              {/* Form fields */}
              <div className="flex gap-4 mb-4">
                <div className="w-1/3">
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newEvoProfissional} onChange={e => setNewEvoProfissional(e.target.value)}>
                    <option>Everton Oliveira</option>
                    <option>Outro Profissional</option>
                  </select>
                </div>
                <div className="w-1/4">
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newEvoData} onChange={e => setNewEvoData(e.target.value)} />
                </div>
                <div className="flex-1">
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newEvoTratamentoId} onChange={e => setNewEvoTratamentoId(e.target.value)}>
                    <option value="">Vincular a um tratamento...</option>
                    {budgets.filter(b => b.status === "Aprovado").map(b => (
                      <optgroup label={`Orçamento #${b.numero || b.id.substring(0, 4)}`} key={b.id}>
                        {b.treatments.map((t: any) => (
                          <option key={t.id} value={`${b.id}|||${t.id}`}>
                            {t.treatmentName || t.tratamento} - Dente {t.dente} {t.faces ? `(${t.faces})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text editor mock */}
              <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2 overflow-x-auto">
                  <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 font-bold font-serif w-8 h-8 flex items-center justify-center">B</button>
                  <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 italic font-serif w-8 h-8 flex items-center justify-center">I</button>
                  <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 line-through font-serif w-8 h-8 flex items-center justify-center">S</button>
                  <div className="w-px h-5 bg-gray-300 mx-1"></div>
                  <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 font-bold w-8 h-8 flex items-center justify-center">🔗</button>
                </div>
                <textarea
                  className="w-full h-48 p-4 text-[14px] text-gray-700 outline-none resize-y"
                  placeholder="Descreva a evolução do tratamento aqui..."
                  value={newEvoTexto}
                  onChange={e => setNewEvoTexto(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                  <button
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-[13px] font-semibold transition-colors shadow-sm ${isRecording ? 'border-red-400 text-red-600 bg-red-50 animate-pulse' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => {
                      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                        alert("Seu navegador não suporta reconhecimento de voz.");
                        return;
                      }
                      if (isRecording) {
                        if (recognitionRef.current) {
                          try {
                            recognitionRef.current.stop();
                          } catch (e) {
                            console.error("Erro ao parar gravação:", e);
                          }
                        }
                        setIsRecording(false);
                        return;
                      }
                      setIsRecording(true);
                      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                      const recognition = new SpeechRecognition();
                      recognitionRef.current = recognition;
                      recognition.lang = 'pt-BR';
                      recognition.continuous = true;
                      recognition.interimResults = true;

                      recognition.onresult = (event: any) => {
                        let finalMsg = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                          if (event.results[i].isFinal) finalMsg += event.results[i][0].transcript;
                        }
                        if (finalMsg) setNewEvoTexto(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + finalMsg);
                      };
                      recognition.onerror = () => {
                        setIsRecording(false);
                        recognitionRef.current = null;
                      };
                      recognition.onend = () => {
                        setIsRecording(false);
                        recognitionRef.current = null;
                      };
                      try {
                        recognition.start();
                      } catch (e) {
                        console.error("Erro ao iniciar gravação:", e);
                        setIsRecording(false);
                        recognitionRef.current = null;
                      }
                    }}
                  >
                    {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={16} />}
                    {isRecording ? 'Parar gravação' : 'Gravar por voz'}
                  </button>

                  <button
                    className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg text-[13px] font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleImproveWithAI}
                    disabled={isImproving || !newEvoTexto.trim() || isRecording}
                  >
                    <Sparkles size={16} className={isImproving ? "animate-pulse" : ""} />
                    {isImproving ? 'Melhorando...' : 'Melhorar com IA'}
                  </button>

                  {newEvoTexto.length > 5 && !isRecording && !isImproving && (
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-500 animate-in fade-in zoom-in slide-in-from-left-4">
                      A transcrição ficou boa?
                      <button className="text-emerald-500 hover:scale-110 transition-transform"><Smile size={18} /></button>
                      <button className="text-red-400 hover:scale-110 transition-transform"><Frown size={18} /></button>
                    </div>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (!newEvoTratamentoId) { alert('Selecione um tratamento para vincular a evolução.'); return; }
                    if (!newEvoTexto.trim()) { alert('Digite o texto da evolução.'); return; }

                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.stop();
                      } catch (e) {
                        console.error("Erro ao parar gravação ao salvar:", e);
                      }
                      setIsRecording(false);
                    }

                    const [bId, tId] = newEvoTratamentoId.split('|||');
                    const b = budgets.find(x => x.id === bId);
                    const t = b?.treatments.find((x: any) => x.id === tId);

                    const novo: Evolucao = {
                      empresa_id: empresaId!,
                      paciente_id: Number(patient.id),
                      orcamento_id: bId,
                      tratamento_id: tId,
                      tratamento_nome: t?.treatmentName || t?.tratamento || 'Desconhecido',
                      dente: t?.dente || '',
                      faces: t?.faces || '',
                      orcamento_numero: b?.numero ? `#${b.numero}` : `#${bId.substring(0, 4)}`,
                      texto: newEvoTexto,
                      data_evolucao: newEvoData.split('-').reverse().join('/'),
                      profissional: newEvoProfissional
                    };

                    const salvou = await evolutionService.saveEvolution(novo);
                    if (salvou) {
                      setEvolutions(prev => [salvou, ...prev]);
                      setNewEvoTexto('');
                      setNewEvoTratamentoId('');
                    } else {
                      alert('Falha ao salvar a evolução.');
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
                >
                  Salvar evolução
                </button>
              </div>
            </div>

            {/* Histórico Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Histórico</h3>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50/50 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors">
                    <FileText size={16} /> Assinar digitalmente
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                    <Printer size={16} /> Imprimir
                  </button>
                </div>
              </div>



              <div className="flex flex-col gap-4">
                {evolutions.map(evo => (
                  <div key={evo.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow bg-white flex flex-col gap-3 relative group">
                    <p className="text-[15px] text-gray-800 whitespace-pre-wrap leading-relaxed">{evo.texto}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-[13px] font-semibold text-gray-500">
                        {evo.tratamento_nome} - Dente {evo.dente || '-'} {evo.faces ? `- ${evo.faces}` : ''} - Orç. {evo.orcamento_numero}
                      </span>
                      <span className="text-[12px] text-gray-400">
                        {evo.data_evolucao} <span className="mx-1">|</span> Dr(a) {evo.profissional.replace('Dr. ', '').replace('Dra. ', '')}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm("Deseja deletar esta evolução?")) {
                          if (evo.id && await evolutionService.deleteEvolution(evo.id)) {
                            setEvolutions(prev => prev.filter(e => e.id !== evo.id));
                          }
                        }
                      }}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {evolutions.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-500 bg-gray-50/50 rounded-xl border border-gray-100">Nenhuma evolução registrada ainda.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs content placeholder */}
        {activeTab !== 'Visão Geral' && activeTab !== 'Orçamentos' && activeTab !== 'Tratamentos' && activeTab !== 'Evoluções' && activeTab !== 'Pagamentos' && activeTab !== 'Anamneses' && activeTab !== 'Documentos' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center min-h-[400px] flex flex-col justify-center items-center h-full">
            <span className="text-gray-400 mb-2"><FileText size={48} /></span>
            <h3 className="text-lg font-medium text-gray-700">Aba em desenvolvimento</h3>
            <p className="text-gray-500 text-sm mt-1">O conteúdo de "{activeTab}" será exibido aqui.</p>
          </div>
        )}
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-800">
                {editingCategory.id === 'new' ? 'Nova Categoria' : 'Editar Categoria'}
              </h3>
              <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Nome da categoria</label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  placeholder="Ex: Urgência"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Cor</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editCatColor}
                    onChange={(e) => setEditCatColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-sm font-medium text-gray-500 uppercase">{editCatColor}</span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {/* Quick color picks */}
                  {['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'].map(c => (
                    <button
                      key={c}
                      onClick={() => setEditCatColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${editCatColor === c ? 'border-gray-800 shadow-md' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
              {editingCategory.id !== 'new' ? (
                <button
                  onClick={() => {
                    setCategories(prev => prev.filter(c => c.id !== editingCategory.id));
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                  Excluir
                </button>
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={!editCatName.trim()}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:shadow-none"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Budget Modal */}
      <ErrorBoundary>
        <NewBudgetModal
          isOpen={isNewBudgetModalOpen}
          onClose={() => { setIsNewBudgetModalOpen(false); setBudgetToEdit(null); }}
          patientName={patient.name}
          proceduresSync={procedures}
          setProceduresSync={setProcedures}
          initialData={budgetToEdit}
          onSave={async (budget) => {
            if (empresaId && patient?.id) {
              const saved = await budgetService.saveBudget(empresaId, Number(patient.id), budget);
              if (saved) {
                setBudgets(prev => {
                  const existIdx = prev.findIndex(b => b.id === saved.id || b.id === budget.id);
                  if (existIdx >= 0) {
                    const copy = [...prev];
                    copy[existIdx] = saved;
                    return copy;
                  }
                  return [saved, ...prev];
                });

                // Auto-create prosthesis cards if not editing an existing budget
                if (!budgetToEdit) {
                  const prosthesisTreatments = saved.treatments.filter((t: any) => 
                    t.treatmentName?.toLowerCase().includes('prótese') || 
                    t.treatmentName?.toLowerCase().includes('protese') ||
                    t.categoria?.toLowerCase().includes('prótese') ||
                    t.categoria?.toLowerCase().includes('protese')
                  );
                  
                  if (prosthesisTreatments.length > 0) {
                    try {
                      const { data: userData } = await supabase.auth.getUser();
                      const userName = userData.user?.email || 'Usuário';

                      for (const t of prosthesisTreatments) {
                        const payload = {
                          empresa_id: empresaId,
                          paciente_id: patient.id.toString(),
                          paciente_nome: patient.name,
                          responsavel_nome: userName,
                          dentes: t.dente ? `${t.dente}${t.faces ? ` - ${t.faces}` : ''}` : '',
                          descricao_servico: t.treatmentName,
                          status: 'Solicitação',
                          updated_at: new Date().toISOString()
                        };

                        const { data: insertedCard } = await supabase
                          .from('protese_solicitacoes')
                          .insert(payload)
                          .select()
                          .single();

                        if (insertedCard) {
                          await supabase.from('protese_historico').insert({
                            empresa_id: empresaId,
                            solicitacao_id: insertedCard.id,
                            status_novo: 'Solicitação',
                            usuario_nome: userName
                          });
                        }
                      }
                    } catch (err) {
                      console.error("Erro ao criar card de prótese automático:", err);
                    }
                  }
                }
              } else {
                alert('Erro ao salvar o orçamento no banco de dados!');
              }
            }
          }}
        />
      </ErrorBoundary>

      <PaymentModal
        isOpen={payingTreatments.length > 0}
        onClose={() => setPayingTreatments([])}
        treatments={payingTreatments}
        patient={patient}
        onProcessPayment={async (payment, isFullyPaid) => {
          if (payingTreatments.length === 0) return;

          let updatedBudgetsMap: any = {};

          payingTreatments.forEach(t => {
            if (!updatedBudgetsMap[t.budget.id]) {
              updatedBudgetsMap[t.budget.id] = { ...t.budget, treatments: [...t.budget.treatments] };
            }
            const bTreatments = updatedBudgetsMap[t.budget.id].treatments;
            const tIdx = bTreatments.findIndex((xt: any) => xt.id === t.id);
            if (tIdx >= 0) {
              const prevPayments = bTreatments[tIdx].payments || [];
              bTreatments[tIdx] = {
                ...bTreatments[tIdx],
                payments: [...prevPayments, payment],
                paymentStatus: isFullyPaid ? 'Pago' : 'Pago parcialmente',
                paymentCancellationReason: null // clearing justify if they pay again
              };
            }
          });

          let lastSaved = null;
          for (const budgetId of Object.keys(updatedBudgetsMap)) {
            const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), updatedBudgetsMap[budgetId]);
            if (saved) {
              setBudgets(prev => prev.map(b => b.id === saved.id ? saved : b));
              lastSaved = saved;
            }
          }

          if (lastSaved) {
            printReceipt(payingTreatments, payment);
            setPayingTreatments([]);
            setSelectedPayments([]);
          }
        }}
      />

      {/* Modal Cancelar Pagamentos em Lote */}
      {cancelingPayments.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-red-50/50">
              <Trash2 size={24} className="text-red-600" />
              <h2 className="text-xl font-bold text-gray-800">Cancelar {cancelingPayments.length > 1 ? `${cancelingPayments.length} pagamentos` : 'pagamento'}</h2>
            </div>
            <div className="p-3 md:p-6">
              <p className="text-gray-600 text-[14px] leading-relaxed mb-4">
                Tem certeza que deseja cancelar {cancelingPayments.length > 1 ? 'os pagamentos selecionados' : 'este pagamento'}?
                Essa ação removerá os registros financeiros e precisará de uma justificativa.
              </p>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Justificativa do Cancelamento <span className="text-red-500">*</span></label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 h-24 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
                placeholder="Motivo obrigatório..."
                value={cancelJustification}
                onChange={(e) => setCancelJustification(e.target.value)}
              ></textarea>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => { setCancelingPayments([]); setCancelJustification(''); }} className="px-5 py-2 text-[14px] font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Voltar
              </button>
              <button
                disabled={!cancelJustification.trim()}
                onClick={async () => {
                  if (!empresaId || !cancelJustification.trim()) return;
                  let newBudgets = [...budgets];
                  for (const t of cancelingPayments) {
                    // For each treatment, we set isPaid false and clear its payments
                    const budgetToUpdate = newBudgets.find(b => b.id === t.budget.id);
                    if (budgetToUpdate) {
                      budgetToUpdate.treatments = budgetToUpdate.treatments.map((x: any) => {
                        if (x.id === t.id) {
                          return {
                            ...x,
                            isPaid: false,
                            paymentStatus: 'Pendente',
                            payments: [],
                            paymentCancellationReason: cancelJustification,
                            paymentCancellationDate: new Date().toISOString()
                          };
                        }
                        return x;
                      });
                      const saved = await budgetService.saveBudget(empresaId, Number(patient.id), budgetToUpdate);
                      if (saved) {
                        newBudgets = newBudgets.map(b => b.id === saved.id ? saved : b);
                      }
                    }
                  }
                  setBudgets(newBudgets);
                  setCancelingPayments([]);
                  setCancelJustification('');
                  setSelectedPayments([]);
                }}
                className="px-5 py-2 bg-red-600 text-white text-[14px] font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Pagamento / Detalhes */}
      <PaymentDetailsModal
        isOpen={!!editingPaymentBudget}
        onClose={() => setEditingPaymentBudget(null)}
        budgetTreatments={editingPaymentBudget?.treatments || []}
        budget={editingPaymentBudget}
        patient={patient}
        onSave={async (updBudget) => {
          if (!empresaId) return;
          const saved = await budgetService.saveBudget(empresaId, Number(patient.id), updBudget);
          if (saved) {
            setBudgets(prev => prev.map(b => b.id === saved.id ? saved : b));
          }
          setEditingPaymentBudget(null);
        }}
      />

      {/* Tarefas Modal */}
      {empresaId && (
        <TarefasModal
          isOpen={isTarefasOpen}
          onClose={() => {
            setIsTarefasOpen(false);
            tarefaService.fetch(empresaId, Number(patient.id)).then(setTarefas);
          }}
          empresaId={empresaId}
          paciente={{ id: patient.id, name: patient.name }}
        />
      )}

      {/* Appointment Modals */}
      {isFetchingEvent && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 font-medium">Buscando detalhes do agendamento no Google Agenda...</p>
          </div>
        </div>
      )}

      <NewAppointmentModal
        isOpen={isApptModalOpen}
        onClose={() => { setIsApptModalOpen(false); setEditingEvent(undefined); }}
        onSave={handleCreateEvent}
        specialists={specialists.filter(spec => spec.name && /Dr\.?|Dra\.?/i.test(spec.name))}
        defaultDate={new Date()}
        initialData={editingEvent}
      />

      <AppointmentDetailsModal
        isOpen={isApptDetailsOpen}
        onClose={() => setIsApptDetailsOpen(false)}
        event={selectedEvent}
        specialistName={
          specialists.find(s => s.calendarId === selectedEvent?.calendarId || s.id === selectedEvent?.calendarId)?.name || 'Clínica'
        }
        onEdit={handleEditAppt}
        onDelete={handleDeleteEvent}
      />

    </div>
  );
};
