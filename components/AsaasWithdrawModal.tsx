import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface AsaasWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  maxAmount: number;
  empresaId: string | null;
}

export const AsaasWithdrawModal: React.FC<AsaasWithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  maxAmount,
  empresaId
}) => {
  const [value, setValue] = useState('');
  const [pixAddressKeyType, setPixAddressKeyType] = useState('CPF');
  const [pixAddressKey, setPixAddressKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setError('Por favor, insira um valor válido.');
      return;
    }
    
    if (numValue > maxAmount) {
      setError('O valor não pode ser maior que o saldo disponível.');
      return;
    }

    if (!pixAddressKey.trim()) {
      setError('Por favor, insira a chave Pix.');
      return;
    }

    setIsSubmitting(true);
    try {
      const webhookUrl = import.meta.env.VITE_N8N_ASAAS_TRANSFER_URL;
      if (!webhookUrl) {
         throw new Error("URL do webhook de transferência não configurada (VITE_N8N_ASAAS_TRANSFER_URL).");
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          value: numValue,
          pixAddressKey,
          pixAddressKeyType,
          operationType: 'PIX'
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao processar a transferência no Asaas.');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        setValue('');
        setPixAddressKey('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Saque Asaas (Pix)</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors" disabled={isSubmitting}>
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
             <div className="flex flex-col items-center justify-center py-6 text-emerald-600 space-y-3">
                 <CheckCircle size={48} />
                 <p className="font-medium text-lg">Saque solicitado com sucesso!</p>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Saque (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxAmount}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Saldo disponível: R$ {maxAmount.toFixed(2).replace('.', ',')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Chave Pix</label>
                <select
                  value={pixAddressKeyType}
                  onChange={(e) => setPixAddressKeyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="PHONE">Celular</option>
                  <option value="EVP">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
                <input
                  type="text"
                  value={pixAddressKey}
                  onChange={(e) => setPixAddressKey(e.target.value)}
                  placeholder="Digite a chave Pix de destino"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t mt-6 border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Processando...' : 'Confirmar Saque'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
