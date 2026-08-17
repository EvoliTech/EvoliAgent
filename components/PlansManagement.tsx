import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { HealthPlan } from '../types';
import { plansService } from '../services/plansService';
import { Modal } from './ui/Modal';
import { PlanTreatments } from './PlanTreatments';

interface PlansManagementProps {
  onBack: () => void;
}

export const PlansManagement: React.FC<PlansManagementProps> = ({ onBack }) => {
  const { empresaId } = useCompany();
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [selectedPlanToEdit, setSelectedPlanToEdit] = useState<HealthPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [copyFromSourceId, setCopyFromSourceId] = useState<string>('zero');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'configuracoes' && parts[2] === 'planos') {
      const planId = parts[3];
      if (planId && (!selectedPlanToEdit || selectedPlanToEdit.id !== planId)) {
        if (plans.length > 0) {
          const p = plans.find(p => p.id === planId);
          if (p) setSelectedPlanToEdit(p);
        }
      } else if (!planId && selectedPlanToEdit) {
        setSelectedPlanToEdit(null);
      }
    }
  }, [location.pathname, plans]);

  const handleSelectPlan = (plan: HealthPlan | null) => {
    setSelectedPlanToEdit(plan);
    if (plan) {
      navigate(`/configuracoes/planos/${plan.id}`, { replace: true });
    } else {
      navigate(`/configuracoes/planos`, { replace: true });
    }
  };


  useEffect(() => {
    if (empresaId) loadPlans();
  }, [empresaId]);

  const loadPlans = async () => {
    if (!empresaId) return;
    const data = await plansService.fetchPlans(empresaId);
    setPlans(data);
  };

  const handleCreatePlan = async () => {
    if (!newPlanName || !empresaId) return;

    let baseTreatments = [];
    if (copyFromSourceId !== 'zero') {
      const sourcePlan = plans.find(p => p.id === copyFromSourceId);
      if (sourcePlan) {
        // Deep copy treatments with new ids
        baseTreatments = JSON.parse(JSON.stringify(sourcePlan.treatments)).map((t: any) => ({
          ...t,
          id: `treat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));
      }
    }

    const newPlan: HealthPlan = {
      id: `plan_${Date.now()}`,
      name: newPlanName,
      treatments: baseTreatments
    };

    await plansService.createPlan(empresaId, newPlan);
    setNewPlanName('');
    setIsModalOpen(false);
    await loadPlans();

    // Automatically open for editing the new plan
    setSelectedPlanToEdit(newPlan);
  };

  const handleDeletePlan = async (plan: HealthPlan) => {
    if (!empresaId) return;
    if (window.confirm(`Tem certeza que deseja excluir o convênio ${plan.name}?`)) {
      try {
        await plansService.deletePlan(empresaId, plan.id);
        await loadPlans();
      } catch (error) {
        console.error('Error deleting plan:', error);
        alert('Erro ao excluir convênio.');
      }
    }
  };

  if (selectedPlanToEdit) {
    return (
      <PlanTreatments
        plan={selectedPlanToEdit}
        onBack={() => { handleSelectPlan(null); loadPlans(); }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors flexitems-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestão de convênios</h1>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm">
          Criar convênio
        </button>
      </div>

      <div className="bg-white border rounded-xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] mb-6 flex flex-col md:flex-row gap-8">

        {/* Lado Esquerdo - Info */}
        <div className="w-full md:w-1/3 flex flex-col items-center justify-center border-r md:border-r border-gray-100 pr-0 md:pr-8">
          <img src="/gestaodeplanos.svg" alt="Gestão de Planos" className="h-40 mb-6" />
          <h3 className="text-sm font-bold text-gray-800 text-center mb-2">Dúvidas sobre os convênios?</h3>
          <p className="text-xs text-blue-600 text-center hover:underline cursor-pointer">
            Acesse nossos artigos e vídeos e aprenda mais sobre esta funcionalidade.
          </p>
        </div>

        {/* Lado Direito - Lista de Planos */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{plan.name}</span>
                  {plan.isDefault && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">Padrão</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  {!plan.isDefault && (
                    <button
                      onClick={() => handleDeletePlan(plan)}
                      className="px-3 py-1 bg-white border border-red-200 rounded text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex justify-end pt-8">

          </div>
        </div>

      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Criar convênio">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">* Nome do convênio</label>
            <input
              type="text"
              placeholder="Ex: Unimed"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="copyType"
                checked={copyFromSourceId !== 'zero'}
                onChange={() => setCopyFromSourceId(plans.find(p => p.isDefault)?.id || plans[0]?.id || '')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Copiar tratamentos do convênio</span>
              <select
                className="ml-2 px-2 py-1 border border-gray-300 rounded-md text-sm outline-none"
                value={copyFromSourceId !== 'zero' ? copyFromSourceId : ''}
                onChange={(e) => setCopyFromSourceId(e.target.value)}
                disabled={copyFromSourceId === 'zero'}
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="copyType"
                checked={copyFromSourceId === 'zero'}
                onChange={() => setCopyFromSourceId('zero')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Criar um convênio do zero</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleCreatePlan} disabled={!newPlanName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Continuar
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
