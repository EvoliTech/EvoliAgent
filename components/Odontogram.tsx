import React, { useState, useMemo } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { DEFAULT_TREATMENTS } from '../constants/treatments';
import { HOFMap } from './HOFMap';

const upperPermanent = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerPermanent = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const upperDeciduous = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const lowerDeciduous = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export interface OdontogramProcedure {
  id: string;
  treatmentName: string;
  isExtraction: boolean;
  notes: string;
  sourceTreatment?: any;
  sourceBudget?: any;
}

interface OdontogramProps {
  patientName: string;
  procedures: Record<number, OdontogramProcedure[]>;
  setProcedures: React.Dispatch<React.SetStateAction<Record<number, OdontogramProcedure[]>>>;
  onAppendToBudget?: (treatments: any[]) => void;
  viewMode?: boolean;
  onUpdateTreatment?: (budget: any, treatmentId: string, updates: any) => Promise<void>;
  onToggleExtraction?: (tooth: number, extracted: boolean) => Promise<void>;
  selectorMode?: boolean;
  onToothSelect?: (tooth: number) => void;
  hofRegionsSelected?: string[];
  onHofRegionToggle?: (region: string) => void;
  hofGender?: 'female' | 'male';
  onGenderChange?: (gender: 'female' | 'male') => void;
}

