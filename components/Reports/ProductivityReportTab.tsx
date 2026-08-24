import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, Calendar, Users, XCircle, CheckCircle2, TrendingDown, Stethoscope } from 'lucide-react';
import { Specialist } from '../../types';
import { googleCalendarService, GoogleEvent } from '../../services/googleCalendarService';
import { userService } from '../../services/userService';
import { specialistService } from '../../services/specialistService';

export const ProductivityReportTab: React.FC = () => {
  const { empresaId } = useCompany();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load specialists and adminEmail
  useEffect(() => {
    const loadContext = async () => {
      if (!empresaId) return;
      try {
        const [email, specs] = await Promise.all([
          userService.getConnectedGoogleEmail(empresaId),
          specialistService.fetchSpecialists(empresaId)
        ]);
        setAdminEmail(email);
        setSpecialists(specs);
      } catch (err) {
        console.error('Error loading context:', err);
      }
    };
    loadContext();
  }, [empresaId]);

  // Load data for period
  useEffect(() => {
    const loadData = async () => {
      if (!empresaId || !startDate || !endDate) return;
      
      const maxDays = differenceInDays(new Date(endDate), new Date(startDate));
      if (maxDays > 60) {
        // Prevent fetching too much data from Google API at once
        alert("Para o relatório de produtividade, por favor selecione um período máximo de 60 dias.");
        return;
      }

      setLoading(true);
      try {
        const start = new Date(startDate);
        const timezoneOffset = start.getTimezoneOffset() * 60000;
        const adjustedStart = new Date(start.getTime() + timezoneOffset);
        adjustedStart.setHours(0, 0, 0, 0);

        const adjustedEnd = new Date(new Date(endDate).getTime() + timezoneOffset);
        adjustedEnd.setHours(23, 59, 59, 999);

        const startDateIso = adjustedStart.toISOString();
        const endDateIso = adjustedEnd.toISOString();

        // 1. Fetch DB
        let apptQuery = supabase
          .from('agendamentos')
          .select('*')
          .eq('IDEmpresa', empresaId)
          .gte('data_inicio', startDateIso)
          .lte('data_fim', endDateIso);

        const { data: dbAgendamentos } = await apptQuery;
        let dbEvents = dbAgendamentos || [];

        // 2. Fetch Google Calendar Events
        let apiEvents: GoogleEvent[] = [];
        if (adminEmail) {
          let calendarIds: string[] = [];
          if (selectedSpecialist !== 'all') {
             const spec = specialists.find(s => s.id === selectedSpecialist || s.calendarId === selectedSpecialist);
             if (spec) calendarIds = [spec.calendarId || spec.id];
          } else {
             calendarIds = specialists.map(s => s.calendarId || s.id).filter(Boolean) as string[];
          }

          const promises = calendarIds
              .filter(id => id && (id.includes('@') || id === 'primary'))
              .map(async (calId) => {
                  try {
                      const results = await googleCalendarService.listEvents(empresaId, adminEmail, adjustedStart, adjustedEnd, calId);
                      return results.map(e => ({ ...e, calendarId: calId }));
                  } catch (e) {
                      return [];
                  }
              });

          const results = await Promise.all(promises);
          apiEvents = results.flat();
        }

        // 3. Filter DB Events
        if (selectedSpecialist !== 'all') {
          const spec = specialists.find(s => s.id === selectedSpecialist || s.calendarId === selectedSpecialist);
          if (spec) {
              dbEvents = dbEvents.filter(a => a.especialista_id === spec.id || a.calendar_id === spec.calendarId);
          } else {
              dbEvents = [];
          }
        }

        const dbGoogleEvents: GoogleEvent[] = dbEvents.map(a => ({
            id: a.google_event_id || a.id,
            summary: a.titulo || '',
            start: { dateTime: a.data_inicio },
            end: { dateTime: a.data_fim },
            calendarId: a.calendar_id || a.especialista_id,
            status: a.status || 'confirmed',
            description: a.procedimento || '',
        }));

        const allEvents = [...apiEvents];
        const apiEventIds = new Set(apiEvents.map(e => e.id));
        
        for (const dbEv of dbGoogleEvents) {
            if (dbEv.id && !apiEventIds.has(dbEv.id)) {
                allEvents.push(dbEv);
            } else if (!dbEv.id) {
                allEvents.push(dbEv);
            }
        }

        const mappedEvents = allEvents.map((a: any) => {
            let specId = 'Sem Especialista';
            if (a.calendarId) {
                const sp = specialists.find(s => s.calendarId === a.calendarId || s.id === a.calendarId);
                if (sp) specId = sp.name;
            }
            
            // Try to match specialist from summary or description if not found
            if (specId === 'Sem Especialista') {
                const summaryAndDesc = ((a.summary || '') + ' ' + (a.description || '')).toUpperCase();
                const sp = specialists.find(s => summaryAndDesc.includes(s.name.toUpperCase()));
                if (sp) specId = sp.name;
            }

            let evStatus = a.status || 'confirmed';
            const sumUpper = (a.summary || '').toUpperCase();
            const descUpper = (a.description || '').toUpperCase();
            
            if (sumUpper.includes('[CANCELADO]') || sumUpper.includes('[CANCELADA]') || 
                descUpper.includes('[CANCELADO]') || descUpper.includes('[CANCELADA]') || 
                evStatus.toLowerCase() === 'cancelado' || evStatus.toLowerCase() === 'cancelada') {
                evStatus = 'cancelled';
            } else if (evStatus.toLowerCase() === 'pendente' || evStatus.toLowerCase() === 'pending' || 
                       sumUpper.includes('[PENDENTE]') || descUpper.includes('[PENDENTE]')) {
                evStatus = 'pending';
            } else if (evStatus.toLowerCase() === 'concluído' || evStatus.toLowerCase() === 'concluido' || evStatus.toLowerCase() === 'completed' ||
                       sumUpper.includes('[CONCLUÍDO]') || descUpper.includes('[CONCLUÍDO]') ||
                       sumUpper.includes('[CONCLUIDO]') || descUpper.includes('[CONCLUIDO]')) {
                evStatus = 'completed';
            } else if (evStatus.toLowerCase() === 'confirmado' || evStatus.toLowerCase() === 'confirmed' ||
                       sumUpper.includes('[CONFIRMADO]') || descUpper.includes('[CONFIRMADO]')) {
                evStatus = 'confirmed';
            }

            return {
              id: a.id || Math.random().toString(),
              status: evStatus,
              specialistName: specId
            };
        });
        
        setEvents(mappedEvents);
      } catch (err) {
        console.error('Error fetching productivity report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [empresaId, startDate, endDate, selectedSpecialist, adminEmail, specialists]);

  const handlePrint = () => {
    window.print();
  };

  // Metrics calculation
  const totalConsultations = events.length;
  const completedCount = events.filter(e => e.status === 'completed').length;
  const cancelledCount = events.filter(e => e.status === 'cancelled').length;
  const pendingCount = events.filter(e => e.status === 'pending').length;

  const attendanceRate = totalConsultations > 0 ? Math.round((completedCount / totalConsultations) * 100) : 0;
  const cancelRate = totalConsultations > 0 ? Math.round((cancelledCount / totalConsultations) * 100) : 0;

  // Breakdown by Specialist
  const specialistStats: Record<string, { total: number, completed: number, cancelled: number }> = {};
  events.forEach(e => {
    const name = e.specialistName;
    if (!specialistStats[name]) {
      specialistStats[name] = { total: 0, completed: 0, cancelled: 0 };
    }
    specialistStats[name].total += 1;
    if (e.status === 'completed') specialistStats[name].completed += 1;
    if (e.status === 'cancelled') specialistStats[name].cancelled += 1;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-500 ml-2 font-medium">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-500 ml-2 font-medium">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <Stethoscope className="w-5 h-5 text-gray-500 ml-2" />
            <select
              value={selectedSpecialist}
              onChange={(e) => setSelectedSpecialist(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 cursor-pointer min-w-[150px]"
            >
              <option value="all">Todos Especialistas</option>
              {specialists.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir Relatório
        </button>
      </div>

      {/* Printable Area */}
      <div className="print:block" id="printable-report">
        
        {/* Print Header */}
        <div className="hidden print:block mb-8 text-center border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Relatório de Produtividade</h2>
          <p className="text-gray-600 mt-1">
            Período: {format(parseISO(startDate), "dd/MM/yyyy")} até {format(parseISO(endDate), "dd/MM/yyyy")}
          </p>
          <p className="text-gray-600">
            Especialista: {selectedSpecialist === 'all' ? 'Todos os Especialistas' : specialists.find(s => s.id === selectedSpecialist)?.name}
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-indigo-700 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Total Agendamentos</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{totalConsultations}</p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Atendimentos Realizados</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{completedCount}</p>
                <div className="mt-2 w-full bg-green-200 rounded-full h-1.5">
                  <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${attendanceRate}%` }}></div>
                </div>
                <p className="text-xs text-green-700 mt-1">{attendanceRate}% de comparecimento</p>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Cancelamentos / Faltas</span>
                </div>
                <p className="text-2xl font-bold text-red-900">{cancelledCount}</p>
                <div className="mt-2 w-full bg-red-200 rounded-full h-1.5">
                  <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${cancelRate}%` }}></div>
                </div>
                <p className="text-xs text-red-700 mt-1">{cancelRate}% de absenteísmo</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Pendentes</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
                <p className="text-xs text-gray-500 mt-1">Ainda não confirmados</p>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Desempenho por Especialista
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Especialista</th>
                      <th className="px-4 py-3 font-semibold text-center">Total Agendado</th>
                      <th className="px-4 py-3 font-semibold text-center text-green-600">Realizados</th>
                      <th className="px-4 py-3 font-semibold text-center text-red-600">Cancelados</th>
                      <th className="px-4 py-3 font-semibold text-center">Taxa de Conversão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(specialistStats).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          Nenhum dado de especialista para este período.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(specialistStats).map(([name, stats]) => {
                        const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        return (
                          <tr key={name} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {name}
                            </td>
                            <td className="px-4 py-3 text-center font-medium">
                              {stats.total}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-green-600">
                              {stats.completed}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-red-600">
                              {stats.cancelled}
                            </td>
                            <td className="px-4 py-3 text-center font-medium">
                              <span className={`px-2 py-1 rounded-full text-xs ${rate >= 70 ? 'bg-green-100 text-green-800' : rate >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: portrait; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          #root { height: auto !important; overflow: visible !important; }
          .app-h-screen { height: auto !important; }
          aside, header, nav, .print\\:hidden { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          .max-w-7xl { max-width: none !important; width: 100% !important; margin: 0 !important; }
          #printable-report { width: 100% !important; display: block !important; }
          .shadow-sm { box-shadow: none !important; }
          
          /* Colors */
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-red-50 { background-color: #fef2f2 !important; }
          .bg-indigo-50 { background-color: #eef2ff !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
        }
      `}</style>
    </div>
  );
};
