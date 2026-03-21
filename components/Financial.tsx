import React, { useState, useEffect } from 'react';
import { ChevronDown, HelpCircle, X, ArrowDownRight, ArrowUpRight, Scale, Calendar, Filter, ArrowUp, Check, MoreVertical, Eye, Settings } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { specialistService } from '../services/specialistService';
import { Specialist, CommissionRule } from '../types';
import { ConfigComissionsModal } from './ConfigComissionsModal';

export const Financial: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'painel' | 'fluxo' | 'comissoes'>('painel');
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const { empresaId } = useCompany();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [commissionedSpecialists, setCommissionedSpecialists] = useState<Record<string, CommissionRule[]>>({});

  useEffect(() => {
    if (empresaId) {
      specialistService.fetchSpecialists(empresaId)
        .then((data) => setSpecialists(data))
        .catch(console.error);
    }
  }, [empresaId]);

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
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'painel' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Painel
          </button>
          <button
            onClick={() => setActiveTab('fluxo')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'fluxo' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Fluxo de caixa
          </button>
          <button
            onClick={() => setActiveTab('comissoes')}
            className={`px-2 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'comissoes' 
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
                    <a href="#" className="text-sm font-medium text-blue-600 hover:underline">Ver detalhes</a>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Recebido</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">A receber</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 100,00</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm text-gray-500">Total previsto</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 100,00</span>
                    </div>
                  </div>
                </div>

                {/* Saídas */}
                <div className="flex flex-col px-6 border-r border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-medium text-gray-800">Saídas</h3>
                    <a href="#" className="text-sm font-medium text-blue-600 hover:underline">Ver detalhes</a>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Pago</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">A pagar</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm text-gray-500">Total previsto</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 0,00</span>
                    </div>
                  </div>
                </div>

                {/* Resultados */}
                <div className="flex flex-col px-6 pr-0">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-medium text-gray-800">Resultados</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Recebido</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">A receber</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 100,00</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm text-gray-500">Total previsto</span>
                      <span className="text-sm text-gray-800 font-medium">R$ 100,00</span>
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
                           {[1,2,3,4,5,6].map(i => <div key={i} className="w-2 h-2 bg-white/40 rounded-sm" />)}
                        </div>
                      </div>
                    </div>
                    <HelpCircle className="absolute -top-1 -left-1 text-yellow-400 fill-white" size={24} />
                  </div>
                  <p className="text-xs font-medium text-gray-600">Não há pagamentos aguardando repasse.</p>
                </div>
              </div>

              {/* Total Inadimplencia */}
              <div className="flex flex-col px-6 border-r border-gray-200 min-h-[160px] relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-medium text-gray-800">Total de inadimplência</h3>
                  <a href="#" className="text-sm font-medium text-blue-600 hover:underline absolute right-6">Ver todos</a>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center mt-4">
                  <span className="text-2xl font-semibold text-gray-800">R$ 100,00</span>
                  <span className="text-sm text-gray-500 mt-1">1 paciente</span>
                </div>
              </div>

              {/* Proximas Despesas */}
              <div className="flex flex-col px-6 pr-0 min-h-[160px]">
                <h3 className="text-sm font-medium text-gray-800 mb-6">Próximas despesas</h3>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-20 h-16 mb-3 relative flex items-center justify-center">
                    {/* Placeholder for empty box illustration */}
                    <div className="w-16 h-12 bg-orange-100 rounded border-2 border-orange-200 relative overflow-hidden flex items-end">
                      <div className="w-full h-1/2 bg-orange-200" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-600">Nenhuma despesa cadastrada.</p>
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
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Distribuição do faturamento</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex-1">Everton Olieira</span>
                    <span className="text-gray-700 font-medium w-32 text-center">100%</span>
                    <div className="w-32 flex justify-between items-center ml-auto">
                      <span className="text-gray-800 font-medium">R$ 591,50</span>
                      <a href="#" className="text-blue-600 font-medium hover:underline text-xs ml-4">Ver</a>
                    </div>
                  </div>
                </div>

                {/* Formas de pagamento */}
                <div className="flex flex-col p-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Formas de pagamento</h3>
                  <div className="flex flex-col space-y-5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex-1">Dinheiro</span>
                      <span className="text-gray-700 w-32 text-center">83%</span>
                      <span className="text-gray-800 font-medium w-32 pr-[34px] text-right">R$ 491,50</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex-1">Pix</span>
                      <span className="text-gray-700 w-32 text-center">17%</span>
                      <span className="text-gray-800 font-medium w-32 pr-[34px] text-right">R$ 100,00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex-1">Crédito</span>
                      <span className="text-gray-500 w-32 text-center">0%</span>
                      <span className="text-gray-500 font-medium w-32 pr-[34px] text-right">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex-1">Débito</span>
                      <span className="text-gray-500 w-32 text-center">0%</span>
                      <span className="text-gray-500 font-medium w-32 pr-[34px] text-right">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex-1">Boleto</span>
                      <span className="text-gray-500 w-32 text-center">0%</span>
                      <span className="text-gray-500 font-medium w-32 pr-[34px] text-right">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex-1">Cheque</span>
                      <span className="text-gray-500 w-32 text-center">0%</span>
                      <span className="text-gray-500 font-medium w-32 pr-[34px] text-right">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex-1">TED</span>
                      <span className="text-gray-500 w-32 text-center">0%</span>
                      <span className="text-gray-500 font-medium w-32 pr-[34px] text-right">R$ 0,00</span>
                    </div>
                  </div>
                </div>

                {/* Tratamentos mais realizados no período */}
                <div className="flex flex-col p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Tratamentos mais realizados no período</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex-1">1 - Restauração Onlay em Cerâmica Pura</span>
                    <span className="text-gray-700 w-32 text-center">2%</span>
                    <span className="text-gray-800 font-medium w-32 pr-[34px] text-right">R$ 591,50</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
        
        {activeTab === 'fluxo' && (
          <div className="flex-1 flex flex-col p-8 bg-[#fafafa]">
            {/* Banner Ad / Info */}
            <div className="bg-[#f0f9ff] border border-blue-100 rounded-lg p-3 px-4 mb-6 flex justify-between items-center text-[13px] text-blue-900 shadow-sm relative pr-10">
              <div className="flex items-center gap-2 font-medium">
                <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span>Emita boletos para seus pacientes com o Codental, além de fácil e barato, você conta com a praticidade da baixa automática do pagamento.</span>
                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline ml-1">Saiba mais aqui</a>
              </div>
              <button className="text-blue-500 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-200 rounded-md p-1 absolute right-3 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-2">
              {/* Card 1: Receitas */}
              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-6 flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-emerald-500 font-medium text-[17px]">Receitas</h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <ArrowDownRight size={18} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ 591,50</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">A receber R$ 98,30</div>
                </div>
              </div>

              {/* Card 2: Despesas */}
              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-6 flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-red-500 font-medium text-[17px]">Despesas</h3>
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <ArrowUpRight size={18} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ 0,00</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">A pagar R$ 0,00</div>
                </div>
              </div>

              {/* Card 3: Saldo */}
              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-6 flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[#3b82f6] font-medium text-[17px]">Saldo</h3>
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#3b82f6]">
                    <Scale size={16} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ 591,50</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">No período selecionado</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-6">
              <button className="flex items-center gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition-colors font-medium">
                <Calendar size={18} className="text-gray-400" /> Período: hoje
              </button>
              <button className="flex items-center gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition-colors font-medium">
                <Filter size={18} className="text-gray-400" /> Filtrar
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm">
              {/* Table Header */}
              <div className="flex items-center justify-between px-6 py-4 text-xs font-bold text-gray-800 border-b border-gray-100">
                <div className="flex-1 pl-12">Descrição</div>
                <div className="w-[12%] flex items-center gap-1 cursor-pointer select-none">Data <ArrowUp size={12} strokeWidth={3} className="text-gray-400" /></div>
                <div className="w-[12%]">Valor líquido</div>
                <div className="w-28 text-center pr-10">Status</div>
              </div>

              {/* Table Rows */}
              <div className="flex flex-col">
                
                {/* Row 1 - Em aberto */}
                <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors group">
                  <div className="flex-1 flex items-start gap-3">
                    <ArrowDownRight size={18} strokeWidth={2.5} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-semibold text-gray-700">Paciente de Exemplo 935.975.310-67</span>
                      <span className="text-[12px] font-medium text-gray-500 mt-0.5">Plano de tratamento de Paciente de Exemplo</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-[48%] pl-8">
                    <div className="w-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="border border-gray-200 rounded px-3 py-1 text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 shadow-sm">
                        Pagar
                      </button>
                    </div>
                    <div className="w-[20%] text-[13.5px] font-medium text-gray-600 tracking-tight">
                      19/03/2026
                    </div>
                    <div className="w-[20%] text-[13.5px] font-semibold text-gray-700 tracking-tight">
                      R$ 98,30
                    </div>
                    <div className="w-28 flex justify-end pr-2">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-[#f3f4f6] text-gray-700 rounded-full text-[11px] font-bold whitespace-nowrap">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                        Em aberto
                      </span>
                    </div>
                    <button className="w-8 flex justify-end text-gray-400 hover:text-gray-700 pr-1">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                {/* Row 2 - Recebido */}
                <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100 bg-[#f6fbf8] hover:bg-[#eaf5ef] transition-colors relative overflow-hidden group">
                  <div className="flex-1 flex items-start gap-3">
                    <div className="w-[18px]"></div>
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-semibold text-gray-700">Paciente de Exemplo 935.975.310-67</span>
                      <span className="text-[12px] font-medium text-gray-500 mt-0.5">Plano de tratamento de Paciente de Exemplo</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-[48%] pl-8">
                    <div className="w-16"></div>
                    <div className="w-[20%] text-[13.5px] font-medium text-gray-600 tracking-tight">
                      19/03/2026
                    </div>
                    <div className="w-[20%] text-[13.5px] font-semibold text-gray-700 tracking-tight">
                      R$ 491,50
                    </div>
                    <div className="w-28 flex justify-end pr-2">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-[#dcfce7] text-[#16a34a] rounded-full text-[11px] font-bold whitespace-nowrap">
                        <Check size={12} strokeWidth={3.5} /> Recebido
                      </span>
                    </div>
                    <button className="w-8 flex justify-end text-gray-400 hover:text-gray-700 pr-1">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

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
      </div>
    </div>
  );
};
