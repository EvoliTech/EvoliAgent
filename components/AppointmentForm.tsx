import React, { useState } from 'react';
import { Appointment } from '../types';
import { SPECIALISTS, MOCK_PATIENTS } from '../constants';
import { generateWhatsAppLink, formatTime } from '../utils';
import { Calendar, Clock, User, Phone, Trash2, MessageCircle } from 'lucide-react';

interface AppointmentFormProps {
  initialData?: Partial<Appointment>;
  onSubmit: (data: Omit<Appointment, 'id'>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({ 
  initialData, 
  onSubmit, 
  onDelete, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<Partial<Appointment>>({
    title: '',
    specialistId: SPECIALISTS[0].id,
    patientName: '',
    patientPhone: '',
    description: '',
    status: 'confirmed',
    start: new Date(),
    end: new Date(new Date().setMinutes(new Date().getMinutes() + 30)),
    ...initialData
  });

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    if (!patientId) return;

    const patient = MOCK_PATIENTS.find(p => p.id === patientId);
    if (patient) {
      setFormData(prev => ({
        ...prev,
        patientName: patient.name,
        patientPhone: patient.phone
      }));
    }
  };

  // Helper to sync end time when start time changes
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    if (!formData.start) return;
    
    const [hours, minutes] = time.split(':').map(Number);
    const newStart = new Date(formData.start);
    newStart.setHours(hours, minutes);
    
    const newEnd = new Date(newStart);
    newEnd.setMinutes(newEnd.getMinutes() + 30); // Default 30 min duration

    setFormData(prev => ({
      ...prev,
      start: newStart,
      end: newEnd
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.start && formData.end && formData.specialistId) {
      // Cast to required type assuming form validation passes
      onSubmit(formData as Omit<Appointment, 'id'>);
    }
  };

  const waLink = formData.patientPhone 
    ? generateWhatsAppLink(
        formData.patientPhone, 
        `Olá ${formData.patientName}, confirmamos seu agendamento para ${formData.start?.toLocaleDateString()} às ${formatTime(formData.start!)}.`
      ) 
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Título / Procedimento</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            required
            className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
            placeholder="Ex: Consulta Primeira Vez"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>
      </div>

      {/* Specialist */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Especialista</label>
        <div className="mt-1 relative">
           <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
            value={formData.specialistId}
            onChange={e => setFormData({...formData, specialistId: e.target.value})}
          >
            {SPECIALISTS.map(spec => (
              <option key={spec.id} value={spec.id}>{spec.name} - {spec.specialty}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Data</label>
          <input 
            type="date"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
            value={formData.start?.toISOString().split('T')[0]}
            onChange={e => {
              const date = new Date(e.target.value);
              // Preserve time
              const newStart = new Date(formData.start!);
              newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
              const newEnd = new Date(formData.end!);
              newEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
              setFormData({...formData, start: newStart, end: newEnd});
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Horário</label>
          <div className="mt-1 relative rounded-md shadow-sm">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-4 w-4 text-gray-400" />
             </div>
             <input 
              type="time"
              required
              className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
              value={formData.start ? formatTime(formData.start) : ''}
              onChange={handleStartTimeChange}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 my-4 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Dados do Paciente</h4>
        
        {/* Patient Select Helper */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-blue-600 mb-1">Selecionar Paciente Cadastrado</label>
          <select 
            className="block w-full rounded-md border-blue-200 bg-blue-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3 text-blue-900"
            onChange={handlePatientSelect}
            defaultValue=""
          >
            <option value="" disabled>Buscar paciente...</option>
            {MOCK_PATIENTS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Patient Name */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
          <div className="mt-1 relative rounded-md shadow-sm">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
             </div>
             <input 
              type="text"
              required
              className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
              value={formData.patientName}
              onChange={e => setFormData({...formData, patientName: e.target.value})}
            />
          </div>
        </div>

        {/* Phone */}
        <div className="mb-3">
           <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                BR +55
              </span>
              <input
                type="tel"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 border"
                placeholder="11 99999-9999"
                value={formData.patientPhone}
                onChange={e => setFormData({...formData, patientPhone: e.target.value})}
              />
            </div>
             {waLink && (
              <a 
                href={waLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center text-xs text-green-600 hover:text-green-700"
              >
                <MessageCircle size={14} className="mr-1" />
                Abrir conversa no WhatsApp
              </a>
            )}
        </div>
      </div>

      {/* Description */}
      <div>
         <label className="block text-sm font-medium text-gray-700">Observações</label>
         <textarea
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
         />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
        {initialData?.id && onDelete ? (
           <button 
             type="button" 
             onClick={() => onDelete(initialData.id!)}
             className="text-red-600 hover:text-red-700 text-sm flex items-center font-medium"
           >
             <Trash2 size={16} className="mr-1"/> Cancelar
           </button>
        ) : <div></div>}
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {initialData?.id ? 'Atualizar' : 'Agendar'}
          </button>
        </div>
      </div>
    </form>
  );
};
