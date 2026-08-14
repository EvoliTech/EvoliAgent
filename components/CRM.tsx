import React, { useState, useEffect } from 'react';
import { patientService } from '../services/patientService';
import { Patient } from '../types';
import { useCompany } from '../contexts/CompanyContext';
import { PageHeader } from './ui/PageHeader';
import { Loader2, Phone, User, MessageSquare } from 'lucide-react';

const KANBAN_COLUMNS = [
  { id: 'Frio', label: 'Frio (Sem resposta)', color: 'bg-blue-100 border-blue-200 text-blue-800' },
  { id: 'Morno', label: 'Morno (Em conversa)', color: 'bg-yellow-100 border-yellow-200 text-yellow-800' },
  { id: 'Agendado', label: 'Agendado', color: 'bg-indigo-100 border-indigo-200 text-indigo-800' },
  { id: 'Finalizado', label: 'Finalizado / Atendido', color: 'bg-green-100 border-green-200 text-green-800' },
  { id: 'Descartado', label: 'Descartado', color: 'bg-red-100 border-red-200 text-red-800' },
];

export const CRM: React.FC = () => {
  const { empresaId } = useCompany();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedPatientId, setDraggedPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (empresaId) {
      loadPatients();
      const subscription = patientService.subscribeToPatients(() => {
        loadPatients();
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [empresaId]);

  const loadPatients = async () => {
    if (!empresaId) return;
    try {
      const data = await patientService.fetchPatients(empresaId);
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients for CRM', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, patientId: string) => {
    setDraggedPatientId(patientId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const el = document.getElementById(`card-${patientId}`);
      if (el) el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, patientId: string) => {
    setDraggedPatientId(null);
    const el = document.getElementById(`card-${patientId}`);
    if (el) el.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedPatientId || !empresaId) return;

    const patient = patients.find(p => p.id === draggedPatientId);
    if (!patient || patient.status_lead_no_crm === newStatus) return;

    // Optimistic update
    const previousPatients = [...patients];
    setPatients(patients.map(p => 
      p.id === draggedPatientId ? { ...p, status_lead_no_crm: newStatus } : p
    ));

    try {
      await patientService.updatePatient(empresaId, draggedPatientId, { status_lead_no_crm: newStatus });
    } catch (error) {
      console.error('Failed to update patient status', error);
      setPatients(previousPatients);
    }
  };

  const getPatientsByStatus = (statusId: string) => {
    return patients.filter(p => {
      const pStatus = p.status_lead_no_crm || 'Frio'; // Default to Frio Se vazio
      
      // Mapeamento de status antigos do agente para os novos do Kanban
      if (statusId === 'Frio' && (pStatus === 'Frio' || pStatus === 'Leads Novos' || pStatus === 'novo' || pStatus === 'Novo')) return true;
      if (statusId === 'Morno' && (pStatus === 'Morno' || pStatus === 'Contato em andamento')) return true;
      if (statusId === 'Agendado' && (pStatus === 'Agendado' || pStatus === 'Pacientes agendados')) return true;
      if (statusId === 'Finalizado' && (pStatus === 'Finalizado' || pStatus === 'Pacientes atendidos')) return true;
      if (statusId === 'Descartado' && (pStatus === 'Descartado' || pStatus === 'Leads não qualificados' || pStatus === 'arquivado' || pStatus === 'Inativo')) return true;
      
      return pStatus === statusId;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-transparent">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Carregando painel de leads...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-in fade-in duration-500">
      <PageHeader
        title="CRM & Leads"
        subtitle="Gerencie seus pacientes pelo funil de atendimento."
      />

      <div className="flex-1 overflow-auto mt-6 pb-4 pr-2">
        <div className="flex gap-4 h-full min-h-[600px] min-w-max items-start pb-2">
          {KANBAN_COLUMNS.map((col) => {
            const columnPatients = getPatientsByStatus(col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col w-72 lg:w-80 bg-gray-50/80 rounded-xl border border-gray-200/60 overflow-hidden max-h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 border-b flex justify-between items-center ${col.color.split(' ')[0]}`}>
                  <h3 className={`font-semibold text-sm ${col.color.split(' ')[2]}`}>
                    {col.label}
                  </h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/60 ${col.color.split(' ')[2]}`}>
                    {columnPatients.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {columnPatients.map((patient) => (
                    <div
                      key={patient.id}
                      id={`card-${patient.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, patient.id)}
                      onDragEnd={(e) => handleDragEnd(e, patient.id)}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm truncate pr-2" title={patient.name}>
                          {patient.name}
                        </h4>
                        <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {patient.name.charAt(0)}
                        </div>
                      </div>
                      
                      {patient.phone && (
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                          <Phone size={12} className="mr-1.5" />
                          {patient.phone.replace(/^55(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                        </div>
                      )}
                      
                      {patient.plano && (
                        <div className="flex items-center text-xs text-gray-500 mb-3">
                          <User size={12} className="mr-1.5" />
                          <span className="truncate">{patient.plano}</span>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                        {patient.phone ? (
                          <a
                            href={`https://wa.me/${patient.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-md text-xs font-medium transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageSquare size={14} className="mr-1.5" />
                            Chamar no Whats
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300 italic w-full text-center block py-1.5">Sem contato</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {columnPatients.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-400 font-medium">Arraste um card para cá</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
