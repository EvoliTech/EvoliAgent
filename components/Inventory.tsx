import React, { useState, useEffect } from 'react';
import { Plus, Search, Info, MoreVertical, FileDown, ArrowDownSquare, Loader2 } from 'lucide-react';
import { ManageInventoryModal } from './ManageInventoryModal';
import { useCompany } from '../contexts/CompanyContext';
import { inventoryService, InventoryProduct } from '../services/inventoryService';



export const Inventory: React.FC = () => {
  const { empresaId } = useCompany();
  const [activeTab, setActiveTab] = useState<'produtos' | 'historico'>('produtos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    if (!empresaId) return;
    try {
      setIsLoading(true);
      const data = await inventoryService.getProducts(empresaId);
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [empresaId]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasLowStock = products.some(p => p.stock <= p.min_stock);

  return (
    <div className="flex-1 w-full max-w-[1920px] mx-auto p-6 md:p-8 font-sans bg-gray-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">Estoque</h1>
        <button 
          onClick={() => setIsManageModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Gerenciar estoque</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex px-6 border-b border-gray-200 shrink-0 mt-2">
          <button
            onClick={() => setActiveTab('produtos')}
            className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'produtos' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Produtos
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'historico' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Histórico de movimentação
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
          {activeTab === 'produtos' ? (
            isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : products.length > 0 ? (
              <>
                {/* Warning Banner */}
                {hasLowStock && (
                  <div className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800 shrink-0">
                    <Info className="text-orange-500 shrink-0" size={18} />
                    <span>
                      Atenção! Há um produto com a quantidade menor que o mínimo. <button className="font-semibold text-orange-600 hover:underline">Ver lista de compras</button>
                    </span>
                  </div>
                )}

                {/* Search */}
                <div className="relative shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Pesquisar por produto"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Table / List */}
                <div className="flex-1 overflow-x-auto min-h-[200px]">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 cursor-pointer">
                          Produto <ArrowDownSquare size={14} className="opacity-0 group-hover:opacity-100" />
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer text-center w-48">
                          Quantidade em estoque
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer text-center w-48">
                          Quantidade mínima
                        </th>
                        <th className="py-3 px-4 w-32"></th>
                        <th className="py-3 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((product) => {
                        const isLowStock = product.stock <= product.min_stock;
                        return (
                          <tr 
                            key={product.id} 
                            className={`group transition-colors ${
                              isLowStock ? 'bg-red-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="py-4 px-4 text-sm font-medium text-gray-900">
                              {product.name}
                            </td>
                            <td className={`py-4 px-4 text-sm text-center font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                              {product.stock}
                            </td>
                            <td className="py-4 px-4 text-sm text-center text-gray-900 font-medium">
                              {product.min_stock}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium py-1.5 px-3 rounded-md transition-colors shadow-sm w-full">
                                Realizar baixa
                              </button>
                            </td>
                            <td className="py-4 px-2 text-center text-gray-400 hover:text-gray-600">
                              <button className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <MoreVertical size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Links */}
                <div className="flex justify-end pt-4 border-t border-gray-100 shrink-0">
                  <button className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors gap-1.5 p-1">
                    <span className="text-gray-500 font-normal mr-1">Baixar lista de produtos</span>
                    <FileDown size={16} /> Exportar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
                <div className="mb-6 relative w-72 h-56 flex items-center justify-center">
                  <img 
                    src="/empty-inventory.png" 
                    alt="Ilustração Sem Produtos" 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      // Fallback visual case user didn't drop empty-inventory.png in public yet
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="text-blue-200"><svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div> <p class="absolute mt-32 text-xs text-blue-300">/empty-inventory.png</p>';
                      }
                    }}
                  />
                </div>
                <h2 className="text-gray-900 text-lg font-bold mb-2">Não há produtos cadastrados</h2>
                <p className="text-gray-500 text-sm mb-1">Pronto para começar a organizar seu estoque? ❤️</p>
                <p className="text-gray-500 text-sm">Clique no botão "Gerenciar estoque" no canto superior direito.</p>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p>O Histórico de movimentação aparecerá aqui.</p>
            </div>
          )}
        </div>
      </div>

      <ManageInventoryModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        hasProducts={products.length > 0} 
        onSuccess={fetchProducts}
      />
    </div>
  );
};
