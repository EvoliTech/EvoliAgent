import React, { useState } from 'react';
import { X, Info, ChevronDown, Check } from 'lucide-react';
import { Specialist, CommissionRule, HealthPlan } from '../types';
import { DEFAULT_TREATMENTS } from '../constants/treatments';
import { useCompany } from '../contexts/CompanyContext';
import { plansService } from '../services/plansService';

interface ConfigComissionsModalProps {
  specialist: Specialist;
  initialRules?: CommissionRule[];
  onClose: () => void;
  onSave: (rules: CommissionRule[]) => void;
}

export const ConfigComissionsModal: React.FC<ConfigComissionsModalProps> = ({ specialist, initialRules, onClose, onSave }) => {
  const [quandoRecebe, setQuandoRecebe] = useState('');
  const [tipoComissao, setTipoComissao] = useState('');
  const [valor, setValor] = useState('0,00');
  const [convenio, setConvenio] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  
  const [treatmentCommissions, setTreatmentCommissions] = useState<Record<string, string>>({});
  
  const [rules, setRules] = useState<CommissionRule[]>(initialRules || []);
  
  const { empresaId } = useCompany();
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  
  React.useEffect(() => {
    if (empresaId) {
      plansService.fetchPlans(empresaId).then(setPlans).catch(console.error);
    }
  }, [empresaId]);

  const specialtiesList = [
    "Cirurgia",
    "Dentística",
    "Endodontia", 
    "Harmonização Orofacial",
    "Implantodontia",
    "Odontopediatria"
  ];

  const showAdditionalFields = quandoRecebe !== '' && tipoComissao !== '';

  const handleAddRule = () => {
    if (!showAdditionalFields || !convenio) return;
    if (tipoComissao === 'porcentagem' && (!valor || !especialidade)) return;
    
    let newRulesToAdd: CommissionRule[] = [];

    if (tipoComissao === 'porcentagem') {
      newRulesToAdd.push({
        id: Math.random().toString(36).substr(2, 9),
        quandoRecebe,
        tipoComissao,
        valor,
        convenio,
        especialidade
      });
    } else {
      Object.entries(treatmentCommissions).forEach(([treatmentId, treatmentValor]) => {
        const treatment = DEFAULT_TREATMENTS.find(t => t.id === treatmentId);
        if (treatment && treatmentValor && treatmentValor !== '0,00' && treatmentValor !== '0') {
          newRulesToAdd.push({
            id: Math.random().toString(36).substr(2, 9),
            quandoRecebe,
            tipoComissao,
            valor: String(treatmentValor),
            convenio,
            especialidade: treatment.name
          });
        }
      });
    }
    
    if (newRulesToAdd.length > 0) {
      setRules([...rules, ...newRulesToAdd]);
    }
    
    // Reset fields
    setQuandoRecebe('');
    setTipoComissao('');
    setValor('0,00');
    setConvenio('');
    setEspecialidade('');
    setTreatmentCommissions({});
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col font-sans relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-2">
          <h2 className="text-xl font-semibold text-[#334155]">Configurar comissões de {specialist.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-2 flex-1 overflow-y-auto">
          
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col">
              <label className="text-[13px] font-semibold text-[#475569] mb-2">Quando o profissional receberá a comissão?</label>
              <div className="relative">
                <select 
                  value={quandoRecebe} 
                  onChange={(e) => setQuandoRecebe(e.target.value)}
                  className="w-full appearance-none bg-white border border-[#cbd5e1] hover:border-[#94a3b8] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-[14.5px] text-[#334155] outline-none transition-colors cursor-pointer"
                >
                  <option value="">Selecionar</option>
                  <option value="apos_pagamento">Após o pagamento do paciente</option>
                  <option value="apos_procedimento">Após finalizar o procedimento</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748b]">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[13px] font-semibold text-[#475569] mb-2">Tipo de comissão</label>
              <div className="relative">
                <select 
                  value={tipoComissao} 
                  onChange={(e) => setTipoComissao(e.target.value)}
                  className="w-full appearance-none bg-white border border-[#cbd5e1] hover:border-[#94a3b8] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-[14.5px] text-[#334155] outline-none transition-colors cursor-pointer"
                >
                  <option value="">Selecionar</option>
                  <option value="porcentagem">Porcentagem (%)</option>
                  <option value="fixo">Valor fixo (R$)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748b]">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 (Conditional) */}
          {showAdditionalFields && (
            <div className="mt-6">
              {tipoComissao === 'porcentagem' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex flex-col">
                    <label className="text-[13px] font-semibold text-[#475569] mb-2">Valor (%)</label>
                    <input 
                      type="text" 
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      className="w-full bg-white border border-[#cbd5e1] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-[14.5px] text-[#334155] outline-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[13px] font-semibold text-[#475569] mb-2">Em qual convênio?</label>
                    <div className="relative">
                      <select 
                        value={convenio} 
                        onChange={(e) => setConvenio(e.target.value)}
                        className="w-full appearance-none bg-white border border-[#cbd5e1] hover:border-[#94a3b8] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-[14.5px] text-[#334155] outline-none transition-colors cursor-pointer"
                      >
                        <option value="">Selecionar</option>
                        <option value="todos">Todos</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748b]">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[13px] font-semibold text-[#475569] mb-2">Em qual especialidade?</label>
                    <div className="relative">
                      <select 
                        value={especialidade} 
                        onChange={(e) => setEspecialidade(e.target.value)}
                        className="w-full appearance-none bg-white border border-[#cbd5e1] hover:border-[#94a3b8] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-[14.5px] text-[#334155] outline-none transition-colors cursor-pointer"
                      >
                        <option value="">Selecionar</option>
                        <option value="todas">Todas</option>
                        {specialtiesList.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748b]">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col mb-4">
                  <label className="text-[13px] font-semibold text-[#475569] mb-2">Em qual convênio?</label>
                  <div className="relative w-full">
                    <select 
                      value={convenio} 
                      onChange={(e) => setConvenio(e.target.value)}
                      className="w-full appearance-none bg-white border border-[#cbd5e1] hover:border-[#94a3b8] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-[14.5px] text-[#334155] outline-none transition-colors cursor-pointer"
                    >
                      <option value="">Selecionar</option>
                      <option value="todos">Todos</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748b]">
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-[15px] font-semibold text-[#334155] mb-1">Defina o valor pago por tratamento</h3>
                    <p className="text-[13px] text-[#64748b] mb-4">
                      Caso deseje alterar o valor dos tratamentos ou custos, acesse a gestão de convênios. <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">Clique aqui</a>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="relative flex-1">
                        <input type="text" placeholder="Pesquisar tratamento" className="w-full pl-10 pr-3 py-2 text-[14px] border border-[#cbd5e1] rounded-lg outline-none focus:border-blue-500 transition-colors" />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" className="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      </div>
                      <div className="relative sm:w-64">
                        <select className="w-full appearance-none pr-8 py-2 px-3 text-[14px] text-gray-500 border border-[#cbd5e1] rounded-lg outline-none cursor-pointer">
                          <option>Filtrar por especialidade</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex font-semibold text-[13px] text-[#475569] px-2 pb-2">
                      <div className="flex-1">Tratamento</div>
                      <div className="w-32 px-2">Valor</div>
                      <div className="w-40 px-2 pl-4">Valor da comissão</div>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 pb-2">
                      {DEFAULT_TREATMENTS.map((t) => (
                        <div key={t.id} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                          <input 
                            type="text" 
                            disabled 
                            value={t.name} 
                            className="flex-1 w-full bg-[#f8fafc] text-[#64748b] border border-[#cbd5e1] rounded-lg px-3 py-2 text-[13px] outline-none truncate"
                            title={t.name}
                          />
                          <div className="flex w-full sm:w-auto items-center gap-2">
                            <div className="relative w-full sm:w-28 flex items-center">
                              <span className="absolute left-3 text-[13px] text-[#64748b]">R$</span>
                              <input 
                                type="text" 
                                disabled
                                value={t.price}
                                className="w-full bg-white text-[#64748b] border border-[#cbd5e1] rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none"
                              />
                            </div>
                            <div className="relative w-full sm:w-36 flex items-center">
                              <span className="absolute left-3 text-[13px] text-[#475569]">R$</span>
                              <input 
                                type="text"
                                value={treatmentCommissions[t.id] || '0,00'}
                                onChange={(e) => setTreatmentCommissions({...treatmentCommissions, [t.id]: e.target.value})}
                                className="w-full bg-white border border-[#cbd5e1] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-[13px] text-gray-800 outline-none transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Salvar Regra Block */}
          {showAdditionalFields && (
            <div className="flex justify-center mt-6 mb-10">
              <button 
                onClick={handleAddRule}
                disabled={tipoComissao === 'porcentagem' ? (!valor || !convenio || !especialidade) : (!convenio)}
                className="border border-[#bfdbfe] bg-[#f0f9ff]/50 hover:bg-[#e0f2fe] disabled:opacity-50 disabled:cursor-not-allowed text-[#3b82f6] px-5 py-2 rounded-md text-[13.5px] font-semibold transition-colors"
               >
                Salvar regra
              </button>
            </div>
          )}

          {/* Regras Criadas */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-medium text-[#334155]">Regras criadas</h3>
              <Info size={16} className="text-[#94a3b8]" />
            </div>
            <p className="text-[13px] text-[#64748b] mb-4">
              Precisa de ajuda para configurar as comissões? <a href="#" className="font-semibold text-[#475569] hover:underline">Acesse a nossa central de ajuda.</a>
            </p>

            {rules.length > 0 ? (
              <div className="flex flex-col gap-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm bg-white">
                    <div className="flex flex-col gap-1">
                      <span className="text-[14px] font-semibold text-gray-800">
                        {rule.tipoComissao === 'porcentagem' ? `${rule.valor}%` : `R$ ${rule.valor}`} 
                        <span className="font-normal text-gray-500 ml-1">em</span> {rule.especialidade}
                      </span>
                      <span className="text-[12.5px] text-gray-500">
                        {rule.quandoRecebe === 'apos_pagamento' ? 'Após pagamento' : 'Após procedimento'} • Convênio: {rule.convenio === 'todos' ? 'Todos' : rule.convenio}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleRemoveRule(rule.id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 flex gap-3 text-[14px] text-[#475569] leading-relaxed">
                <Info size={18} className="text-[#64748b] shrink-0 mt-0.5" />
                <span>
                  As regras que você criar serão exibidas aqui. Se tiver dúvidas de como configurar as comissões, <a href="#" className="font-semibold text-[#475569] hover:underline">acesse a nossa central de ajuda.</a>
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[#f1f5f9] flex justify-end items-center gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-[#cbd5e1] bg-white text-[#475569] font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(rules)}
            className="px-5 py-2.5 rounded-lg bg-[#60a5fa] hover:bg-[#3b82f6] text-white font-medium text-sm transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
