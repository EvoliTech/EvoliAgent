import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText } from 'lucide-react';

export interface DespesaType {
  id?: string;
  empresa_id?: number;
  titulo: string;
  categoria: string;
  data_vencimento: string;
  valor: number;
  is_recorrente: boolean;
  periodo_recorrencia?: string;
  duracao_meses?: number;
  grupo_recorrente?: string;
  is_paga: boolean;
  data_pagamento?: string;
  forma_pagamento?: string;
  observacoes?: string;
  anexo_url?: string;
}

interface AddDespesaModalProps {
  onClose: () => void;
  onSave: (despesa: DespesaType, file: File | null) => void;
}

export const AddDespesaModal: React.FC<AddDespesaModalProps> = ({ onClose, onSave }) => {
  const [isRecurring, setIsRecurring] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderPaymentMethodBtn = (method: string, icon: string) => {
    const active = paymentMethod === method;
    return (
      <button
        type="button"
        className={`flex items-center justify-center gap-2 border px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'}`}
        onClick={() => setPaymentMethod(method)}
      >
        <span>{icon}</span> {method}
      </button>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amountStr = formData.get('amount') as string;
    const duracaoStr = formData.get('duracao_meses') as string;
    
    const newDespesa: DespesaType = {
      titulo: formData.get('titulo') as string,
      categoria: formData.get('categoria') as string,
      data_vencimento: formData.get('dueDate') as string,
      valor: parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || parseFloat(amountStr) || 0,
      is_recorrente: isRecurring,
      periodo_recorrencia: isRecurring ? formData.get('recurringPeriod') as string : undefined,
      duracao_meses: isRecurring && duracaoStr ? parseInt(duracaoStr) : undefined,
      is_paga: isPaid,
      data_pagamento: isPaid ? formData.get('paymentDate') as string : undefined,
      forma_pagamento: isPaid ? paymentMethod : undefined,
      observacoes: formData.get('observacoes') as string,
    };

    onSave(newDespesa, file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-800">Adicionar despesa</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="grid grid-cols-1 gap-5">
            {/* Titulo */}
            <div className="flex flex-col">
              <label className="mb-1.5 text-xs font-semibold text-gray-700">Título</label>
              <input required name="titulo" type="text" placeholder="Descreva o nome da despesa" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            </div>

            {/* Cat, Date, Value Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="mb-1.5 text-xs font-semibold text-gray-700">Categoria</label>
                <select name="categoria" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Selecionar</option>
                  <option value="Agua">Água</option>
                  <option value="Luz">Luz</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Salario">Salários</option>
                  <option value="Materiais">Materiais Diversos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 text-xs font-semibold text-gray-700">Data de vencimento</label>
                <input required name="dueDate" type="date" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 text-xs font-semibold text-gray-700">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                  <input required name="amount" type="text" placeholder="0,00" className="border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 w-full" />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-3 mt-1">
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Despesa recorrente</span>
                </label>
              </div>

              {isRecurring && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ml-0">
                  <div className="flex flex-col">
                    <label className="mb-1.5 text-xs font-semibold text-gray-700">Frequência</label>
                    <select name="recurringPeriod" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white">
                      <option value="semanalmente">Semanalmente</option>
                      <option value="quinzenalmente">Quinzenalmente</option>
                      <option value="mensalmente">Mensalmente</option>
                      <option value="trimestralmente">Trimestralmente</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1.5 text-xs font-semibold text-gray-700">Duração (meses)</label>
                    <input required name="duracao_meses" type="number" min="1" max="60" defaultValue="12" placeholder="Ex: 12" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">Despesa paga</span>
              </label>
            </div>

            {/* Se Paid for true, mostra pagamento */}
            {isPaid && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 mt-2 pt-4 border-t border-gray-100">
                <div className="flex flex-col">
                  <label className="mb-1.5 text-xs font-semibold text-gray-700">Data de pagamento</label>
                  <input required name="paymentDate" type="date" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1.5 text-xs font-semibold text-gray-700">Forma de pagamento</label>
                  <div className="flex flex-wrap gap-2">
                    {renderPaymentMethodBtn('Dinheiro', '💵')}
                    {renderPaymentMethodBtn('Crédito', '💳')}
                    {renderPaymentMethodBtn('Débito', '💳')}
                    {renderPaymentMethodBtn('Boleto', '🧾')}
                    {renderPaymentMethodBtn('Cheque', '🎫')}
                    {renderPaymentMethodBtn('Pix', '❖')}
                    {renderPaymentMethodBtn('TED', '🔄')}
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="flex flex-col mt-2">
              <label className="mb-1.5 text-xs font-semibold text-gray-700">Observações</label>
              <textarea name="observacoes" rows={3} placeholder="Digite aqui" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"></textarea>
            </div>

            {/* File Upload Dropzone */}
            {isPaid && (
                <div 
                  className={`border-2 border-dashed ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-[#f8fafc]'} rounded-lg p-6 flex flex-col items-center justify-center text-center mt-2 cursor-pointer transition-colors`}
                  onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    {file ? (
                        <>
                            <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                                <FileText size={20} />
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                    ) : (
                        <>
                            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                                <UploadCloud size={20} />
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Clique ou Arraste um arquivo aqui para carregar</p>
                            <p className="text-xs text-gray-500 mb-4">O arquivo deve ter no máximo 15 MB.</p>
                            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 bg-white border border-gray-200 rounded-md">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                                Procurar
                            </span>
                        </>
                    )}
                </div>
            )}

          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-5">
             <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
               Cancelar
             </button>
             <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
               Criar despesa
             </button>
          </div>
        </form>

      </div>
    </div>
  );
};
