import React from 'react';
import { X, ExternalLink, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Payout {
  id: string;
  amount: number;
  status: string;
  arrival_date: string;
  created: string;
  bank?: string;
}

interface PayoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payouts: Payout[];
}

export const PayoutsModal: React.FC<PayoutsModalProps> = ({ isOpen, onClose, payouts }) => {
  if (!isOpen) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Pago', color: 'text-green-700', bg: 'bg-green-100', icon: <CheckCircle size={14} className="text-green-600" /> };
      case 'pending':
        return { label: 'Pendente', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: <Clock size={14} className="text-yellow-600" /> };
      case 'in_transit':
        return { label: 'Em Trânsito', color: 'text-blue-700', bg: 'bg-blue-100', icon: <Clock size={14} className="text-blue-600" /> };
      case 'canceled':
      case 'failed':
        return { label: status === 'failed' ? 'Falhou' : 'Cancelado', color: 'text-red-700', bg: 'bg-red-100', icon: <AlertCircle size={14} className="text-red-600" /> };
      default:
        return { label: status, color: 'text-gray-700', bg: 'bg-gray-100', icon: <Clock size={14} className="text-gray-600" /> };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Transações e Repasses</h2>
            <p className="text-sm text-gray-500 mt-1">Histórico de transferências para sua conta bancária</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {payouts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum repasse encontrado no histórico.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-3 px-4 font-medium">Data</th>
                    <th className="pb-3 px-4 font-medium">Status</th>
                    <th className="pb-3 px-4 font-medium">Valor</th>
                    <th className="pb-3 px-4 font-medium">Destino</th>
                    <th className="pb-3 px-4 font-medium">Chegada Estimada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payouts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()).map(payout => {
                    const statusInfo = getStatusInfo(payout.status);
                    return (
                      <tr key={payout.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {new Date(payout.created).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">
                          R$ {payout.amount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {payout.bank || 'Conta Bancária'}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500 flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(payout.arrival_date).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
