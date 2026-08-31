import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Odontogram, OdontogramProcedure } from './Odontogram';
import { DrawingElement } from './HOFMap';
import { plansService } from '../services/plansService';
import { useCompany } from '../contexts/CompanyContext';
import { HealthPlan, Specialist } from '../types';
import { specialistService } from '../services/specialistService';

interface NewBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  proceduresSync?: Record<number, OdontogramProcedure[]>;
  setProceduresSync?: React.Dispatch<React.SetStateAction<Record<number, OdontogramProcedure[]>>>;
  onSave: (budget: any) => void;
  initialData?: any | null;
}

export const NewBudgetModal: React.FC<NewBudgetModalProps> = ({ isOpen, onClose, patientName, proceduresSync, setProceduresSync, onSave, initialData }) => {
  const [budgetName, setBudgetName] = useState(`Plano de tratamento de ${patientName}`);
  const [date, setDate] = useState('');

  // Adding treatment form state
  const { empresaId } = useCompany();
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [profissional, setProfissional] = useState('');
  const [convenio, setConvenio] = useState('');
  const [tratamentoSearch, setTratamentoSearch] = useState('');
  const [selectedTratamento, setSelectedTratamento] = useState<string>('');
  const [selectedTratamentoCategoria, setSelectedTratamentoCategoria] = useState<string>('');
  const [valor, setValor] = useState('');
  const [denteId, setDenteId] = useState('');
  const [faces, setFaces] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isHarmonizacao, setIsHarmonizacao] = useState(false);

  // New Treatment Modal state
  const [isAddingNewTreatment, setIsAddingNewTreatment] = useState(false);
  const [newTreatmentName, setNewTreatmentName] = useState('');
  const [newTreatmentPrice, setNewTreatmentPrice] = useState('');

  // HOF State
  const [hofSelectedRegions, setHofSelectedRegions] = useState<string[]>([]);
  const [hofDrawings, setHofDrawings] = useState<DrawingElement[]>([]);
  const [hofGender, setHofGender] = useState<'female' | 'male'>('female');
  const [hofRegionUIML, setHofRegionUIML] = useState<Record<string, number>>({});
  const [isHofModalOpen, setIsHofModalOpen] = useState(false);

  // Added treatments array
  const [addedTreatments, setAddedTreatments] = useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setBudgetName(initialData.name || `Plano de tratamento de ${patientName}`);
        setDate(initialData.date ? (initialData.date.includes('/') ? initialData.date.split('/').reverse().join('-') : initialData.date) : new Date().toISOString().split('T')[0]);
        setAddedTreatments(initialData.treatments || []);
      } else {
        setBudgetName(`Plano de tratamento de ${patientName}`);
        setDate(new Date().toISOString().split('T')[0]);
        setAddedTreatments([]);
        setHofDrawings([]);
        setHofSelectedRegions([]);
      }

      // Load Plans and Specialists
      if (empresaId) {
        plansService.fetchPlans(empresaId).then(loadedPlans => {
          setPlans(loadedPlans);
          if (loadedPlans.length > 0 && !convenio) {
            setConvenio(loadedPlans.find(p => p.isDefault)?.id || loadedPlans[0].id);
          }
        });
        specialistService.fetchSpecialists(empresaId).then(sp => {
          setSpecialists(sp);
          // Don't override if there's an existing valid selection (like from editing)
          setProfissional(prev => prev || (sp.length > 0 ? sp[0].name : ''));
        });
      }
    }
  }, [isOpen, initialData, patientName, empresaId]);

  // Editing pending treatment state
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);

  const safeTreatments = Array.isArray(addedTreatments) ? addedTreatments : [];
  const pendingTreatments = safeTreatments.filter((t: any) => t?.status === 'Pendente');
  const confirmedTreatments = safeTreatments.filter((t: any) => t?.status !== 'Pendente');

  const localProcedures = React.useMemo(() => {
    const proc: Record<number, OdontogramProcedure[]> = {};
    safeTreatments.forEach(t => {
      const denteNum = parseInt(t.dente);
      if (!isNaN(denteNum)) {
        if (!proc[denteNum]) proc[denteNum] = [];
        proc[denteNum].push({
          id: t.id,
          treatmentName: t.treatmentName,
          isExtraction: t.treatmentName.toLowerCase().includes('exodontia') || t.treatmentName.toLowerCase().includes('extração'),
          notes: t.observacoes || ''
        });
      }
    });
    return proc;
  }, [safeTreatments]);

  const addedHofRegions = React.useMemo(() => {
    const regions = new Set<string>();
    safeTreatments.forEach(t => {
      if (t.hofRegions && Array.isArray(t.hofRegions)) {
        t.hofRegions.forEach((r: string) => regions.add(r));
      }
    });
    return Array.from(regions);
  }, [safeTreatments]);

  const addedHofDrawings = React.useMemo(() => {
    const dr: DrawingElement[] = [];
    safeTreatments.forEach(t => {
      if (t.hofDrawings && Array.isArray(t.hofDrawings)) {
        dr.push(...t.hofDrawings);
      }
    });
    return dr;
  }, [safeTreatments]);

  if (!isOpen) return null;

  const handleAddTreatment = () => {
    if (!selectedTratamento || (!denteId && !isHarmonizacao)) {
      alert("Preencha ao menos o tratamento e o dente (ou marque como Harmonização Facial)");
      return;
    }

    const resolvedConvenioName = plans.find(p => p.id === convenio)?.name || convenio;

    let finalObservacoes = observacoes;
    if (isHarmonizacao && hofSelectedRegions.length > 0) {
       const regInfo = hofSelectedRegions.map(r => `${r}${hofRegionUIML[r] ? ` (${hofRegionUIML[r]} UI/ML)` : ''}`).join(', ');
       finalObservacoes = finalObservacoes ? `${finalObservacoes} | Regiões: ${regInfo}` : `Regiões: ${regInfo}`;
    }

    if (editingPendingId) {
      setAddedTreatments(prev => prev.map(t => t.id === editingPendingId ? {
        ...t,
        treatmentName: selectedTratamento,
        valor,
        dente: denteId,
        faces,
        profissional,
        convenio: resolvedConvenioName,
        status: 'Aguardando',
        observacoes: finalObservacoes,
        hofRegions: [...hofSelectedRegions],
        hofDrawings: [...hofDrawings]
      } : t));
      setEditingPendingId(null);
    } else {
      const t = {
        id: Math.random().toString(36).substr(2, 9),
        treatmentName: selectedTratamento,
        categoria: selectedTratamentoCategoria, // Salva a categoria para filtros de campanhas
        valor,
        dente: denteId,
        faces,
        profissional,
        convenio: resolvedConvenioName,
        status: 'Aguardando',
        observacoes: finalObservacoes,
        hofRegions: [...hofSelectedRegions],
        hofDrawings: [...hofDrawings]
      };

      setAddedTreatments([...safeTreatments, t]);
    }

    // Limpar campos
    setTratamentoSearch('');
    setSelectedTratamento('');
    setValor('');
    setDenteId('');
    setFaces('');
    setObservacoes('');
    setIsHarmonizacao(false);
    setHofSelectedRegions([]);
    setHofDrawings([]);
    setHofRegionUIML({});
  };

  const handleCreateNewTreatment = () => {
    if (!convenio) {
      alert("Por favor, selecione um convênio primeiro para adicionar o tratamento a ele.");
      return;
    }
    setNewTreatmentName('');
    setNewTreatmentPrice('');
    setIsAddingNewTreatment(true);
  };

  const handleConfirmNewTreatment = async () => {
    const name = newTreatmentName;
    if (!name || !name.trim()) return;
    
    const price = parseFloat(newTreatmentPrice.replace(',', '.') || '0');
    if (isNaN(price)) {
      alert("Valor numérico inválido! Operação cancelada.");
      return;
    }

    const selectedPlanObj = plans.find(p => p.id === convenio);
    if (selectedPlanObj && empresaId) {
      const newTreatment = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        category: 'Outros',
        price: price,
        active: true
      };

      const updatedPlan = {
        ...selectedPlanObj,
        treatments: [...selectedPlanObj.treatments, newTreatment]
      };

      try {
        const saved = await plansService.updatePlan(empresaId, updatedPlan);
        setPlans(prev => prev.map(p => p.id === saved.id ? saved : p));
        
        setSelectedTratamento(newTreatment.name);
        setSelectedTratamentoCategoria(newTreatment.category);
        setTratamentoSearch('');
        setValor(String(newTreatment.price));
        setIsAddingNewTreatment(false);
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar novo tratamento no banco de dados.");
      }
    }
  };

  const handleEditPending = (t: any) => {
    setEditingPendingId(t.id);
    setSelectedTratamento(t.treatmentName);
    setDenteId(t.dente || '');
    setFaces(t.faces || '');
    setProfissional(t.profissional || (specialists.length > 0 ? specialists[0].name : '')); // pre-fill or keep existing

    // Find the plan ID that matches the text name from the old treatment
    const matchedPlan = plans.find(p => p.name === t.convenio);
    setConvenio(matchedPlan ? matchedPlan.id : (plans.find(p => p.isDefault)?.id || ''));

    setValor(t.valor || '');
    setObservacoes(t.observacoes || '');
  };

  const handleRemoveAddedTreatment = (tId: string, denteOrig: string) => {
    setAddedTreatments(prev => prev.filter(x => x.id !== tId));
  };

  const selectedPlanObj = plans.find(p => p.id === convenio);
  const planTreatments = selectedPlanObj?.treatments.filter(t => t.active) || [];
  const filteredTreatments = planTreatments.filter(t => t.name.toLowerCase().includes(tratamentoSearch.toLowerCase())).slice(0, 5);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-6 animate-in fade-in duration-300">
      
      {/* Add New Treatment Modal */}
      {isAddingNewTreatment && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Novo Tratamento</h3>
              <button onClick={() => setIsAddingNewTreatment(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Nome do tratamento</label>
                <input
                  type="text"
                  value={newTreatmentName}
                  onChange={e => setNewTreatmentName(e.target.value)}
                  placeholder="Ex: Restauração Resina"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Valor Base (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={newTreatmentPrice}
                    onChange={e => setNewTreatmentPrice(e.target.value)}
                    placeholder="Ex: 150.00"
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsAddingNewTreatment(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors">Cancelar</button>
              <button onClick={handleConfirmNewTreatment} disabled={!newTreatmentName.trim()} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:shadow-none">Cadastrar</button>
            </div>
          </div>
        </div>
      )}

      {/* HOF UI/ML Modal */}
      {isHofModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Plano de aplicação</h3>
            </div>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
              <div className="relative border border-gray-200 rounded-lg p-3 pt-5">
                <span className="absolute -top-2.5 left-3 bg-white px-1 text-[11px] font-semibold text-gray-400">Tratamento</span>
                <input type="text" value={selectedTratamento || 'Não selecionado'} disabled className="w-full text-sm text-gray-500 bg-transparent outline-none" />
              </div>
              
              {hofSelectedRegions.map(reg => (
                <div key={reg} className="flex gap-4">
                  <div className="relative border border-gray-200 rounded-lg p-3 pt-5 w-2/3">
                    <span className="absolute -top-2.5 left-3 bg-white px-1 text-[11px] font-semibold text-gray-400">Região</span>
                    <input type="text" value={reg} disabled className="w-full text-sm text-gray-500 bg-transparent outline-none" />
                  </div>
                  <div className="relative border border-blue-400 rounded-lg p-3 pt-5 w-1/3">
                    <span className="absolute -top-2.5 left-3 bg-white px-1 text-[11px] font-semibold text-blue-500">UI/ML</span>
                    <input 
                      type="number" 
                      min="0"
                      value={hofRegionUIML[reg] || ''} 
                      onChange={e => setHofRegionUIML(prev => ({...prev, [reg]: Number(e.target.value)}))}
                      className="w-full text-sm text-gray-800 bg-transparent outline-none" 
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsHofModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">FECHAR</button>
              <button onClick={() => setIsHofModalOpen(false)} className="px-6 py-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-sm transition-colors">SALVAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-[1400px] h-full max-h-[96vh] rounded-2xl bg-[#f8fafc] shadow-2xl border border-white flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">

        <div className="flex items-center justify-between border-b border-gray-200 p-6 flex-shrink-0 bg-white">
          <h3 className="text-xl font-bold text-gray-900">Novo Orçamento</h3>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8 bg-white/50">
          {/* Top Form */}
          <div className="flex gap-4">
            <div className="w-1/4">
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="w-3/4">
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Nome do orçamento</label>
              <input
                type="text"
                value={budgetName}
                onChange={e => setBudgetName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Odontograma Integrado */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <h4 className="font-bold text-[#1e293b]">Selecione o dente no Odontograma</h4>
            <div className="w-full bg-slate-50/50 rounded-xl border border-slate-100 p-2">
              <Odontogram 
                patientName={patientName}
                procedures={localProcedures}
                setProcedures={() => {}} // Apenas visualização e seleção
                selectorMode={true}
                onToothSelect={(tooth) => {
                  setIsHarmonizacao(false);
                  setDenteId(String(tooth));
                  // Smooth scroll to the form
                  document.getElementById('treatment-form-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                hofRegionsSelected={hofSelectedRegions}
                addedHofRegions={addedHofRegions}
                hofDrawings={hofDrawings}
                addedHofDrawings={addedHofDrawings}
                onHofDrawingsChange={setHofDrawings}
                onHofRegionToggle={(region) => {
                  setHofSelectedRegions(prev => {
                    if (prev.includes(region)) return prev.filter(r => r !== region);
                    return [...prev, region];
                  });
                  setIsHarmonizacao(true);
                  // Smooth scroll to form if selecting region
                  document.getElementById('treatment-form-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                hofGender={hofGender}
                onGenderChange={setHofGender}
              />
            </div>
          </div>

          {/* Adicionar Tratamentos Box */}
          <div className="flex flex-col gap-4" id="treatment-form-box">
            <h4 className="font-bold text-[#1e293b]">Adicionar tratamentos</h4>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-5">
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5"><span className="text-red-500">*</span> Profissional</label>
                  <select
                    value={profissional}
                    onChange={e => setProfissional(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {!profissional && <option value="">Selecionar profissional</option>}
                    {specialists.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5"><span className="text-red-500">*</span> Convênio</label>
                  <select
                    value={convenio}
                    onChange={e => setConvenio(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {!convenio && <option value="">Selecionar</option>}
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 items-end">
                <div className="w-3/4 relative">
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5"><span className="text-red-500">*</span> Tratamento</label>
                  {selectedTratamento ? (
                    <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-blue-50 text-blue-900 flex justify-between items-center outline-none">
                      <span className="truncate">{selectedTratamento}</span>
                      <button onClick={() => setSelectedTratamento('')} className="text-blue-500 hover:text-blue-700 bg-white px-2 rounded font-semibold text-xs py-0.5 shadow-sm">Mudar</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={tratamentoSearch}
                        onChange={e => setTratamentoSearch(e.target.value)}
                        placeholder="Digite o nome de um tratamento"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {tratamentoSearch && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                          {filteredTreatments.length === 0 && (
                            <div className="px-3 py-4 text-sm text-gray-400 text-center">Nenhum tratamento encontrado neste plano.</div>
                          )}
                          {filteredTreatments.map(t => (
                            <button key={t.id} onClick={() => {
                              setSelectedTratamento(t.name);
                              setSelectedTratamentoCategoria(t.category);
                              setTratamentoSearch('');
                              setValor(String(t.price));
                            }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 truncate flex justify-between items-center group">
                              <span className="group-hover:text-blue-700">{t.name}</span>
                              <span className="text-emerald-600 font-semibold text-xs whitespace-nowrap">R$ {Number(t.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={handleCreateNewTreatment} className="text-blue-600 text-xs font-semibold mt-2 hover:underline">Cadastrar novo tratamento</button>
                </div>
                <div className="w-1/4 pb-5">
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Valor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <input
                      type="number"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 bg-blue-50 border border-blue-100 p-3 rounded-xl hover:bg-blue-100/50 transition-colors">
                  <input type="checkbox" checked={isHarmonizacao} onChange={e => {
                      setIsHarmonizacao(e.target.checked);
                      if (e.target.checked) {
                          setDenteId('');
                          setFaces('');
                      } else {
                          setHofSelectedRegions([]);
                      }
                  }} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                  Este tratamento é Harmonização Facial ou Geral (não requer seleção de dente)
                </label>

                {isHarmonizacao ? (
                  <div className="flex gap-4 items-end mt-2 mb-2">
                    <div className="w-full relative border border-blue-200 rounded-lg p-3 min-h-[60px] flex gap-2 flex-wrap items-center bg-blue-50/30">
                       <span className="absolute -top-2.5 left-3 bg-white px-1 text-[11px] font-semibold text-blue-500">Selecionar região</span>
                       {hofSelectedRegions.map(reg => (
                          <div key={reg} className="bg-gray-200 border border-gray-300 px-2 py-1 rounded text-[13px] flex items-center gap-1 shadow-sm text-gray-800">
                             {reg} {hofRegionUIML[reg] ? <span className="font-bold">({hofRegionUIML[reg]})</span> : ''}
                             <button onClick={() => setHofSelectedRegions(prev => prev.filter(r => r !== reg))} className="text-gray-500 hover:text-red-500 ml-1"><X size={14} /></button>
                          </div>
                       ))}
                       <input 
                          type="text" 
                          placeholder="Inserir região..." 
                          className="outline-none flex-1 min-w-[100px] text-sm bg-transparent"
                          onKeyDown={(e) => {
                             if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                const val = e.currentTarget.value.trim();
                                if (!hofSelectedRegions.includes(val)) {
                                   setHofSelectedRegions(prev => [...prev, val]);
                                }
                                e.currentTarget.value = '';
                             }
                          }}
                       />
                       {hofSelectedRegions.length > 0 && (
                          <button onClick={() => setIsHofModalOpen(true)} className="ml-auto text-blue-600 font-semibold text-sm hover:underline">
                             Selecionar UI/ML
                          </button>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Dente(s)</label>
                      <select
                        value={denteId}
                        onChange={e => setDenteId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none flex items-center justify-between"
                      >
                        <option value="">Selecionar</option>
                        <optgroup label="Permanentes">
                          {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(d => (
                            <option key={d} value={d}>Dente {d}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Decíduos (Leite)">
                          {[55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75].map(d => (
                            <option key={d} value={d}>Dente {d}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div className="w-1/2">
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Face(s)</label>
                      <select
                        value={faces}
                        onChange={e => setFaces(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Selecionar</option>
                        <option value="Vestibular">Vestibular</option>
                        <option value="Lingual">Lingual</option>
                        <option value="Oclusal">Oclusal</option>
                        <option value="Mesial">Mesial</option>
                        <option value="Distal">Distal</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <div className="w-full">
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Observações</label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    placeholder="Notas importadas do odontograma ou anotações..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleAddTreatment}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow-md transition-all"
                >
                  Adicionar ao orçamento
                </button>
              </div>
            </div>
          </div>

          {/* Tratamentos Pendentes */}
          {pendingTreatments.length > 0 && (
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-[#e85c13] flex items-center gap-2">
                Tratamentos Pendentes ({pendingTreatments.length})
                <span className="text-xs font-normal text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Preencha os dados</span>
              </h4>
              <div className="bg-orange-50/50 border border-orange-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-orange-100/40 border-b border-orange-200">
                      <th className="px-5 py-3 text-xs font-semibold text-orange-800 uppercase tracking-wider">Tratamento</th>
                      <th className="px-5 py-3 text-xs font-semibold text-orange-800 uppercase tracking-wider">Dente/Face</th>
                      <th className="px-5 py-3 text-xs font-semibold text-orange-800 uppercase tracking-wider text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {pendingTreatments.map((t) => (
                      <tr
                        key={t.id}
                        className={`hover:bg-orange-100/60 cursor-pointer transition-colors ${editingPendingId === t.id ? 'bg-orange-100' : ''}`}
                        onClick={() => handleEditPending(t)}
                      >
                        <td className="px-5 py-3 text-sm font-semibold text-orange-900">
                          <div className="flex flex-col">
                            <span>{t.treatmentName}</span>
                            {t.observacoes && <span className="text-xs text-orange-700/70 font-normal truncate max-w-xs">{t.observacoes}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-orange-800">{t.dente ? `Dente ${t.dente}` : 'Geral / Face'} {t.faces && `- ${t.faces}`}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-orange-600 font-bold text-[11px] uppercase tracking-wider bg-white px-3 py-1.5 rounded shadow-sm border border-orange-100">Atualizar</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tratamentos adicionados */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-[#1e293b]">Tratamentos adicionados ({confirmedTreatments.length})</h4>

            {confirmedTreatments.length === 0 && pendingTreatments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 opacity-80 mt-4 animate-in fade-in zoom-in-95">
                <img src="/empty-inventory.png" alt="Ainda não há tratamentos" className="w-48 h-auto opacity-70 mb-4" />
                <span className="text-gray-500 font-medium">Ainda não há tratamentos neste orçamento.</span>
              </div>
            ) : confirmedTreatments.length === 0 && pendingTreatments.length > 0 ? null : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tratamento</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dente/Face</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Profissional / Convênio</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor total</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {confirmedTreatments.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                          <div className="flex flex-col">
                            <span>{t.treatmentName}</span>
                            {t.observacoes && <span className="text-[11px] font-normal text-slate-500 mt-0.5 truncate max-w-[200px]">{t.observacoes}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{t.dente ? `Dente ${t.dente}` : 'Geral / Face'} {t.faces && `- ${t.faces}`}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">
                          <div className="flex flex-col">
                            <span>{t.profissional}</span>
                            <span className="text-xs text-slate-400">{t.convenio}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm font-bold text-slate-700">{t.valor ? `R$ ${t.valor}` : '--'}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => handleRemoveAddedTreatment(t.id, t.dente)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-white flex justify-end gap-3 flex-shrink-0 relative z-20">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-sm">Cancelar</button>
          <button
            onClick={() => {
              const total = safeTreatments.reduce((sum, t) => sum + (parseFloat(t?.valor) || 0), 0);
              const hasPending = safeTreatments.some(t => t.status === 'Pendente');

              let finalStatus = 'Pendente';
              if (initialData?.status === 'Aprovado') finalStatus = 'Aprovado';
              else if (safeTreatments.length > 0 && !hasPending) finalStatus = 'Aguardando';

              const budget = {
                id: initialData ? initialData.id : `new_${Math.floor(Math.random() * 10000000)}`,
                name: budgetName,
                date: date.split('-').reverse().join('/'),
                total: total,
                status: finalStatus,
                treatments: safeTreatments
              };
              onSave(budget);
              setAddedTreatments([]);
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors text-sm"
          >
            Salvar Orçamento
          </button>
        </div>

      </div>
    </div>
  );
};
