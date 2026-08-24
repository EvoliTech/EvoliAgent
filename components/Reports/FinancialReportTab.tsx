import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, TrendingUp, TrendingDown, DollarSign, ListFilter, Activity } from 'lucide-react';
import { revenueService, Receita } from '../../services/revenueService';
import { expenseService, Despesa } from '../../services/expenseService';

export const FinancialReportTab: React.FC = () => {
  const { empresaId } = useCompany();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [revenues, setRevenues] = useState<Receita[]>([]);
  const [expenses, setExpenses] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!empresaId) return;
      setLoading(true);
      try {
        const [revData, expData] = await Promise.all([
          revenueService.fetchRevenues(empresaId),
          expenseService.fetchExpenses(empresaId)
        ]);
        
        // Filter by date range (using data_vencimento for both)
        const filteredRev = revData.filter(r => {
          if (!r.data_vencimento) return false;
          return r.data_vencimento >= startDate && r.data_vencimento <= endDate;
        });
        
        const filteredExp = expData.filter(e => {
          if (!e.data_vencimento) return false;
          return e.data_vencimento >= startDate && e.data_vencimento <= endDate;
        });

        setRevenues(filteredRev);
        setExpenses(filteredExp);
      } catch (err) {
        console.error('Error fetching financial report data:', err);
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
  const totalRevenue = revenues.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalReceived = revenues.filter(r => r.is_paga).reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const pendingRevenue = totalRevenue - totalReceived;

  const totalExpense = expenses.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalPaid = expenses.filter(e => e.is_paga).reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const pendingExpense = totalExpense - totalPaid;

  const netBalance = totalReceived - totalPaid;
  const projectedBalance = totalRevenue - totalExpense;

  // Combine and sort all transactions
  const allTransactions = [
    ...revenues.map(r => ({ ...r, type: 'receita' as const })),
    ...expenses.map(e => ({ ...e, type: 'despesa' as const }))
  ].sort((a, b) => {
    const dateA = a.data_pagamento || a.data_vencimento || '';
    const dateB = b.data_pagamento || b.data_vencimento || '';
    return dateA.localeCompare(dateB);
  });

  return (
    <div className="space-y-6">
      {/* Header & Filters - Hidden on print */}
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
          <h2 className="text-2xl font-bold text-gray-900">Relatório Financeiro</h2>
          <p className="text-gray-600 mt-1">
            Período: {format(parseISO(startDate), "dd/MM/yyyy")} até {format(parseISO(endDate), "dd/MM/yyyy")}
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Total Recebido</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-green-700 mt-1">Previsto: {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Total Pago</span>
                </div>
                <p className="text-2xl font-bold text-red-900">
                  {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-red-700 mt-1">Previsto: {totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>

              <div className={`border rounded-xl p-4 ${netBalance >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                <div className={`flex items-center gap-2 mb-1 ${netBalance >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Saldo Realizado</span>
                </div>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-indigo-900' : 'text-orange-900'}`}>
                  {netBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className={`text-xs mt-1 ${netBalance >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
                  Saldo Projetado: {projectedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Inadimplência (A Receber)</span>
                </div>
                <p className="text-2xl font-bold text-amber-900">
                  {pendingRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Pendências Totais
                </p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                <ListFilter className="w-4 h-4" />
                Fluxo Detalhado
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 border-b border-gray-100 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Data (Venc./Pagamento)</th>
                      <th className="px-4 py-3 font-semibold">Descrição / Título</th>
                      <th className="px-4 py-3 font-semibold">Categoria</th>
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Nenhuma movimentação encontrada para o período selecionado.
                        </td>
                      </tr>
                    ) : (
                      allTransactions.map((tx, idx) => {
                        const isRevenue = tx.type === 'receita';
                        const isPaid = tx.is_paga;
                        const dateToShow = tx.data_pagamento || tx.data_vencimento;

                        return (
                          <tr key={`${tx.type}-${tx.id || idx}`} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                              {dateToShow ? format(parseISO(dateToShow), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate" title={tx.titulo}>
                              {tx.titulo}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {tx.categoria || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                isRevenue ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-700 bg-red-50 border border-red-200'
                              }`}>
                                {isRevenue ? 'Receita' : 'Despesa'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                isPaid ? 'text-gray-600 bg-gray-100 border border-gray-200' : 'text-amber-700 bg-amber-50 border border-amber-200'
                              }`}>
                                {isPaid ? 'Efetivado' : 'Pendente'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${isRevenue ? 'text-green-600' : 'text-red-600'}`}>
                              {isRevenue ? '+' : '-'}{(tx.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
          @page { size: landscape; margin: 1cm; }
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
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-red-50 { background-color: #fef2f2 !important; }
          .bg-indigo-50 { background-color: #eef2ff !important; }
          .bg-orange-50 { background-color: #fff7ed !important; }
          .bg-amber-50 { background-color: #fffbeb !important; }
        }
      `}</style>
    </div>
  );
};
