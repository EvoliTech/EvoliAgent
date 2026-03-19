import React, { useState } from 'react';
import { X, Trash2, Plus, Loader2 } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { inventoryService } from '../services/inventoryService';

interface ManageInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Passing mock products length so we know if it's empty
  hasProducts?: boolean;
  onSuccess?: () => void;
}

export const ManageInventoryModal: React.FC<ManageInventoryModalProps> = ({ isOpen, onClose, hasProducts = false, onSuccess }) => {
  const { empresaId } = useCompany();
  const [activeTab, setActiveTab] = useState<'alterar' | 'cadastrar'>('alterar');
  const [isSaving, setIsSaving] = useState(false);
  
  const [newProducts, setNewProducts] = useState([
    { id: 1, name: '', stock: 1, minStock: 1 }
  ]);

  const addProductRow = () => {
    setNewProducts([...newProducts, { id: Date.now(), name: '', stock: 1, minStock: 1 }]);
  };

  const removeProductRow = (id: number) => {
    if (newProducts.length > 1) {
      setNewProducts(newProducts.filter(p => p.id !== id));
    } else {
      setNewProducts([{ id: Date.now(), name: '', stock: 1, minStock: 1 }]);
    }
  };

  const updateProductRow = (id: number, field: string, value: string | number) => {
    setNewProducts(newProducts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSaveNewProducts = async () => {
    if (!empresaId) return;

    // Filter out invalid products
    const validProducts = newProducts.filter(p => p.name.trim() !== '');
    
    if (validProducts.length === 0) {
      alert("Por favor, preencha o nome do produto.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = validProducts.map(p => ({
        name: p.name.trim(),
        stock: p.stock,
        min_stock: p.minStock,
        IDEmpresa: empresaId
      }));

      await inventoryService.addProducts(payload);
      
      // Cleanup after success
      setNewProducts([{ id: Date.now(), name: '', stock: 1, minStock: 1 }]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      alert("Ocorreu um erro ao cadastrar os produtos. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col min-h-[450px] animate-in zoom-in-95 duration-300">
        
        {/* Header - Custom without border bottom */}
        <div className="flex items-center justify-between p-6 flex-shrink-0">
          
          {/* Toggle Switch */}
          <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100">
            <button
              onClick={() => setActiveTab('alterar')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'alterar'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Alterar quantidade
            </button>
            <button
              onClick={() => setActiveTab('cadastrar')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'cadastrar'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cadastrar novo produto
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          {activeTab === 'alterar' ? (
            hasProducts ? (
              <div className="text-gray-500">
                A lista de produtos para alterar aparecerá aqui.
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-md mx-auto fade-in animate-in">
                <div className="mb-6 relative w-48 h-40 flex items-center justify-center">
                  <img 
                    src="/empty-inventory.png" 
                    alt="Sem produtos" 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="text-gray-200"><svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>';
                      }
                    }}
                  />
                </div>
                <h2 className="text-gray-900 text-base font-bold mb-2">
                  Nenhum produto cadastrado ainda
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Aqui você pode ajustar a quantidade de produtos em estoque. Como ainda não há nenhum, clique em <strong className="font-semibold text-gray-700">"Cadastrar novo produto"</strong>.
                </p>
              </div>
            )
          ) : (
            <div className="w-full flex-1 flex flex-col fade-in animate-in overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col custom-scrollbar pb-4 mt-2">
                
                {newProducts.map((prod, index) => (
                  <div key={prod.id} className="flex items-end gap-4 w-full text-left mb-4">
                    <div className="flex-1">
                      {index === 0 && <label className="block text-xs font-semibold text-gray-800 mb-2">Nome do produto</label>}
                      <input 
                        type="text" 
                        placeholder="Ex: Resina Fotopolimerizável A2" 
                        value={prod.name}
                        onChange={(e) => updateProductRow(prod.id, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-36">
                      {index === 0 && <label className="block text-xs font-semibold text-gray-800 mb-2">Quantidade em estoque</label>}
                      <input 
                        type="number" 
                        min="0"
                        value={prod.stock}
                        onChange={(e) => updateProductRow(prod.id, 'stock', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-36">
                      {index === 0 && <label className="block text-xs font-semibold text-gray-800 mb-2">Quantidade mínima</label>}
                      <input 
                        type="number" 
                        min="0"
                        value={prod.minStock}
                        onChange={(e) => updateProductRow(prod.id, 'minStock', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="pb-2">
                       <button onClick={() => removeProductRow(prod.id)} className="text-gray-500 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                ))}

                <div className="mt-6 flex justify-center">
                  <button onClick={addProductRow} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors py-2 px-4 rounded-md hover:bg-blue-50">
                    <Plus size={16} strokeWidth={2.5} /> Adicionar outro produto
                  </button>
                </div>
                
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex justify-end shrink-0 gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          
          {activeTab === 'cadastrar' && (
            <button 
              onClick={handleSaveNewProducts}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center min-w-[160px]"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Cadastrar produto(s)'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
