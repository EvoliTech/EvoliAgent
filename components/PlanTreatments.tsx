import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { HealthPlan, TreatmentItem } from '../types';
import { plansService, TREATMENT_CATEGORIES } from '../services/plansService';
import { Search, Copy, Download, Edit2, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';

interface PlanTreatmentsProps {
  plan: HealthPlan;
  onBack: () => void;
}

export const PlanTreatments: React.FC<PlanTreatmentsProps> = ({ plan, onBack }) => {
  const { empresaId } = useCompany();
  const [currentPlan, setCurrentPlan] = useState<HealthPlan>(plan);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Update Plan Name Modal
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editingName, setEditingName] = useState(plan.name);

  // New Treatment Modal
  const [isNewTreatmentOpen, setIsNewTreatmentOpen] = useState(false);
  const [newTreatment, setNewTreatment] = useState<Partial<TreatmentItem>>({
    name: '',
    category: 'Odontologia Geral',
    cost: 0,
    price: 0,
    receiveDays: 30,
    active: true
  });

  const generateId = () => `treat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const savePlanState = async (updatedPlan: HealthPlan) => {
    if (!empresaId) return;
    setCurrentPlan(updatedPlan);
    await plansService.updatePlan(empresaId, updatedPlan);
  };

  const handleUpdateTreatment = (id: string, field: keyof TreatmentItem, value: any) => {
    const updatedTreatments = currentPlan.treatments.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    });
    savePlanState({ ...currentPlan, treatments: updatedTreatments });
  };

  const handleDeleteTreatment = (id: string) => {
    const updatedTreatments = currentPlan.treatments.filter(t => t.id !== id);
    savePlanState({ ...currentPlan, treatments: updatedTreatments });
  };

  const handleCreateTreatment = () => {
    if (!newTreatment.name || !newTreatment.category) return;
    
    const treatment: TreatmentItem = {
      id: generateId(),
      name: newTreatment.name,
      category: newTreatment.category,
      cost: newTreatment.cost || 0,
      price: newTreatment.price || 0,
      receiveDays: newTreatment.receiveDays || 0,
      active: true
    };
    
    const updatedTreatments = [...currentPlan.treatments, treatment];
    savePlanState({ ...currentPlan, treatments: updatedTreatments });
    setIsNewTreatmentOpen(false);
    setNewTreatment({ name: '', category: 'Odontologia Geral', cost: 0, price: 0, receiveDays: 30, active: true });
  };

  const handleSaveName = () => {
    if (editingName.trim()) {
      savePlanState({ ...currentPlan, name: editingName.trim() });
      setIsEditNameOpen(false);
    }
  };

  const filteredTreatments = currentPlan.treatments.filter(t => {
    const matchesCategory = activeCategory === 'Todos' || t.category === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatCurrencyLocal = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const parseCurrencyInput = (val: string) => {
    // Remove non-numeric chars except comma
    const clean = val.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-medium text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Voltar
          </button>
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditNameOpen(true)}>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{currentPlan.name}</h1>
            <Edit2 size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>
        <button 
           onClick={() => setIsNewTreatmentOpen(true)}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 shadow-sm"
        >
          Adicionar tratamento
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Categorias */}
        <div className="w-full md:w-64 flex-shrink-0 bg-white border border-gray-100 rounded-xl p-2 shadow-sm h-fit">
          {TREATMENT_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${activeCategory === cat ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white border border-gray-100 rounded-xl p-6 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Procure um tratamento"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="text-blue-600 text-sm font-medium flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
               <Download size={16} /> Exportar
            </button>
          </div>

          {/* Labels Cabeçalho (somente desktop) */}
          <div className="hidden md:grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 mb-2 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div>Tratamento</div>
            <div>Categoria</div>
            <div>Custo</div>
            <div>Valor</div>
            <div>Diasp/ Receber</div>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-10">
            {filteredTreatments.length === 0 ? (
               <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                     <Search className="text-gray-300" size={24} />
                  </div>
                  Nenhum tratamento encontrado nesta categoria.
               </div>
            ) : filteredTreatments.map(treatment => (
              <div key={treatment.id} className="border-b border-gray-100 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 mb-3">
                  <input
                    type="text"
                    value={treatment.name}
                    onChange={e => handleUpdateTreatment(treatment.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-800"
                  />
                  <select
                    value={treatment.category}
                    onChange={e => handleUpdateTreatment(treatment.id, 'category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                  >
                    {TREATMENT_CATEGORIES.filter(c => c !== 'Todos').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  
                  <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden bg-white">
                    <span className="text-gray-500 text-sm font-medium px-3 bg-gray-50 border-r border-gray-300 py-2">R$</span>
                    <input
                      type="number"
                      value={treatment.cost}
                      onChange={e => handleUpdateTreatment(treatment.id, 'cost', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm text-gray-800 outline-none"
                    />
                  </div>

                  <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden bg-white">
                    <span className="text-gray-500 text-sm font-medium px-3 bg-gray-50 border-r border-gray-300 py-2">R$</span>
                    <input
                      type="number"
                      value={treatment.price}
                      onChange={e => handleUpdateTreatment(treatment.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm text-gray-800 outline-none"
                    />
                  </div>

                  <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden bg-white">
                    <input
                      type="number"
                      min={0}
                      value={treatment.receiveDays || 0}
                      onChange={e => handleUpdateTreatment(treatment.id, 'receiveDays', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm text-gray-800 outline-none"
                    />
                    <span className="text-gray-500 text-xs font-medium px-2 bg-gray-50 border-l border-gray-300 py-2.5">dias</span>
                  </div>
                </div>

                <div className="flex justify-between items-center px-1">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <div className="relative inline-flex items-center">
                         <input
                            type="checkbox"
                            checked={treatment.active}
                            onChange={e => handleUpdateTreatment(treatment.id, 'active', e.target.checked)}
                            className="sr-only peer"
                         />
                         <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{treatment.active ? 'Ativo' : 'Inativo'}</span>
                   </label>
                   <button
                     onClick={() => handleDeleteTreatment(treatment.id)}
                     className="text-gray-400 hover:text-red-500 transition-colors p-1"
                     title="Excluir Tratamento"
                   >
                      <Trash2 size={16} />
                   </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Editar Nome Modal */}
      <Modal isOpen={isEditNameOpen} onClose={() => setIsEditNameOpen(false)} title="Editar Nome do Convênio">
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
               <input 
                 type="text" 
                 value={editingName} 
                 onChange={e => setEditingName(e.target.value)}
                 className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               />
            </div>
            <div className="flex justify-end gap-2 pt-4">
               <button onClick={() => setIsEditNameOpen(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
               <button onClick={handleSaveName} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Salvar</button>
            </div>
         </div>
      </Modal>

      {/* Novo Tratamento Modal */}
      <Modal isOpen={isNewTreatmentOpen} onClose={() => setIsNewTreatmentOpen(false)} title="Novo Tratamento">
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Tratamento</label>
               <input 
                 type="text" 
                 value={newTreatment.name} 
                 onChange={e => setNewTreatment({...newTreatment, name: e.target.value})}
                 className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               />
            </div>
            <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
               <select 
                 value={newTreatment.category} 
                 onChange={e => setNewTreatment({...newTreatment, category: e.target.value})}
                 className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
               >
                 {TREATMENT_CATEGORIES.filter(c => c !== 'Todos').map(c => (
                   <option key={c} value={c}>{c}</option>
                 ))}
               </select>
            </div>
             <div className="grid grid-cols-3 gap-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Custo (R$)</label>
                  <input 
                    type="number" 
                    value={newTreatment.cost} 
                    onChange={e => setNewTreatment({...newTreatment, cost: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    value={newTreatment.price} 
                    onChange={e => setNewTreatment({...newTreatment, price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dias para receber</label>
                  <input 
                    type="number" 
                    min={0}
                    value={newTreatment.receiveDays !== undefined ? newTreatment.receiveDays : 30} 
                    onChange={e => setNewTreatment({...newTreatment, receiveDays: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
               <button onClick={() => setIsNewTreatmentOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-medium">Cancelar</button>
               <button onClick={handleCreateTreatment} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Adicionar</button>
            </div>
         </div>
      </Modal>

    </div>
  );
};
