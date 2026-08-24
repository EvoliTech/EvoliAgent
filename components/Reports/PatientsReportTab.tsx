import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, Users, UserPlus, Phone, MapPin } from 'lucide-react';
import { Patient } from '../../types';

export const PatientsReportTab: React.FC = () => {
  const { empresaId } = useCompany();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!empresaId || !startDate || !endDate) return;
      setLoading(true);
      try {
        const start = new Date(startDate);
        const timezoneOffset = start.getTimezoneOffset() * 60000;
        const adjustedStart = new Date(start.getTime() + timezoneOffset);
        adjustedStart.setHours(0, 0, 0, 0);

        const adjustedEnd = new Date(new Date(endDate).getTime() + timezoneOffset);
        adjustedEnd.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('Cliente')
          .select('*')
          .eq('IDEmpresa', empresaId)
          .gte('created_at', adjustedStart.toISOString())
          .lte('created_at', adjustedEnd.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        console.error('Error fetching patients report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [empresaId, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  // Metrics
  const totalNewPatients = patients.length;
  const patientsWithEmail = patients.filter(p => p.email).length;
  const patientsWithPhone = patients.filter(p => p.telefoneWhatsapp).length;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-500 ml-2 font-medium">Cadastros de:</span>
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
          <h2 className="text-2xl font-bold text-gray-900">Relatório de Pacientes</h2>
          <p className="text-gray-600 mt-1">
            Novos Cadastros: {format(parseISO(startDate), "dd/MM/yyyy")} até {format(parseISO(endDate), "dd/MM/yyyy")}
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-indigo-700 mb-1">
                  <UserPlus className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Novos Pacientes</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{totalNewPatients}</p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Com Telefone/WhatsApp</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{patientsWithPhone}</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Com E-mail</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{patientsWithEmail}</p>
              </div>
            </div>

            {/* Patients Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Pacientes Cadastrados no Período
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 border-b border-gray-100 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Data Cadastro</th>
                      <th className="px-4 py-3 font-semibold">Nome</th>
                      <th className="px-4 py-3 font-semibold">Telefone</th>
                      <th className="px-4 py-3 font-semibold">Origem / Convênio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          Nenhum paciente cadastrado no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      patients.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {p.created_at ? format(parseISO(p.created_at), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate" title={p.nome_completo}>
                            {p.nome_completo}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {p.telefoneWhatsapp || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {p.convenio || 'Particular'}
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
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
        }
      `}</style>
    </div>
  );
};
