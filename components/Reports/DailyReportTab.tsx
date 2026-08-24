import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Printer, AlertTriangle, CheckCircle2, Clock, DollarSign, User, Activity, Stethoscope } from 'lucide-react';
import { Specialist } from '../../types';
import { googleCalendarService, GoogleEvent } from '../../services/googleCalendarService';
import { userService } from '../../services/userService';
import { patientService } from '../../services/patientService';

interface DailyAppointment {
  id: string;
  title: string;
  start: string;
  end: string;
  patientName: string;
  patientPhone: string;
  status: string;
  description: string;
  specialistId: string;
}

interface PendingPayment {
  id: string;
  paciente_id: string;
  nome_paciente: string;
  valor_total: number;
  data_vencimento: string;
  status: string;
  descricao: string;
}

export const DailyReportTab: React.FC = () => {
  const { empresaId } = useCompany();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  
  const [appointments, setAppointments] = useState<DailyAppointment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  // Load initial context (specialists and adminEmail)
  useEffect(() => {
    const loadContext = async () => {
      if (!empresaId) return;
      try {
        const [email, specialistData] = await Promise.all([
          userService.getConnectedGoogleEmail(empresaId),
          supabase.from('specialists').select('*').eq('empresa_id', empresaId).order('name')
        ]);
        setAdminEmail(email);
        setSpecialists(specialistData.data || []);
      } catch (err) {
        console.error('Error loading context for daily report:', err);
      }
    };
    loadContext();
  }, [empresaId]);

  // Load report data
  useEffect(() => {
    const loadReportData = async () => {
      if (!empresaId || !selectedDate) return;
      setLoading(true);
      
      try {
        const start = new Date(selectedDate);
        // Ajuste para pegar considerando o fuso horário corretamente (ignorar time)
        const timezoneOffset = start.getTimezoneOffset() * 60000;
        const adjustedStart = new Date(start.getTime() + timezoneOffset);
        adjustedStart.setHours(0, 0, 0, 0);

        const adjustedEnd = new Date(adjustedStart);
        adjustedEnd.setHours(23, 59, 59, 999);

        const startDate = adjustedStart.toISOString();
        const endDate = adjustedEnd.toISOString();

        // 1. Fetch DB Appointments
        let apptQuery = supabase
          .from('agendamentos')
          .select('*')
          .eq('IDEmpresa', empresaId)
          .gte('data_inicio', startDate)
          .lte('data_fim', endDate);

        const { data: dbAgendamentos, error: apptError } = await apptQuery;
        if (apptError) {
          console.error('Supabase query error:', apptError);
        }

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

        // 3. Filter DB Events by Specialist
        if (selectedSpecialist !== 'all') {
          const spec = specialists.find(s => s.id === selectedSpecialist || s.calendarId === selectedSpecialist);
          if (spec) {
              dbEvents = dbEvents.filter(a => a.especialista_id === spec.id || a.calendar_id === spec.calendarId);
          } else {
              dbEvents = [];
          }
        }

        // 4. Map DB Events to GoogleEvent format to merge
        const dbGoogleEvents: GoogleEvent[] = dbEvents.map(a => ({
            id: a.google_event_id || a.id,
            summary: a.titulo || '',
            start: { dateTime: a.data_inicio },
            end: { dateTime: a.data_fim },
            calendarId: a.calendar_id || a.especialista_id,
            status: a.status || 'confirmed',
            description: a.procedimento || '',
        }));

        // 5. Merge avoiding duplicates (prefer API over DB if same ID)
        const allEvents = [...apiEvents];
        const apiEventIds = new Set(apiEvents.map(e => e.id));
        
        for (const dbEv of dbGoogleEvents) {
            if (dbEv.id && !apiEventIds.has(dbEv.id)) {
                allEvents.push(dbEv);
            } else if (!dbEv.id) {
                // If it doesn't have an ID, just add it (local only)
                allEvents.push(dbEv);
            }
        }

        // 6. Sort and format for the UI
        allEvents.sort((a, b) => {
            const timeA = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
            const timeB = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
            return timeA - timeB;
        });

        const mappedAppointments = allEvents.map((a: any) => {
            // Find specialist
            let specId = '';
            if (a.calendarId) {
                const sp = specialists.find(s => s.calendarId === a.calendarId || s.id === a.calendarId);
                if (sp) specId = sp.id;
            }
            
            if (!specId) {
                const summaryAndDesc = ((a.summary || '') + ' ' + (a.description || '')).toUpperCase();
                const sp = specialists.find(s => summaryAndDesc.includes(s.name.toUpperCase()));
                if (sp) specId = sp.id;
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
            } else if (evStatus.toLowerCase() === 'confirmado' || evStatus.toLowerCase() === 'confirmed' ||
                       sumUpper.includes('[CONFIRMADO]') || descUpper.includes('[CONFIRMADO]')) {
                evStatus = 'confirmed';
            }

            return {
              id: a.id || Math.random().toString(),
              title: a.summary || '',
              start: a.start?.dateTime || a.start?.date || '',
              end: a.end?.dateTime || a.end?.date || '',
              patientName: a.summary || 'Desconhecido', // Google Event summary is usually the patient name
              patientPhone: '', // Not easily available in Google Event, would need CRM lookup
              status: evStatus,
              description: a.description || '',
              specialistId: specId
            };
        });
        
        setAppointments(mappedAppointments);

        // Get unique patient names or IDs from appointments to find pending payments
        const patientNames = Array.from(new Set(mappedAppointments.map(a => a.patientName)));

        if (patientNames.length > 0) {
          // Find pending payments for these patients. Note: `receitas` table lacks `nome_paciente` and `status` in this version.
          // We will mock or skip this until the financial module is fully integrated.
          setPendingPayments([]);
        } else {
          setPendingPayments([]);
        }

      } catch (err) {
        console.error('Error loading daily report data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [empresaId, selectedDate, selectedSpecialist]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  // Metrics
  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmed').length;
  const uniquePatientsCount = new Set(appointments.map(a => a.patientName)).size;
  const totalPendingValue = pendingPayments.reduce((acc, curr) => acc + (curr.valor_total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Filters - Hidden on print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <Calendar className="w-5 h-5 text-gray-500 ml-2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
          <h2 className="text-2xl font-bold text-gray-900">Relatório Diário do Especialista</h2>
          <p className="text-gray-600 mt-1">
            Data: {format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-gray-600">
            Especialista: {selectedSpecialist === 'all' ? 'Todos os Especialistas' : specialists.find(s => s.id === selectedSpecialist)?.name}
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
            <Calendar className="w-12 h-12 mb-3 text-gray-400" />
            <p className="font-medium">Nenhum agendamento encontrado para esta data.</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Total Consultas</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{totalAppointments}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Confirmadas</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{confirmedAppointments}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Pacientes Únicos</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{uniquePatientsCount}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Cobranças Pend.</span>
                </div>
                <p className="text-2xl font-bold text-amber-900">
                  {totalPendingValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>

            {/* Agenda Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Agenda do Dia
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Horário</th>
                      <th className="px-4 py-3 font-semibold">Paciente</th>
                      <th className="px-4 py-3 font-semibold">Procedimento / Motivo</th>
                      <th className="px-4 py-3 font-semibold">Especialista</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold print:hidden">Avisos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appointments.map((appt) => {
                      const specialist = specialists.find(s => s.id === appt.specialistId);
                      const patientPendingPayments = pendingPayments.filter(p => p.nome_paciente === appt.patientName);
                      
                      return (
                        <tr key={appt.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {format(parseISO(appt.start), 'HH:mm')} - {format(parseISO(appt.end), 'HH:mm')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{appt.patientName}</div>
                            <div className="text-xs text-gray-500">{appt.patientPhone}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={appt.description || '-'}>
                            {appt.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {specialist ? specialist.name : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(appt.status)}`}>
                              {getStatusText(appt.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            {patientPendingPayments.length > 0 && (
                              <div className="flex items-center gap-1 text-amber-600 text-xs font-medium" title="Possui pendências financeiras">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {patientPendingPayments.length} Cobrança(s)
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Payments Section (Print only or explicit view) */}
            {pendingPayments.length > 0 && (
              <div className="bg-white border border-red-100 rounded-xl overflow-hidden shadow-sm mt-6">
                <div className="bg-red-50 px-4 py-3 border-b border-red-100 font-medium text-sm text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Alerta de Inadimplência (Pacientes do Dia)
                </div>
                <div className="p-4 bg-white">
                  <ul className="space-y-3">
                    {pendingPayments.map(payment => (
                      <li key={payment.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                        <div>
                          <span className="font-medium text-gray-900">{payment.nome_paciente}</span>
                          <span className="text-gray-500 ml-2">({payment.descricao})</span>
                        </div>
                        <div className="text-red-600 font-medium">
                          {payment.valor_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          #root { height: auto !important; overflow: visible !important; }
          .app-h-screen { height: auto !important; }
          
          /* Hide sidebar, headers, and unwanted elements */
          aside, header, nav, .print\\:hidden { display: none !important; }
          
          /* Reset container margins for printing */
          main { margin: 0 !important; padding: 0 !important; }
          .max-w-7xl { max-width: none !important; width: 100% !important; margin: 0 !important; }
          
          /* Ensure printable area takes full width */
          #printable-report { width: 100% !important; display: block !important; }
          
          /* Remove shadows and borders that look bad on paper */
          .shadow-sm { box-shadow: none !important; }
          
          /* Keep background colors for cards */
          .bg-indigo-50 { background-color: #eef2ff !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-amber-50 { background-color: #fffbeb !important; }
        }
      `}</style>
    </div>
  );
};
