import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { inventoryService, InventoryProduct } from '../services/inventoryService';

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryProduct | null;
  onSuccess: () => void;
}

export const StockOutModal: React.FC<StockOutModalProps> = ({ isOpen, onClose, product, onSuccess }) => {
  const { empresaId } = useCompany();
  
  const [responsible, setResponsible] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !product) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    
    if (!responsible.trim()) {
      alert('O responsável pela baixa é obrigatório.');
      return;
    }
    if (quantity <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }
    if (quantity > product.stock) {
      alert('A quantidade retirada não pode ser maior que o estoque atual.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update the stock
      const newStock = product.stock - quantity;
      await inventoryService.updateProduct(product.id, empresaId, { stock: newStock });
      
      // 2. Record the movement
      await inventoryService.recordMovement({
        product_id: product.id,
        empresa_id: empresaId,
        type: 'out',
        quantity: quantity,
        date: date,
        responsible_name: responsible,
        notes: notes
      });

      onSuccess();
      onClose();
      // Reset form
      setResponsible('');
      setQuantity(1);
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao realizar a baixa de estoque.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Realizar Baixa</h3>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Produto</label>
            <input 
              type="text" 
              value={product.name} 
              disabled 
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Sua quantidade em estoque hoje: {product.stock}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Responsável *</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Dra. Maria"
                value={responsible}
                onChange={e => setResponsible(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Data da baixa</label>
              <input 
                type="date" 
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Quantidade retirada *</label>
            <input 
              type="number" 
              min="1"
              max={product.stock}
              required
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Observações (opcional)</label>
            <textarea 
              rows={3}
              placeholder="Ex: Material utilizado em cirurgia"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Footer - Buttons */}
          <div className="mt-4 flex justify-end gap-3">
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
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center min-w-[140px]"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar baixa'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
