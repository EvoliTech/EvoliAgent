import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Printer, List, Stethoscope, DollarSign } from 'lucide-react';
import { Specialist, CommissionRule } from '../../types';
import { budgetService } from '../../services/budgetService';
import { specialistService } from '../../services/specialistService';

export const CommissionsReportTab: React.FC = () => {
  const { empresaId } = useCompany();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('');
  
  const [allBudgets, setAllBudgets] = useState<any[]>([]);
  const [commissionedSpecialists, setCommissionedSpecialists] = useState<Record<string, CommissionRule[]>>({});
  const [loading, setLoading] = useState(false);

  // Load specialists, budgets, and commission rules
  useEffect(() => {
    const loadContext = async () => {
      if (!empresaId) return;
      setLoading(true);
      try {
        const [specs, budgetsData] = await Promise.all([
          specialistService.fetchSpecialists(empresaId),
          budgetService.fetchAllCompanyBudgets(empresaId)
        ]);

        setSpecialists(specs);
        if (specs.length > 0 && !selectedSpecialist) {
          setSelectedSpecialist(specs[0].id);
        }

        const mapRules: Record<string, CommissionRule[]> = {};
        specs.forEach((s: any) => {
          let parsedComissoes = s.comissoes || [];
          if (typeof parsedComissoes === 'string') {
            try { parsedComissoes = JSON.parse(parsedComissoes); } catch { parsedComissoes = []; }
          }
          if (parsedComissoes.length > 0) {
            mapRules[s.id] = parsedComissoes;
          }
        });
        setCommissionedSpecialists(mapRules);
        setAllBudgets(budgetsData);

      } catch (err) {
        console.error('Error loading context:', err);
      } finally {
        setLoading(false);
      }
    };
    loadContext();
  }, [empresaId]);

  const parseDateStr = (dateStr?: string) => {
    if (!dateStr) return null;
    let parsedStr = dateStr;
    if (typeof dateStr === 'string' && dateStr.includes('/') && dateStr.split('/')[0].length === 2) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) parsedStr = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`;
    } else if (typeof dateStr === 'string' && !dateStr.includes('T')) {
      if (dateStr.length <= 10) parsedStr = dateStr + 'T12:00:00';
      else parsedStr = dateStr.replace(' ', 'T');
    }
    const d = new Date(parsedStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const isDateInFilter = (dateStr?: string) => {
    if (!startDate || !endDate) return true;
    const d = parseDateStr(dateStr);
    if (!d) return false;
    const sDate = startOfDay(parseISO(startDate));
    const eDate = endOfDay(parseISO(endDate));
    return isWithinInterval(d, { start: sDate, end: eDate });
  };

  const getCommissionRule = (rules: CommissionRule[] | undefined, trtName: string, convenioName: string) => {
    if (!rules) return null;
    const cName = (convenioName || '').toLowerCase().trim();
    const tName = (trtName || '').toLowerCase().trim();
    return rules.find(r => {
      const rc = (r.convenio || '').toLowerCase().trim();
      const re = (r.especialidade || '').toLowerCase().trim();
      return (rc === 'todos' || rc === cName || (rc === 'particular' && cName === 'particular')) &&
        (re === 'todas' || re === tName);
    });
  };

  const comissoesList = useMemo(() => {
    if (!selectedSpecialist) return [];
    
    const spec = specialists.find(s => s.id === selectedSpecialist);
    if (!spec) return [];
    
    const profRules = commissionedSpecialists[spec.id];
    const normalizeName = (name: string) => name.replace(/Dr\(a\)\s*/gi, '').trim().toLowerCase();
    const specNameNormalized = normalizeName(spec.name);

    const list: any[] = [];
    allBudgets.forEach(b => {
      if (b.status !== 'Aprovado') return;

      (b.tratamentos || b.treatments || []).forEach((t: any) => {
        const trtName = t.treatmentName || t.tratamento || 'Outro';
        const convenioName = t.convenio || 'Particular';
        const itemVal = parseFloat(t.valor || 0);

        const profNormalized = normalizeName(t.profissional || '');
        const isMatched = profNormalized === specNameNormalized ||
                          (t.profissional || '').toLowerCase().includes(specNameNormalized) ||
                          spec.name.toLowerCase().includes(profNormalized);
                          
        if (!isMatched) return;

        const rule = getCommissionRule(profRules, trtName, convenioName);

        if (t.payments && t.payments.length > 0) {
          t.payments.forEach((p: any) => {
            if (!p) return;
            if (p.method === 'Boleto' && p.status !== 'Pago' && !p.isPaid) return; 
            
            const patientPaid = parseFloat(p.amount) || 0;
            const pDate = ((p.isPaid === true || p.status === 'Pago') && p.paymentDate) ? p.paymentDate : (p.date || p.receiveDate || new Date().toISOString());
            
            if (rule && rule.quandoRecebe === 'apos_pagamento' && isDateInFilter(pDate)) {
              let valComissao = 0;
              const valRegra = parseFloat(String(rule.valor).replace(',', '.'));
              if (rule.tipoComissao === 'porcentagem') {
                valComissao = patientPaid * (valRegra / 100);
              } else {
                const prop = itemVal > 0 ? (patientPaid / itemVal) : 1;
                valComissao = valRegra * prop;
              }
              if (valComissao > 0) {
                list.push({
                  id: 'com_pg_' + p.id,
                  treatmentName: trtName,
                  specialistName: spec.name,
                  date: pDate,
                  amount: valComissao,
                  paciente: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
                  status: p.isComissaoPaga ? 'Pago' : 'Pendente',
                });
              }
            }
          });
        }

        if (rule && rule.quandoRecebe === 'apos_procedimento' && t.status === 'Finalizado') {
          const procDate = b.updated_at || b.created_at || new Date().toISOString();
          if (isDateInFilter(procDate)) {
            let valComissao = 0;
            const valRegra = parseFloat(String(rule.valor).replace(',', '.'));
            if (rule.tipoComissao === 'porcentagem') {
              valComissao = itemVal * (valRegra / 100);
            } else {
              valComissao = valRegra;
            }
            if (valComissao > 0) {
              list.push({
                id: 'com_pr_' + t.id,
                treatmentName: trtName,
                specialistName: spec.name,
                date: procDate,
                amount: valComissao,
                paciente: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
                status: t.isComissaoPaga ? 'Pago' : 'Pendente',
              });
            }
          }
        }
      });
    });

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [allBudgets, commissionedSpecialists, specialists, selectedSpecialist, startDate, endDate]);

  const handlePrint = () => window.print();

  const selectedSpecialistName = specialists.find(s => s.id === selectedSpecialist)?.name || '';
  const totalAmount = comissoesList.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 cursor-pointer" />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-500 ml-2 font-medium">Até:</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 cursor-pointer" />
          </div>
        </div>

        <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Printer className="w-4 h-4" />
          Imprimir Relatório
        </button>
      </div>

      <div className="print:block" id="printable-report">
        <div className="hidden print:block mb-8 text-center border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Relatório de Comissões</h2>
          <p className="text-gray-600 mt-1">Especialista: <span className="font-semibold">{selectedSpecialistName}</span></p>
          <p className="text-gray-600">Período: {format(parseISO(startDate), "dd/MM/yyyy")} até {format(parseISO(endDate), "dd/MM/yyyy")}</p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex gap-3 print:hidden">
              <div className="mt-0.5"><DollarSign className="w-4 h-4" /></div>
              <div>
                <p className="font-medium">Cálculo de Comissões</p>
                <p>Este relatório lista os repasses pendentes e pagos do especialista, extraídos diretamente do módulo financeiro baseados nos orçamentos aprovados e regras de comissionamento.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-indigo-700 mb-1">
                  <List className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Total de Procedimentos Comissionados</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{comissoesList.length}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Total de Comissões no Período</span>
                </div>
                <p className="text-2xl font-bold text-green-900">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                <List className="w-4 h-4" />
                Histórico de Comissões
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 border-b border-gray-100 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Data</th>
                      <th className="px-4 py-3 font-semibold">Especialista</th>
                      <th className="px-4 py-3 font-semibold">Procedimento / Paciente</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Valor Comissão (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {comissoesList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          Nenhuma comissão encontrada para este especialista no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      comissoesList.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {e.date ? (typeof e.date === 'string' && e.date.includes('T') ? format(parseISO(e.date), "dd/MM/yyyy") : format(new Date(e.date), "dd/MM/yyyy")) : '-'}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {e.specialistName}
                          </td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-xs" title={`${e.treatmentName} - ${e.paciente}`}>
                            <div className="font-medium text-gray-800">{e.treatmentName}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{e.paciente}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-[11px] font-bold ${e.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">
                            R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          .bg-gray-50 { background-color: #f9fafb !important; }
        }
      `}</style>
    </div>
  );
};
