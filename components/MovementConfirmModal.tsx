import React, { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';

interface MovementConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: (responsible: string, date: string, notes: string) => Promise<void>;
}

export const MovementConfirmModal: React.FC<MovementConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  onConfirm 
}) => {
  const [responsible, setResponsible] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsible.trim()) {
      alert("O nome do responsável é obrigatório.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onConfirm(responsible.trim(), date, notes.trim());
      // Cleanup happens via unmount or parent logic
      setResponsible('');
      setNotes('');
    } catch (error) {
       console.error(error);
       // Error alert is handled parent side or here if not rethrown.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Save className="text-blue-500" size={24} />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <p className="text-sm text-gray-600 mb-2 leading-relaxed">
            {description}
          </p>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Responsável pela alteração <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              placeholder="Digite seu nome"
              value={responsible}
              onChange={e => setResponsible(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
             <label className="block text-sm font-semibold text-gray-700 mb-1">Data</label>
             <input 
               type="date"
               required
               value={date}
               onChange={e => setDate(e.target.value)}
               className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
             />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Observações no Histórico (Opcional)</label>
            <textarea 
              rows={3}
              placeholder="Ex: Recebimento de material novo..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Footer - Buttons */}
          <div className="mt-4 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center min-w-[140px]"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar e Salvar'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
