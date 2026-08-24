import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, Calendar, DollarSign, List, Stethoscope } from 'lucide-react';
import { Specialist } from '../../types';
import { googleCalendarService, GoogleEvent } from '../../services/googleCalendarService';
import { userService } from '../../services/userService';

export const CommissionsReportTab: React.FC = () => {
  const { empresaId } = useCompany();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('');
  
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load specialists and adminEmail
  useEffect(() => {
    const loadContext = async () => {
      if (!empresaId) return;
      try {
        const [email, specialistData] = await Promise.all([
          userService.getConnectedGoogleEmail(empresaId),
          supabase.from('specialists').select('*').eq('empresa_id', empresaId).order('name')
        ]);
        setAdminEmail(email);
        const specs = specialistData.data || [];
        setSpecialists(specs);
        if (specs.length > 0 && !selectedSpecialist) {
          setSelectedSpecialist(specs[0].id);
        }
      } catch (err) {
        console.error('Error loading context:', err);
      }
    };
    loadContext();
  }, [empresaId]);

  // Load data for period
  useEffect(() => {
    const loadData = async () => {
      if (!empresaId || !startDate || !endDate || !selectedSpecialist) return;
      
      const maxDays = differenceInDays(new Date(endDate), new Date(startDate));
      if (maxDays > 60) {
        alert("Para o relatório de comissões, por favor selecione um período máximo de 60 dias.");
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

        // Fetch only for selected specialist
        const spec = specialists.find(s => s.id === selectedSpecialist || s.calendarId === selectedSpecialist);
        if (!spec) {
          setEvents([]);
          setLoading(false);
          return;
        }

        // 1. Fetch DB
        const { data: dbAgendamentos } = await supabase
          .from('agendamentos')
          .select('*, Cliente:cliente_id(nome_completo)')
          .eq('IDEmpresa', empresaId)
          .gte('data_inicio', startDateIso)
          .lte('data_fim', endDateIso)
          .or(`especialista_id.eq.${spec.id},calendar_id.eq.${spec.calendarId || 'NOCAL'}`);

        let dbEvents = dbAgendamentos || [];

        // 2. Fetch Google Calendar
        let apiEvents: GoogleEvent[] = [];
        if (adminEmail && spec.calendarId) {
          try {
            const results = await googleCalendarService.listEvents(empresaId, adminEmail, adjustedStart, adjustedEnd, spec.calendarId);
            apiEvents = results.map(e => ({ ...e, calendarId: spec.calendarId }));
          } catch (e) {
            console.warn('Google Calendar fetch error', e);
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

        // Filter only CONFIRMED events for commissions (usually you only pay for completed procedures)
        const confirmedEvents = allEvents.filter(e => e.status === 'confirmed');

        const mappedEvents = confirmedEvents.map((a: any) => {
            // Find patient name from DB if available, else from summary
            const dbMatch = dbEvents.find(db => db.google_event_id === a.id || db.id === a.id);
            const patientName = dbMatch?.Cliente?.nome_completo || a.summary || 'Desconhecido';
            
            return {
              id: a.id || Math.random().toString(),
              date: a.start?.dateTime || a.start?.date || '',
              patientName: patientName,
              procedure: a.description || dbMatch?.procedimento || 'Consulta Geral',
            };
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setEvents(mappedEvents);
      } catch (err) {
        console.error('Error fetching commissions report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [empresaId, startDate, endDate, selectedSpecialist, adminEmail, specialists]);

  const handlePrint = () => {
    window.print();
  };

  const selectedSpecialistName = specialists.find(s => s.id === selectedSpecialist)?.name || '';
  const totalProcedures = events.length;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <Stethoscope className="w-5 h-5 text-gray-500 ml-2" />
            <select
              value={selectedSpecialist}
              onChange={(e) => setSelectedSpecialist(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 cursor-pointer min-w-[200px]"
            >
              <option value="" disabled>Selecione o Especialista</option>
              {specialists.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
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
          <h2 className="text-2xl font-bold text-gray-900">Relatório de Atendimentos / Comissões</h2>
          <p className="text-gray-600 mt-1">
            Especialista: <span className="font-semibold">{selectedSpecialistName}</span>
          </p>
          <p className="text-gray-600">
            Período: {format(parseISO(startDate), "dd/MM/yyyy")} até {format(parseISO(endDate), "dd/MM/yyyy")}
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Alert info */}
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex gap-3 print:hidden">
              <div className="mt-0.5"><DollarSign className="w-4 h-4" /></div>
              <div>
                <p className="font-medium">Cálculo de Comissões</p>
                <p>Este relatório lista todos os atendimentos confirmados do especialista no período. Utilize esta base para calcular o fechamento mensal com base nas regras de comissionamento da clínica (porcentagem ou valor fixo).</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-indigo-700 mb-1">
                  <List className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Total de Procedimentos Realizados</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{totalProcedures}</p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                <List className="w-4 h-4" />
                Histórico de Atendimentos Confirmados
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 border-b border-gray-100 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Data / Hora</th>
                      <th className="px-4 py-3 font-semibold">Paciente</th>
                      <th className="px-4 py-3 font-semibold">Procedimento / Detalhes</th>
                      <th className="px-4 py-3 font-semibold text-right">Valor Comissão (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          Nenhum atendimento confirmado encontrado para este especialista no período.
                        </td>
                      </tr>
                    ) : (
                      events.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {e.date ? format(parseISO(e.date), "dd/MM/yy 'às' HH:mm") : '-'}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {e.patientName}
                          </td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-xs" title={e.procedure}>
                            {e.procedure}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {/* Um espaço para preenchimento manual ou integração futura */}
                            <div className="inline-block w-24 border-b border-dashed border-gray-300 h-6"></div>
                          </td>
                        </tr>
                      ))
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
          .max-h-\\[500px\\] { max-height: none !important; overflow: visible !important; }
          
          /* Colors */
          .bg-indigo-50 { background-color: #eef2ff !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
        }
      `}</style>
    </div>
  );
};
