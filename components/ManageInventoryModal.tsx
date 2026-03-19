import React, { useState } from 'react';
import { X, Trash2, Plus, Loader2, Search } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { inventoryService, InventoryProduct } from '../services/inventoryService';
import { MovementConfirmModal } from './MovementConfirmModal';

interface ManageInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: InventoryProduct[];
  onSuccess?: () => void;
}

export const ManageInventoryModal: React.FC<ManageInventoryModalProps> = ({ 
  isOpen, 
  onClose, 
  products = [], 
  onSuccess 
}) => {
  const { empresaId } = useCompany();
  const [activeTab, setActiveTab] = useState<'alterar' | 'cadastrar'>('alterar');
  const [isSaving, setIsSaving] = useState(false);
  
  // States for "Cadastrar"
  const [newProducts, setNewProducts] = useState([
    { id: 1, name: '', stock: 1, minStock: 1 }
  ]);

  // States for "Alterar"
  const [alterSearch, setAlterSearch] = useState('');
  const [showAlertOnly, setShowAlertOnly] = useState(false);
  const [stockChanges, setStockChanges] = useState<Record<string, number>>({});

  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    type: 'alterar' | 'cadastrar';
  }>({ isOpen: false, type: 'alterar' });

  const handleStockChange = (id: string, delta: number) => {
    setStockChanges(prev => ({ ...prev, [id]: (prev[id] || 0) + delta }));
  };

  const setExactStockChange = (id: string, val: number) => {
    setStockChanges(prev => ({ ...prev, [id]: val }));
  };

  const triggerSaveStockChanges = () => {
    if (!empresaId) return;
    const updates = Object.entries(stockChanges).filter(([_, change]) => change !== 0);
    if (updates.length === 0) {
      onClose();
      return;
    }
    setConfirmModalState({ isOpen: true, type: 'alterar' });
  };

  const triggerSaveNewProducts = () => {
    if (!empresaId) return;
    const validProducts = newProducts.filter(p => p.name.trim() !== '');
    if (validProducts.length === 0) {
      alert("Por favor, preencha o nome do produto.");
      return;
    }
    setConfirmModalState({ isOpen: true, type: 'cadastrar' });
  };

  const processConfirmation = async (responsible: string, date: string, notes: string) => {
    if (!empresaId) return;
    
    setIsSaving(true);
    try {
      if (confirmModalState.type === 'cadastrar') {
        const validProducts = newProducts.filter(p => p.name.trim() !== '');
        const payload = validProducts.map(p => ({
          name: p.name.trim(),
          stock: p.stock,
          min_stock: p.minStock,
          IDEmpresa: empresaId
        }));

        const createdProducts = await inventoryService.addProducts(payload);
        
        // Record initial movements for created ones
        if (createdProducts.length > 0) {
          await Promise.all(createdProducts.map(cp => 
            inventoryService.recordMovement({
              product_id: cp.id,
              empresa_id: empresaId,
              type: 'in',
              quantity: cp.stock,
              date: date,
              responsible_name: responsible,
              notes: notes || 'Cadastro Inicial de Produto'
            })
          ));
        }
        
        setNewProducts([{ id: Date.now(), name: '', stock: 1, minStock: 1 }]);
        setConfirmModalState({ isOpen: false, type: 'cadastrar' });
        if (onSuccess) onSuccess();
        onClose();
        
      } else if (confirmModalState.type === 'alterar') {
        const updates = Object.entries(stockChanges).filter(([_, change]) => change !== 0);
        
        await Promise.all(updates.map(async ([id, change]) => {
           const product = products.find(p => p.id === id);
           if (product) {
              const newStock = Math.max(0, product.stock + change);
              await inventoryService.updateProduct(id, empresaId, { stock: newStock });
              
              await inventoryService.recordMovement({
                product_id: id,
                empresa_id: empresaId,
                type: 'adjust',
                quantity: change as number,
                date: date,
                responsible_name: responsible,
                notes: notes || 'Ajuste Manual de Estoque'
              });
           }
        }));
        setStockChanges({});
        setConfirmModalState({ isOpen: false, type: 'alterar' });
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
       console.error(error);
       alert("Ocorreu um erro ao salvar as alterações. Tente novamente.");
       throw error; // Let generic modal catch to stay open if failed
    } finally {
       setIsSaving(false);
    }
  };

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

  if (!isOpen) return null;

  const filteredAlterProducts = products.filter(p => {
    if (showAlertOnly && p.stock > p.min_stock) return false;
    return p.name.toLowerCase().includes(alterSearch.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col min-h-[500px] max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 flex-shrink-0 border-b border-transparent">
          
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
        <div className="flex-1 flex flex-col p-6 pt-0 overflow-hidden">
          {activeTab === 'alterar' ? (
            products.length > 0 ? (
              <div className="w-full flex-1 flex flex-col fade-in animate-in overflow-hidden">
                {/* Search / Toggle Row */}
                <div className="flex flex-col gap-4 mb-4 shrink-0">
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Pesquisar por produto"
                      value={alterSearch}
                      onChange={(e) => setAlterSearch(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-blue-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm transition-all"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 w-fit">
                    <button 
                      onClick={() => setShowAlertOnly(!showAlertOnly)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border ${showAlertOnly ? 'bg-indigo-200 border-indigo-200' : 'bg-gray-200 border-gray-200'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${showAlertOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                    <span className="text-sm font-medium text-gray-700">Itens com quantidade em alerta</span>
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-gray-100">
                  <table className="w-full text-left border-collapse mt-2">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr>
                        <th className="py-3 text-xs font-semibold text-gray-500 w-[45%]">Produto</th>
                        <th className="py-3 text-xs font-semibold text-gray-500 text-center w-[15%]">Quantidade em estoque</th>
                        <th className="py-3 text-xs font-semibold text-gray-500 text-center w-[25%]">Quantidade de entrada</th>
                        <th className="py-3 text-xs font-semibold text-gray-500 text-center w-[15%]">Quantidade total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlterProducts.map(prod => {
                        const change = stockChanges[prod.id] || 0;
                        const finalTotal = Math.max(0, prod.stock + change);
                        
                        return (
                          <tr key={prod.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                            <td className="py-4 text-sm font-medium text-gray-700 pr-4">{prod.name}</td>
                            <td className="py-4 text-sm text-gray-600 text-center">{prod.stock}</td>
                            <td className="py-4 text-sm text-center">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm w-[120px]">
                                  <button onClick={() => handleStockChange(prod.id, -1)} className="w-10 py-1.5 bg-white hover:bg-gray-50 text-gray-600 border-r border-gray-200 font-medium transition-colors text-lg flex items-center justify-center leading-none">-</button>
                                  <input 
                                    type="number" 
                                    className="w-full text-center focus:outline-none text-sm font-semibold text-gray-700 hide-arrows" 
                                    value={change} 
                                    onChange={(e) => setExactStockChange(prod.id, parseInt(e.target.value) || 0)} 
                                  />
                                  <button onClick={() => handleStockChange(prod.id, 1)} className="w-10 py-1.5 bg-white hover:bg-gray-50 text-gray-600 border-l border-gray-200 font-medium transition-colors text-lg flex items-center justify-center leading-none">+</button>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-sm font-semibold text-gray-800 text-center">{finalTotal}</td>
                          </tr>
                        );
                      })}
                      
                      {filteredAlterProducts.length === 0 && (
                         <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                               Nenhum produto encontrado.
                            </td>
                         </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto fade-in animate-in pb-10">
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
                <p className="text-gray-500 text-sm leading-relaxed text-center">
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
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-40">
                      {index === 0 && <label className="block text-xs font-semibold text-gray-800 mb-2">Quantidade em estoque</label>}
                      <input 
                        type="number" 
                        min="0"
                        value={prod.stock}
                        onChange={(e) => updateProductRow(prod.id, 'stock', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hide-arrows text-center"
                      />
                    </div>
                    <div className="w-40">
                      {index === 0 && <label className="block text-xs font-semibold text-gray-800 mb-2">Quantidade mínima</label>}
                      <input 
                        type="number" 
                        min="0"
                        value={prod.minStock}
                        onChange={(e) => updateProductRow(prod.id, 'minStock', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hide-arrows text-center"
                      />
                    </div>
                    <div className="pb-2">
                       <button onClick={() => removeProductRow(prod.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                         <Trash2 size={20} />
                       </button>
                    </div>
                  </div>
                ))}

                <div className="mt-6 flex justify-center">
                  <button onClick={addProductRow} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors py-2 px-4 rounded-md hover:bg-blue-50/50">
                    <Plus size={16} strokeWidth={2.5} /> Adicionar outro produto
                  </button>
                </div>
                
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-3 flex justify-end shrink-0 gap-3 border-t border-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          
          {activeTab === 'alterar' && products.length > 0 && (
            <button 
              onClick={triggerSaveStockChanges}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center min-w-[150px]"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Alterar estoque'}
            </button>
          )}

          {activeTab === 'cadastrar' && (
            <button 
              onClick={triggerSaveNewProducts}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center min-w-[160px]"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Cadastrar produto(s)'}
            </button>
          )}
        </div>

      </div>

      <MovementConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
        title={confirmModalState.type === 'cadastrar' ? 'Confirmar Cadastro' : 'Confirmar Alteração'}
        description={
          confirmModalState.type === 'cadastrar' 
            ? 'Para concluir o cadastro de novos produtos no estoque, identifique o responsável pela operação.'
            : 'Para registrar a alteração de estoque (entrada/saída manual), identifique o responsável pela operação.'
        }
        onConfirm={processConfirmation}
      />
    </div>
  );
};
