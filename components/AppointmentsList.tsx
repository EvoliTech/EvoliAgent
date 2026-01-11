
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
    Trash2
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { userService } from '../services/userService';
import { specialistService } from '../services/specialistService';
import { googleCalendarService, GoogleEvent } from '../services/googleCalendarService';
import { Specialist } from '../types';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { NewAppointmentModal } from './NewAppointmentModal';

export const AppointmentsList: React.FC = () => {
    const { empresaId } = useCompany();
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const [specialists, setSpecialists] = useState<Specialist[]>([]);
    const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('all');
    const [events, setEvents] = useState<GoogleEvent[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(false);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
    const [editingEvent, setEditingEvent] = useState<GoogleEvent | undefined>(undefined);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

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
    }, [currentDate, adminEmail, selectedSpecialistId]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const email = await userService.getConnectedGoogleEmail(empresaId!);
            setAdminEmail(email);

            const specialistList = await specialistService.fetchSpecialists(empresaId!);
            setSpecialists(specialistList);
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
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

            setEvents(allEvents);
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (eventData: any) => {
        if (!adminEmail || !empresaId) return;
        const { calendarId, id, ...googleEventData } = eventData;
        try {
            if (id) {
                await googleCalendarService.updateEvent(empresaId, adminEmail, id, googleEventData, calendarId);
            } else {
                await googleCalendarService.createEvent(empresaId, adminEmail, googleEventData, calendarId);
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
            const tags = ['[PENDENTE]', '[CONFIRMADO]', '[CONCLUIDO]', '[CONCLUÍDO]', '[CANCELADO]'];
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

    const isToday = (date: Date) => date.toDateString() === today.toDateString();
    const isSelected = (date: Date) => date.toDateString() === currentDate.toDateString();

    const getDayName = (date: Date) => {
        return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
    };

    const getStatusInfo = (summary: string) => {
        const s = summary.toLowerCase();
        if (s.includes('confirmado')) return { id: 'confirmado', label: 'CONFIRMADO', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 };
        if (s.includes('concluido') || s.includes('concluído')) return { id: 'concluido', label: 'CONCLUÍDO', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 };
        if (s.includes('cancelado')) return { id: 'cancelado', label: 'CANCELADO', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle };
        return { id: 'pendente', label: 'PENDENTE', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock3 };
    };

    const scrollToSelected = () => {
        // Simple scrolling logic if needed
    };

    return (
        <div className="flex flex-col h-full bg-white transition-all duration-500 animate-in fade-in">

            {/* Header */}
            <header className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Agendamentos do Dia</h1>
                    <p className="text-sm text-slate-500">Gerencie os compromissos em formato de lista</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={selectedSpecialistId}
                            onChange={(e) => setSelectedSpecialistId(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 appearance-none min-w-[200px]"
                        >
                            <option value="all">Todos Especialistas</option>
                            {specialists.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Novo
                    </button>
                </div>
            </header>

            {/* Date Selector */}
            <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30">
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
                  flex flex-col items-center justify-center min-w-[70px] py-3 px-2 rounded-2xl transition-all
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
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 bg-gray-50/30">
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
                    events.map((event) => {
                        const startTime = event.start.dateTime ? new Date(event.start.dateTime) : null;
                        const endTime = event.end.dateTime ? new Date(event.end.dateTime) : null;
                        const status = getStatusInfo(event.summary);
                        const StatusIcon = status.icon;

                        // Extract info (same as AppointmentDetailsModal)
                        const getField = (text: string | undefined, label: string) => {
                            if (!text) return '';
                            const lines = text.split('\n');
                            const line = lines.find(l => l.startsWith(label));
                            return line ? line.replace(label, '').trim() : '';
                        };

                        const patientName = getField(event.description, 'Paciente:') || event.summary.split(' - Paciente:')[1] || event.summary;
                        const patientRaw = event.summary.includes(' - Paciente:') ? event.summary.split(' - Paciente:')[1].trim() : event.summary;
                        const specialist = specialists.find(s => s.calendarId === event.calendarId || s.id === event.calendarId);

                        return (
                            <div
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="group bg-white rounded-3xl border border-gray-100 p-6 flex gap-8 items-center cursor-pointer hover:shadow-xl hover:shadow-gray-100 transition-all active:scale-[0.99]"
                            >
                                {/* Time Section */}
                                <div className="w-32 flex flex-col items-center justify-center border-r border-gray-100 px-4">
                                    <span className="text-2xl font-black text-slate-800">
                                        {startTime ? startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Dia'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 mb-2">
                                        {endTime ? endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Todo'}
                                    </span>
                                    <div className="relative group/status">
                                        <select
                                            value={status.id}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleStatusUpdate(event, e.target.value)}
                                            className={`
                        appearance-none pl-6 pr-2 py-1 rounded-lg text-[9px] font-black border outline-none cursor-pointer transition-all
                        ${status.color} hover:shadow-sm
                      `}
                                        >
                                            <option value="pendente">PENDENTE</option>
                                            <option value="confirmado">CONFIRMADO</option>
                                            <option value="concluido">CONCLUÍDO</option>
                                        </select>
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <StatusIcon size={10} />
                                        </div>
                                    </div>
                                </div>

                                {/* Patient & Details */}
                                <div className="flex-1 flex flex-col gap-2">
                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                        {patientRaw}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${specialist?.color.split(' ')[0] || 'bg-blue-500'}`}></div>
                                            <span className="text-sm font-bold text-slate-600">{specialist?.name || 'Clínica'}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                            <Clock size={14} />
                                            <span className="text-xs font-bold">Retorno</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === event.id ? null : (event.id || null));
                                        }}
                                        className={`p-2 rounded-full transition-all ${activeMenuId === event.id ? 'bg-slate-100 text-slate-800' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        <MoreVertical size={20} />
                                    </button>

                                    {activeMenuId === event.id && (
                                        <>
                                            {/* Overlay invisível para fechar o menu ao clicar fora */}
                                            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}></div>

                                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(null);
                                                        setEditingEvent(event);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                        <Pencil size={16} />
                                                    </div>
                                                    <span className="font-bold">Editar agendamento</span>
                                                </button>

                                                <div className="h-px bg-gray-100 mx-2 my-1"></div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(null);
                                                        handleDeleteEvent(event);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                                                        <Trash2 size={16} />
                                                    </div>
                                                    <span className="font-bold">Excluir agendamento</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {/* Decorative Pill */}
                                <div className={`w-1.5 h-16 rounded-full ${specialist?.color.split(' ')[0] || 'bg-blue-100'} opacity-30 shadow-sm`}></div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modals */}
            <NewAppointmentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingEvent(undefined); }}
                onSave={handleCreateEvent}
                specialists={specialists.filter(spec => spec.name && /Dr\.?|Dra\.?/i.test(spec.name))}
                defaultDate={currentDate}
                initialData={editingEvent}
            />

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
        </div>
    );
};
