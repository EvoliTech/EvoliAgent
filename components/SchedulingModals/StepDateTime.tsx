import React, { useState, useEffect } from 'react';
import { Specialist } from '../../types';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { companyService } from '../../services/companyService';
import { supabase } from '../../lib/supabase';

interface StepDateTimeProps {
    date: Date;
    time: string;
    duration: number;
    professional?: Specialist;
    onChangeDate: (d: Date) => void;
    onChangeTime: (t: string) => void;
    onChangeDuration: (d: number) => void;
    onNext: () => void;
}

export const StepDateTime: React.FC<StepDateTimeProps> = ({ 
    date, 
    time, 
    duration, 
    professional, 
    onChangeDate, 
    onChangeTime, 
    onChangeDuration, 
    onNext 
}) => {
    const { empresaId } = useCompany();
    const [timeOptions, setTimeOptions] = useState<string[]>([]);
    const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);

    useEffect(() => {
        const generateFallback = () => {
            const options = [];
            for (let h = 7; h <= 22; h++) {
                for (let m = 0; m < 60; m += 15) {
                    options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                }
            }
            return options;
        };

        if (!empresaId) return;
        companyService.fetchCompany(empresaId).then(data => {
            const diasFuncionamento = data?.configuracoes?.dias_funcionamento;
            if (diasFuncionamento) {
                const dayIndex = date.getDay();
                const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                const dayName = dayNames[dayIndex];
                
                const dayConfig = diasFuncionamento.find((d: any) => d.dia === dayName);

                if (dayConfig && dayConfig.aberto) {
                    const [startH, startM] = dayConfig.inicio.split(':').map(Number);
                    const [endH, endM] = dayConfig.fim.split(':').map(Number);

                    const options = [];
                    for (let h = startH; h <= endH; h++) {
                        for (let m = 0; m < 60; m += 15) {
                            if (h === startH && m < startM) continue;
                            if (h === endH && m > endM) continue;
                            
                            const hh = h.toString().padStart(2, '0');
                            const mm = m.toString().padStart(2, '0');
                            options.push(`${hh}:${mm}`);
                        }
                    }
                    setTimeOptions(options.length ? options : generateFallback());
                } else {
                    // Closed day
                    setTimeOptions([]);
                }
            } else {
                setTimeOptions(generateFallback());
            }
        }).catch(err => {
            console.error("Failed to load company hours", err);
            setTimeOptions(generateFallback());
        });
    }, [empresaId, date]);

    useEffect(() => {
        const fetchUnavailable = async () => {
            if (!empresaId || !professional) {
                setUnavailableSlots([]);
                return;
            }
            const startOfDay = new Date(date);
            startOfDay.setHours(0,0,0,0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23,59,59,999);

            const { data } = await supabase
                .from('agendamentos')
                .select('data_inicio, data_fim, status')
                .eq('IDEmpresa', empresaId)
                .eq('calendar_id', professional.calendarId || professional.id)
                .gte('data_inicio', startOfDay.toISOString())
                .lte('data_inicio', endOfDay.toISOString());
            
            if (data) {
                const occupied: string[] = [];
                data.forEach(appt => {
                    if (appt.status === 'cancelled') return;
                    const s = new Date(appt.data_inicio);
                    const e = new Date(appt.data_fim);
                    let current = new Date(s);
                    while (current < e) {
                        const h = current.getHours().toString().padStart(2, '0');
                        const m = current.getMinutes().toString().padStart(2, '0');
                        occupied.push(`${h}:${m}`);
                        current = new Date(current.getTime() + 15 * 60000);
                    }
                });
                setUnavailableSlots(occupied);
            } else {
                setUnavailableSlots([]);
            }
        };
        fetchUnavailable();
    }, [empresaId, professional, date]);

    // Simple calendar logic just for the sake of the wizard (mocking full calendar layout from image)
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    
    const daysArray = Array.from({ length: 42 }, (_, i) => {
        const dayNumber = i - firstDayOfMonth + 1;
        if (dayNumber > 0 && dayNumber <= daysInMonth) return dayNumber;
        return null;
    });

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const handleDayClick = (day: number) => {
        const newDate = new Date(date);
        newDate.setDate(day);
        onChangeDate(newDate);
    };

    return (
        <div className="w-full max-w-md mx-auto flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Escolher Data</h3>
            
            <div className="flex items-center gap-6 mb-6 border-b border-gray-200">
                <button className="pb-3 border-b-2 border-blue-600 text-blue-600 font-bold text-sm">Agenda</button>
                <button className="pb-3 text-slate-500 font-bold text-sm">Livres</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-2">
                
                {/* Calendário */}
                <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-blue-900">{monthNames[date.getMonth()]} {date.getFullYear()}</span>
                        <div className="flex gap-2">
                            <button className="p-1 rounded text-slate-400 hover:bg-slate-100" onClick={() => {
                                const newDate = new Date(date);
                                newDate.setMonth(date.getMonth() - 1);
                                onChangeDate(newDate);
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <button className="p-1 rounded text-slate-400 hover:bg-slate-100" onClick={() => {
                                const newDate = new Date(date);
                                newDate.setMonth(date.getMonth() + 1);
                                onChangeDate(newDate);
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-400 mb-1">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
                    </div>

                    <div className="grid grid-cols-7 text-center text-sm font-medium text-slate-700">
                        {daysArray.map((d, i) => (
                            <div key={i} className="flex items-center justify-center">
                                {d && (
                                    <button 
                                        onClick={() => handleDayClick(d)}
                                        className={`w-6 h-6 text-xs rounded-full flex items-center justify-center transition-all ${
                                            date.getDate() === d 
                                                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-200' 
                                                : 'hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                    >
                                        {d}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Seleção de Horário */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Horário</label>
                        <div className="relative">
                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={time}
                                onChange={e => onChangeTime(e.target.value)}
                                className="w-full rounded-xl border-gray-200 border pl-10 pr-3 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm outline-none appearance-none"
                            >
                                {timeOptions.length > 0 ? timeOptions.map(t => {
                                    const isDisabled = unavailableSlots.includes(t);
                                    return (
                                        <option key={t} value={t} disabled={isDisabled} className={isDisabled ? "text-gray-300" : ""}>
                                            {t} {isDisabled && '(Indisponível)'}
                                        </option>
                                    );
                                }) : (
                                    <option value="">Fechado</option>
                                )}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Duração</label>
                        <div className="relative">
                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={duration}
                                onChange={e => onChangeDuration(Number(e.target.value))}
                                className="w-full rounded-xl border-gray-200 border pl-10 pr-3 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm outline-none appearance-none"
                            >
                                <option value={15}>15 Min</option>
                                <option value={30}>30 Min</option>
                                <option value={45}>45 Min</option>
                                <option value={60}>1 Hora</option>
                                <option value={90}>1h 30m</option>
                                <option value={120}>2 Horas</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6 flex flex-col gap-4">
                <button 
                    onClick={onNext}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    Avançar
                </button>
            </div>
        </div>
    );
};
