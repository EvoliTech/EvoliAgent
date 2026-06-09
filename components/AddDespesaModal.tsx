import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, Plus, Trash2 } from 'lucide-react';

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
  comprovante_url?: string;
  nota_fiscal_url?: string;
  boleto_url?: string;
  tipo?: 'despesa' | 'receita';
  created_at?: string;
}

interface ExpenseFiles {
  boletos?: File[];
  notaFiscal?: File | null;
  comprovante?: File | null;
}

interface AddDespesaModalProps {
  onClose: () => void;
  onSave: (despesa: DespesaType, files: ExpenseFiles) => void;
  initialData?: DespesaType;
  type?: 'despesa' | 'receita';
}

export const AddDespesaModal: React.FC<AddDespesaModalProps> = ({ onClose, onSave, initialData, type = 'despesa' }) => {
  const [isRecurring, setIsRecurring] = useState(initialData?.is_recorrente || false);
  const [isPaid, setIsPaid] = useState(initialData?.is_paga || false);
  const [paymentMethod, setPaymentMethod] = useState(initialData?.forma_pagamento || '');
  
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [compFile, setCompFile] = useState<File | null>(null);
  const [boletoFiles, setBoletoFiles] = useState<File[]>([]);

  const nfRef = useRef<HTMLInputElement>(null);
  const compRef = useRef<HTMLInputElement>(null);
  const boletoRef = useRef<HTMLInputElement>(null);

  const isReceita = type === 'receita';
  const colorTheme = isReceita ? 'emerald' : 'blue';
  const titleText = initialData ? (isReceita ? 'Editar receita' : 'Editar despesa') : (isReceita ? 'Adicionar receita' : 'Adicionar despesa');
  const btnText = initialData ? 'Salvar alterações' : (isReceita ? 'Criar receita' : 'Criar despesa');

  useEffect(() => {
    if (initialData) {
      setIsRecurring(initialData.is_recorrente);
      setIsPaid(initialData.is_paga);
      setPaymentMethod(initialData.forma_pagamento || '');
    }
  }, [initialData]);

  const renderPaymentMethodBtn = (method: string, icon: string) => {
    const active = paymentMethod === method;
    return (
      <button
        type="button"
        className={`flex items-center justify-center gap-2 border px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? `border-${colorTheme}-600 bg-${colorTheme}-600 text-white shadow-sm` : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'}`}
        onClick={() => setPaymentMethod(method)}
      >
        <span>{icon}</span> {method}
      </button>
    );
  };

  const handleBoletoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setBoletoFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amountStr = formData.get('amount') as string;
    const duracaoStr = formData.get('duracao_meses') as string;
    
    const newDespesa: DespesaType = {
      ...(initialData || {}),
      tipo: type,
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

    onSave(newDespesa, {
      boletos: boletoFiles.length > 0 ? boletoFiles : undefined,
      notaFiscal: nfFile,
      comprovante: compFile
    });
  };

  const FileZone = ({ 
    file, 
    onFileSet, 
    inputRef, 
    label, 
    multiple = false, 
    existingUrl 
  }: { 
    file: File | File[] | null, 
    onFileSet: (f: any) => void, 
    inputRef: React.RefObject<HTMLInputElement>, 
    label: string, 
    multiple?: boolean,
    existingUrl?: string
  }) => {
    const isArray = Array.isArray(file);
    const hasFiles = isArray ? file.length > 0 : file !== null;
    
    return (
      <div className="flex flex-col mb-4">
        <label className="mb-1.5 text-xs font-bold text-gray-700">{label}</label>
        <div 
          className={`border-2 border-dashed ${hasFiles ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-[#f8fafc]'} rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors`}
          onClick={() => inputRef.current?.click()}
        >
          <input 
            type="file" 
            className="hidden" 
            ref={inputRef} 
            multiple={multiple} 
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(e) => {
              const maxSizeBytes = 48 * 1024 * 1024;
              if (multiple) {
                if (e.target.files) {
                  const validFiles = Array.from(e.target.files).filter(f => {
                    if (f.size > maxSizeBytes) {
                      alert('Tamanho do arquivo maior que o permitido, caso queira subir esse arquivo contate o suporte - Limite atingido-');
                      return false;
                    }
                    return true;
                  });
                  if (validFiles.length > 0) onFileSet(validFiles);
                }
              } else {
                if (e.target.files && e.target.files[0]) {
                  const f = e.target.files[0];
                  if (f.size > maxSizeBytes) {
                    alert('Tamanho do arquivo maior que o permitido, caso queira subir esse arquivo contate o suporte - Limite atingido-');
                  } else {
                    onFileSet(f);
                  }
                }
              }
              // Reset the input value so the same file can be selected again if needed
              if (inputRef.current) inputRef.current.value = '';
            }} 
          />
          {hasFiles ? (
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                <Check size={16} />
              </div>
              <p className="text-sm font-semibold text-gray-700">{isArray ? `${file.length} arquivo(s) selecionado(s)` : (file as File).name}</p>
              <button type="button" onClick={(e) => { e.stopPropagation(); onFileSet(multiple ? [] : null); }} className="text-xs text-red-500 hover:text-red-700 mt-1 flex items-center gap-1">
                <Trash2 size={12} /> Remover
              </button>
            </div>
          ) : existingUrl ? (
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                <FileText size={16} />
              </div>
              <a href={existingUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-sm font-semibold text-blue-600 hover:underline mb-1">
                Ver arquivo atual
              </a>
              <p className="text-xs text-gray-500">Clique na área para substituir</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud size={20} className="text-gray-400 mb-2" />
              <p className="text-xs font-medium text-gray-600">Clique para anexar arquivo(s)</p>
            </div>
          )}
        </div>
        {multiple && !hasFiles && (
          <p className="text-[10px] text-gray-400 mt-1 leading-tight">
            Para recorrência: envie 1 PDF com todos juntos, ou selecione N arquivos (ex: 10) para dividir um por mês automaticamente.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col md:flex-row">
        
        {/* Formulário Principal */}
        <div className="flex-1 border-r border-gray-100">
          <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">{titleText}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 md:hidden p-1">
              <X size={20} />
            </button>
          </div>

          <form id="despesaForm" onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 gap-5">
              {/* Titulo */}
              <div className="flex flex-col">
                <label className="mb-1.5 text-xs font-semibold text-gray-700">Título</label>
                <input required name="titulo" defaultValue={initialData?.titulo} type="text" placeholder={`Descreva o nome da ${isReceita ? 'receita' : 'despesa'}`} className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-${colorTheme}-500`} />
              </div>

              {/* Cat, Date, Value Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="mb-1.5 text-xs font-semibold text-gray-700">Categoria</label>
                  <select name="categoria" defaultValue={initialData?.categoria || ''} className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-${colorTheme}-500 bg-white`}>
                    <option value="">Selecionar</option>
                    {!isReceita ? (
                      <>
                        <option value="Agua">Água</option>
                        <option value="Luz">Luz</option>
                        <option value="Aluguel">Aluguel</option>
                        <option value="Salario">Salários</option>
                        <option value="Materiais">Materiais Diversos</option>
                        <option value="Comissões">Comissões</option>
                        <option value="Outros">Outros</option>
                      </>
                    ) : (
                      <>
                        <option value="Servico">Serviço</option>
                        <option value="Venda">Venda de Produto</option>
                        <option value="Rendimento">Rendimento</option>
                        <option value="Outros">Outros</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1.5 text-xs font-semibold text-gray-700">{isReceita ? 'Data recebimento (prev)' : 'Data vencimento'}</label>
                  <input required name="dueDate" defaultValue={initialData?.data_vencimento?.split('T')[0]} type="date" className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-${colorTheme}-500`} />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1.5 text-xs font-semibold text-gray-700">Valor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <input required name="amount" defaultValue={initialData?.valor} type="number" step="0.01" placeholder="0.00" className={`border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-${colorTheme}-500 w-full font-semibold`} />
                  </div>
                </div>
              </div>

              {/* Toggles Recorrencia */}
              <div className="flex flex-col gap-3 mt-1 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
                    <div className={`w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-${colorTheme}-600`}></div>
                    <span className="ml-3 text-sm font-bold text-gray-700">{isReceita ? 'Receita recorrente' : 'Despesa recorrente'}</span>
                  </label>
                </div>

                {isRecurring && (
                  <div className={`bg-${colorTheme}-50 border border-${colorTheme}-100 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2`}>
                    <div className="flex flex-col">
                      <label className="mb-1.5 text-xs font-semibold text-gray-700">Frequência</label>
                      <select name="recurringPeriod" defaultValue={initialData?.periodo_recorrencia || 'mensalmente'} className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-${colorTheme}-500 bg-white`}>
                        <option value="semanalmente">Semanalmente</option>
                        <option value="quinzenalmente">Quinzenalmente</option>
                        <option value="mensalmente">Mensalmente</option>
                        <option value="trimestralmente">Trimestralmente</option>
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1.5 text-xs font-semibold text-gray-700">Duração (meses)</label>
                      <input required name="duracao_meses" defaultValue={initialData?.duracao_meses || 12} type="number" min="1" max="60" placeholder="Ex: 12" className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-${colorTheme}-500`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Pagamento */}
              <div className="flex flex-col mt-2">
                <div className="flex items-center gap-4 mb-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                    <div className={`w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-${colorTheme}-600`}></div>
                    <span className="ml-3 text-sm font-bold text-gray-700">{isReceita ? 'Marcar como RECEBIDA' : 'Marcar como PAGA'}</span>
                  </label>
                </div>

                {isPaid && (
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-5 bg-[#f8fafc] p-4 rounded-lg border border-gray-200">
                    <div className="flex flex-col">
                      <label className="mb-1.5 text-xs font-semibold text-gray-700">{isReceita ? 'Data do recebimento' : 'Data de pagamento'}</label>
                      <input required name="paymentDate" defaultValue={initialData?.data_pagamento?.split('T')[0] || initialData?.data_vencimento?.split('T')[0] || new Date().toISOString().split('T')[0]} type="date" className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-${colorTheme}-500 bg-white`} />
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
              </div>

              {/* Observações */}
              <div className="flex flex-col">
                <label className="mb-1.5 text-xs font-semibold text-gray-700">Observações Gerais</label>
                <textarea name="observacoes" defaultValue={initialData?.observacoes} rows={2} placeholder="Digite aqui" className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-${colorTheme}-500 resize-none`}></textarea>
              </div>

            </div>
          </form>
        </div>

        {/* Painel lateral de Anexos */}
        <div className="w-full md:w-80 bg-gray-50 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 shrink-0">
          <div>
             <div className="flex justify-between items-center mb-6 md:mb-8">
               <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Documentos Anexos</h3>
               <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 hidden md:block">
                 <X size={20} />
               </button>
             </div>
             
             {/* Boletos */}
             <FileZone 
               label="Boletos (Parcelas)" 
               file={boletoFiles} 
               onFileSet={setBoletoFiles} 
               inputRef={boletoRef} 
               multiple={true}
               existingUrl={initialData?.boleto_url || (initialData?.anexo_url && !initialData?.is_paga ? initialData.anexo_url : undefined)}
             />

             {/* Nota Fiscal */}
             <FileZone 
               label="Nota Fiscal (Geral)" 
               file={nfFile} 
               onFileSet={setNfFile} 
               inputRef={nfRef} 
               existingUrl={initialData?.nota_fiscal_url}
             />

             {/* Comprovante */}
             <FileZone 
               label="Comprovante de Pagto" 
               file={compFile} 
               onFileSet={setCompFile} 
               inputRef={compRef}
               existingUrl={initialData?.comprovante_url || (initialData?.anexo_url && initialData?.is_paga ? initialData.anexo_url : undefined)}
             />
          </div>

          <div className="flex flex-col gap-3 mt-6 pt-5 border-t border-gray-200">
             <button type="button" onClick={onClose} className="w-full py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
               Cancelar
             </button>
             <button type="submit" form="despesaForm" className={`w-full py-2.5 text-sm font-bold text-white bg-${colorTheme}-600 rounded-lg hover:bg-${colorTheme}-700 transition-colors shadow-md`}>
               {btnText}
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Simple check icon
const Check = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);
