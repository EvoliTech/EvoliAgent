
import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Filter,
    MoreVertical,
    Calendar as CalendarIcon,
    Clock,
    User,
    RefreshCw,
    Search,
    CheckCircle2,
    Clock3,
    AlertCircle,
    Pencil,
    Trash2,
    ChevronDown
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { userService } from '../services/userService';
import { specialistService } from '../services/specialistService';
import { googleCalendarService, GoogleEvent } from '../services/googleCalendarService';
import { Specialist, Patient } from '../types';
import { patientService } from '../services/patientService';
import { useNavigate } from 'react-router-dom';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { FluidAppointmentWizard } from './SchedulingModals/FluidAppointmentWizard';

export const AppointmentsList: React.FC = () => {
    const { empresaId } = useCompany();
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const [specialists, setSpecialists] = useState<Specialist[]>([]);
    const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('all');
    const [events, setEvents] = useState<GoogleEvent[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
    const [editingEvent, setEditingEvent] = useState<GoogleEvent | undefined>(undefined);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [timeoutAlertEvent, setTimeoutAlertEvent] = useState<GoogleEvent | null>(null);
    const [snoozedEvents, setSnoozedEvents] = useState<{ [key: string]: number }>({});

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (empresaId) {
            loadInitialData();
        }
    }, [empresaId]);

    useEffect(() => {
        if (adminEmail) {
            loadEvents();
        }
    }, [currentDate, adminEmail, selectedSpecialistId, specialists]);

    const loadInitialData = async () => {
        try {
            const [email, specialistList, patientList] = await Promise.all([
                userService.getConnectedGoogleEmail(empresaId!),
                specialistService.fetchSpecialists(empresaId!),
                patientService.fetchPatients(empresaId!)
            ]);

            setSpecialists(specialistList);
            setPatients(patientList);
            setAdminEmail(email);

            if (!email) {
                setLoading(false);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            setLoading(false);
        }
    };

    const loadEvents = async () => {
        if (!adminEmail) return;
        try {
            setLoading(true);

            const start = new Date(currentDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(currentDate);
            end.setHours(23, 59, 59, 999);

            let calendarIds: string[] = [];
            if (selectedSpecialistId === 'all') {
                calendarIds = specialists
                    .map(s => s.calendarId || s.id)
                    .filter(Boolean) as string[];
            } else {
                const spec = specialists.find(s => s.id === selectedSpecialistId || s.calendarId === selectedSpecialistId);
                if (spec) {
                    calendarIds = [spec.calendarId || spec.id];
                }
            }

            const promises = calendarIds
                .filter(id => id && (id.includes('@') || id === 'primary'))
                .map(async (calId) => {
                    try {
                        const results = await googleCalendarService.listEvents(empresaId!, adminEmail, start, end, calId);
                        return results.map(e => ({ ...e, calendarId: calId }));
                    } catch (e) {
                        return [];
                    }
                });

            const results = await Promise.all(promises);
            const allEvents = results.flat().sort((a, b) => {
                const timeA = new Date(a.start.dateTime || a.start.date || 0).getTime();
                const timeB = new Date(b.start.dateTime || b.start.date || 0).getTime();
                return timeA - timeB;
            });

            // Buscar mapeamento de cliente_id no banco para os eventos retornados
            const eventIds = allEvents.map(e => e.id).filter(Boolean);
            if (eventIds.length > 0) {
                const { data: dbAgendamentos } = await supabase
                    .from('agendamentos')
                    .select('google_event_id, cliente_id')
                    .in('google_event_id', eventIds)
                    .eq('IDEmpresa', empresaId);

                if (dbAgendamentos && dbAgendamentos.length > 0) {
                    const idMap = new Map(dbAgendamentos.map(a => [a.google_event_id, a.cliente_id]));
                    allEvents.forEach(ev => {
                        if (ev.id && idMap.has(ev.id)) {
                            (ev as any).cliente_id = idMap.get(ev.id);
                        }
                    });
                }
            }

            setEvents(allEvents);
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (eventData: any) => {
        if (!adminEmail || !empresaId) return;
        const { calendarId, id, cliente_id, ...googleEventData } = eventData;
        try {
            if (id) {
                await googleCalendarService.updateEvent(empresaId, adminEmail, id, googleEventData, calendarId, cliente_id);
            } else {
                await googleCalendarService.createEvent(empresaId, adminEmail, googleEventData, calendarId, cliente_id);
            }
            loadEvents();
            setEditingEvent(undefined);
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        }
    };

    const handleEventClick = (event: GoogleEvent) => {
        setSelectedEvent(event);
        setIsDetailsOpen(true);
    };

    const handleDeleteEvent = async (event: GoogleEvent) => {
        if (!adminEmail || !empresaId) return;
        if (confirm('Tem certeza que deseja excluir?')) {
            try {
                await googleCalendarService.deleteEvent(empresaId, adminEmail, event.id!, event.calendarId);
                setIsDetailsOpen(false);
                loadEvents();
            } catch (error: any) {
                alert('Erro ao excluir: ' + error.message);
            }
        }
    };

    // Date array for horizontal selector (Today +/- 7 days)
    const days = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 1); // Start from yesterday for context

    for (let i = 0; i < 14; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        days.push(d);
    }

    const handleStatusUpdate = async (event: GoogleEvent, newStatus: string) => {
        if (!adminEmail || !empresaId || !event.id) return;

        setLoading(true);
        try {
            // Clean tags
            const tags = ['[PENDENTE]', '[CONFIRMADO]', '[CONCLUIDO]', '[CONCLUÍDO]', '[CANCELADO]', '[EM ATENDIMENTO]'];
            let cleanSummary = event.summary;
            tags.forEach(tag => {
                cleanSummary = cleanSummary.replace(tag, '').trim();
            });

            const updatedSummary = `[${newStatus.toUpperCase()}] ${cleanSummary}`;

            await googleCalendarService.updateEvent(empresaId, adminEmail, event.id, {
                ...event,
                summary: updatedSummary,
            }, event.calendarId);

            await loadEvents();
        } catch (error: any) {
            alert('Erro ao atualizar status: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePresenceUpdate = async (event: GoogleEvent, newPresence: string) => {
        if (!adminEmail || !empresaId || !event.id) return;
        setLoading(true);
        try {
            const tags = ['[CHECKOUT]', '[MISSED]'];
            let cleanSummary = event.summary;
            tags.forEach(tag => {
                cleanSummary = cleanSummary.replace(tag, '').trim();
            });

            const updatedSummary = newPresence ? `[${newPresence.toUpperCase()}] ${cleanSummary}` : cleanSummary;

            await googleCalendarService.updateEvent(empresaId, adminEmail, event.id, {
                ...event,
                summary: updatedSummary,
            }, event.calendarId);

            await loadEvents();
        } catch (error: any) {
            alert('Erro ao atualizar chegada: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Monitoramento de tempo limite para eventos EM ATENDIMENTO
    useEffect(() => {
        const checkTimeouts = () => {
            const now = new Date();
            const emAtendimentoEvents = events.filter(e => e.summary.toLowerCase().includes('[em atendimento]'));
            
            for (const event of emAtendimentoEvents) {
                if (event.end && event.end.dateTime && event.id) {
                    const endTime = new Date(event.end.dateTime);
                    
                    const snoozedUntil = snoozedEvents[event.id];
                    if (snoozedUntil && now.getTime() < snoozedUntil) {
                        continue;
                    }

                    // Se o horário de término já passou e não tem alerta aberto
                    if (now > endTime && !timeoutAlertEvent) {
                        setTimeoutAlertEvent(event);
                        break; // Mostra um por vez
                    }
                }
            }
        };

        const interval = setInterval(checkTimeouts, 60000); // Checa a cada minuto
        checkTimeouts(); // Checa na primeira vez também

        return () => clearInterval(interval);
    }, [events, timeoutAlertEvent, snoozedEvents]);

    const isToday = (date: Date) => date.toDateString() === today.toDateString();
    const isSelected = (date: Date) => date.toDateString() === currentDate.toDateString();

    const getDayName = (date: Date) => {
        return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
    };

    const getStatusInfo = (summary: string) => {
        const s = summary.toLowerCase();
        if (s.includes('em atendimento')) return { id: 'em atendimento', label: 'EM ATEND.', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Clock };
        if (s.includes('confirmado')) return { id: 'confirmado', label: 'CONFIRMADO', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 };
        if (s.includes('concluido') || s.includes('concluído')) return { id: 'concluido', label: 'CONCLUÍDO', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 };
        if (s.includes('cancelado')) return { id: 'cancelado', label: 'CANCELADO', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle };
        return { id: 'pendente', label: 'AGENDADO', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock3 }; // Modificado para AGENDADO conforme imagem
    };

    const getPresenceInfo = (summary: string) => {
        const s = summary.toLowerCase();
        if (s.includes('[checkout]')) return 'checkout';
        if (s.includes('[missed]')) return 'missed';
        return '';
    };

    const getPresenceStyle = (presence: string) => {
        if (presence === 'checkout') return { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 };
        if (presence === 'missed') return { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle };
        return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock3 }; 
    };

    const scrollToSelected = () => {
        // Simple scrolling logic if needed
    };

    return (
        <div className="flex flex-col h-full bg-white transition-all duration-500 animate-in fade-in">
            {isModalOpen ? (
                <div className="flex-1 overflow-hidden h-full">
                    <FluidAppointmentWizard
                        isOpen={isModalOpen}
                        onClose={() => { setIsModalOpen(false); setEditingEvent(undefined); }}
                        onSave={handleCreateEvent}
                        specialists={specialists.filter(spec => spec.name && /Dr\.?|Dra\.?/i.test(spec.name))}
                        defaultDate={currentDate}
                        initialData={editingEvent}
                    />
                </div>
            ) : (
                <>
                    {/* Header */}
                    <header className="px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Agendamentos do Dia</h1>
                    <p className="text-sm text-slate-500">Gerencie os compromissos em formato de lista</p>
                </div>

                <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={selectedSpecialistId}
                            onChange={(e) => setSelectedSpecialistId(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 appearance-none min-w-0 md:min-w-[200px] flex-1 md:flex-auto"
                        >
                            <option value="all">Todos Especialistas</option>
                            {specialists.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 shrink-0"
                    >
                        <Plus size={20} />
                        Novo
                    </button>
                </div>
            </header>

            {/* Date Selector */}
            <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 hover:shadow-sm" onClick={() => {
                        const d = new Date(currentDate);
                        d.setDate(d.getDate() - 1);
                        setCurrentDate(d);
                    }}>
                        <ChevronLeft size={20} />
                    </button>

                    <div ref={scrollContainerRef} className="flex-1 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth px-2">
                        {days.map((date, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentDate(new Date(date))}
                                className={`
                  flex flex-col items-center justify-center min-w-[56px] md:min-w-[70px] py-2 md:py-3 px-1.5 md:px-2 rounded-2xl transition-all
                  ${isSelected(date)
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                                        : 'bg-white border border-gray-100 text-slate-400 hover:border-blue-300 hover:text-blue-500'
                                    }
                `}
                            >
                                <span className="text-[10px] font-bold uppercase tracking-wider">{getDayName(date)}</span>
                                <span className="text-xl font-black">{date.getDate()}</span>
                                {isToday(date) && (
                                    <span className={`text-[9px] mt-1 font-bold ${isSelected(date) ? 'text-blue-100' : 'text-blue-600'}`}>Hoje</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <button className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 hover:shadow-sm" onClick={() => {
                        const d = new Date(currentDate);
                        d.setDate(d.getDate() + 1);
                        setCurrentDate(d);
                    }}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Appointment List */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6 space-y-3 md:space-y-4 bg-gray-50/30">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <RefreshCw className="animate-spin" size={32} />
                        <p className="font-medium">Carregando agendamentos...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4 bg-white rounded-3xl border border-dashed border-slate-200">
                        <CalendarIcon size={48} className="opacity-20" />
                        <div className="text-center">
                            <p className="font-bold text-slate-600 text-lg">Nenhum agendamento para hoje</p>
                            <p className="text-sm">Que tal aproveitar para organizar a semana?</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-blue-600 font-bold border-2 border-blue-600 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                        >
                            Agendar agora
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm">
                        <div className="overflow-x-auto pb-24">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">Horário</th>
                                        <th className="px-6 py-4">Paciente</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Compromisso</th>
                                        <th className="px-6 py-4">Observações</th>
                                        <th className="px-6 py-4 text-center">Chegada</th>
                                        <th className="px-6 py-4 text-center">Pagamento</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((event) => {
                                        const startTime = event.start.dateTime ? new Date(event.start.dateTime) : null;
                                        const endTime = event.end.dateTime ? new Date(event.end.dateTime) : null;
                                        const status = getStatusInfo(event.summary);
                                        const StatusIcon = status.icon;

                                        // Extract info
                                        const getField = (text: string | undefined, label: string) => {
                                            if (!text) return '';
                                            const lines = text.split('\n');
                                            const line = lines.find(l => l.startsWith(label));
                                            return line ? line.replace(label, '').trim() : '';
                                        };

                                        // Try to find patient by mapped cliente_id first
                                        const clienteId = (event as any).cliente_id;
                                        let foundPatient = clienteId ? patients.find(p => p.id === Number(clienteId)) : undefined;
                                        
                                        let patientName = foundPatient?.name || getField(event.description, 'Paciente:') || 
                                                            (event.summary.includes(' - Paciente:') ? event.summary.split(' - Paciente:')[1].trim() : event.summary.replace(/\[.*?\]/g, '').trim());
                                        
                                        if (!foundPatient) {
                                            foundPatient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
                                        }

                                        const specialist = specialists.find(s => s.calendarId === event.calendarId || s.id === event.calendarId);
                                        
                                        // Legacy import type fallback
                                        let type = getField(event.description, 'Tipo:');
                                        if (!type && event.summary.toUpperCase().includes('IMPORTAÇÃO DE SISTEMA LEGADO')) {
                                            type = 'IMPORTAÇÃO';
                                        }

                                        const obs = getField(event.description, 'Obs:');
                                        
                                        const isAgendado = status.id === 'confirmado' || status.id === 'pendente'; 
                                        const isEmAtendimento = status.id === 'em atendimento';
                                        const isConcluido = status.id === 'concluido';
                                        const presence = getPresenceInfo(event.summary);
                                        const PresenceIcon = getPresenceStyle(presence).icon;

                                        return (
                                            <tr 
                                                key={event.id}
                                                onClick={() => handleEventClick(event)}
                                                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors group relative"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 text-sm">
                                                            {startTime ? startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Dia'}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium mt-1">
                                                            {endTime ? endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Todo'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} className="text-slate-400 shrink-0" />
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (foundPatient) {
                                                                    navigate(`/pacientes/${foundPatient.id}/visao-geral`);
                                                                } else {
                                                                    navigate('/pacientes');
                                                                }
                                                            }}
                                                            className="font-bold text-slate-700 hover:text-blue-600 text-sm max-w-[180px] truncate hover:underline text-left cursor-pointer"
                                                        >
                                                            {patientName}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap align-middle">
                                                    <div className="relative group/status w-[130px]" onClick={(e) => e.stopPropagation()}>
                                                        <select
                                                            value={status.id}
                                                            onChange={(e) => handleStatusUpdate(event, e.target.value)}
                                                            className={`
                                                                appearance-none pl-7 pr-6 py-1.5 rounded-full text-[10px] font-black border outline-none cursor-pointer transition-all uppercase tracking-wider w-full
                                                                ${status.color} hover:shadow-sm
                                                            `}
                                                        >
                                                            <option value="pendente">AGENDADO</option>
                                                            <option value="confirmado">CONFIRMADO</option>
                                                            <option value="em atendimento">EM ATENDIMENTO</option>
                                                            <option value="concluido">CONCLUÍDO</option>
                                                            <option value="cancelado">CANCELADO</option>
                                                        </select>
                                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <StatusIcon size={12} />
                                                        </div>
                                                        <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{type && type !== '-' ? type : 'ATENDIMENTO'}</span>
                                                        <span className="text-xs font-medium text-slate-500 mt-0.5">{specialist?.name || 'Clínica'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <span className="text-sm text-slate-500 line-clamp-2 max-w-[150px]" title={obs !== '-' ? obs : ''}>
                                                        {obs !== '-' ? obs : ''}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap align-middle">
                                                    <div className="relative group/status w-[110px] mx-auto" onClick={(e) => e.stopPropagation()}>
                                                        <select
                                                            value={presence}
                                                            onChange={(e) => handlePresenceUpdate(event, e.target.value)}
                                                            className={`
                                                                appearance-none pl-7 pr-6 py-1.5 rounded-full text-[10px] font-black border outline-none cursor-pointer transition-all uppercase tracking-wider w-full
                                                                ${getPresenceStyle(presence).color} hover:shadow-sm
                                                            `}
                                                        >
                                                            <option value="">PENDENTE</option>
                                                            <option value="checkout">PRESENTE</option>
                                                            <option value="missed">FALTOU</option>
                                                        </select>
                                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <PresenceIcon size={12} />
                                                        </div>
                                                        <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap align-middle">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (foundPatient) {
                                                                navigate(`/pacientes/${foundPatient.id}/pagamentos`);
                                                            } else {
                                                                navigate('/pacientes');
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-slate-50 rounded-full transition-colors cursor-pointer inline-flex items-center justify-center group/pay"
                                                        title="Ir para Pagamentos"
                                                    >
                                                        <span className="text-red-500 font-bold group-hover/pay:scale-110 transition-transform">$</span>
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap align-middle">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {(isAgendado || isEmAtendimento || isConcluido) && (
                                                            <button 
                                                                disabled={isConcluido}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isConcluido) return;

                                                                    if (presence !== 'checkout') {
                                                                        alert('É necessário marcar a Chegada como PRESENTE antes de iniciar ou finalizar o atendimento.');
                                                                        return;
                                                                    }

                                                                    if (isAgendado) {
                                                                        if (endTime && new Date() > endTime) {
                                                                            if(confirm("O horário previsto para este agendamento já encerrou. Deseja apenas marcá-lo como CONCLUÍDO? (Cancelará a navegação ao prontuário)")) {
                                                                                handleStatusUpdate(event, 'concluido');
                                                                                return;
                                                                            } else if (!confirm("Deseja iniciar o atendimento mesmo com o horário esgotado?")) {
                                                                                return;
                                                                            }
                                                                        }

                                                                        handleStatusUpdate(event, 'em atendimento');
                                                                        if (foundPatient) {
                                                                            navigate(`/pacientes/${foundPatient.id}/tratamentos`);
                                                                        } else {
                                                                            navigate('/pacientes');
                                                                        }
                                                                    } else if (isEmAtendimento) {
                                                                        handleStatusUpdate(event, 'concluido');
                                                                    }
                                                                }}
                                                                className={`px-4 py-2 border-2 font-bold rounded-full text-xs transition-colors flex items-center gap-1 ${
                                                                    isConcluido
                                                                    ? 'border-gray-300 text-gray-500 cursor-not-allowed opacity-70 bg-gray-50'
                                                                    : isAgendado 
                                                                    ? 'border-blue-600 text-blue-600 hover:bg-blue-50' 
                                                                    : 'border-green-600 text-green-600 hover:bg-green-50'
                                                                }`}
                                                            >
                                                                {isConcluido ? 'FINALIZADO' : isAgendado ? 'ATENDER' : 'FINALIZAR'} {!isConcluido && <ChevronRight size={14} />}
                                                            </button>
                                                        )}
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveMenuId(activeMenuId === event.id ? null : (event.id || null));
                                                                }}
                                                                className={`p-1.5 rounded-full transition-colors ${activeMenuId === event.id ? 'bg-slate-100 text-slate-800' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}`}
                                                            >
                                                                <MoreVertical size={16} />
                                                            </button>
                                                            {activeMenuId === event.id && (
                                                                <>
                                                                    <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}></div>
                                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveMenuId(null);
                                                                                setEditingEvent(event);
                                                                                setIsModalOpen(true);
                                                                            }}
                                                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                        >
                                                                            <Pencil size={14} /> <span className="font-medium">Editar</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveMenuId(null);
                                                                                handleDeleteEvent(event);
                                                                            }}
                                                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                        >
                                                                            <Trash2 size={14} /> <span className="font-medium">Excluir</span>
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Indicador de cor do especialista */}
                                                <td className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full" style={{ backgroundColor: specialist?.color?.split(' ')[0]?.replace('bg-', '') || '#3b82f6' }}></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

                </>
            )}

            <AppointmentDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                event={selectedEvent}
                specialistName={
                    specialists.find(s => s.calendarId === selectedEvent?.calendarId || s.id === selectedEvent?.calendarId)?.name || 'Clínica'
                }
                onEdit={(ev) => {
                    setIsDetailsOpen(false);
                    setEditingEvent(ev);
                    setIsModalOpen(true);
                }}
                onDelete={handleDeleteEvent}
            />

            {/* Modal de Alerta de Tempo Limite */}
            {timeoutAlertEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
                        <div className="text-center mb-6">
                            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-3">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Tempo Esgotado</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                O atendimento de <span className="font-bold text-slate-700">{timeoutAlertEvent.summary.replace('[EM ATENDIMENTO]', '').trim()}</span> já passou do horário previsto de encerramento.
                            </p>
                            <p className="text-sm text-slate-600 mt-4 font-medium">O atendimento já foi encerrado ou ainda está em atendimento?</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    if (!timeoutAlertEvent?.id) return;
                                    const eventToUpdate = timeoutAlertEvent;
                                    setSnoozedEvents(prev => ({ ...prev, [eventToUpdate.id!]: Date.now() + 60000 }));
                                    setTimeoutAlertEvent(null);
                                    handleStatusUpdate(eventToUpdate, 'concluido');
                                }}
                                className="w-full px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                            >
                                Sim, já foi encerrado
                            </button>
                            <button
                                onClick={() => {
                                    if (!timeoutAlertEvent?.id || !timeoutAlertEvent.end?.dateTime) return;
                                    const eventToUpdate = timeoutAlertEvent;
                                    
                                    // Snooze local temporário apenas para evitar reabertura enquanto salva na nuvem
                                    setSnoozedEvents(prev => ({ ...prev, [eventToUpdate.id!]: Date.now() + 60000 }));
                                    setTimeoutAlertEvent(null);
                                    
                                    // Estende o horário do evento em 10 minutos na nuvem (Google Calendar)
                                    setLoading(true);
                                    const newEndTime = new Date(new Date(eventToUpdate.end.dateTime).getTime() + 10 * 60000);
                                    googleCalendarService.updateEvent(empresaId!, adminEmail!, eventToUpdate.id, {
                                        ...eventToUpdate,
                                        end: {
                                            ...eventToUpdate.end,
                                            dateTime: newEndTime.toISOString()
                                        }
                                    }, eventToUpdate.calendarId).then(() => {
                                        loadEvents();
                                    }).catch((error: any) => {
                                        alert('Erro ao estender horário na nuvem: ' + error.message);
                                        setLoading(false);
                                    });
                                }}
                                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                            >
                                Ainda está em atendimento (+10 min)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
