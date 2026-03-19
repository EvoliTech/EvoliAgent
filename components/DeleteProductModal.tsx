import React, { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { inventoryService, InventoryProduct } from '../services/inventoryService';

interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryProduct | null;
  onSuccess: () => void;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({ isOpen, onClose, product, onSuccess }) => {
  const { empresaId } = useCompany();
  const [responsible, setResponsible] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !product) return null;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    
    if (!responsible.trim()) {
      alert('O nome do responsável é obrigatório para registrar a exclusão.');
      return;
    }

    setIsDeleting(true);
    try {
      await inventoryService.deleteProduct(product.id, empresaId, responsible.trim());
      onSuccess();
      onClose();
      setResponsible(''); // Limpa o campo para a próxima vez
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao excluir o produto.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* Header Visual with Alert */}
        <div className="bg-red-50 p-6 flex flex-col items-center justify-center text-center relative border-b border-red-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-2 text-red-400 hover:bg-red-100 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-200">
            <AlertTriangle size={28} strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-bold text-red-800">Excluir Produto</h3>
          <p className="text-sm text-red-600 mt-2">
            Tem certeza que deseja excluir o produto <strong className="font-bold">"{product.name}"</strong> do estoque?
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleDelete} className="p-6 flex flex-col gap-5">
          
          <div className="bg-gray-50 p-4 border border-gray-100 rounded-lg text-sm text-gray-600">
            Essa ação removerá o produto da lista de visualização, mas a movimentação de exclusão ficará registrada no Histórico por motivos de segurança.
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Responsável pela exclusão <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              placeholder="Digite seu nome (Obrigatório)"
              value={responsible}
              onChange={e => setResponsible(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-shadow"
            />
          </div>

          {/* Footer - Buttons */}
          <div className="mt-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isDeleting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center min-w-[140px]"
            >
              {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Exclusão'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