export function Odontogram({ patientName, procedures, setProcedures, onAppendToBudget, viewMode, onUpdateTreatment, onToggleExtraction, selectorMode, onToothSelect, hofRegionsSelected = [], onHofRegionToggle, hofGender = 'female', onGenderChange }: OdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  
  // View mode local state for toggles and inputs
  const [viewNotes, setViewNotes] = useState<Record<string, string>>({});
  const [viewExtracted, setViewExtracted] = useState(false);

  const handleToothClick = (tooth: number) => {
    setSelectedTooth(tooth);
    if (selectorMode) {
      if (onToothSelect) onToothSelect(tooth);
      return;
    }

    setSelectedTreatments([]);
    setNotes('');
    setSearchTerm('');
    
    // Setup initial view state for viewMode
    if (viewMode && procedures[tooth]) {
       const initialNotes: Record<string, string> = {};
       procedures[tooth].forEach(p => {
          if (p.sourceTreatment) {
              initialNotes[p.id] = p.sourceTreatment.observacoes || '';
          }
       });
       setViewNotes(initialNotes);
       setViewExtracted(procedures[tooth].some(p => p.isExtraction));
    } else {
       setViewExtracted(false);
    }
  };

  const filteredTreatments = useMemo(() => {
    return DEFAULT_TREATMENTS.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50);
  }, [searchTerm]);

  const [archMode, setArchMode] = useState<'permanentes' | 'deciduos' | 'hof'>('permanentes');

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
        {!isUpper && <span className="text-[10px] md:text-[13px] font-semibold text-gray-600 mb-0.5 md:mb-1">{num}</span>}
        <div className={`relative w-7 h-12 md:w-10 md:h-16 flex items-center justify-center rounded-lg md:rounded-xl border-2 transition-colors overflow-hidden ${selectedTooth === num ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : hasProcedure ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-blue-400 bg-transparent'}`}>
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
        {isUpper && <span className="text-[10px] md:text-[13px] font-semibold text-gray-600 mt-0.5 md:mt-1">{num}</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full gap-4 md:gap-8 bg-white p-3 md:p-6 rounded-2xl">
      
      {/* Segmented Control */}
      <div className="flex bg-gray-50 border border-gray-200 p-1 rounded-lg shadow-inner">
        <button 
           className={`px-4 md:px-8 py-1.5 md:py-2 rounded-md text-[13px] md:text-[14px] font-semibold transition-all ${archMode === 'permanentes' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
           onClick={() => setArchMode('permanentes')}
        >
           Permanentes
        </button>
        <button 
           className={`px-4 md:px-8 py-1.5 md:py-2 rounded-md text-[13px] md:text-[14px] font-semibold transition-all ${archMode === 'deciduos' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
           onClick={() => setArchMode('deciduos')}
        >
           Decíduos
        </button>
        <button 
           className={`px-4 md:px-8 py-1.5 md:py-2 rounded-md text-[13px] md:text-[14px] font-semibold transition-all ${archMode === 'hof' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
           onClick={() => setArchMode('hof')}
        >
           HOF
        </button>
      </div>

      {archMode === 'permanentes' && (
        <div className="flex flex-col w-full items-center gap-6 mt-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-1 md:gap-2 justify-start md:justify-center w-full overflow-x-auto hide-scrollbar px-2 pb-2 -mx-4 md:mx-0">
            {upperPermanent.map(n => renderTooth(n, true))}
          </div>

          <div className="w-full max-w-3xl border-t border-dashed border-gray-300"></div>

          <div className="flex gap-1 md:gap-2 justify-start md:justify-center w-full overflow-x-auto hide-scrollbar px-2 pb-2 -mx-4 md:mx-0">
            {lowerPermanent.map(n => renderTooth(n, false))}
          </div>
        </div>
      )}

      {archMode === 'deciduos' && (
        <div className="flex flex-col w-full items-center gap-6 mt-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-2 md:gap-3 justify-start md:justify-center w-full overflow-x-auto hide-scrollbar px-2 pb-2 -mx-4 md:mx-0">
            {upperDeciduous.map(n => renderTooth(n, true))}
          </div>

          <div className="w-full max-w-xl border-t border-dashed border-gray-300"></div>

          <div className="flex gap-2 md:gap-3 justify-start md:justify-center w-full overflow-x-auto hide-scrollbar px-2 pb-2 -mx-4 md:mx-0">
            {lowerDeciduous.map(n => renderTooth(n, false))}
          </div>
        </div>
      )}

      {archMode === 'hof' && (
        <div className="flex flex-col w-full items-center gap-6 mt-4 animate-in fade-in zoom-in-95 duration-200">
           <div className="flex justify-end w-full max-w-[500px] mb-2 gap-2">
              <button 
                onClick={() => onGenderChange?.('female')} 
                className={`p-2 rounded-lg border ${hofGender === 'female' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                title="Mulher"
              >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M8 22h8"/><path d="M8 12h8"/><circle cx="12" cy="7" r="5"/></svg>
              </button>
              <button 
                onClick={() => onGenderChange?.('male')} 
                className={`p-2 rounded-lg border ${hofGender === 'male' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                title="Homem"
              >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/><path d="m22 2-6.5 6.5"/><path d="M16 2h6v6"/></svg>
              </button>
           </div>
           <HOFMap 
              gender={hofGender} 
              selectedRegions={hofRegionsSelected} 
              onRegionToggle={(region) => onHofRegionToggle?.(region)} 
           />
        </div>
      )}

      {/* Action Modal */}
      {selectedTooth && !selectorMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                  {selectedTooth}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Dente {selectedTooth}</h3>
                  <p className="text-xs text-gray-500">{viewMode ? 'Visualizar tratamento' : 'Adicionar procedimento'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTooth(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {viewMode ? (
               <>
                 <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
                    <div className="flex items-center gap-3 w-full bg-gray-50 border border-gray-200 p-3 rounded-xl shadow-sm">
                       <div className="w-10 h-5 bg-gray-200 rounded-full flex items-center p-0.5 cursor-pointer transition-colors shadow-inner" onClick={() => setViewExtracted(!viewExtracted)} style={{ backgroundColor: viewExtracted ? '#ef4444' : '#e5e7eb' }}>
                           <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${viewExtracted ? 'translate-x-5' : 'translate-x-0'}`} />
                       </div>
                       <span className="text-sm font-semibold text-gray-700">Marcar como removido</span>
                    </div>

                    {procedures[selectedTooth] && procedures[selectedTooth].length > 0 ? procedures[selectedTooth].map(p => (
                       <div key={p.id} className="flex flex-col p-4 border border-gray-200 rounded-xl shadow-sm bg-white hover:border-blue-200 transition-colors duration-200">
                          <h4 className="font-bold text-[14px] text-gray-800 leading-tight mb-2">
                             {p.treatmentName} {p.sourceTreatment?.faces ? `(${p.sourceTreatment.faces})` : ''}
                          </h4>
                          <span className="text-[12px] text-gray-500 mb-0.5">
                             {p.sourceBudget?.date || 'Data Desconhecida'} | {p.sourceTreatment?.profissional || p.sourceBudget?.name}
                          </span>
                          <span className="text-[12px] text-gray-500 mb-0.5">
                             Convênio {p.sourceTreatment?.convenio || 'Particular'}
                          </span>
                          <span className="text-[12px] font-bold text-[#e85c13] mt-2 mb-3">
                             {p.sourceTreatment?.status || 'Em andamento'}
                          </span>

                          <textarea 
                             className="w-full border border-gray-200 rounded-lg p-3 text-[13px] outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-gray-50 focus:bg-white resize-none"
                             placeholder="Adicione observações"
                             rows={3}
                             value={viewNotes[p.id] || ''}
                             onChange={e => setViewNotes(prev => ({ ...prev, [p.id]: e.target.value }))}
                          />
                       </div>
                    )) : (
                       <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                          <span>Nenhum tratamento adicionado.</span>
                       </div>
                    )}
                 </div>
                 <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button 
                       onClick={async () => {
                           if (onUpdateTreatment && procedures[selectedTooth]) {
                              const promises = procedures[selectedTooth].map(p => {
                                 let shouldUpdate = false;
                                 const updates: any = {};
                                 if (viewNotes[p.id] !== (p.sourceTreatment?.observacoes || '')) {
                                     updates.observacoes = viewNotes[p.id];
                                     shouldUpdate = true;
                                 }
                                 if (viewExtracted !== !!p.sourceTreatment?.isExtraction) {
                                     updates.isExtraction = viewExtracted;
                                     shouldUpdate = true;
                                 }
                                 if (shouldUpdate && p.sourceBudget && p.id) {
                                     return onUpdateTreatment(p.sourceBudget, p.id, updates);
                                 }
                                 return Promise.resolve();
                              });
                              await Promise.all(promises);
                           }
                           
                           if (onToggleExtraction) {
                               await onToggleExtraction(selectedTooth as number, viewExtracted);
                           }
                              
                           if (procedures[selectedTooth] && viewExtracted !== procedures[selectedTooth].some(x => x.isExtraction)) {
                              setProcedures(prev => {
                                  const st = { ...prev };
                                  if (st[selectedTooth]) {
                                      st[selectedTooth] = st[selectedTooth].map(x => ({ ...x, isExtraction: viewExtracted }));
                                  }
                                  return st;
                              });
                           }
                           setSelectedTooth(null);
                       }}
                       className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md"
                    >
                       Salvar
                    </button>
                 </div>
               </>
            ) : (
             <>
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
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
