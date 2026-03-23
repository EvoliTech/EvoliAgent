import React, { useState, useMemo } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { DEFAULT_TREATMENTS } from '../constants/treatments';

const upperPermanent = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerPermanent = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const upperDeciduous = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const lowerDeciduous = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export interface OdontogramProcedure {
  id: string;
  treatmentName: string;
  isExtraction: boolean;
  notes: string;
}

interface OdontogramProps {
  patientName: string;
  procedures: Record<number, OdontogramProcedure[]>;
  setProcedures: React.Dispatch<React.SetStateAction<Record<number, OdontogramProcedure[]>>>;
  onAppendToBudget?: (treatments: any[]) => void;
}

export function Odontogram({ patientName, procedures, setProcedures, onAppendToBudget }: OdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handleToothClick = (tooth: number) => {
    setSelectedTooth(tooth);
    setSelectedTreatments([]);
    setNotes('');
    setSearchTerm('');
  };

  const filteredTreatments = useMemo(() => {
    return DEFAULT_TREATMENTS.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50);
  }, [searchTerm]);

  const [archMode, setArchMode] = useState<'permanentes' | 'deciduos'>('permanentes');

  const handleSaveBudget = () => {
    if (selectedTreatments.length === 0) return;
    
    // Auto-create budget item payloads for Orçamentos sync
    const sharedIds = selectedTreatments.map(() => Math.random().toString(36).substr(2, 9));
    
    const budgetTreatments = selectedTreatments.map((t, idx) => ({
      id: sharedIds[idx],
      treatmentName: t,
      valor: '',
      dente: selectedTooth!.toString(),
      faces: '',
      profissional: 'N/A',
      convenio: 'N/A',
      status: 'Pendente',
      observacoes: notes
    }));

    if (onAppendToBudget) {
      onAppendToBudget(budgetTreatments);
    }

    setProcedures(prev => {
      const toothProcedures = prev[selectedTooth!] || [];
      const newProcedures = selectedTreatments.map((t, idx) => ({
        id: sharedIds[idx],
        treatmentName: t,
        isExtraction: t.toLowerCase().includes('exodontia') || t.toLowerCase().includes('extração'),
        notes
      }));
      return {
        ...prev,
        [selectedTooth!]: [
          ...toothProcedures,
          ...newProcedures
        ]
      };
    });
    
    window.alert(`Orçamento criado: Orçamento - ${patientName} 01-`);
    
    setSelectedTooth(null);
  };

  const renderTooth = (num: number, isUpper: boolean) => {
    const toothProcedures = procedures[num] || [];
    const isExtracted = toothProcedures.some(p => p.isExtraction);
    const hasProcedure = toothProcedures.some(p => !p.isExtraction);

    return (
      <div 
        key={num} 
        className="flex flex-col items-center gap-1 cursor-pointer group"
        onClick={() => handleToothClick(num)}
      >
        {!isUpper && <span className="text-[13px] font-semibold text-gray-600 mb-1">{num}</span>}
        <div className={`relative w-10 h-16 flex items-center justify-center rounded-xl border-2 transition-colors overflow-hidden ${hasProcedure ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-blue-400 bg-transparent'}`}>
          {/* Tooth Image (Use user uploaded PNG for all) */}
          <img 
            src={`/${num}.png`} 
            alt={`Dente ${num}`} 
            className="w-full h-full object-contain object-center drop-shadow-sm transition-transform group-hover:scale-110" 
            onError={(e) => {
              // Fallback to minimal SVG if image not found
              const target = e.target as HTMLImageElement;
              target.onerror = null; // prevent infinite loop
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-gray-300 hidden">
            <path d="M7,2 C5,2 4,3 4,5 L4,10 C4,13 6,15 8,16 L8,21 C8,22 9,23 10,23 C11,23 12,22 12,21 L12,18 L12,21 C12,22 13,23 14,23 C15,23 16,22 16,21 L16,16 C18,15 20,13 20,10 L20,5 C20,3 19,2 17,2 C15,2 14,3 13,4 L12,6 L11,4 C10,3 9,2 7,2 Z" />
          </svg>
          
          {isExtracted && (
            <div className="absolute inset-0 flex items-center justify-center">
              <X className="w-10 h-10 text-red-500 drop-shadow-md" strokeWidth={3} />
            </div>
          )}
        </div>
        {isUpper && <span className="text-[13px] font-semibold text-gray-600 mt-1">{num}</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full gap-8 bg-white p-6 rounded-2xl">
      
      {/* Segmented Control */}
      <div className="flex bg-gray-50 border border-gray-200 p-1 rounded-lg shadow-inner">
        <button 
           className={`px-8 py-2 rounded-md text-[14px] font-semibold transition-all ${archMode === 'permanentes' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
           onClick={() => setArchMode('permanentes')}
        >
           Permanentes
        </button>
        <button 
           className={`px-8 py-2 rounded-md text-[14px] font-semibold transition-all ${archMode === 'deciduos' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
           onClick={() => setArchMode('deciduos')}
        >
           Decíduos
        </button>
      </div>

      {archMode === 'permanentes' && (
        <div className="flex flex-col w-full items-center gap-6 mt-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-2 justify-center w-full">
            {upperPermanent.map(n => renderTooth(n, true))}
          </div>

          <div className="w-full max-w-3xl border-t border-dashed border-gray-300"></div>

          <div className="flex gap-2 justify-center w-full">
            {lowerPermanent.map(n => renderTooth(n, false))}
          </div>
        </div>
      )}

      {archMode === 'deciduos' && (
        <div className="flex flex-col w-full items-center gap-6 mt-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-3 justify-center w-full">
            {upperDeciduous.map(n => renderTooth(n, true))}
          </div>

          <div className="w-full max-w-xl border-t border-dashed border-gray-300"></div>

          <div className="flex gap-3 justify-center w-full">
            {lowerDeciduous.map(n => renderTooth(n, false))}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {selectedTooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                  {selectedTooth}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Dente {selectedTooth}</h3>
                  <p className="text-xs text-gray-500">Adicionar procedimento</p>
                </div>
              </div>
              <button onClick={() => setSelectedTooth(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
                {/* Registros Anteriores (Manual Unmark Cleanup) */}
                {selectedTooth && procedures[selectedTooth] && procedures[selectedTooth].length > 0 && (
                   <div className="mb-6 bg-orange-50/70 p-4 rounded-xl border border-orange-100/50 shadow-sm animate-in fade-in">
                     <label className="block text-[13px] font-bold text-orange-900 mb-3">
                       Procedimentos Já Registrados
                     </label>
                     <div className="flex flex-col gap-2.5">
                       {procedures[selectedTooth].map(p => (
                         <div key={p.id} className="flex items-center justify-between text-[13px] bg-white border border-orange-100/50 px-3 py-2.5 rounded-lg shadow-sm">
                           <span className="font-semibold text-gray-800 line-clamp-1">{p.treatmentName}</span>
                           <button 
                             onClick={() => setProcedures(prev => {
                                 const updated = prev[selectedTooth].filter(x => x.id !== p.id);
                                 const state = { ...prev };
                                 if (updated.length === 0) delete state[selectedTooth];
                                 else state[selectedTooth] = updated;
                                 return state;
                             })}
                             className="text-gray-400 hover:text-red-500 rounded-md p-1.5 hover:bg-red-50 flex-shrink-0 transition-colors"
                             title="Limpar marcação"
                           >
                             <Trash2 size={16} />
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                )}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Procedimentos
                </label>
                
                {/* Selected Pills */}
                {selectedTreatments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTreatments.map(t => (
                      <div key={t} className="bg-green-50 border border-green-200 text-green-800 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                        <span className="truncate max-w-[200px] font-medium">{t}</span>
                        <button onClick={() => setSelectedTreatments(prev => prev.filter(x => x !== t))} className="text-green-600 hover:text-green-900 ml-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      autoFocus
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar procedural (ex: Exodontia)..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col h-48 bg-gray-50 shadow-inner">
                     <div className="overflow-y-auto flex-1 p-2 space-y-1">
                       {filteredTreatments.map(t => {
                         const isSelected = selectedTreatments.includes(t.name);
                         return (
                           <button
                             key={t.id}
                             onClick={() => {
                               if (!isSelected) {
                                  setSelectedTreatments(prev => [...prev, t.name]);
                                  setSearchTerm('');
                               }
                             }}
                             disabled={isSelected}
                             className={`w-full text-left px-3 py-2.5 rounded-md text-[13px] leading-tight border shadow-sm transition-colors ${isSelected ? 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed' : 'bg-white hover:bg-blue-600 hover:text-white border-gray-100'}`}
                           >
                             <span className="line-clamp-2">{t.name}</span>
                           </button>
                         );
                       })}
                       {filteredTreatments.length === 0 && (
                          <div className="text-center py-6 text-sm text-gray-500">Nenhum procedimento encontrado</div>
                       )}
                     </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Observações <span className="text-gray-400 font-normal">(Aplicado a todos os procedimentos)</span>
                </label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalhes adicionais sobre o dente..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-24 shadow-sm"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-3 items-center">
              <button 
                onClick={() => setSelectedTooth(null)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                disabled={selectedTreatments.length === 0}
                onClick={handleSaveBudget}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
              >
                Enviar {selectedTreatments.length > 0 ? `(${selectedTreatments.length})` : ''} para Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
