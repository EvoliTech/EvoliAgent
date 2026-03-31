import React from 'react';
import { X, FileDown, AlertTriangle, ShoppingCart } from 'lucide-react';
import { InventoryProduct } from '../services/inventoryService';
import * as XLSX from 'xlsx';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: InventoryProduct[];
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ isOpen, onClose, products }) => {
  if (!isOpen) return null;

  const lowStockProducts = products.filter(p => p.stock <= p.min_stock);

  const handleDownload = () => {
    if (lowStockProducts.length === 0) return;

    const dataForExport = lowStockProducts.map(product => ({
      'Produto (A repor)': product.name,
      'Qtde Atual': product.stock,
      'Mínimo Ideal': product.min_stock,
      'Sugestão de Compra': product.min_stock - product.stock > 0 ? product.min_stock - product.stock : 1
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();

    worksheet['!cols'] = [
      { wch: 40 }, // Produto
      { wch: 15 }, // Qtde Atual
      { wch: 15 }, // Mínimo Ideal
      { wch: 25 }  // Sugestão de Compra
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Compras');
    XLSX.writeFile(workbook, `Lista_Compras_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Lista de Compras</h2>
              <p className="text-sm text-slate-500">Produtos que atingiram ou passaram do limite mínimo</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto w-full custom-scrollbar flex-1 bg-white">
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="text-emerald-500 mb-3" size={40} />
              <p className="text-slate-700 font-bold mb-1">Seu estoque está ótimo!</p>
              <p className="text-slate-500 text-sm">Não há nenhum produto abaixo do limite mínimo.</p>
            </div>
          ) : (
             <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-slate-600">Produto</th>
                        <th className="py-3 px-4 text-center font-semibold text-slate-600 w-24">Atual</th>
                        <th className="py-3 px-4 text-center font-semibold text-slate-600 w-24">Mínimo</th>
                        <th className="py-3 px-4 text-center font-semibold text-slate-600 w-24">Comprar</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {lowStockProducts.map(p => (
                         <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 font-medium text-slate-800">{p.name}</td>
                            <td className="py-4 px-4 text-center font-bold text-red-500">{p.stock}</td>
                            <td className="py-4 px-4 text-center text-slate-600">{p.min_stock}</td>
                            <td className="py-4 px-4 text-center font-bold text-emerald-600 bg-emerald-50/50">
                               +{p.min_stock - p.stock > 0 ? p.min_stock - p.stock : 1}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-gray-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Fechar
          </button>
          <button 
            disabled={lowStockProducts.length === 0}
            onClick={handleDownload}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <FileDown size={18} />
            Baixar Excel para repor
          </button>
        </div>
      </div>
    </div>
  );
};
