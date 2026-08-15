import React, { useState } from 'react';
import { X, PenTool, Mail, FileText } from 'lucide-react';
import { DocumentoData } from '../services/documentoService';

interface AssinarDocumentoModalProps {
  documento: DocumentoData;
  patientEmail?: string;
  onClose: () => void;
  onSubmit: (email: string) => void;
  isLoading?: boolean;
}

export const AssinarDocumentoModal: React.FC<AssinarDocumentoModalProps> = ({
  documento, patientEmail, onClose, onSubmit, isLoading
}) => {
  const [email, setEmail] = useState(patientEmail || '');

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = isEmailValid;

  const handleSubmit = () => {
    onSubmit(email);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">Assinar documento</h3>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Document Preview Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center gap-3">
             <FileText className="text-blue-500" size={24} />
             <div className="flex flex-col">
                 <span className="font-semibold text-gray-800">{documento.tipo}</span>
                 <span className="text-xs text-gray-500">
                     Criado em: {documento.created_at ? new Date(documento.created_at).toLocaleDateString('pt-BR') : '-'}
                 </span>
             </div>
          </div>

          {/* Contact field (Email) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Mail size={16} className="text-blue-600" />
              E-mail do paciente
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="paciente@email.com"
              disabled={isLoading}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
            <p className="text-xs text-gray-400">O paciente receberá o link para assinatura neste e-mail.</p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={isLoading} className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium rounded-lg text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <PenTool size={16} />
            )}
            Solicitar assinatura
          </button>
        </div>
      </div>
    </div>
  );
};
