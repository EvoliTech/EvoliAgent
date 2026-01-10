import React, { useState } from 'react';
import { AVAILABLE_TREATMENTS } from '../constants';
import { Specialist } from '../types';
import { specialistService } from '../services/specialistService';
import { Mail, Phone, Edit2, Plus, BriefcaseMedical, CheckSquare, Square, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { LoadingModal } from './ui/LoadingModal';
import { AlertModal } from './ui/AlertModal';

import { useCompany } from '../contexts/CompanyContext';

export const Professionals: React.FC = () => {
  const { empresaId } = useCompany();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data & subscribe
  React.useEffect(() => {
    if (empresaId) {
      loadSpecialists();

      const subscription = specialistService.subscribeToSpecialists(() => {
        loadSpecialists();
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [empresaId]);

  const loadSpecialists = async () => {
    if (!empresaId) return;
    try {
      const data = await specialistService.fetchSpecialists(empresaId);
      setSpecialists(data);
    } catch (error) {
      console.error('Failed to load specialists', error);
    } finally {
      setLoading(false);
    }
  };
  // States para Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTreatmentsModalOpen, setIsTreatmentsModalOpen] = useState(false);
  const [isCreatingSpecialist, setIsCreatingSpecialist] = useState(false);

  // States de Edição
  const [currentSpecialist, setCurrentSpecialist] = useState<Partial<Specialist>>({});
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [selectedSpecialistForTreatments, setSelectedSpecialistForTreatments] = useState<Specialist | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: any = 'info', onConfirm?: () => void, confirmLabel?: string) => {
    setAlertConfig({ isOpen: true, title, message, type, onConfirm, confirmLabel });
  };

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

  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSpecialist.name) return;

    try {
      if (currentSpecialist.id && empresaId) {
        // Editar Existente
        await specialistService.updateSpecialist(empresaId, currentSpecialist as Specialist);
        setIsEditModalOpen(false);
        loadSpecialists(); // Refresh just in case (though subscription should handle it)
      } else if (empresaId) {
        // Criar Novo - Mostrar loading por 2,5 segundos
        setIsCreatingSpecialist(true);

        // Criar especialista e aguardar integração com Google Calendar
        const createPromise = specialistService.createSpecialist(empresaId, currentSpecialist as Specialist);
        const delayPromise = new Promise(resolve => setTimeout(resolve, 2500));

        // Aguardar ambos: criação do especialista e delay mínimo de 2,5s
        await Promise.all([createPromise, delayPromise]);

        setIsCreatingSpecialist(false);
        setIsEditModalOpen(false);
        loadSpecialists(); // Refresh just in case (though subscription should handle it)
      }
    } catch (error) {
      console.error('Error saving specialist', error);
      setIsCreatingSpecialist(false);
      showAlert('Erro', 'Erro ao salvar especialista', 'error');
    }
  };

  const handleOpenDelete = (spec: Specialist) => {
    showAlert(
      'Excluir Especialista',
      `Tem certeza que deseja excluir o especialista ${spec.name}? Esta ação não pode ser desfeita.`,
      'confirm',
      async () => {
        if (!empresaId) return;
        try {
          await specialistService.deleteSpecialist(empresaId, spec.id);
          setIsEditModalOpen(false);
          await loadSpecialists();
          showAlert('Sucesso', 'Especialista excluído com sucesso!', 'success');
        } catch (error) {
          console.error('Error deleting specialist', error);
          showAlert('Erro', 'Erro ao deletar especialista', 'error');
        }
      },
      'Excluir'
    );
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

  const handleSaveTreatments = async () => {
    if (!selectedSpecialistForTreatments || !empresaId) return;

    try {
      await specialistService.updateSpecialist(empresaId, selectedSpecialistForTreatments);
      await loadSpecialists();
      setIsTreatmentsModalOpen(false);
      showAlert('Sucesso', 'Tratamentos atualizados com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving treatments', error);
      showAlert('Erro', 'Erro ao salvar tratamentos', 'error');
    }
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
        {specialists
          .filter(spec => spec.name && /Dr\.?|Dra\.?/i.test(spec.name))
          .map(spec => (
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
                  <Mail size={16} className="mr-3 text-gray-400" />
                  {spec.email || 'Não informado'}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-3 text-gray-400" />
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

          {/* Show Calendar ID if exists (read-only) */}
          {currentSpecialist.calendarId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">ID da Agenda (Google Calendar)</label>
              <input
                type="text"
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm py-2 border px-3 text-gray-500 cursor-not-allowed"
                value={currentSpecialist.calendarId || ''}
                title="Este campo é gerado automaticamente e não pode ser editado"
              />
              <p className="mt-1 text-xs text-gray-500">Este ID é gerado automaticamente pelo Google Calendar</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
              value={currentSpecialist.email || ''}
              onChange={e => setCurrentSpecialist({ ...currentSpecialist, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              {currentSpecialist.id ? 'E-mail do especialista' : 'Será preenchido automaticamente com seu e-mail se deixado em branco'}
            </p>
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


          {currentSpecialist.id && ( // Only show delete for existing specialists
            <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">Zona de Perigo</span>
              <button
                type="button"
                onClick={() => handleOpenDelete(currentSpecialist as Specialist)}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} /> Excluir Especialista
              </button>
            </div>
          )}

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

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmLabel={alertConfig.confirmLabel}
        onConfirm={() => {
          if (alertConfig.onConfirm) alertConfig.onConfirm();
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* --- Modal de Loading --- */}
      <LoadingModal
        isOpen={isCreatingSpecialist}
        message="Criando..."
      />

    </div >
  );
};
