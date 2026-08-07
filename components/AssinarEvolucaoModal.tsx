import React, { useState } from 'react';
import { X, PenTool, Mail, MessageCircle } from 'lucide-react';
import { Evolucao } from '../services/evolutionService';

interface AssinarEvolucaoModalProps {
  evolutions: Evolucao[];
  patientEmail?: string;
  patientPhone?: string;
  onClose: () => void;
  onSubmit: (selectedIds: string[], contactValue: string, method: 'Email' | 'Whatsapp') => void;
  isLoading?: boolean;
}

export const AssinarEvolucaoModal: React.FC<AssinarEvolucaoModalProps> = ({
  evolutions, patientEmail, patientPhone, onClose, onSubmit, isLoading
}) => {
  const availableEvolutions = evolutions.filter(e => e.assinafy_status !== 'certificated' && e.assinafy_status !== 'pending_signature');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [method, setMethod] = useState<'Email' | 'Whatsapp'>('Email');
  const [email, setEmail] = useState(patientEmail || '');
  const [phone, setPhone] = useState(patientPhone || '');

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? availableEvolutions.map(e => e.id as string) : []);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  // Format phone to E.164
  const formatPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.startsWith('55')) return `+${digits}`;
    return `+55${digits}`;
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneValid = phone.replace(/\D/g, '').length >= 10;
  const canSubmit = selectedIds.length > 0 && (method === 'Email' ? isEmailValid : isPhoneValid);

  const handleSubmit = () => {
    if (method === 'Email') {
      onSubmit(selectedIds, email, 'Email');
    } else {
      onSubmit(selectedIds, formatPhone(phone), 'Whatsapp');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">Assinar digitalmente</h3>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Method selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Método de verificação</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('Email')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  method === 'Email'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Mail size={16} /> E-mail
              </button>
              <button
                type="button"
                onClick={() => setMethod('Whatsapp')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  method === 'Whatsapp'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
            </div>
            {method === 'Whatsapp' && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ WhatsApp requer plano pago na Assinafy. No Sandbox, a mensagem é simulada (sem envio real).
              </p>
            )}
          </div>

          {/* Contact field */}
          {method === 'Email' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">E-mail do paciente</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paciente@email.com"
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
              <p className="text-xs text-gray-400">O paciente receberá um código de verificação neste e-mail.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">WhatsApp do paciente</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(45) 99999-1234"
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
              />
              <p className="text-xs text-gray-400">O paciente receberá o link de assinatura via WhatsApp.</p>
            </div>
          )}

          {/* Evolution list */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="selectAll"
                disabled={isLoading}
                checked={selectedIds.length === availableEvolutions.length && availableEvolutions.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="selectAll" className="text-sm font-medium text-gray-700">Todas</label>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
              {availableEvolutions.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">Nenhuma evolução disponível para assinatura.</div>
              ) : (
                <div className="flex flex-col">
                  {availableEvolutions.map(evo => (
                    <div key={evo.id} className="flex items-start gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 last:border-0">
                      <input
                        type="checkbox"
                        id={`evo-${evo.id}`}
                        disabled={isLoading}
                        checked={selectedIds.includes(evo.id as string)}
                        onChange={(e) => handleSelect(evo.id as string, e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex flex-col">
                        <label htmlFor={`evo-${evo.id}`} className="text-sm font-medium text-gray-800 cursor-pointer">
                          {evo.texto.length > 60 ? evo.texto.substring(0, 60) + '...' : evo.texto}
                        </label>
                        <span className="text-xs text-gray-500 mt-1">
                          {evo.data_evolucao} <span className="mx-1">•</span> Dr(a) {evo.profissional.replace('Dr. ', '').replace('Dra. ', '')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
