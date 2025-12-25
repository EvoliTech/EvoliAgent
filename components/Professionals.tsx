import React, { useState } from 'react';
import { SPECIALISTS, AVAILABLE_TREATMENTS } from '../constants';
import { Specialist } from '../types';
import { Mail, Phone, Edit2, Plus, BriefcaseMedical, CheckSquare, Square } from 'lucide-react';
import { Modal } from './ui/Modal';

export const Professionals: React.FC = () => {
  const [specialists, setSpecialists] = useState<Specialist[]>(SPECIALISTS);
  
  // States para Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTreatmentsModalOpen, setIsTreatmentsModalOpen] = useState(false);
  
  // States de Edição
  const [currentSpecialist, setCurrentSpecialist] = useState<Partial<Specialist>>({});
  const [selectedSpecialistForTreatments, setSelectedSpecialistForTreatments] = useState<Specialist | null>(null);

  // --- Handlers para Dados Básicos (Novo e Editar) ---

  const handleOpenEdit = (spec: Specialist) => {
    setCurrentSpecialist({ ...spec });
    setIsEditModalOpen(true);
  };

  const handleOpenNew = () => {
    setCurrentSpecialist({
      name: '',
      email: '',
      phone: '',
      specialty: '',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      treatments: []
    });
    setIsEditModalOpen(true);
  };

  const handleSaveBasicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSpecialist.name) return;

    if (currentSpecialist.id) {
      // Editar Existente
      setSpecialists(prev => prev.map(s => 
        s.id === currentSpecialist.id ? { ...s, ...currentSpecialist } as Specialist : s
      ));
    } else {
      // Criar Novo
      const newSpec: Specialist = {
        ...currentSpecialist,
        id: Math.random().toString(36).substr(2, 9),
        treatments: [],
        color: 'bg-gray-100 text-gray-700 border-gray-200' // Cor padrão
      } as Specialist;
      setSpecialists(prev => [...prev, newSpec]);
    }
    setIsEditModalOpen(false);
  };

  // --- Handlers para Tratamentos ---

  const handleOpenTreatments = (spec: Specialist) => {
    setSelectedSpecialistForTreatments(spec);
    setIsTreatmentsModalOpen(true);
  };

  const toggleTreatment = (treatment: string) => {
    if (!selectedSpecialistForTreatments) return;

    const currentTreatments = selectedSpecialistForTreatments.treatments || [];
    let newTreatments;

    if (currentTreatments.includes(treatment)) {
      newTreatments = currentTreatments.filter(t => t !== treatment);
    } else {
      newTreatments = [...currentTreatments, treatment];
    }

    // Atualiza estado local do modal
    setSelectedSpecialistForTreatments({
      ...selectedSpecialistForTreatments,
      treatments: newTreatments
    });
  };

  const handleSaveTreatments = () => {
    if (!selectedSpecialistForTreatments) return;

    setSpecialists(prev => prev.map(s => 
      s.id === selectedSpecialistForTreatments.id ? selectedSpecialistForTreatments : s
    ));
    setIsTreatmentsModalOpen(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Especialistas</h1>
          <p className="text-gray-500">Gerencie o corpo clínico e atribua tratamentos habilitados.</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2"
        >
          <Plus size={16} /> Adicionar Especialista
        </button>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specialists.map(spec => (
          <div key={spec.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            
            {/* Header do Card (Nome e Especialidade Principal) */}
            <div className="p-6 border-b border-gray-50">
               <h3 className="text-lg font-bold text-gray-900">{spec.name}</h3>
               <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${spec.color}`}>
                 {spec.specialty || 'Sem especialidade'}
               </span>
            </div>

            {/* Corpo do Card (Contatos) */}
            <div className="px-6 py-4 space-y-3 flex-1">
               <div className="flex items-center text-sm text-gray-600">
                  <Mail size={16} className="mr-3 text-gray-400"/>
                  {spec.email || 'Não informado'}
               </div>
               <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-3 text-gray-400"/>
                  {spec.phone || 'Não informado'}
               </div>
            </div>

            {/* Área de Tratamentos (Clicável) */}
            <div 
              onClick={() => handleOpenTreatments(spec)}
              className="mx-6 mb-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors group"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 group-hover:text-blue-600">
                  <BriefcaseMedical size={12} /> Tratamentos Habilitados
                </span>
                <span className="text-[10px] bg-white px-1.5 rounded border text-gray-400 group-hover:border-blue-200 group-hover:text-blue-500">
                  Editar
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(spec.treatments && spec.treatments.length > 0) ? (
                  spec.treatments.slice(0, 3).map((t, idx) => (
                    <span key={idx} className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">Nenhum tratamento selecionado</span>
                )}
                {(spec.treatments?.length || 0) > 3 && (
                   <span className="text-[10px] text-gray-400 pl-1 self-center">+{spec.treatments!.length - 3} mais</span>
                )}
              </div>
            </div>

            {/* Footer com Botão Editar */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
               <button 
                 onClick={() => handleOpenEdit(spec)}
                 className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 border border-gray-200 transition-colors"
               >
                  <Edit2 size={14} /> Editar Dados
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- Modal de Dados Básicos --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={currentSpecialist.id ? "Editar Especialista" : "Novo Especialista"}
      >
        <form onSubmit={handleSaveBasicInfo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
              value={currentSpecialist.name || ''}
              onChange={e => setCurrentSpecialist({ ...currentSpecialist, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Especialidade Principal (Título)</label>
            <input
              type="text"
              required
              placeholder="Ex: Cardiologia"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
              value={currentSpecialist.specialty || ''}
              onChange={e => setCurrentSpecialist({ ...currentSpecialist, specialty: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
              value={currentSpecialist.email || ''}
              onChange={e => setCurrentSpecialist({ ...currentSpecialist, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="tel"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
              value={currentSpecialist.phone || ''}
              onChange={e => setCurrentSpecialist({ ...currentSpecialist, phone: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm"
            >
              Salvar Dados
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal de Tratamentos --- */}
      <Modal
        isOpen={isTreatmentsModalOpen}
        onClose={() => setIsTreatmentsModalOpen(false)}
        title={`Tratamentos: ${selectedSpecialistForTreatments?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            Selecione quais procedimentos este especialista está habilitado a realizar na clínica.
          </p>
          
          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
            {AVAILABLE_TREATMENTS.map(treatment => {
              const isSelected = selectedSpecialistForTreatments?.treatments?.includes(treatment);
              return (
                <div 
                  key={treatment}
                  onClick={() => toggleTreatment(treatment)}
                  className={`flex items-center p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-100'}`}
                >
                  <div className={`mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <span className={`text-sm ${isSelected ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
                    {treatment}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsTreatmentsModalOpen(false)}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveTreatments}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm"
            >
              Salvar Tratamentos
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
