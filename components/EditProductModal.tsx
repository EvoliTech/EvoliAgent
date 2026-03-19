import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { inventoryService, InventoryProduct } from '../services/inventoryService';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryProduct | null;
  onSuccess: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, product, onSuccess }) => {
  const { empresaId } = useCompany();
  
  const [name, setName] = useState('');
  const [minStock, setMinStock] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setMinStock(product.min_stock);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    
    if (!name.trim()) {
      alert('O nome do produto é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      await inventoryService.updateProduct(product.id, empresaId, { 
        name: name.trim(), 
        min_stock: minStock 
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao editar o produto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Editar Produto</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do produto *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Quantidade mínima *</label>
            <input 
              type="number" 
              min="0"
              required
              value={minStock}
              onChange={e => setMinStock(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer - Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center min-w-[120px]"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
