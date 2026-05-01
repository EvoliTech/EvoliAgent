import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Info, MoreVertical, FileDown, ArrowDownSquare, Loader2 } from 'lucide-react';
import { ManageInventoryModal } from './ManageInventoryModal';
import { StockOutModal } from './StockOutModal';
import { EditProductModal } from './EditProductModal';
import { DeleteProductModal } from './DeleteProductModal';
import { ShoppingListModal } from './ShoppingListModal';
import { useCompany } from '../contexts/CompanyContext';
import { inventoryService, InventoryProduct } from '../services/inventoryService';
import * as XLSX from 'xlsx';



export const Inventory: React.FC = () => {
  const { empresaId } = useCompany();
  const [activeTab, setActiveTab] = useState<'produtos' | 'historico'>('produtos');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'estoque' && parts[2]) {
      const tab = parts[2] as 'produtos' | 'historico';
      if (['produtos', 'historico'].includes(tab) && activeTab !== tab) {
        setActiveTab(tab);
      }
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'produtos' | 'historico') => {
    setActiveTab(tab);
    navigate(`/estoque/${tab}`, { replace: true });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // History State
  const [movements, setMovements] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // Stock Out State
  const [selectedProductForOut, setSelectedProductForOut] = useState<InventoryProduct | null>(null);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);

  // Shopping List Modal State
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  // Edit / Dropdown State
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<InventoryProduct | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Delete Modal State
  const [selectedProductForDelete, setSelectedProductForDelete] = useState<InventoryProduct | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleExportExcel = () => {
    if (products.length === 0) {
      alert("Não há produtos para exportar.");
      return;
    }

    const dataForExport = products.map(product => {
      const isLowStock = product.stock <= product.min_stock;
      return {
        'Nome do Produto': product.name,
        'Qtde em Estoque': product.stock,
        'Quantidade Mínima': product.min_stock,
        'Situação': isLowStock ? 'Alerta - Estoque Baixo' : 'Normal'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();

    worksheet['!cols'] = [
      { wch: 40 }, // Nome do Produto
      { wch: 18 }, // Qtde em Estoque
      { wch: 18 }, // Quantidade Mínima
      { wch: 25 }  // Situação
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');

    XLSX.writeFile(workbook, `Relatorio_Estoque_${new Date().toLocaleDateString('pt-BR', { timeZone: 'UTC' }).replace(/\//g, '-')}.xlsx`);
  };

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

  const fetchMovements = async () => {
    if (!empresaId) return;
    try {
      setIsFetchingHistory(true);
      const data = await inventoryService.getMovements(empresaId);
      setMovements(data);
    } catch (error) {
       console.error(error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchMovements();
    }
  }, [activeTab, empresaId]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasLowStock = products.some(p => p.stock <= p.min_stock);

  return (
    <div className="w-full max-w-[1920px] mx-auto p-6 md:p-8 font-sans bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
        
        {/* Tabs */}
        <div className="flex px-6 border-b border-gray-200 mt-2">
          <button
            onClick={() => handleTabChange('produtos')}
            className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'produtos' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Produtos
          </button>
          <button
            onClick={() => handleTabChange('historico')}
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
        <div className="p-6 flex flex-col gap-6">
          {activeTab === 'produtos' ? (
            isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : products.length > 0 ? (
              <>
                {/* Warning Banner */}
                {hasLowStock && (
                  <div className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800 shrink-0">
                    <Info className="text-orange-500 shrink-0" size={18} />
                    <span>
                      Atenção! Há um produto com a quantidade menor que o mínimo. <button onClick={() => setIsShoppingListOpen(true)} className="font-semibold text-orange-600 hover:underline">Ver lista de compras</button>
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
                              <button 
                                onClick={() => {
                                  setSelectedProductForOut(product);
                                  setIsStockOutOpen(true);
                                }}
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium py-1.5 px-3 rounded-md transition-colors shadow-sm w-full"
                              >
                                Realizar baixa
                              </button>
                            </td>
                            <td className="py-4 px-2 text-center relative">
                              <button 
                                onClick={() => setOpenDropdownId(openDropdownId === product.id ? null : product.id)}
                                className="p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              {openDropdownId === product.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)} />
                                  <div className="absolute right-8 top-10 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 z-20 overflow-hidden fade-in animate-in">
                                    <button 
                                      onClick={() => {
                                        setSelectedProductForEdit(product);
                                        setIsEditModalOpen(true);
                                        setOpenDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                                    >
                                      Editar
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedProductForDelete(product);
                                        setIsDeleteModalOpen(true);
                                        setOpenDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-gray-50"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Links */}
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-2 shrink-0">
                  <button onClick={handleExportExcel} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors gap-1.5 p-2 rounded-md hover:bg-blue-50">
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
            <div className="flex-1 overflow-x-auto min-h-[200px]">
              {isFetchingHistory ? (
                <div className="flex-1 flex items-center justify-center p-10">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : movements.length > 0 ? (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Data</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Produto</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-center">Tipo</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-center">Quantidade</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Responsável</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.map((mov) => {
                      const dateObj = new Date(mov.date);
                      const formattedDate = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                      return (
                        <tr key={mov.id || Math.random()} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 text-sm font-medium text-gray-600 whitespace-nowrap">{formattedDate}</td>
                          <td className="py-4 px-4 text-sm font-medium text-gray-900">{mov.inventory_products?.name || 'Produto excluído'}</td>
                          <td className="py-4 px-4 text-sm text-center">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              mov.type === 'in' ? 'bg-green-100 text-green-700' : 
                              mov.type === 'delete' ? 'bg-red-100 text-red-700' : 
                              mov.type === 'adjust' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {mov.type === 'in' ? 'Entrada' : mov.type === 'delete' ? 'Exclusão' : mov.type === 'adjust' ? 'Reajuste' : 'Baixa'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-center font-bold text-gray-800">
                            {mov.type === 'in' ? '+' : mov.type === 'delete' ? '0' : mov.type === 'adjust' ? (mov.quantity > 0 ? '+' : '') : '-'}{mov.quantity}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-800">{mov.responsible_name}</td>
                          <td className="py-4 px-4 text-sm text-gray-500 max-w-[200px] truncate" title={mov.notes || '-'}>{mov.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex-1 flex items-center justify-center p-10 text-gray-500">
                  Nenhuma movimentação registrada ainda.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ManageInventoryModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        products={products} 
        onSuccess={fetchProducts}
      />

      <StockOutModal 
        isOpen={isStockOutOpen}
        onClose={() => {
          setIsStockOutOpen(false);
          setSelectedProductForOut(null);
        }}
        product={selectedProductForOut}
        onSuccess={fetchProducts}
      />

      <EditProductModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProductForEdit(null);
        }}
        product={selectedProductForEdit}
        onSuccess={fetchProducts}
      />

      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProductForDelete(null);
        }}
        product={selectedProductForDelete}
        onSuccess={fetchProducts}
      />

      <ShoppingListModal 
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
        products={products}
      />
    </div>
  );
};
