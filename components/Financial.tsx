import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, HelpCircle, X, ArrowDownRight, ArrowUpRight, Scale, Calendar, Filter, ArrowUp, Check, MoreVertical, Eye, Settings, Trash2, Edit3 } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { specialistService } from '../services/specialistService';
import { budgetService } from '../services/budgetService';
import { Specialist, CommissionRule } from '../types';
import { ConfigComissionsModal } from './ConfigComissionsModal';
import { AddDespesaModal, DespesaType } from './AddDespesaModal';
import { expenseService } from '../services/expenseService';
import { revenueService } from '../services/revenueService';
import { supabase } from '../lib/supabase';


interface ErrorBoundaryState { error: any; }
class FinancialErrorBoundary extends React.Component<any, ErrorBoundaryState> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: any) { return { error }; }
  componentDidCatch(error: any, info: any) { console.error('Financial Error:', error, info); }
  render() {
    if (this.state.error) return <div style={{padding: 40, color: 'red', background: '#fee2e2'}}>
      <h1>Error in Financial.tsx</h1><pre>{this.state.error.message}</pre><pre>{this.state.error.stack}</pre>
    </div>;
    return this.props.children;
  }
}

export const Financial: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'painel' | 'fluxo' | 'a_receber' | 'comissoes' | 'boletos'>('painel');
  const [faturamentoPeriod, setFaturamentoPeriod] = useState<'dia' | 'mes'>('dia');
  const [showFaturamentoDetails, setShowFaturamentoDetails] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'financeiro' && parts[2]) {
      const tab = parts[2] as 'painel' | 'fluxo' | 'a_receber' | 'comissoes' | 'boletos';
      if (['painel', 'fluxo', 'a_receber', 'comissoes', 'boletos'].includes(tab) && activeTab !== tab) {
        setActiveTab(tab);
      }
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'painel' | 'fluxo' | 'a_receber' | 'comissoes' | 'boletos') => {
    setActiveTab(tab);
    navigate(`/financeiro/${tab}`, { replace: true });
  };

  const [filterMonth, setFilterMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [showDetails, setShowDetails] = useState<'entradas' | 'saidas' | 'addDespesa' | 'addReceita' | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<{type: 'despesa' | 'receita', data: DespesaType, readOnly?: boolean} | null>(null);
  const [showCommissionsDetail, setShowCommissionsDetail] = useState<string | null>(null);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const { empresaId } = useCompany();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [commissionedSpecialists, setCommissionedSpecialists] = useState<Record<string, CommissionRule[]>>({});
  const [allDespesas, setAllDespesas] = useState<DespesaType[]>([]);
  const [allReceitas, setAllReceitas] = useState<any[]>([]);
  const [allBudgets, setAllBudgets] = useState<any[]>([]);
  const [maquininhas, setMaquininhas] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    if (empresaId) {
      specialistService.fetchSpecialists(empresaId).then(data => {
        setSpecialists(data);
        const mapRules: Record<string, CommissionRule[]> = {};
        data.forEach(s => {
          if (s.comissoes && s.comissoes.length > 0) {
            mapRules[s.id] = s.comissoes;
          }
        });
        setCommissionedSpecialists(mapRules);
      }).catch(console.error);
      budgetService.fetchAllCompanyBudgets(empresaId).then(setAllBudgets).catch(console.error);

      expenseService.fetchExpenses(empresaId)
        .then((data) => setAllDespesas(data as DespesaType[]))
        .catch(console.error);

      revenueService.fetchRevenues(empresaId)
        .then((data) => setAllReceitas(data))
        .catch(console.error);

      supabase.from('maquininhas').select('*').eq('empresa_id', empresaId)
        .then(({ data, error }) => { if (error) console.error(error); else setMaquininhas(data || []); });

      supabase.from('Empresa').select('*').eq('id', empresaId).single()
        .then(({ data }) => setCompanySettings(data));
    }
  }, [empresaId]);

  const handleDeleteDespesa = async (id: string, isReceita: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Deseja realmente cancelar/excluir esta ${isReceita ? 'receita' : 'despesa'}?`)) {
      if (isReceita) {
          await revenueService.deleteRevenue(id);
          setAllReceitas(prev => prev.filter(r => r.id !== id));
      } else {
          await expenseService.deleteExpense(id);
          setAllDespesas(prev => prev.filter(d => d.id !== id));
      }
    }
  };

  const handlePayDespesa = async (id: string, isReceita: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(isReceita ? "Confirmar o recebimento?" : "Confirmar o pagamento?")) {
      if (isReceita) {
          await revenueService.payRevenue(id, 'Dinheiro');
          setAllReceitas(prev => prev.map(r => r.id === id ? { ...r, is_paga: true, data_pagamento: new Date().toISOString().split('T')[0], forma_pagamento: 'Dinheiro' } : r));
      } else {
          const success = await expenseService.payExpense(id, 'Dinheiro');
          if (id) {
            setAllDespesas(prev => prev.map(d => d.id === id ? { ...d, is_paga: true, data_pagamento: new Date().toISOString().split('T')[0], forma_pagamento: 'Dinheiro' } : d));
          }
      }
    }
  };

  const handleSaveTransaction = async (data: DespesaType, files: any) => {
    if (!empresaId) return;
    try {
      const isReceita = data.tipo === 'receita' || editingTransaction?.type === 'receita';
      
      if (editingTransaction?.data?.id) {
        if (isReceita) {
          await revenueService.updateRevenue(editingTransaction.data.id, data as any, files);
        } else {
          await expenseService.updateExpense(editingTransaction.data.id, data, files);
        }
      } else {
        if (isReceita) {
          await revenueService.createRevenue({ ...data, empresa_id: empresaId } as any, files);
        } else {
          await expenseService.createExpense({ ...data, empresa_id: empresaId }, files);
        }
      }
      const refreshedD = await expenseService.fetchExpenses(empresaId);
      const refreshedR = await revenueService.fetchRevenues(empresaId);
      setAllDespesas(refreshedD as DespesaType[]);
      setAllReceitas(refreshedR);
      setShowDetails(null);
      setEditingTransaction(null);
    } catch (err: any) {
      console.error("Save transaction error:", err);
      alert(`Erro detalhado ao salvar: ${err?.message || JSON.stringify(err)}`);
    }
  };

  const handleDeleteGroup = async (grupoId: string, isReceita: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Deseja cancelar TODAS as cobranças desta ${isReceita ? 'receita' : 'despesa'} recorrente?`)) {
      if (isReceita) {
          await revenueService.deleteRevenueGroup(grupoId);
          setAllReceitas(prev => prev.filter(r => r.grupo_recorrente !== grupoId));
      } else {
          await expenseService.deleteExpenseGroup(grupoId);
          setAllDespesas(prev => prev.filter(d => d.grupo_recorrente !== grupoId));
      }
      setExpandedGroup(null);
    }
  };

  const handlePayCommissions = async () => {
    if (!empresaId) return;
    const listToPay = financialStats.comissoesList.filter(c => selectedCommissions.has(c.id));
    if (listToPay.length === 0) return;

    // Process payments (Update budget isComissaoPaga & Create expenses)
    for (const com of listToPay) {
      const b = allBudgets.find(b => b.id === com.budgetId);
      if (b) {
        let updated = false;
        (b.tratamentos || b.treatments || []).forEach((t: any) => {
          if (t.id === com.treatmentId || t.treatmentName === com.treatmentName || t.tratamento === com.treatmentName) {
            if (com.paymentId) {
              const p = t.payments?.find((pay: any) => pay.id === com.paymentId);
              if (p) {
                p.isComissaoPaga = true;
                updated = true;
              }
            } else {
              t.isComissaoPaga = true;
              updated = true;
            }
          }
        });
        if (updated) {
          const budgetPayload = {
            id: b.id,
            name: b.nome || b.name || '',
            date: b.data_orcamento || b.date || '',
            total: b.total,
            status: b.status,
            treatments: b.tratamentos || b.treatments || []
          };
          const pacId = b.paciente?.id || b.paciente_id || 0;
          await budgetService.saveBudget(empresaId, pacId, budgetPayload as any);
        }
      }

      // Register Expense
      await expenseService.createExpense({
        titulo: `Comissão - ${com.treatment} (${com.paciente})`,
        valor: com.amount,
        categoria: 'Comissões',
        is_paga: true,
        empresa_id: empresaId,
        data_vencimento: new Date().toISOString().split('T')[0],
        data_pagamento: new Date().toISOString().split('T')[0],
        forma_pagamento: 'Transferência'
      } as any, null);
    }

    alert('Comissões pagas e registradas como despesas com sucesso!');
    setSelectedCommissions(new Set());

    // Recarregar os dados localmente
    budgetService.fetchAllCompanyBudgets(empresaId).then(setAllBudgets).catch(console.error);
    expenseService.fetchExpenses(empresaId).then((data) => setAllDespesas(data as DespesaType[])).catch(console.error);
  };

  const parseDateStr = (dateStr?: string) => {
    if (!dateStr) return null;
    let parsedStr = dateStr;
    if (typeof dateStr === 'string' && dateStr.includes('/') && dateStr.split('/')[0].length === 2) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) parsedStr = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`;
    } else if (typeof dateStr === 'string' && !dateStr.includes('T')) {
      if (dateStr.length <= 10) {
        parsedStr = dateStr + 'T12:00:00';
      } else {
        parsedStr = dateStr.replace(' ', 'T');
      }
    }
    const d = new Date(parsedStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const isDateInFilter = (dateStr?: string) => {
    if (filterMonth === 'all') return true;
    const d = parseDateStr(dateStr);
    if (!d) return false;
    return (d.getMonth() + 1).toString() === filterMonth && d.getFullYear().toString() === filterYear;
  };

  const despesas = useMemo(() => allDespesas.filter(d => isDateInFilter(d.data_pagamento || d.data_vencimento)), [allDespesas, filterMonth, filterYear]);
  const receitas = useMemo(() => allReceitas.filter(r => isDateInFilter(r.data_pagamento || r.data_vencimento)), [allReceitas, filterMonth, filterYear]);

  const gruposRecorrentes = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const processItems = (items: any[], typeTag: string) => {
      items.forEach(d => {
        if (d.is_recorrente && d.grupo_recorrente) {
          if (!groups[d.grupo_recorrente]) groups[d.grupo_recorrente] = [];
          groups[d.grupo_recorrente].push({...d, tipoOrigem: typeTag});
        }
      });
    };
    processItems(allDespesas, 'despesa');
    processItems(allReceitas, 'receita');
    
    // Sort each group by date
    Object.values(groups).forEach(g => g.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
    return groups;
  }, [allDespesas, allReceitas]);

  const faturamentoStats = useMemo(() => {
    let total = 0;
    let totalTaxas = 0;
    const byMethod: Record<string, number> = {};
    const items: any[] = [];

    const isDateInFaturamentoFilter = (dateStr?: string) => {
      const d = parseDateStr(dateStr);
      if (!d) return false;
      const now = new Date();
      if (faturamentoPeriod === 'dia') {
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
    };

    // 1. Vendas de Tratamentos (Bruto)
    allBudgets.forEach(b => {
      if (b.status !== 'Aprovado') return;
      (b.tratamentos || b.treatments || []).forEach((t: any) => {
        if (t.payments && t.payments.length > 0) {
          t.payments.forEach((p: any) => {
            if (!p) return;
            const saleDate = b.data_orcamento || b.date || b.created_at || new Date().toISOString();
            const pDate = p.date || p.receiveDate || new Date().toISOString();
            if (isDateInFaturamentoFilter(saleDate)) {
              const amount = parseFloat(p.amount) || 0;
              let netReceived = p.planAmount !== undefined && p.planAmount !== null && p.planAmount !== '' ? parseFloat(p.planAmount) : amount;
              const maq = maquininhas.find((m: any) => m.id === p.maquininha_id);
              if (p.method === 'Pix') {
                  if (maq && maq.pix_fee) {
                      netReceived -= netReceived * (Number(maq.pix_fee) / 100);
                  }
              } else if (p.method === 'Débito') {
                  if (maq && maq.debito_fee) {
                      netReceived -= netReceived * (Number(maq.debito_fee) / 100);
                  }
              } else if (p.method === 'Crédito') {
                  let installments = p.installments || 1;
                  if (maq && maq.credito_fees) {
                      let fee = 0;
                      if (installments === 1 && maq.credito_fees.length > 0) fee = Number(maq.credito_fees[0]);
                      else if (maq.credito_fees.length >= installments) fee = Number(maq.credito_fees[installments - 1]);
                      netReceived -= netReceived * (fee / 100);
                  }
              } else if (p.method === 'Boleto') {
                  const boletoFee = Number(companySettings?.configuracoes?.taxaBoleto) || 0;
                  netReceived -= boletoFee;
              }
              const taxes = amount - netReceived;
              total += amount;
              totalTaxas += taxes;

              const method = p.method || 'Outros';
              byMethod[method] = (byMethod[method] || 0) + amount;
              items.push({
                id: Math.random().toString(),
                title: t.treatmentName || t.tratamento || 'Tratamento',
                paciente: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
                amount: amount,
                method: method,
                date: pDate,
                type: 'Tratamento'
              });
            }
          });
        }
      });
    });

    // 2. Entradas Manuais (exclui Tratamentos já contados acima)
    allReceitas.forEach(r => {
      const isFromTreatment = !!(r.orcamento_id || r.tratamento_id || r.payment_id);
      if (r.categoria === 'Tratamentos' || isFromTreatment) return;
      const rDate = r.created_at || r.data_pagamento || r.data_vencimento || new Date().toISOString();
      if (isDateInFaturamentoFilter(rDate)) {
        const amount = Number(r.valor) || 0;
        total += amount;
        const method = r.forma_pagamento || 'Outros';
        byMethod[method] = (byMethod[method] || 0) + amount;
        items.push({
          id: Math.random().toString(),
          title: r.titulo || 'Entrada Manual',
          paciente: r.paciente?.nome || r.paciente?.nome_completo || '-',
          amount: amount,
          method: method,
          date: rDate,
          type: 'Manual'
        });
      }
    });

    const breakdown = Object.entries(byMethod)
      .map(([name, val]) => ({ name, val, perc: total > 0 ? (val / total) * 100 : 0 }))
      .sort((a, b) => b.val - a.val);

    // Sort items by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { total, totalTaxas, totalLiquido: total - totalTaxas, breakdown, items };
  }, [allBudgets, allReceitas, faturamentoPeriod, maquininhas, companySettings]);

  const despesasAgrupadas = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const singles: any[] = [];

    const processItems = (items: any[], typeTag: string) => {
      items.forEach(d => {
        const item = {...d, tipoOrigem: typeTag};
        if (d.is_recorrente && d.grupo_recorrente) {
          if (!groups[d.grupo_recorrente]) groups[d.grupo_recorrente] = [];
          groups[d.grupo_recorrente].push(item);
        } else {
          singles.push(item);
        }
      });
    };
    processItems(despesas, 'despesa');

    // Sort each group by date
    Object.values(groups).forEach(g => g.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));

    const result: ({ type: 'group'; grupoId: string; items: any[]; representative: any } | { type: 'single'; item: any })[] = [];

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
  }, [despesas, receitas]);

  const renderDateFilters = () => (
    <div className="flex items-center gap-3">
      <div className="relative border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors">
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="appearance-none bg-transparent pl-4 pr-10 py-1.5 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer">
          <option value="all">Todo o Período</option>
          <option value="1">Janeiro</option>
          <option value="2">Fevereiro</option>
          <option value="3">Março</option>
          <option value="4">Abril</option>
          <option value="5">Maio</option>
          <option value="6">Junho</option>
          <option value="7">Julho</option>
          <option value="8">Agosto</option>
          <option value="9">Setembro</option>
          <option value="10">Outubro</option>
          <option value="11">Novembro</option>
          <option value="12">Dezembro</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
          <ChevronDown size={14} />
        </div>
      </div>

      <div className="relative border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors">
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="appearance-none bg-transparent pl-4 pr-10 py-1.5 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer">
          <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
          <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
          <option value={new Date().getFullYear() + 2}>{new Date().getFullYear() + 2}</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
          <ChevronDown size={14} />
        </div>
      </div>
    </div>
  );

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
      const cName = (convenioName || '').toLowerCase().trim();
      const tName = (trtName || '').toLowerCase().trim();

      return rules.find(r => {
        const rc = (r.convenio || '').toLowerCase().trim();
        const re = (r.especialidade || '').toLowerCase().trim();
        return (rc === 'todos' || rc === cName || (rc === 'particular' && cName === 'particular')) &&
          (re === 'todas' || re === tName);
      });
    };

    allBudgets.forEach(b => {
      if (b.status !== 'Aprovado') return;
      const pacId = b.paciente?.id || b.paciente_id || '';

      (b.tratamentos || b.treatments || []).forEach((t: any) => {
        const trtName = t.treatmentName || t.tratamento || 'Outro';
        const convenioName = t.convenio || 'Particular';
        const itemVal = parseFloat(t.valor || 0);
        let paidOnTrt = 0;

        const normalizeName = (name: string) => name.replace(/Dr\(a\)\s*/gi, '').trim().toLowerCase();
        const matchedSpec = specialists.find(s =>
          normalizeName(s.name) === normalizeName(t.profissional) ||
          t.profissional.toLowerCase().includes(normalizeName(s.name)) ||
          s.name.toLowerCase().includes(normalizeName(t.profissional))
        );
        const profId = matchedSpec?.id;
        const profRules = profId ? commissionedSpecialists[profId] : undefined;
        const rule = getCommissionRule(profRules, trtName, convenioName);
        const profNameForCommission = matchedSpec?.name || t.profissional;
        if (t.payments && t.payments.length > 0) {
          t.payments.forEach((p: any) => {
            if (!p) return;
            if (p.method === 'Boleto' && p.status !== 'Pago' && !p.isPaid) return; // Ignore unpaid boletos
            const patientPaid = parseFloat(p.amount) || 0;
            paidOnTrt += patientPaid;
            
            const pDate = p.date || p.receiveDate || new Date().toISOString();
            if (isDateInFilter(pDate)) {
               let netReceived = p.planAmount !== undefined && p.planAmount !== null && p.planAmount !== '' ? parseFloat(p.planAmount) : patientPaid;
               const maq = maquininhas.find(m => m.id === p.maquininha_id);
               if (p.method === 'Pix') {
                   if (maq && maq.pix_fee) {
                       netReceived -= netReceived * (Number(maq.pix_fee) / 100);
                   }
               } else if (p.method === 'Débito') {
                   if (maq && maq.debito_fee) {
                       netReceived -= netReceived * (Number(maq.debito_fee) / 100);
                   }
               } else if (p.method === 'Crédito') {
                   let installments = p.installments || 1;
                   if (maq && maq.credito_fees) {
                       let fee = 0;
                       if (installments === 1 && maq.credito_fees.length > 0) fee = Number(maq.credito_fees[0]);
                       else if (maq.credito_fees.length >= installments) fee = Number(maq.credito_fees[installments - 1]);
                       netReceived -= netReceived * (fee / 100);
                   }
               } else if (p.method === 'Boleto' && (p.isPaid === true || p.status === 'Pago')) {
                   const boletoFee = Number(companySettings?.configuracoes?.taxaBoleto) || 0;
                   netReceived -= boletoFee;
               }
               const diff = patientPaid - netReceived;
               if (diff > 0) planTaxesTotal += diff;
            }
            
            // Calculate apos_pagamento commission
            if (rule && rule.quandoRecebe === 'apos_pagamento') {
              let valComissao = 0;
              const valRegra = parseFloat(String(rule.valor).replace(',', '.'));
              if (rule.tipoComissao === 'porcentagem') {
                valComissao = patientPaid * (valRegra / 100);
              } else {
                const prop = itemVal > 0 ? (patientPaid / itemVal) : 1;
                valComissao = valRegra * prop;
              }
              if (valComissao > 0) {
                comissoesTotal += valComissao;
                comissoesList.push({
                  id: 'com_pg_' + p.id,
                  budgetId: b.id,
                  treatmentId: t.id,
                  paymentId: p.id,
                  treatmentName: trtName,
                  profissional: profNameForCommission,
                  treatment: trtName,
                  date: p.date || p.receiveDate || new Date().toISOString(),
                  amount: valComissao,
                  paciente: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
                  status: p.isComissaoPaga ? 'Repassado' : 'A repassar',
                  valorLiquido: patientPaid,
                  custo: 0, // plan fee logic moved to physical revenues
                  ruleInfo: `Convênio ${convenioName} > ${rule.especialidade === 'todas' ? 'Todas as Especialidades' : rule.especialidade} > ${rule.valor}${rule.tipoComissao === 'porcentagem' ? '%' : ' R$'}`
                });
              }
            }
          });
        }

        const remaining = Math.max(0, itemVal - paidOnTrt);

        if (remaining > 0 && (t.status === 'Em andamento' || t.status === 'Finalizado' || t.status === 'Concluído')) {
          const pendDate = b.data_orcamento || b.date || b.created_at || new Date().toISOString();
          if (isDateInFilter(pendDate)) {
            pendingTotal += remaining;

            // Consider inadimplente if treatment is finalized but not paid, or older than 30 days
            if (t.status === 'Finalizado' || t.status === 'Concluído' || ((b.data_orcamento || b.date) && (() => { const pd = parseDateStr(b.data_orcamento || b.date); return pd ? pd.getTime() < new Date().getTime() - 1000 * 60 * 60 * 24 * 30 : false; })())) {
              inadimplenciaAmount += remaining;
              if (pacId) patientsInad.add(pacId);
            }

            transactions.push({
              id: t.id + '_pend',
              treatmentName: trtName,
              patientName: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
              cpf: b.paciente?.cpf || '',
              date: b.data_orcamento || b.date || b.created_at,
              amount: remaining,
              originalAmount: remaining,
              planFee: 0,
              isPaid: false,
              type: 'pendente',
              patientId: pacId
            });
          }
        }

        // Treatments sum
        if (itemVal > 0 && isDateInFilter(b.data_orcamento || b.date || b.created_at)) {
          if (!treatmentsSummary[trtName]) {
            treatmentsSummary[trtName] = { count: 0, amount: 0 };
          }
          treatmentsSummary[trtName].count += 1;
          treatmentsSummary[trtName].amount += itemVal;
        }

        // Calculate apos_procedimento commission
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
              comissoesTotal += valComissao;
              comissoesList.push({
                id: 'com_proc_' + t.id,
                budgetId: b.id,
                treatmentId: t.id,
                paymentId: null,
                treatmentName: trtName,
                profissional: profNameForCommission,
                treatment: trtName,
                date: b.updated_at || b.created_at || new Date().toISOString(),
                amount: valComissao,
                paciente: b.paciente?.nome || b.paciente?.nome_completo || 'Paciente',
                status: t.isComissaoPaga ? 'Repassado' : 'A repassar',
                valorLiquido: itemVal,
                custo: 0,
                ruleInfo: `Procedimento Concluído > Convênio ${convenioName} > ${rule.especialidade === 'todas' ? 'Todas as Especialidades' : rule.especialidade} > ${rule.valor}${rule.tipoComissao === 'porcentagem' ? '%' : ' R$'}`
              });
            }
          }
        }
      });
    });

    receitas.forEach(r => {
      const netReceived = r.valor;
      const isFromTreatment = !!(r.orcamento_id || r.tratamento_id || r.payment_id);

      if (r.is_paga) {
        paidTotal += netReceived;
      } else {
        if (!isFromTreatment) {
          pendingTotal += netReceived;
        }
      }

      if (r.is_paga || !isFromTreatment) {
        transactions.push({
          id: r.id || ('rec_' + Math.random()),
          treatmentName: r.titulo,
          patientName: 'Receita (' + (r.categoria || 'Outros') + ')',
          cpf: '',
          date: r.data_pagamento || r.data_vencimento,
          amount: r.valor,
          originalAmount: r.valor,
          planFee: 0,
          isPaid: r.is_paga,
          type: r.is_paga ? 'entrada' : 'pendente',
          isManualRevenue: true,
          patientId: r.cliente_id,
          rawData: { ...r, tipo: 'receita' } // Keep reference for editing and identify as receita
        });
      }
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
          type: 'saida',
          patientId: d.cliente_id,
          rawData: { ...d, tipo: 'despesa' } // Keep reference for editing
        });
      }
    });

    comissoesList.forEach(c => {
      if (c.status === 'A repassar') {
        transactions.push({
          id: c.id,
          treatmentName: `Comissão - ${c.treatment}`,
          patientName: `Despesa (${c.profissional})`,
          cpf: '',
          date: c.date,
          amount: c.amount,
          originalAmount: c.amount,
          planFee: 0,
          isPaid: false,
          type: 'saida', // It will be treated as an expense in Fluxo
          rawData: { ...c, tipo: 'despesa' }
        });
      }
    });

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalBalance = paidTotal + pendingTotal;

    const topTreatments = Object.entries(treatmentsSummary)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const methodsTotalAmount = Object.values(methodsSummary).reduce((a, b) => a + b, 0);

    const methodsData = Object.entries(methodsSummary)
      .map(([name, amount]) => ({ name, amount, perc: methodsTotalAmount > 0 ? (amount / methodsTotalAmount) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    return {
      paidTotal, pendingTotal, totalBalance, transactions,
      inadimplenciaAmount, inadimplenciaCount: patientsInad.size,
      topTreatments, methodsData, planTaxesTotal, comissoesTotal, comissoesList
    };
  }, [allBudgets, commissionedSpecialists, specialists, filterMonth, filterYear, despesas, receitas, maquininhas, companySettings]);

  const boletosData = useMemo(() => {
    const vencidos: any[] = [];
    const aVencer: any[] = [];
    const pagos: any[] = [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const boletosMap = new Map<string, any>();

    allBudgets.forEach(b => {
      const treatments = b.tratamentos || b.treatments;
      if (!treatments) return;
      treatments.forEach((t: any) => {
        if (!t.payments) return;
        t.payments.forEach((p: any) => {
          if (p.method === 'Boleto' && p.status_asaas !== 'DELETED') {
            const dateStr = p.date || p.receiveDate || new Date().toISOString();
            const parsedD = parseDateStr(dateStr) || new Date();
            const pDate = new Date(parsedD);
            pDate.setHours(0,0,0,0);
            
            const groupKey = p.asaas_payment_id || p.id;

            if (boletosMap.has(groupKey)) {
                const existing = boletosMap.get(groupKey);
                const tName = t.treatmentName || t.tratamento;
                if (!existing.tratamentoNome.includes(tName)) {
                    existing.tratamentoNome += ` + ${tName}`;
                }
            } else {
                const boletoObj = {
                   id: p.id,
                   budgetId: b.id,
                   paciente: b.paciente?.nome || b.paciente?.nome_completo || 'Desconhecido',
                   pacienteId: b.paciente?.id || b.paciente_id,
                   tratamentoId: t.id,
                   tratamentoNome: t.treatmentName || t.tratamento,
                   valor: parseFloat(p.amount) || 0,
                   dataVencimento: pDate,
                   dataStr: dateStr,
                   status: p.status_asaas === 'RECEIVED' ? 'Pago' : 'Pendente',
                   observacao: p.observations || '',
                   asaas_payment_id: p.asaas_payment_id,
                   link_boleto: p.link_boleto,
                   linha_digitavel: p.linha_digitavel,
                   paymentRaw: p,
                   treatmentRaw: t,
                   budgetRaw: b
                };
                boletosMap.set(groupKey, boletoObj);
            }
          }
        });
      });
    });

    boletosMap.forEach((boletoObj) => {
        if (boletoObj.status === 'Pago') {
           if (isDateInFilter(boletoObj.dataStr)) {
             pagos.push(boletoObj);
           }
        } else {
           if (boletoObj.paymentRaw.status_asaas === 'OVERDUE' || (boletoObj.paymentRaw.status_asaas !== 'RECEIVED' && boletoObj.dataVencimento < hoje)) {
             vencidos.push(boletoObj);
           } else {
             aVencer.push(boletoObj);
           }
        }
    });
    
    vencidos.sort((a,b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());
    aVencer.sort((a,b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());
    pagos.sort((a,b) => b.dataVencimento.getTime() - a.dataVencimento.getTime());

    return { vencidos, aVencer, pagos };
  }, [allBudgets, filterMonth, filterYear]);

  const handleCancelBoleto = async (boleto: any) => {
    if (!empresaId) return;
    if (window.confirm(`Confirma o cancelamento deste boleto de R$ ${boleto.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}?`)) {
       try {
         const cancelUrl = import.meta.env.VITE_N8N_CANCEL_BOLETO_URL;
         if (cancelUrl && boleto.asaas_payment_id) {
             const n8nRes = await fetch(cancelUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ asaas_payment_id: boleto.asaas_payment_id })
             });
             if (!n8nRes.ok) {
                 throw new Error("Falha ao comunicar com n8n/Asaas para cancelar.");
             }
         }
       
         // Atualiza o orçamento no banco
         boleto.paymentRaw.status_asaas = 'DELETED';
         boleto.paymentRaw.status = 'Cancelado';
         
         const treatmentsCopy = JSON.parse(JSON.stringify(boleto.budgetRaw.tratamentos || boleto.budgetRaw.treatments || []));
         
         // Encontra e atualiza o tratamento e o pagamento específico
         const tIdx = treatmentsCopy.findIndex((t: any) => t.id === boleto.tratamentoId);
         if (tIdx !== -1) {
             const pIdx = treatmentsCopy[tIdx].payments?.findIndex((p: any) => p.id === boleto.paymentRaw.id);
             if (pIdx !== -1) {
                 treatmentsCopy[tIdx].payments[pIdx].status_asaas = 'DELETED';
                 treatmentsCopy[tIdx].payments[pIdx].status = 'Cancelado';
             }
         }

         const budgetPayload = {
            id: boleto.budgetRaw.id,
            name: boleto.budgetRaw.nome || boleto.budgetRaw.name || '',
            date: boleto.budgetRaw.data_orcamento || boleto.budgetRaw.date || '',
            total: boleto.budgetRaw.total,
            status: boleto.budgetRaw.status,
            treatments: treatmentsCopy
         };
         
         await budgetService.saveBudget(empresaId, boleto.pacienteId, budgetPayload as any);
         
         const { data: receita } = await supabase.from('receitas').select('*').eq('payment_id', boleto.paymentRaw.id).single();
         if (receita) {
            await supabase.from('receitas').update({ status_asaas: 'DELETED' }).eq('id', receita.id);
         }
         
         alert('Boleto cancelado com sucesso!');
         
         // Recarrega os dados
         budgetService.fetchAllCompanyBudgets(empresaId).then(setAllBudgets).catch(console.error);
         revenueService.fetchRevenues(empresaId).then(setAllReceitas).catch(console.error);
       } catch (err: any) {
         console.error(err);
         alert(`Erro ao cancelar boleto: ${err?.message || err}`);
       }
    }
  };

  const handleSaveRules = async (specialistId: string, rules: CommissionRule[]) => {
    // Optimistic UI Update
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

    // Save to Cloud via Service
    const spec = specialists.find(s => s.id === specialistId);
    if (spec && empresaId) {
      try {
        await specialistService.updateSpecialist(empresaId, {
          ...spec,
          comissoes: rules
        });
      } catch (err) {
        console.error('Failed to sync commissions to cloud:', err);
      }
    }
  };

  const configuredSpecialists = specialists.filter(s => !!commissionedSpecialists[s.id]);
  const notConfiguredSpecialists = specialists.filter(s => !commissionedSpecialists[s.id]);

  const incomeVsExpense = useMemo(() => {
    const received = financialStats.paidTotal;
    const paid = despesas.filter(d => d.is_paga).reduce((acc, d) => acc + (d.valor || 0), 0) + financialStats.planTaxesTotal;
    const maxVal = Math.max(received, paid) || 1;
    return [
      { label: 'Entradas', value: received, color: 'bg-emerald-500', perc: (received / maxVal) * 100 },
      { label: 'Saídas (inc. taxas)', value: paid, color: 'bg-red-500', perc: (paid / maxVal) * 100 }
    ];
  }, [financialStats.paidTotal, despesas, financialStats.planTaxesTotal]);

  const commissionsBySpecialist = useMemo(() => {
    const map: Record<string, number> = {};
    financialStats.comissoesList.forEach(c => {
      const prof = c.profissional || 'Outro';
      if (!map[prof]) map[prof] = 0;
      map[prof] += c.amount;
    });
    const items = Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    const maxVal = items.length > 0 ? items[0].total : 1;
    return items.map(item => ({ ...item, perc: (item.total / maxVal) * 100 }));
  }, [financialStats.comissoesList]);

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-500 min-h-full">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowDetails('addReceita')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Nova Receita
          </button>
          <button 
            onClick={() => setShowDetails('addDespesa')}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1">

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 md:px-8 border-b border-gray-200 pt-2 gap-4 md:gap-6 hide-scrollbar">
          <button
            onClick={() => handleTabChange('painel')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'painel'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            Painel
          </button>
          <button
            onClick={() => handleTabChange('fluxo')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fluxo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            Fluxo de caixa
          </button>
          <button
            onClick={() => handleTabChange('a_receber')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'a_receber'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            A Receber
          </button>
          <button
            onClick={() => handleTabChange('comissoes')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'comissoes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            Comissões
          </button>
          <button
            onClick={() => handleTabChange('boletos')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'boletos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            Boletos
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'painel' && (
          <div className="flex-1 flex flex-col p-4 md:p-8">

            {/* Faturamento Block */}
            <div className="mb-10 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl shadow-lg p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-white tracking-wide">Faturamento Bruto</h2>
                    <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10">
                      <button
                        onClick={() => setFaturamentoPeriod('dia')}
                        className={`px-3 py-1 rounded-md text-[13px] font-semibold transition-all ${faturamentoPeriod === 'dia' ? 'bg-white text-indigo-900 shadow-sm' : 'text-blue-100 hover:text-white'}`}
                      >
                        Hoje
                      </button>
                      <button
                        onClick={() => setFaturamentoPeriod('mes')}
                        className={`px-3 py-1 rounded-md text-[13px] font-semibold transition-all ${faturamentoPeriod === 'mes' ? 'bg-white text-indigo-900 shadow-sm' : 'text-blue-100 hover:text-white'}`}
                      >
                        Este Mês
                      </button>
                    </div>
                  </div>
                  <span className="text-blue-200 text-sm mb-4">Total vendido, independente de parcelamento.</span>
                  
                  <div className="text-4xl md:text-5xl font-black text-white flex items-baseline gap-2 mb-4">
                    <span className="text-2xl text-blue-300 font-bold">R$</span>
                    {faturamentoStats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="flex flex-col gap-1.5 pt-4 border-t border-white/20 w-fit pr-8">
                    <div className="flex items-center gap-2 text-red-300 text-[13px] font-medium">
                      <span>(–) Taxas de Intermediação (Cartão/Boleto):</span>
                      <span className="font-bold">R$ {faturamentoStats.totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-300 text-[14px] font-bold">
                      <span>(=) Receita Líquida:</span>
                      <span className="text-lg">R$ {faturamentoStats.totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowFaturamentoDetails(true)}
                    className="mt-6 text-[12px] font-semibold bg-white/10 hover:bg-white/20 text-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-white/10 flex items-center gap-1 w-fit"
                  >
                    <Eye size={14} /> Ver detalhes
                  </button>
                </div>

                {faturamentoStats.breakdown.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[280px]">
                    <h3 className="text-blue-100 text-[13px] font-bold uppercase tracking-wider mb-3">Composição</h3>
                    <div className="space-y-3">
                      {faturamentoStats.breakdown.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[13px] font-medium text-white">
                            <span className="flex items-center gap-1.5">
                              {item.name === 'Crédito' && <div className="w-2 h-2 rounded-full bg-pink-400"></div>}
                              {item.name === 'Débito' && <div className="w-2 h-2 rounded-full bg-blue-400"></div>}
                              {item.name === 'Pix' && <div className="w-2 h-2 rounded-full bg-emerald-400"></div>}
                              {item.name === 'Dinheiro' && <div className="w-2 h-2 rounded-full bg-yellow-400"></div>}
                              {item.name === 'Boleto' && <div className="w-2 h-2 rounded-full bg-orange-400"></div>}
                              {!['Crédito', 'Débito', 'Pix', 'Dinheiro', 'Boleto'].includes(item.name) && <div className="w-2 h-2 rounded-full bg-purple-400"></div>}
                              {item.name}
                            </span>
                            <span>R$ {item.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                item.name === 'Crédito' ? 'bg-pink-400' :
                                item.name === 'Débito' ? 'bg-blue-400' :
                                item.name === 'Pix' ? 'bg-emerald-400' :
                                item.name === 'Dinheiro' ? 'bg-yellow-400' :
                                item.name === 'Boleto' ? 'bg-orange-400' : 'bg-purple-400'
                              }`} 
                              style={{ width: `${Math.max(2, item.perc)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6 md:mb-8">
              <div className="flex flex-col">
                 <h2 className="text-[1.1rem] font-medium text-gray-800">Fluxo de Caixa (Realizado vs Previsto)</h2>
                 <span className="text-xs text-gray-400 mt-0.5">Baseado nas datas de vencimento/recebimento de cada parcela.</span>
              </div>
              {renderDateFilters()}
            </div>

            {/* Financial Grid Data */}
            <div className="flex flex-col border-b border-gray-200 pb-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {/* Entradas */}
                <div className="flex flex-col px-0 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 first:pl-0 pb-4 md:pb-0">
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
                <div className="flex flex-col px-0 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 pt-4 md:pt-0">
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
                      <span className="text-sm text-gray-800 font-medium">R$ {(despesas.filter(d => !d.is_paga).reduce((a, b) => a + (b.valor || 0), 0) + financialStats.comissoesList.filter(c => c.status === 'A repassar').reduce((sum, c) => sum + (c.amount || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm text-gray-500">Total previsto</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {despesas.reduce((acc, d) => acc + (d.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Taxas pagas / Planos */}
                <div className="flex flex-col px-0 md:px-6 pt-4 md:pt-0">
                  <div className="flex flex-col items-start justify-start mb-6 w-full">
                    <h3 className="text-sm font-medium text-gray-800">Taxas e Deduções</h3>
                    <span className="text-xs text-gray-400 mt-1">Custos retidos por operadoras e maquininhas</span>
                  </div>
                  <div className="space-y-4">
                    <div className="text-[28px] font-bold text-gray-800 mt-2">
                      R$ {financialStats.planTaxesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1">

              {/* Aguardando Repasse */}
              <div className="flex flex-col px-0 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 first:pl-0 min-h-[160px] h-full overflow-hidden pb-4 md:pb-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-medium text-gray-800 w-full">Aguardando repasse (A receber)</h3>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded whitespace-nowrap" title="Total global (todos os meses)">
                    Total: R$ {allReceitas.filter(r => !r.is_paga).reduce((s, r) => s + (r.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="max-h-[160px] overflow-y-auto w-full pr-2 space-y-3">
                    {(() => {
                      const repassesPendentes = allReceitas.filter(r => !r.is_paga).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
                      if (repassesPendentes.length === 0) {
                        return <div className="text-center text-xs text-gray-500 mt-8">Não há pagamentos aguardando repasse.</div>;
                      }
                      return repassesPendentes.map((r, idx) => (
                        <div key={r.id || idx} onClick={() => r.cliente_id ? navigate(`/pacientes/${r.cliente_id}/pagamentos`) : null} className={`flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0 ${r.cliente_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 line-clamp-1">{r.titulo || 'Pagamento'}</span>
                            <span className="text-xs text-gray-500">{r.categoria || 'Paciente'} • Data: {new Date(r.data_vencimento).toLocaleDateString()}</span>
                          </div>
                          <span className="font-semibold text-emerald-600 whitespace-nowrap ml-2">
                            R$ {(r.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {r.is_paga === false && (
                            <button onClick={(e) => { e.stopPropagation(); setEditingTransaction({ type: 'receita', data: { ...r, tipo: 'receita' } }); }} className="text-blue-500 hover:text-blue-700 transition-colors p-1 ml-2">
                              <Edit3 size={15} />
                            </button>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col px-0 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 pt-4 md:pt-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-medium text-gray-800">Histórico de Comissões</h3>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Total: R$ {financialStats.comissoesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col flex-1 pb-2">
                  <div className="max-h-[160px] overflow-y-auto w-full pr-2">
                    {financialStats.comissoesList.length === 0 ? (
                      <div className="flex mt-8 items-center justify-center text-center text-xs text-gray-500">
                        Nenhum repasse de comissão encontrado para o período.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {financialStats.comissoesList.map(c => (
                            <div key={c.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800 line-clamp-1">{c.treatment}</span>
                                <span className="text-xs text-gray-500">{c.profissional} • {c.paciente}</span>
                              </div>
                              <span className="font-semibold text-blue-600 whitespace-nowrap ml-2">
                                R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              {/* Proximas Despesas */}
              <div className="flex flex-col px-0 md:px-6 md:pr-0 min-h-[160px] pt-4 md:pt-0">
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
                      {despesas.filter(d => !d.is_paga).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()).slice(0, 4).map(d => (
                        <div key={d.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium text-gray-800 line-clamp-1">{d.titulo}</p>
                            <p className="text-xs text-gray-500">Vence: {new Date(d.data_vencimento + 'T12:00:00').toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-4 ml-2">
                            <p className="font-semibold text-red-600 whitespace-nowrap">R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <div className="flex items-center gap-1.5 border-l border-gray-100 pl-3">
                              <button onClick={(e) => handlePayDespesa(d.id!, d.tipoOrigem === 'receita', e)} className="text-emerald-600 font-bold text-[11px] px-2 py-1 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors">
                                {d.tipoOrigem === 'receita' ? 'Receber' : 'Pagar'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingTransaction({ type: d.tipoOrigem || 'despesa', data: d }); }} className="text-blue-500 hover:text-blue-700 transition-colors p-1">
                                <Edit3 size={15} />
                              </button>
                              <button onClick={(e) => handleDeleteDespesa(d.id!, d.tipoOrigem === 'receita', e)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {despesas.filter(d => !d.is_paga).length > 4 && (
                        <button
                          onClick={() => handleTabChange('fluxo')}
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 border-t border-gray-200 pt-8">
              {/* Entradas vs Saídas Chart */}
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-800 mb-6">Comparativo de Entradas e Saídas</h3>
                <div className="flex flex-col gap-6">
                  {incomeVsExpense.map(item => (
                    <div key={item.label} className="flex flex-col">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                        <span className="text-sm font-bold text-gray-800">R$ {item.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.perc}%`, transition: 'width 1s ease-in-out' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comissões Chart */}
              <div className="flex flex-col border-t md:border-t-0 md:border-l border-gray-200 pt-8 md:pt-0 md:pl-8">
                <h3 className="text-sm font-medium text-gray-800 mb-6">Comissões por Especialista</h3>
                {commissionsBySpecialist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-gray-500 text-xs">
                    Nenhuma comissão encontrada para este mês.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 overflow-y-auto max-h-[180px] custom-scrollbar pr-2">
                    {commissionsBySpecialist.map(item => (
                      <div key={item.name} className="flex flex-col">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-medium text-gray-700 line-clamp-1 mr-2">{item.name}</span>
                          <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">R$ {item.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.perc}%`, transition: 'width 1s ease-in-out' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Text */}
            <div className="pt-8 pb-10 border-b border-gray-200">
              <span className="text-xs text-gray-400 font-medium">* Informações atualizadas a cada 30 minutos</span>
            </div>

            {/* Nova Seção: Saúde da Clínica */}
            <div className="pt-10 flex flex-col">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
                <h2 className="text-[1.1rem] font-medium text-gray-800">Saúde da clínica</h2>
                {renderDateFilters()}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">

                {/* Distribuição do faturamento */}
                <div className="flex flex-col p-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Faturamento Geral</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex-1">Clínica</span>
                    <span className="text-gray-700 font-medium w-32 text-center">100%</span>
                    <div className="w-32 flex justify-between items-center ml-auto">
                      <span className="text-gray-800 font-medium">R$ {financialStats.methodsData.reduce((acc, md) => acc + md.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
          <div className="flex-1 flex flex-col p-4 md:p-8 bg-[#fafafa]">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8 mt-2">
              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-emerald-500 font-medium text-[17px]">Receitas</h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <ArrowDownRight size={18} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-xl md:text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ {financialStats.paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">A receber R$ {financialStats.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-red-500 font-medium text-[17px]">Despesas</h3>
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <ArrowUpRight size={18} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-xl md:text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ {despesas.filter(d => d.is_paga).reduce((a, b) => a + (b.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">A pagar R$ {(despesas.filter(d => !d.is_paga).reduce((a, b) => a + (b.valor || 0), 0) + financialStats.comissoesList.filter(c => c.status === 'A repassar').reduce((sum, c) => sum + (c.amount || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[#3b82f6] font-medium text-[17px]">Saldo Total (Bruto)</h3>
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#3b82f6]">
                    <Scale size={16} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="text-xl md:text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ {(financialStats.paidTotal - despesas.filter(d => d.is_paga).reduce((a, b) => a + (b.valor || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">Todo o período</div>
                </div>
              </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              {renderDateFilters()}
            </div>

            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-visible">
              <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-gray-800 border-b border-gray-100 min-w-[700px]">
                <div className="flex-1 pl-12">Descrição</div>
                <div className="flex items-center justify-between w-[48%] pl-8">
                  <div className="w-16"></div>
                  <div className="w-[20%] flex items-center gap-1 cursor-pointer select-none">Data (Recebto) <ArrowUp size={12} strokeWidth={3} className="text-gray-400" /></div>
                  <div className="w-[20%]">Valor líquido</div>
                  <div className="w-28 flex justify-end pr-2">Status</div>
                  <div className="w-8"></div>
                </div>
              </div>

              <div className="flex flex-col min-w-[700px]">
                {financialStats.transactions.filter(tx => tx.isPaid).length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">Nenhuma movimentação financeira encontrada.</div>
                ) : financialStats.transactions.filter(tx => tx.isPaid).map((tx, idx) => (
                  <div key={tx.id || idx} onClick={() => tx.patientId ? navigate(`/pacientes/${tx.patientId}/pagamentos`) : null} className={`flex items-center justify-between p-4 px-6 border-b border-gray-100 transition-colors group relative ${tx.isPaid ? (tx.type === 'saida' ? 'bg-red-50/20 hover:bg-red-50/50' : 'bg-[#f6fbf8] hover:bg-[#eaf5ef]') : 'bg-white hover:bg-gray-50'} ${tx.patientId ? 'cursor-pointer' : ''}`}>
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
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'todas-' + tx.id ? null : 'todas-' + tx.id); }}
                          className="w-8 flex justify-end text-gray-400 hover:text-gray-700 pr-1"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {activeMenu === 'todas-' + tx.id && (
                          <div className="absolute right-4 top-0 mt-8 w-48 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 py-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setEditingTransaction({ type: tx.type === 'saida' ? 'despesa' : 'receita', data: tx.rawData as any, readOnly: true }); }}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye size={15} /> Visualizar detalhes
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleDeleteDespesa(tx.id!, tx.type === 'entrada', e); }}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={15} /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* === DESPESAS (Saídas) === */}
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm mt-6 md:mt-8 overflow-visible">
              <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-gray-800 border-b border-gray-100 min-w-[700px]">
                <div className="flex-1 pl-12">Despesas</div>
                <div className="flex items-center justify-between w-[55%] pl-4">
                  <div className="w-[18%]">Categoria</div>
                  <div className="w-[18%]">Vencimento</div>
                  <div className="w-[18%]">Valor</div>
                  <div className="w-28 flex justify-end pr-2">Status</div>
                  <div className="w-8"></div>
                </div>
              </div>

              <div className="flex flex-col min-w-[700px]">
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
                          <div className="w-[18%] text-[13.5px] font-semibold text-red-600">{d.tipoOrigem === 'receita' ? '' : '-'}R$ {(d.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          <div className="w-28 flex justify-end pr-2">
                            {d.is_paga ? (
                              <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[11px] font-bold whitespace-nowrap"><Check size={12} strokeWidth={3.5} /> Pago</span>
                            ) : (
                              <button onClick={(e) => handlePayDespesa(d.id!, d.tipoOrigem === 'receita', e)} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors rounded-full text-[11px] font-bold whitespace-nowrap">
                                <Check size={12} strokeWidth={3} /> {d.tipoOrigem === 'receita' ? 'Receber' : 'Pagar'}
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'despesas-' + d.id ? null : 'despesas-' + d.id); }}
                              className="w-8 flex justify-end text-gray-400 hover:text-gray-700 transition-colors pr-1"
                            >
                              <MoreVertical size={18} />
                            </button>
                            {activeMenu === 'despesas-' + d.id && (
                              <div className="absolute right-4 top-0 mt-8 w-48 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 py-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setEditingTransaction({ type: d.tipoOrigem === 'receita' ? 'receita' : 'despesa', data: d, readOnly: true }); }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Eye size={15} /> Visualizar detalhes
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleDeleteDespesa(d.id!, d.tipoOrigem === 'receita', e); }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={15} /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // === GROUPED RECURRING ===
                  const { grupoId, items, representative } = entry;
                  const isExpanded = expandedGroup === grupoId;
                  
                  const fullGroupItems = gruposRecorrentes[grupoId] || items;
                  const sortedGroupItems = [...fullGroupItems].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
                  const expectedDuracao = representative.duracao_meses || fullGroupItems.length;
                  const maxTotalItems = Math.max(expectedDuracao, fullGroupItems.length);
                  
                  const totalPagas = fullGroupItems.filter(i => i.is_paga).length;
                  const totalValor = items.reduce((s, i) => s + (i.valor || 0), 0); 
                  const proximaAPagar = items.find(i => !i.is_paga);

                  return (
                    <div key={grupoId}>
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
                              Recorrente ({representative.periodo_recorrencia}) · {maxTotalItems} meses · {totalPagas}/{maxTotalItems} pagas
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-[55%] pl-4">
                          <div className="w-[18%] text-[13px] font-medium text-gray-600">{representative.categoria || '--'}</div>
                          <div className="w-[18%] text-[13px] font-medium text-gray-600">
                            {proximaAPagar ? new Date(proximaAPagar.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Todas pagas'}
                          </div>
                          <div className="w-[18%] text-[13.5px] font-semibold text-red-600">
                            -R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="w-28 flex justify-end pr-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] font-bold whitespace-nowrap">
                              {items.length}x parcela{items.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <button onClick={(e) => handleDeleteGroup(grupoId, representative.tipoOrigem === 'receita', e)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="Cancelar cobrança">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail rows */}
                      {isExpanded && items.map((d, subIdx) => {
                        // Find the exact index of this installment in the full group
                        const exactIndex = sortedGroupItems.findIndex(x => x.id === d.id);
                        const displayedIndex = exactIndex >= 0 ? exactIndex + 1 : subIdx + 1;
                        
                        return (
                          <div key={d.id || subIdx} className={`flex items-center justify-between p-3 pl-16 pr-6 border-b border-gray-100/80 transition-colors ${d.is_paga ? 'bg-red-50/30' : 'bg-blue-50/20'}`}>
                            <div className="flex-1 flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: d.is_paga ? '#ef4444' : '#f97316' }}>
                                {d.is_paga && <Check size={10} strokeWidth={4} className="text-red-500" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[13px] font-medium text-gray-700">Parcela {displayedIndex}/{maxTotalItems}</span>
                                {d.is_paga && d.forma_pagamento && <span className="text-[11px] text-gray-500">Pago via {d.forma_pagamento}</span>}
                              </div>
                            </div>
                            <div className="flex items-center justify-between w-[55%] pl-4">
                              <div className="w-[18%] text-[12px] font-medium text-gray-500">{d.categoria || '--'}</div>
                              <div className="w-[18%] text-[12px] font-medium text-gray-600">{new Date(d.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                              <div className="w-[18%] text-[13px] font-semibold text-red-600">-R$ {(d.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              <div className="w-28 flex justify-end pr-2 gap-2">
                                {d.is_paga ? (
                                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold"><Check size={10} strokeWidth={3.5} /> Pago</span>
                                ) : (
                                  <button onClick={(e) => handlePayDespesa(d.id!, e)} className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors rounded-full text-[10px] font-bold">
                                    <Check size={10} strokeWidth={3} /> Pagar
                                  </button>
                                )}
                              </div>
                              <div className="relative">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'parcela-' + d.id ? null : 'parcela-' + d.id); }}
                                  className="w-8 flex justify-end text-gray-400 hover:text-gray-700 transition-colors pr-1"
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {activeMenu === 'parcela-' + d.id && (
                                  <div className="absolute right-4 top-0 mt-8 w-48 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 py-1">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setEditingTransaction({ type: d.tipoOrigem === 'receita' ? 'receita' : 'despesa', data: d, readOnly: true }); }}
                                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <Eye size={15} /> Visualizar detalhes
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveMenu(null); handleDeleteDespesa(d.id!, d.tipoOrigem === 'receita', e); }}
                                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Trash2 size={15} /> Excluir parcela
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'a_receber' && (
          <div className="flex-1 flex flex-col p-4 md:p-8 bg-[#fafafa]">
             <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
                <div>
                   <h2 className="text-[1.1rem] font-medium text-gray-800">Tratamentos A Receber</h2>
                   <p className="text-sm text-gray-500 mt-1">Clique em um registro para ser levado direto ao prontuário do paciente.</p>
                </div>
                {renderDateFilters()}
             </div>
             
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                 <div className="flex items-center justify-between px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    <div className="flex-1">Paciente / Tratamento</div>
                    <div className="w-40 text-center">Data Origem</div>
                    <div className="w-32 text-right">Valor Pendente</div>
                 </div>
                 <div className="flex flex-col divide-y divide-gray-100 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {financialStats.transactions.filter((tx: any) => tx.type === 'pendente' && !tx.isManualRevenue).length === 0 ? (
                       <div className="text-center py-12 text-gray-400 text-sm">Nenhum tratamento pendente de pagamento no período selecionado.</div>
                    ) : (
                       financialStats.transactions.filter((tx: any) => tx.type === 'pendente' && !tx.isManualRevenue).map((tx: any) => (
                          <div 
                             key={tx.id} 
                             onClick={() => navigate(`/pacientes/${tx.patientId}`)}
                             className="flex items-center justify-between px-6 py-4 hover:bg-blue-50 cursor-pointer transition-colors group"
                          >
                             <div className="flex-1 flex flex-col">
                                <span className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{tx.patientName}</span>
                                <span className="text-[13px] text-gray-500 mt-0.5">{tx.treatmentName}</span>
                             </div>
                             <div className="w-40 text-center text-sm text-gray-600">
                                {new Date(tx.date.includes('T') ? tx.date : tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                             </div>
                             <div className="w-32 text-right text-sm font-bold text-red-500">
                                R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                             </div>
                          </div>
                       ))
                    )}
                 </div>
             </div>
          </div>
        )}

        {activeTab === 'comissoes' && (
          <div className="flex-1 flex flex-col p-8 bg-white rounded-b-xl">
            {/* Header / Date Picker */}
            <div className="mb-10">
              {renderDateFilters()}
            </div>

            {/* Profissionais comissionados */}
            <div className="mb-10">
              <h3 className="text-[14.5px] font-semibold text-[#5a6b7c] mb-4">Profissionais comissionados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">

                {configuredSpecialists.map(specialist => {
                  const profComissions = financialStats.comissoesList.filter(c => c.profissional === specialist.name);
                  const totalProf = profComissions.reduce((acc, c) => acc + c.amount, 0);

                  return (
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
                          <div className="flex items-center gap-1.5 text-gray-800 font-bold text-[14px]">
                            R$ {totalProf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <span className="bg-[#f1f5f9] text-[#475569] border border-gray-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            Em dia
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => { setShowCommissionsDetail(specialist.name); setSelectedCommissions(new Set()); }}
                        className="w-full border border-blue-200 rounded-lg py-2 mt-auto text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors bg-white">
                        Visualizar detalhes
                      </button>
                    </div>
                  );
                })}

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

        {/* Modals and Overlays */}
        {showFaturamentoDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Detalhes do Faturamento</h3>
                  <p className="text-sm text-gray-500">
                    {faturamentoPeriod === 'dia' ? 'Vendas realizadas hoje.' : 'Vendas realizadas neste mês.'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowFaturamentoDetails(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-white custom-scrollbar">
                {faturamentoStats.items.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p>Nenhuma venda registrada no período selecionado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {faturamentoStats.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all gap-3 bg-white">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800">{item.title}</span>
                          {item.paciente && item.paciente !== '-' && (
                            <span className="text-[13px] text-gray-500">{item.paciente}</span>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                             <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                               {item.type}
                             </span>
                             <span className="text-[11px] font-medium text-gray-400">
                               {new Date(item.date.includes('T') ? item.date : item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                             </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[15px] font-black text-gray-800">
                            R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1">
                            {item.method}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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
                        <div className="text-right flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold ${t.isPaid ? 'text-green-600' : 'text-blue-600'}`}>
                              R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {t.isManualRevenue && t.rawData && (
                              <button onClick={(e) => { e.stopPropagation(); setEditingTransaction({ type: 'receita', data: t.rawData }); }} className="text-blue-500 hover:text-blue-700 transition-colors p-1">
                                <Edit3 size={15} />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                            {t.isPaid ? 'Recebido' : 'A receber em: '} {parseDateStr(t.date)?.toLocaleDateString() || new Date(t.date).toLocaleDateString()}
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
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Detalhes de Saídas</h3>
                <button onClick={() => setShowDetails(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <p className="text-sm text-gray-500">Detalhes de saídas estão em construção.</p>
              </div>
            </div>
          </div>
        )}

        {showCommissionsDetail && (() => {
          const profComissions = financialStats.comissoesList.filter(c => c.profissional === showCommissionsDetail);
          const emAberto = profComissions.filter(c => c.status === 'A repassar');
          const pagas = profComissions.filter(c => c.status === 'Repassado');

          const totalAberto = emAberto.reduce((a, b) => a + b.amount, 0);
          const totalSelecionado = Array.from(selectedCommissions).reduce((a, id) => {
            const c = emAberto.find(x => x.id === id);
            return a + (c ? c.amount : 0);
          }, 0);

          return (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-[#f8fafc] rounded-xl shadow-lg w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center px-6 py-5 bg-white border-b border-gray-200">
                  <h3 className="text-[1.05rem] font-bold text-gray-700">Comissões em aberto de {showCommissionsDetail}</h3>
                  <button onClick={() => setShowCommissionsDetail(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-6">
                  <div>
                    <button className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-600 bg-white font-medium">
                      <Calendar size={15} /> 7 de abril - 7 de abril
                    </button>
                  </div>

                  {/* Tabela de "A repassar" */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden shrink-0">
                    <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center text-[13px] font-semibold text-gray-700 bg-gray-50/50">
                      <span>A Repassar (Pendentes)</span>
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                    {emAberto.length === 0 ? (
                      <div className="p-5 text-center text-sm text-gray-500">Nenhuma comissão pendente.</div>
                    ) : (
                      <div className="w-full">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-white shadow-sm">
                            <tr className="border-b border-gray-100">
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase w-10"></th>
                              <th className="px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Tratamento/Orçamento</th>
                              <th className="px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase text-center">Parcela</th>
                              <th className="px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Paciente</th>
                              <th className="px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase text-center">Data ref.</th>
                              <th className="px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase text-right">Valor líquido</th>
                              <th className="px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase text-right">Custo</th>
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase text-right">Comissão</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emAberto.map(c => (
                              <tr key={c.id} className={`border-b border-gray-50 text-[13px] ${selectedCommissions.has(c.id) ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                                <td className="px-5 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedCommissions.has(c.id)}
                                    onChange={(e) => {
                                      const newSet = new Set(selectedCommissions);
                                      if (e.target.checked) newSet.add(c.id);
                                      else newSet.delete(c.id);
                                      setSelectedCommissions(newSet);
                                    }}
                                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-2 py-3 font-semibold text-gray-700">
                                  <div className="flex flex-col">
                                    {c.treatment}
                                    <span className="text-[10px] text-gray-400 font-normal">{c.ruleInfo}</span>
                                  </div>
                                </td>
                                <td className="px-2 py-3 text-center text-gray-500">-</td>
                                <td className="px-2 py-3 text-gray-600">{c.paciente}</td>
                                <td className="px-2 py-3 text-center text-gray-600">{new Date(c.date).toLocaleDateString()}</td>
                                <td className="px-2 py-3 text-right text-gray-600">R$ {c.valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-2 py-3 text-right text-gray-600">R$ {c.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-5 py-3 text-right font-bold text-gray-800">R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="bg-gray-50/30 px-5 py-4 flex justify-end items-center text-[13.5px] border-t border-gray-100">
                          <span className="font-semibold text-gray-600 mr-2">Total A Repassar</span>
                          <span className="font-bold text-gray-800">R$ {totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tabela de "Pagas" */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden shrink-0">
                    <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center text-[13px] font-semibold text-gray-700 bg-gray-50/50">
                      <span>Pagas (Histórico)</span>
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                    {pagas.length === 0 ? (
                      <div className="p-5 text-center text-sm text-gray-500">Nenhum histórico de repasse.</div>
                    ) : (
                      <div className="w-full">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-white shadow-sm">
                            <tr className="border-b border-gray-100">
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Tratamento</th>
                              <th className="px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Paciente</th>
                              <th className="px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase text-center">Data</th>
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase text-right">Comissão Paga</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagas.map(c => (
                              <tr key={c.id} className="border-b border-gray-50 text-[13px] opacity-70">
                                <td className="px-5 py-3 font-semibold text-gray-500">{c.treatment}</td>
                                <td className="px-2 py-3 text-gray-500">{c.paciente}</td>
                                <td className="px-2 py-3 text-center text-gray-500">{new Date(c.date).toLocaleDateString()}</td>
                                <td className="px-5 py-3 text-right font-bold text-emerald-600 text-sm">R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Flutuante de Pagamento */}
                <div className="bg-white border-t border-gray-200 px-6 py-5 mt-auto flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="flex justify-between items-center mb-5 bg-[#f8fafc] border border-gray-200 rounded-lg px-5 py-4">
                    <span className="text-[14px] font-bold text-gray-600 uppercase">Total a pagar <span className="font-medium text-gray-500 capitalize ml-1">({selectedCommissions.size} tratamentos selecionados)</span></span>
                    <span className="text-[16px] font-black text-gray-800">R$ {Number(totalSelecionado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-end items-center gap-3">
                    <button onClick={() => setShowCommissionsDetail(null)} className="px-5 py-2.5 border border-gray-300 rounded font-semibold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={handlePayCommissions}
                      disabled={selectedCommissions.size === 0}
                      className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-blue-800 disabled:bg-blue-300 text-white rounded font-bold text-[13px] transition-colors shadow-sm">
                      Realizar pagamento ({selectedCommissions.size})
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {activeTab === 'boletos' && (
          <div className="flex-1 flex flex-col p-4 md:p-8 bg-white rounded-b-xl">
            <div className="mb-6">
              <h2 className="text-[1.1rem] font-medium text-gray-800">Gestão de Boletos</h2>
              <p className="text-sm text-gray-500">Acompanhe boletos pendentes, vencidos e pagos.</p>
            </div>
            
            {/* Boletos Lists Will Go Here */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
               <div className="border border-gray-200 rounded-xl p-5 shadow-sm bg-white">
                  <h3 className="text-sm font-semibold text-red-600 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600"></div> Vencidos ({boletosData.vencidos.length})</h3>
                  <div className="space-y-3">
                    {boletosData.vencidos.length === 0 ? <p className="text-xs text-gray-400">Nenhum boleto vencido.</p> : 
                     boletosData.vencidos.map((b: any) => (
                       <div key={b.id} className="p-3 border border-red-100 bg-red-50/30 rounded-lg text-sm">
                         <div className="flex justify-between font-semibold text-gray-800 mb-1">
                           <span className="truncate pr-2">{b.paciente}</span>
                           <span>R$ {b.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                         </div>
                         <div className="text-xs text-gray-500 mb-2 truncate">{b.tratamentoNome}</div>
                         <div className="flex justify-between items-center mt-2 pt-2 border-t border-red-100">
                           <span className="text-xs font-semibold text-red-600">Venceu em: {b.dataVencimento.toLocaleDateString()}</span>
                           <div className="flex gap-2">
                             {b.link_boleto && <a href={b.link_boleto} target="_blank" rel="noreferrer" className="px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded">Visualizar</a>}
                             <button onClick={() => handleCancelBoleto(b)} className="px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded">Cancelar</button>
                           </div>
                         </div>
                       </div>
                     ))
                    }
                  </div>
               </div>
               <div className="border border-gray-200 rounded-xl p-5 shadow-sm bg-white">
                  <h3 className="text-sm font-semibold text-blue-600 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-600"></div> A Vencer ({boletosData.aVencer.length})</h3>
                  <div className="space-y-3">
                    {boletosData.aVencer.length === 0 ? <p className="text-xs text-gray-400">Nenhum boleto a vencer.</p> : 
                     boletosData.aVencer.map((b: any) => (
                       <div key={b.id} className="p-3 border border-blue-100 bg-blue-50/30 rounded-lg text-sm">
                         <div className="flex justify-between font-semibold text-gray-800 mb-1">
                           <span className="truncate pr-2">{b.paciente}</span>
                           <span>R$ {b.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                         </div>
                         <div className="text-xs text-gray-500 mb-2 truncate">{b.tratamentoNome}</div>
                         <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-100">
                           <span className="text-xs font-semibold text-blue-600">Vence em: {b.dataVencimento.toLocaleDateString()}</span>
                           <div className="flex gap-2">
                             {b.link_boleto && <a href={b.link_boleto} target="_blank" rel="noreferrer" className="px-3 py-1 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded">Visualizar</a>}
                             <button onClick={() => handleCancelBoleto(b)} className="px-3 py-1 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded">Cancelar</button>
                           </div>
                         </div>
                       </div>
                     ))
                    }
                  </div>
               </div>
               <div className="border border-gray-200 rounded-xl p-5 shadow-sm bg-white">
                  <h3 className="text-sm font-semibold text-emerald-600 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-600"></div> Pagos (Mês Selecionado) ({boletosData.pagos.length})</h3>
                  <div className="space-y-3">
                    {boletosData.pagos.length === 0 ? <p className="text-xs text-gray-400">Nenhum boleto pago neste mês.</p> : 
                     boletosData.pagos.map((b: any) => (
                       <div key={b.id} className="p-3 border border-emerald-100 bg-emerald-50/30 rounded-lg text-sm">
                         <div className="flex justify-between font-semibold text-gray-800 mb-1">
                           <span className="truncate pr-2">{b.paciente}</span>
                           <span className="text-emerald-700">R$ {b.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                         </div>
                         <div className="text-xs text-gray-500 mb-2 truncate">{b.tratamentoNome}</div>
                         <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-100">
                           <span className="text-xs font-semibold text-emerald-600">Pago: {b.dataVencimento.toLocaleDateString()}</span>
                           <button onClick={() => {
                               const win = window.open('', '_blank');
                               if (win) {
                                   win.document.write(`
                                       <html><head><title>Recibo</title></head><body style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                                           <h1 style="text-align: center; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">RECIBO DE PAGAMENTO</h1>
                                           <div style="margin-top: 30px;">
                                               <p>Recebemos de <strong>${b.paciente}</strong>, a quantia de <strong>R$ ${b.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong>,</p>
                                               <p>referente ao tratamento: <strong>${b.tratamentoNome}</strong>.</p>
                                               <p style="margin-top: 40px;">Data do pagamento: <strong>${b.dataVencimento.toLocaleDateString()}</strong></p>
                                               <div style="margin-top: 80px; text-align: center; border-top: 1px solid #000; width: 300px; margin-left: auto; margin-right: auto; padding-top: 10px;">
                                                   Assinatura
                                               </div>
                                           </div>
                                           <div style="margin-top: 40px; text-align: center;">
                                                <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir</button>
                                           </div>
                                       </body></html>
                                   `);
                                   win.document.close();
                               }
                           }} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded">Recibo</button>
                         </div>
                       </div>
                     ))
                    }
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Modal Add/Edit Transaction */}
        {(showDetails === 'addDespesa' || showDetails === 'addReceita' || editingTransaction !== null) && (
          <AddDespesaModal
            type={editingTransaction ? editingTransaction.type : (showDetails === 'addReceita' ? 'receita' : 'despesa')}
            initialData={editingTransaction ? editingTransaction.data : undefined}
            isReadOnly={editingTransaction?.readOnly}
            onClose={() => {
              setShowDetails(null);
              setEditingTransaction(null);
            }}
            onSave={handleSaveTransaction}
          />
        )}

      </div>
    </div>
  );
};

export default Financial;
