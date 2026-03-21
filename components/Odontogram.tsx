import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { DEFAULT_TREATMENTS } from '../constants/treatments';

const upperPermanent = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerPermanent = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const upperDeciduous = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const lowerDeciduous = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

interface OdontogramProcedure {
  id: string;
  treatmentName: string;
  isExtraction: boolean;
  notes: string;
}

export function Odontogram({ patientName }: { patientName: string }) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [procedures, setProcedures] = useState<Record<number, OdontogramProcedure[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState('');
  const [notes, setNotes] = useState('');

  const handleToothClick = (tooth: number) => {
    setSelectedTooth(tooth);
    setSelectedTreatment('');
    setNotes('');
    setSearchTerm('');
  };

  const filteredTreatments = useMemo(() => {
    return DEFAULT_TREATMENTS.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50);
  }, [searchTerm]);

  const [archMode, setArchMode] = useState<'permanentes' | 'deciduos'>('permanentes');

  const handleSaveBudget = () => {
    if (!selectedTreatment) return;
    
    // Simple heuristic to check if it's an extraction
    const isExtraction = selectedTreatment.toLowerCase().includes('exodontia') || selectedTreatment.toLowerCase().includes('extração');
    
    setProcedures(prev => {
      const toothProcedures = prev[selectedTooth!] || [];
      return {
        ...prev,
        [selectedTooth!]: [
          ...toothProcedures,
          {
            id: Math.random().toString(36).substr(2, 9),
            treatmentName: selectedTreatment,
            isExtraction,
            notes
          }
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
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Procedimento
                </label>
                {!selectedTreatment ? (
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text"
                        autoFocus
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar (ex: Exodontia)..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col h-48 bg-gray-50 shadow-inner">
                       <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
                         {filteredTreatments.map(t => (
                           <button
                             key={t.id}
                             onClick={() => setSelectedTreatment(t.name)}
                             className="text-left px-3 py-2 rounded-md hover:bg-blue-600 hover:text-white text-sm truncate bg-white border border-gray-100 shadow-sm transition-colors"
                           >
                             {t.name}
                           </button>
                         ))}
                         {filteredTreatments.length === 0 && (
                            <div className="text-center py-6 text-sm text-gray-500">Nenhum procedimento encontrado</div>
                         )}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start justify-between gap-3 shadow-sm">
                     <div className="flex flex-col">
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Selecionado</span>
                        <span className="font-semibold text-green-900 text-sm leading-tight">{selectedTreatment}</span>
                     </div>
                     <button onClick={() => setSelectedTreatment('')} className="text-green-600 hover:text-green-800 text-xs font-semibold underline shrink-0 mt-0.5 bg-green-100/50 px-2 py-1 rounded">
                       Trocar
                     </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Observações <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalhes adicionais sobre o procedimento..."
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
                disabled={!selectedTreatment}
                onClick={handleSaveBudget}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
              >
                Enviar para Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
