import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, X, ArrowDownRight, ArrowUpRight, Scale, Calendar, Filter, ArrowUp, Check, MoreVertical, Eye, Settings, Trash2 } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { specialistService } from '../services/specialistService';
import { budgetService } from '../services/budgetService';
import { Specialist, CommissionRule } from '../types';
import { ConfigComissionsModal } from './ConfigComissionsModal';
import { AddDespesaModal, DespesaType } from './AddDespesaModal';
import { expenseService } from '../services/expenseService';


export const Financial: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'painel' | 'fluxo' | 'comissoes'>('painel');
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [showDetails, setShowDetails] = useState<'entradas' | 'saidas' | 'addDespesa' | null>(null);
  const { empresaId } = useCompany();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [commissionedSpecialists, setCommissionedSpecialists] = useState<Record<string, CommissionRule[]>>({});
  const [allBudgets, setAllBudgets] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<DespesaType[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (empresaId) {
      specialistService.fetchSpecialists(empresaId).then(setSpecialists).catch(console.error);
      budgetService.fetchAllCompanyBudgets(empresaId).then(setAllBudgets).catch(console.error);

      expenseService.fetchExpenses(empresaId)
        .then((data) => setDespesas(data as DespesaType[]))
        .catch(console.error);
    }
  }, [empresaId]);

  const handleDeleteDespesa = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Deseja realmente cancelar/excluir esta despesa?")) {
      await expenseService.deleteExpense(id);
      setDespesas(prev => prev.filter(d => d.id !== id));
    }
  };

  const handlePayDespesa = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Confirmar o pagamento desta despesa?")) {
      const success = await expenseService.payExpense(id, 'Dinheiro');
      if (success) {
        setDespesas(prev => prev.map(d => d.id === id ? { ...d, is_paga: true, data_pagamento: new Date().toISOString().split('T')[0], forma_pagamento: 'Dinheiro' } : d));
      }
    }
  };

  const handleDeleteGroup = async (grupoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Deseja cancelar TODAS as cobranças desta despesa recorrente?")) {
      await expenseService.deleteExpenseGroup(grupoId);
      setDespesas(prev => prev.filter(d => d.grupo_recorrente !== grupoId));
      setExpandedGroup(null);
    }
  };

  // Group despesas by grupo_recorrente for the Fluxo de Caixa view
  const despesasAgrupadas = useMemo(() => {
    const groups: Record<string, DespesaType[]> = {};
    const singles: DespesaType[] = [];

    despesas.forEach(d => {
      if (d.is_recorrente && d.grupo_recorrente) {
        if (!groups[d.grupo_recorrente]) groups[d.grupo_recorrente] = [];
        groups[d.grupo_recorrente].push(d);
      } else {
        singles.push(d);
      }
    });

    // Sort each group by date
    Object.values(groups).forEach(g => g.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));

    const result: ({ type: 'group'; grupoId: string; items: DespesaType[]; representative: DespesaType } | { type: 'single'; item: DespesaType })[] = [];

    Object.entries(groups).forEach(([grupoId, items]) => {
      result.push({ type: 'group', grupoId, items, representative: items[0] });
    });
    singles.forEach(item => {
      result.push({ type: 'single', item });
    });

    // Sort by next due date
    result.sort((a, b) => {
      const dateA = a.type === 'group' ? a.representative.data_vencimento : a.item.data_vencimento;
      const dateB = b.type === 'group' ? b.representative.data_vencimento : b.item.data_vencimento;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    return result;
  }, [despesas]);

  const financialStats = useMemo(() => {
    let paidTotal = 0;
    let pendingTotal = 0;
    let inadimplenciaAmount = 0;
    let planTaxesTotal = 0;
    let comissoesTotal = 0;
    const comissoesList: any[] = [];
    const patientsInad = new Set<string>();
    const methodsSummary: Record<string, number> = {};
    const treatmentsSummary: Record<string, { count: number, amount: number }> = {};
    const transactions: any[] = [];

    const getCommissionRule = (rules: CommissionRule[] | undefined, trtName: string, convenioName: string) => {
      if (!rules) return null;
      return rules.find(r => 
        (r.convenio === 'todos' || r.convenio === convenioName || (r.convenio === 'particular' && convenioName === 'Particular')) &&
        (r.especialidade === 'todas' || r.especialidade === trtName)
      );
    };

    allBudgets.forEach(b => {
      if (b.status !== 'Aprovado') return;
      const pacId = b.paciente?.id || b.paciente_id || '';

      (b.tratamentos || []).forEach((t: any) => {
        const trtName = t.treatmentName || t.tratamento || 'Outro';
        const convenioName = t.convenio || 'Particular';
        const itemVal = parseFloat(t.valor || 0);
        let paidOnTrt = 0;
        
        const profId = specialists.find(s => s.name === t.profissional)?.id;
        const profRules = profId ? commissionedSpecialists[profId] : undefined;
        const rule = getCommissionRule(profRules, trtName, convenioName);

        if (t.payments && t.payments.length > 0) {
          t.payments.forEach((p: any) => {
            const patientPaid = parseFloat(p.amount) || 0;
            const netReceived = p.planAmount !== undefined ? parseFloat(p.planAmount) : patientPaid;
            const planFee = Math.max(0, patientPaid - netReceived);

            const isFuture = p.receiveDate && new Date(p.receiveDate + 'T23:59:59').getTime() > new Date().getTime();

            if (isFuture) {
              pendingTotal += netReceived;
            } else {
              paidTotal += netReceived;
              
              // Calculate apos_pagamento commission
              if (rule && rule.quandoRecebe === 'apos_pagamento') {
                 let valComissao = 0;
                 const valRegra = parseFloat(rule.valor.replace(',', '.'));
                 if (rule.tipoComissao === 'porcentagem') {
                    valComissao = netReceived * (valRegra / 100);
                 } else {
                    const prop = itemVal > 0 ? (netReceived / itemVal) : 1;
                    valComissao = valRegra * prop;
                 }
                 if (valComissao > 0) {
                    comissoesTotal += valComissao;
                    comissoesList.push({
                       id: 'com_' + Math.random().toString(36).substr(2, 9),
                       profissional: t.profissional,
                       treatment: trtName,
                       date: p.receiveDate || p.date,
                       amount: valComissao,
                       paciente: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
                       status: 'Repassado' // Deduction on receipt implies it's resolved logic wise
                    });
                 }
              }
            }

            paidOnTrt += patientPaid;

            if (p.planAmount !== undefined) {
              planTaxesTotal += planFee;
            }

            const met = p.method || 'Outro';
            methodsSummary[met] = (methodsSummary[met] || 0) + netReceived;

            transactions.push({
              id: p.id,
              treatmentName: trtName,
              patientName: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
              cpf: b.paciente?.cpf || '',
              date: p.receiveDate || p.date, // "daquia 15 dias"
              amount: netReceived,
              originalAmount: patientPaid,
              planFee: planFee,
              isPaid: !isFuture,
              type: 'entrada'
            });
          });
        }

        const remaining = Math.max(0, itemVal - paidOnTrt);

        if (remaining > 0 && (t.status === 'Em andamento' || t.status === 'Finalizado')) {
          pendingTotal += remaining;

          // Consider inadimplente if treatment is finalized but not paid, or older than 30 days
          if (t.status === 'Finalizado' || (b.date && new Date(b.date).getTime() < new Date().getTime() - 1000 * 60 * 60 * 24 * 30)) {
            inadimplenciaAmount += remaining;
            if (pacId) patientsInad.add(pacId);
          }

          transactions.push({
            id: t.id + '_pend',
            treatmentName: trtName,
            patientName: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
            cpf: b.paciente?.cpf || '',
            date: b.date || b.created_at,
            amount: remaining,
            originalAmount: remaining,
            planFee: 0,
            isPaid: false,
            type: 'pendente'
          });
        }

        // Treatments sum
        if (itemVal > 0) {
          if (!treatmentsSummary[trtName]) {
            treatmentsSummary[trtName] = { count: 0, amount: 0 };
          }
          treatmentsSummary[trtName].count += 1;
          treatmentsSummary[trtName].amount += itemVal;
        }

        // Calculate apos_procedimento commission
        if (rule && rule.quandoRecebe === 'apos_procedimento' && t.status === 'Finalizado') {
           let valComissao = 0;
           const valRegra = parseFloat(rule.valor.replace(',', '.'));
           if (rule.tipoComissao === 'porcentagem') {
              valComissao = itemVal * (valRegra / 100);
           } else {
              valComissao = valRegra;
           }
           
           if (valComissao > 0) {
               comissoesTotal += valComissao;
               comissoesList.push({
                   id: 'com_proc_' + Math.random().toString(36).substr(2, 9),
                   profissional: t.profissional,
                   treatment: trtName,
                   date: b.updated_at || b.created_at || new Date().toISOString(),
                   amount: valComissao,
                   paciente: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
                   status: t.isComissaoPaga ? 'Repassado' : 'A repassar'
               });
           }
        }
      });
    });

    despesas.forEach(d => {
      if (d.is_paga) {
        transactions.push({
          id: d.id || ('desp_' + Math.random()),
          treatmentName: d.titulo,
          patientName: 'Despesa (' + (d.categoria || 'Outros') + ')',
          cpf: '',
          date: d.data_pagamento || d.data_vencimento,
          amount: d.valor, // positive value, but rendered negative
          originalAmount: d.valor,
          planFee: 0,
          isPaid: true,
          type: 'saida'
        });
      }
    });

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalBalance = paidTotal + pendingTotal;

    const topTreatments = Object.entries(treatmentsSummary)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const methodsData = Object.entries(methodsSummary)
      .map(([name, amount]) => ({ name, amount, perc: paidTotal > 0 ? (amount / paidTotal) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    return {
      paidTotal, pendingTotal, totalBalance, transactions,
      inadimplenciaAmount, inadimplenciaCount: patientsInad.size,
      topTreatments, methodsData, planTaxesTotal, comissoesTotal, comissoesList
    };
  }, [allBudgets, commissionedSpecialists, specialists]);

  const handleSaveRules = (specialistId: string, rules: CommissionRule[]) => {
    setCommissionedSpecialists(prev => {
      const updated = { ...prev };
      if (rules.length > 0) {
        updated[specialistId] = rules;
      } else {
        delete updated[specialistId];
      }
      return updated;
    });
    setSelectedSpecialist(null);
  };

  const configuredSpecialists = specialists.filter(s => !!commissionedSpecialists[s.id]);
  const notConfiguredSpecialists = specialists.filter(s => !commissionedSpecialists[s.id]);

  return (
    <div className="w-full max-w-[1920px] mx-auto p-6 md:p-8 font-sans bg-slate-50 flex flex-col min-h-full">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        {activeTab === 'fluxo' && (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">
            Adicionar despesa
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1">

        {/* Tabs */}
        <div className="flex px-8 border-b border-gray-200 pt-2 gap-6">
          <button
            onClick={() => setActiveTab('painel')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'painel'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            Painel
          </button>
          <button
            onClick={() => setActiveTab('fluxo')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fluxo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            Fluxo de caixa
          </button>
          <button
            onClick={() => setActiveTab('comissoes')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'comissoes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            Comissões
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'painel' && (
          <div className="flex-1 flex flex-col p-8">

            {/* Header Content */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-[1.1rem] font-medium text-gray-800">Visão Geral</h2>
              <div className="flex items-center gap-3">
                <div className="relative border border-gray-300 rounded-md bg-white">
                  <select className="appearance-none bg-transparent pl-4 pr-10 py-1.5 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer">
                    <option>Março</option>
                    {/* Add other months as needed */}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDown size={14} />
                  </div>
                </div>

                <div className="relative border border-gray-300 rounded-md bg-white">
                  <select className="appearance-none bg-transparent pl-4 pr-10 py-1.5 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer">
                    <option>2026</option>
                    {/* Add other years as needed */}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Grid Data */}
            <div className="flex flex-col border-b border-gray-200 pb-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {/* Entradas */}
                <div className="flex flex-col px-6 border-r border-gray-200 first:pl-0">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-medium text-gray-800">Entradas</h3>
                    <button onClick={() => setShowDetails('entradas')} className="text-sm font-medium text-blue-600 hover:underline">Ver detalhes</button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Recebido</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {financialStats.paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">A receber</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {financialStats.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm text-gray-500">Total previsto</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {financialStats.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Saídas */}
                <div className="flex flex-col px-6 border-r border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-medium text-gray-800">Saídas</h3>
                    <button onClick={() => setShowDetails('saidas')} className="text-sm font-medium text-blue-600 hover:underline">Ver detalhes</button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Pago</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {despesas.filter(d => d.is_paga).reduce((acc, d) => acc + (d.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">A pagar</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {despesas.filter(d => !d.is_paga).reduce((acc, d) => acc + (d.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm text-gray-500">Total previsto</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {despesas.reduce((acc, d) => acc + (d.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>


              </div>
            </div>

            {/* Bottom Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1">

              {/* Aguardando Repasse */}
              <div className="flex flex-col px-6 border-r border-gray-200 first:pl-0 min-h-[160px]">
                <h3 className="text-sm font-medium text-gray-800 mb-6">Aguardando repasse</h3>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 mb-3 relative flex items-center justify-center">
                    {/* Placeholder for POS machine illustration */}
                    <div className="absolute inset-0 bg-blue-50 rounded-lg flex items-center justify-center opacity-80">
                      <div className="w-12 h-16 bg-blue-400 rounded-sm shadow relative">
                        <div className="w-8 h-4 bg-white/20 mx-auto mt-2 rounded-sm" />
                        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center">
                          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="w-2 h-2 bg-white/40 rounded-sm" />)}
                        </div>
                      </div>
                    </div>
                    <HelpCircle className="absolute -top-1 -left-1 text-yellow-400 fill-white" size={24} />
                  </div>
                  <p className="text-xs font-medium text-gray-600">Não há pagamentos aguardando repasse.</p>
                </div>
              </div>

            {/* Linha 2 de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              
              <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center text-center">
                <h3 className="text-sm font-semibold text-gray-700 mb-6 w-full text-left">Taxas pagas / Planos</h3>
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="text-3xl font-bold text-[#1e293b] mb-1">R$ {financialStats.planTaxesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-sm text-gray-500">Taxas e custos de convênios</div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Histórico de Repasse de Comissões</h3>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Total: R$ {financialStats.comissoesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col flex-1 pb-2">
                  <div className="max-h-[160px] overflow-y-auto w-full">
                    {financialStats.comissoesList.length === 0 ? (
                       <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500">
                          Nenhum repasse de comissão encontrado para o período.
                       </div>
                    ) : (
                       <table className="w-full text-left border-collapse text-sm">
                         <thead>
                           <tr className="bg-gray-50/50 sticky top-0 border-b border-gray-100">
                             <th className="px-4 py-2 font-medium text-gray-500 text-xs uppercase">Profissional</th>
                             <th className="px-4 py-2 font-medium text-gray-500 text-xs uppercase">Tratamento</th>
                             <th className="px-4 py-2 font-medium text-gray-500 text-xs uppercase text-right">Comissão</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                           {financialStats.comissoesList.map(c => (
                             <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                               <td className="px-4 py-2.5">
                                 <span className="font-semibold text-gray-800 text-[13px]">{c.profissional}</span>
                               </td>
                               <td className="px-4 py-2.5">
                                 <div className="flex flex-col">
                                   <span className="text-gray-700">{c.treatment}</span>
                                   <span className="text-[11px] text-gray-400">{c.paciente}</span>
                                 </div>
                               </td>
                               <td className="px-4 py-2.5 text-right font-semibold text-blue-600">
                                 R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    )}
                  </div>
                </div>
              </div>
            </div>

              {/* Proximas Despesas */}
              <div className="flex flex-col px-6 pr-0 min-h-[160px]">
                <h3 className="text-sm font-medium text-gray-800 mb-6">Próximas despesas</h3>
                <div className="flex-1 flex flex-col justify-center">
                  {despesas.filter(d => !d.is_paga).length === 0 ? (
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-16 mb-3 relative flex items-center justify-center">
                        <div className="w-16 h-12 bg-orange-100 rounded border-2 border-orange-200 relative overflow-hidden flex items-end">
                          <div className="w-full h-1/2 bg-orange-200" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-600">Nenhuma despesa futura cadastrada.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {despesas.filter(d => !d.is_paga).sort((a,b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()).slice(0, 4).map(d => (
                        <div key={d.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium text-gray-800 line-clamp-1">{d.titulo}</p>
                            <p className="text-xs text-gray-500">Vence: {new Date(d.data_vencimento + 'T12:00:00').toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-4 ml-2">
                            <p className="font-semibold text-red-600 whitespace-nowrap">R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <div className="flex items-center gap-1.5 border-l border-gray-100 pl-3">
                              <button onClick={(e) => handlePayDespesa(d.id!, e)} className="text-emerald-600 font-bold text-[11px] px-2 py-1 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors">
                                Pagar
                              </button>
                              <button onClick={(e) => handleDeleteDespesa(d.id!, e)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {despesas.filter(d => !d.is_paga).length > 4 && (
                        <button 
                          onClick={() => setActiveTab('fluxo')} 
                          className="w-full mt-2 text-[13px] font-medium text-blue-600 hover:text-blue-700 hover:underline text-center pt-1"
                        >
                          Ver todas ({despesas.filter(d => !d.is_paga).length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Text */}
            <div className="pt-8 pb-10 border-b border-gray-200">
              <span className="text-xs text-gray-400 font-medium">* Informações atualizadas a cada 30 minutos</span>
            </div>

            {/* Nova Seção: Saúde da Clínica */}
            <div className="pt-10 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[1.1rem] font-medium text-gray-800">Saúde da clínica</h2>
                <button className="flex items-center gap-2 border border-gray-300 rounded-md px-4 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  1 de março - 31 de março
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">

                {/* Distribuição do faturamento */}
                <div className="flex flex-col p-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Faturamento Geral</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex-1">Clínica</span>
                    <span className="text-gray-700 font-medium w-32 text-center">100%</span>
                    <div className="w-32 flex justify-between items-center ml-auto">
                      <span className="text-gray-800 font-medium">R$ {financialStats.paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Formas de pagamento */}
                <div className="flex flex-col p-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Formas de pagamento</h3>
                  <div className="flex flex-col space-y-5 text-sm">
                    {financialStats.methodsData.length === 0 ? (
                      <span className="text-gray-500">Nenhum pagamento recebido.</span>
                    ) : financialStats.methodsData.map(md => (
                      <div key={md.name} className="flex justify-between items-center">
                        <span className="text-gray-600 flex-1">{md.name}</span>
                        <span className="text-gray-700 w-32 text-center">{Math.round(md.perc)}%</span>
                        <span className="text-gray-800 font-medium w-32 pr-[34px] text-right">R$ {md.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tratamentos mais realizados no período */}
                <div className="flex flex-col p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Tratamentos mais realizados no período</h3>
                  {financialStats.topTreatments.length === 0 ? (
                    <span className="text-gray-500 text-sm">Nenhum tratamento registrado.</span>
                  ) : financialStats.topTreatments.map((t, idx) => (
                    <div key={t.name} className="flex justify-between items-center text-sm mb-4 last:mb-0">
                      <span className="text-gray-600 flex-1">{idx + 1} - {t.name} (Qtd: {t.count})</span>
                      <span className="text-gray-800 font-medium w-32 pr-[34px] text-right">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </div>
        )}

        {activeTab === 'fluxo' && (
          <div className="flex-1 flex flex-col p-8 bg-[#fafafa]">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-2">
              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-6 flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-emerald-500 font-medium text-[17px]">Receitas</h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <ArrowDownRight size={18} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ {financialStats.paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">A receber R$ {financialStats.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-6 flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-red-500 font-medium text-[17px]">Despesas</h3>
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <ArrowUpRight size={18} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ {despesas.filter(d => d.is_paga).reduce((a, b) => a + (b.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">A pagar R$ {despesas.filter(d => !d.is_paga).reduce((a, b) => a + (b.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-6 flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[#3b82f6] font-medium text-[17px]">Saldo Total (Bruto)</h3>
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#3b82f6]">
                    <Scale size={16} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ {(financialStats.paidTotal - despesas.filter(d => d.is_paga).reduce((a, b) => a + (b.valor || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">Todo o período</div>
                </div>
              </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition-colors font-medium">
                  <Calendar size={18} className="text-gray-400" /> Período: todo
                </button>
                <button className="flex items-center gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition-colors font-medium">
                  <Filter size={18} className="text-gray-400" /> Filtrar
                </button>
              </div>
              <button
                onClick={() => setShowDetails('addDespesa')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors border border-transparent shadow-sm">
                Adicionar Despesa
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 text-xs font-bold text-gray-800 border-b border-gray-100">
                <div className="flex-1 pl-12">Descrição</div>
                <div className="w-[12%] flex items-center gap-1 cursor-pointer select-none">Data (Recebto) <ArrowUp size={12} strokeWidth={3} className="text-gray-400" /></div>
                <div className="w-[12%]">Valor líquido</div>
                <div className="w-28 text-center pr-10">Status</div>
              </div>

              <div className="flex flex-col">
                {financialStats.transactions.filter(tx => tx.isPaid).length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">Nenhuma movimentação financeira encontrada.</div>
                ) : financialStats.transactions.filter(tx => tx.isPaid).map((tx, idx) => (
                  <div key={tx.id || idx} className={`flex items-center justify-between p-4 px-6 border-b border-gray-100 transition-colors group relative overflow-hidden ${tx.isPaid ? (tx.type === 'saida' ? 'bg-red-50/20 hover:bg-red-50/50' : 'bg-[#f6fbf8] hover:bg-[#eaf5ef]') : 'bg-white hover:bg-gray-50'}`}>
                    <div className="flex-1 flex items-start gap-3">
                      {tx.type === 'saida' ? (
                        <ArrowUpRight size={18} strokeWidth={2.5} className="text-red-500 mt-0.5 shrink-0" />
                      ) : !tx.isPaid ? (
                        <ArrowDownRight size={18} strokeWidth={2.5} className="text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <div className="w-[18px]"></div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[13.5px] font-semibold text-gray-700">{tx.patientName} {tx.cpf ? `${tx.cpf}` : ''}</span>
                        <span className="text-[12px] font-medium text-gray-500 mt-0.5">{tx.type === 'saida' ? 'Título: ' : 'Tratamento: '} {tx.treatmentName}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-[48%] pl-8">
                      <div className="w-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {!tx.isPaid && (
                          <button className="border border-gray-200 rounded px-3 py-1 text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 shadow-sm">
                            Pagar
                          </button>
                        )}
                      </div>
                      <div className="w-[20%] text-[13.5px] font-medium text-gray-600 tracking-tight">
                        {tx.date ? new Date(tx.date.includes('T') ? tx.date : tx.date + 'T12:00:00').toLocaleDateString('pt-BR') : '--'}
                      </div>
                      <div className="w-[20%] text-[13.5px] font-semibold tracking-tight">
                        {tx.type === 'saida' ? (
                           <span className="text-red-600">-R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        ) : (
                           <span className="text-gray-700">R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                      <div className="w-28 flex justify-end pr-2">
                        {tx.isPaid ? (
                          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${tx.type === 'saida' ? 'bg-red-100 text-red-700' : 'bg-[#dcfce7] text-[#16a34a]'}`}>
                            <Check size={12} strokeWidth={3.5} /> Pago
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-[#f3f4f6] text-gray-700 rounded-full text-[11px] font-bold whitespace-nowrap">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                            Em aberto
                          </span>
                        )}
                      </div>
                      <button className="w-8 flex justify-end text-gray-400 hover:text-gray-700 pr-1">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* === DESPESAS (Saídas) === */}
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm mt-8">
              <div className="flex items-center justify-between px-6 py-4 text-xs font-bold text-gray-800 border-b border-gray-100">
                <div className="flex-1 pl-12">Despesa</div>
                <div className="w-[12%]">Categoria</div>
                <div className="w-[12%]">Vencimento</div>
                <div className="w-[12%]">Valor</div>
                <div className="w-28 text-center pr-2">Status</div>
                <div className="w-8"></div>
              </div>

              <div className="flex flex-col">
                {despesasAgrupadas.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">Nenhuma despesa registrada. Clique em "Adicionar Despesa" para começar.</div>
                ) : despesasAgrupadas.map((entry, idx) => {
                  if (entry.type === 'single') {
                    const d = entry.item;
                    return (
                      <div key={d.id || idx} className={`flex items-center justify-between p-4 px-6 border-b border-gray-100 transition-colors group ${d.is_paga ? 'bg-red-50/40 hover:bg-red-50/70' : 'bg-white hover:bg-orange-50/40'}`}>
                        <div className="flex-1 flex items-start gap-3">
                          <ArrowUpRight size={18} strokeWidth={2.5} className="text-red-500 mt-0.5 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[13.5px] font-semibold text-gray-700">{d.titulo}</span>
                            <span className="text-[12px] font-medium text-gray-500 mt-0.5">Despesa única</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-[55%] pl-4">
                          <div className="w-[18%] text-[13px] font-medium text-gray-600">{d.categoria || '--'}</div>
                          <div className="w-[18%] text-[13px] font-medium text-gray-600">{new Date(d.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                          <div className="w-[18%] text-[13.5px] font-semibold text-red-600">-R$ {(d.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                          <div className="w-28 flex justify-end pr-2">
                            {d.is_paga ? (
                              <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[11px] font-bold whitespace-nowrap"><Check size={12} strokeWidth={3.5} /> Pago</span>
                            ) : (
                              <button onClick={(e) => handlePayDespesa(d.id!, e)} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors rounded-full text-[11px] font-bold whitespace-nowrap">
                                <Check size={12} strokeWidth={3} /> Pagar
                              </button>
                            )}
                          </div>
                          <button onClick={(e) => handleDeleteDespesa(d.id!, e)} className="w-8 flex justify-end text-gray-400 hover:text-red-500 transition-colors pr-1" title="Excluir despesa"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    );
                  }

                  // === GROUPED RECURRING ===
                  const { grupoId, items, representative } = entry;
                  const isExpanded = expandedGroup === grupoId;
                  const totalPagas = items.filter(i => i.is_paga).length;
                  const totalValor = items.reduce((s, i) => s + (i.valor || 0), 0);
                  const proximaAPagar = items.find(i => !i.is_paga);

                  return (
                    <div key={grupoId}>
                      {/* Summary row */}
                      <div
                        onClick={() => setExpandedGroup(isExpanded ? null : grupoId)}
                        className={`flex items-center justify-between p-4 px-6 border-b border-gray-100 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/50' : 'bg-white hover:bg-orange-50/40'}`}
                      >
                        <div className="flex-1 flex items-start gap-3">
                          <div className="mt-0.5 shrink-0 text-blue-500 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                            <ChevronRight size={18} strokeWidth={2.5} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13.5px] font-semibold text-gray-700">{representative.titulo}</span>
                            <span className="text-[12px] font-medium text-gray-500 mt-0.5">
                              Recorrente ({representative.periodo_recorrencia}) · {representative.duracao_meses} meses · {totalPagas}/{items.length} pagas
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-[55%] pl-4">
                          <div className="w-[18%] text-[13px] font-medium text-gray-600">{representative.categoria || '--'}</div>
                          <div className="w-[18%] text-[13px] font-medium text-gray-600">
                            {proximaAPagar ? new Date(proximaAPagar.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Todas pagas'}
                          </div>
                          <div className="w-[18%] text-[13.5px] font-semibold text-red-600">
                            -R$ {totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </div>
                          <div className="w-28 flex justify-end pr-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] font-bold whitespace-nowrap">
                              {items.length}x parcelas
                            </span>
                          </div>
                          <button onClick={(e) => handleDeleteGroup(grupoId, e)} className="w-8 flex justify-end text-gray-400 hover:text-red-500 transition-colors pr-1" title="Cancelar todas">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail rows */}
                      {isExpanded && items.map((d, subIdx) => (
                        <div key={d.id || subIdx} className={`flex items-center justify-between p-3 pl-16 pr-6 border-b border-gray-100/80 transition-colors ${d.is_paga ? 'bg-red-50/30' : 'bg-blue-50/20'}`}>
                          <div className="flex-1 flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: d.is_paga ? '#ef4444' : '#f97316' }}>
                              {d.is_paga && <Check size={10} strokeWidth={4} className="text-red-500" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-gray-700">Parcela {subIdx + 1}/{items.length}</span>
                              {d.is_paga && d.forma_pagamento && <span className="text-[11px] text-gray-500">Pago via {d.forma_pagamento}</span>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between w-[55%] pl-4">
                            <div className="w-[18%] text-[12px] font-medium text-gray-500">{d.categoria || '--'}</div>
                            <div className="w-[18%] text-[12px] font-medium text-gray-600">{new Date(d.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                            <div className="w-[18%] text-[13px] font-semibold text-red-600">-R$ {(d.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                            <div className="w-28 flex justify-end pr-2 gap-2">
                              {d.is_paga ? (
                                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold"><Check size={10} strokeWidth={3.5} /> Pago</span>
                              ) : (
                                <button onClick={(e) => handlePayDespesa(d.id!, e)} className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors rounded-full text-[10px] font-bold">
                                  <Check size={10} strokeWidth={3} /> Pagar
                                </button>
                              )}
                            </div>
                            <button onClick={(e) => handleDeleteDespesa(d.id!, e)} className="w-8 flex justify-end text-gray-400 hover:text-red-500 transition-colors pr-1" title="Excluir parcela"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'comissoes' && (
          <div className="flex-1 flex flex-col p-8 bg-white rounded-b-xl">
            {/* Header / Date Picker */}
            <div className="mb-10">
              <button className="flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 shadow-sm font-medium transition-colors">
                <Calendar size={16} className="text-gray-500" /> 19 de março - 19 de março
              </button>
            </div>

            {/* Profissionais comissionados */}
            <div className="mb-10">
              <h3 className="text-[14.5px] font-semibold text-[#5a6b7c] mb-4">Profissionais comissionados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">

                {configuredSpecialists.map(specialist => (
                  <div key={specialist.id} className="border border-gray-200 rounded-xl p-5 flex flex-col items-center bg-white shadow-sm relative group">
                    <div
                      onClick={() => setSelectedSpecialist(specialist)}
                      className="absolute top-4 right-3 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <MoreVertical size={20} />
                    </div>

                    <div className="w-28 h-28 mb-5 mt-2 relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-blue-50/40 rounded-full blur-xl"></div>
                      <div className="relative z-10 w-16 h-16 border-[3px] border-[#93c5fd] rounded-md transform -skew-x-12 rotate-[-10deg] flex items-center justify-center bg-[#bfdbfe]">
                        <div className="w-full h-2 bg-blue-100 absolute bottom-2"></div>
                      </div>
                    </div>

                    <div className="w-full text-left">
                      <h4 className="text-[14.5px] font-semibold text-gray-800">{specialist.name}</h4>
                      <div className="flex items-center justify-between mt-1 mb-5">
                        <div className="flex items-center gap-1.5 text-gray-600 font-medium text-[13px]">
                          R$ **** <Eye size={14} className="cursor-pointer hover:text-gray-800 transition-colors" />
                        </div>
                        <span className="bg-[#f1f5f9] text-[#475569] border border-gray-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          Em dia
                        </span>
                      </div>
                    </div>

                    <button className="w-full border border-gray-200 rounded-lg py-2 mt-auto text-xs font-bold text-gray-400 cursor-not-allowed bg-[#fafafa]">
                      Visualizar detalhes
                    </button>
                  </div>
                ))}

                {configuredSpecialists.length === 0 && (
                  <div className="col-span-full py-8 text-center text-sm text-gray-500">
                    Ainda não há profissionais configurados com comissões.
                  </div>
                )}
              </div>
            </div>

            {/* Profissionais não configurados */}
            <div>
              <h3 className="text-[14.5px] font-semibold text-[#5a6b7c] mb-4">Profissionais não configurados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {notConfiguredSpecialists.map(specialist => (
                  <div key={specialist.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between min-h-[140px]">
                    <h4 className="text-[14.5px] font-semibold text-gray-800 mb-6">{specialist.name}</h4>
                    <button
                      onClick={() => setSelectedSpecialist(specialist)}
                      className="w-full border border-[#cbd5e1] hover:bg-gray-50 rounded-lg py-2 text-xs font-bold text-gray-700 transition-colors mt-auto"
                    >
                      Configurar regras
                    </button>
                  </div>
                ))}

                {notConfiguredSpecialists.length === 0 && (
                  <div className="col-span-full py-8 text-center text-sm text-gray-500">
                    Nenhum profissional listado ou todos já estão configurados.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedSpecialist && (
          <ConfigComissionsModal
            specialist={selectedSpecialist}
            initialRules={commissionedSpecialists[selectedSpecialist.id] || []}
            onClose={() => setSelectedSpecialist(null)}
            onSave={(rules) => handleSaveRules(selectedSpecialist.id, rules)}
          />
        )}

        {showDetails === 'entradas' && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Detalhes de Entradas</h3>
                <button onClick={() => setShowDetails(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Pagamentos Registrados</h4>
                  {financialStats.transactions.filter(t => t.type === 'entrada').length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum pagamento registrado.</p>
                  ) : (
                    financialStats.transactions.filter(t => t.type === 'entrada').map(t => (
                      <div key={t.id} className="text-sm border-b border-gray-100 py-3 last:border-0 flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{t.treatmentName}</p>
                          <p className="text-gray-500 text-xs">Paciente: {t.patientName}</p>
                          {t.planFee > 0 && <p className="text-xs text-orange-600 mt-1">Custo retido plano: R$ {t.planFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${t.isPaid ? 'text-green-600' : 'text-blue-600'}`}>
                            R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                            {t.isPaid ? 'Recebido' : 'A receber em: '} {new Date(t.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Tratamentos Pendentes (Não Pagos)</h4>
                  {financialStats.transactions.filter(t => t.type === 'pendente').length === 0 ? (
                    <p className="text-sm text-gray-500">Não há valores totalmente em aberto.</p>
                  ) : (
                    financialStats.transactions.filter(t => t.type === 'pendente').map(t => (
                      <div key={t.id} className="text-sm border-b border-gray-100 py-3 last:border-0 flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{t.treatmentName}</p>
                          <p className="text-gray-500 text-xs">Paciente: {t.patientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[11px] font-medium text-gray-400 mt-0.5">Em aberto</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showDetails === 'saidas' && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Detalhes de Saídas</h3>
                <button onClick={() => setShowDetails(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {despesas.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">Nenhuma despesa registrada.</p>
                ) : (
                  despesas.map(d => (
                    <div key={d.id} className="text-sm border-b border-gray-100 py-3 last:border-0 flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{d.titulo}</p>
                        <p className="text-gray-500 text-xs text-blue-600 mt-1">{d.is_paga ? 'Pago em ' + new Date((d.data_pagamento || d.data_vencimento) + 'T12:00:00').toLocaleDateString() : 'A vencer em ' + new Date(d.data_vencimento + 'T12:00:00').toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-3">
                          <p className={`font-semibold ${d.is_paga ? 'text-red-500' : 'text-orange-500'}`}>-R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <button onClick={(e) => handleDeleteDespesa(d.id!, e)} className="text-gray-400 hover:text-red-500 transition-colors" title="Excluir/Cancelar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {d.anexo_url && (
                          <a href={d.anexo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                            Ver anexo
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {showDetails === 'addDespesa' && (
          <AddDespesaModal
            onClose={() => setShowDetails(null)}
            onSave={async (novaDespesa, file) => {
              const despesaToSave = { ...novaDespesa, empresa_id: empresaId };
              try {
                const savedArray = await expenseService.createExpense(despesaToSave as any, file);
                setDespesas([...(savedArray as DespesaType[]), ...despesas]);
                setShowDetails(null);
              } catch (error) {
                console.error("Falha ao salvar despesa", error);
                alert("Houve um erro ao salvar a despesa. Verifique sua conexão.");
              }
            }}
          />
        )}

      </div>
    </div>
  );
};

export default Financial;
