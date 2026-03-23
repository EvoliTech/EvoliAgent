import React, { useState } from 'react';
import { Patient } from '../types';
import { 
  ChevronLeft, Edit2, MessageCircle, Tag, CheckSquare, Plus, 
  MapPin, Phone, Calendar, User, FileText, ChevronRight, X,
  ChevronDown, MoreVertical, Copy, Printer, Trash2
} from 'lucide-react';
import { Odontogram, OdontogramProcedure } from './Odontogram';
import { NewBudgetModal } from './NewBudgetModal';
import { ErrorBoundary } from './ErrorBoundary';

interface PatientDetailsProps {
  patient: any; // Using any for Patient to avoid circular dependency complaints here
  onBack: () => void;
  onEdit: () => void;
}

type TabType = 'Visão Geral' | 'Anamneses' | 'Orçamentos' | 'Tratamentos' | 'Pagamentos' | 'Evoluções' | 'Documentos' | 'Arquivos';

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Budget {
  id: string;
  name: string;
  date: string;
  total: number;
  status: 'Pendente' | 'Aprovado';
  treatments: any[];
}

export const PatientDetails: React.FC<PatientDetailsProps> = ({ patient, onBack, onEdit }) => {
  const [activeTab, setActiveTab] = React.useState<TabType>('Visão Geral');

  // Shared Procedures State (Persisted)
  const [procedures, setProcedures] = React.useState<Record<number, OdontogramProcedure[]>>(() => {
    try {
      const saved = localStorage.getItem(`v3_procedures_${patient.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  React.useEffect(() => {
    localStorage.setItem(`v3_procedures_${patient.id}`, JSON.stringify(procedures));
  }, [procedures, patient.id]);

  // Budgets State (Persisted)
  const [budgets, setBudgets] = React.useState<Budget[]>(() => {
    try {
      const saved = localStorage.getItem(`v3_budgets_list_${patient.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  React.useEffect(() => {
    localStorage.setItem(`v3_budgets_list_${patient.id}`, JSON.stringify(budgets));
  }, [budgets, patient.id]);

  const [openBudgetMenuId, setOpenBudgetMenuId] = React.useState<string | null>(null);

  // Budget Modal State
  const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = React.useState(false);
  const [budgetToEdit, setBudgetToEdit] = React.useState<Budget | null>(null);

  const handleAppendToBudgetFromOdontogram = (newTreatments: any[]) => {
    setBudgets(prev => {
      const existingIdx = prev.findIndex(b => b.name === `Plano de tratamento de ${patient.name}` && b.status === 'Pendente');
      
      if (existingIdx >= 0) {
         const draft = prev[existingIdx];
         const mergedTreatments = [...draft.treatments, ...newTreatments];
         const total = mergedTreatments.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
         const updated = { ...draft, treatments: mergedTreatments, total };
         const copy = [...prev];
         copy[existingIdx] = updated;
         return copy;
      } else {
         const total = newTreatments.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
         const brandNew: Budget = {
            id: Math.floor(Math.random() * 10000000).toString(),
            name: `Plano de tratamento de ${patient.name}`,
            date: new Date().toLocaleDateString('pt-BR'),
            total,
            status: 'Pendente',
            treatments: newTreatments
         };
         return [brandNew, ...prev];
      }
    });
    alert(`Procedimentos enviados para a aba Orçamentos com sucesso!`);
  };

  // Categories state (Persisted)
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(`draft_categories_${patient.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: '1', name: 'Cirurgia', color: '#ef4444' },
      { id: '2', name: 'Endodontia', color: '#3b82f6' },
      { id: '3', name: 'Falecido', color: '#94a3b8' },
      { id: '4', name: 'HOF', color: '#f97316' },
      { id: '5', name: 'Implante', color: '#8b5cf6' },
      { id: '6', name: 'Inativo', color: '#94a3b8' },
      { id: '7', name: 'Necessita cuidado especial', color: '#ef4444' },
      { id: '8', name: 'Ortodontia', color: '#22c55e' },
    ];
  });

  React.useEffect(() => {
    localStorage.setItem(`draft_categories_${patient.id}`, JSON.stringify(categories));
  }, [categories, patient.id]);

  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [editCatName, setEditCatName] = React.useState('');
  const [editCatColor, setEditCatColor] = React.useState('');

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
    setIsCategoryMenuOpen(false); // Close category menu when opening edit modal
  };

  const handleSaveCategory = () => {
    if (!editCatName.trim()) return;
    
    if (editingCategory?.id === 'new') {
      setCategories(prev => [...prev, { id: Math.random().toString(), name: editCatName, color: editCatColor || '#cbd5e1' }]);
    } else if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: editCatName, color: editCatColor } : c));
    }
    setEditingCategory(null);
  };

  const tabs: TabType[] = [
    'Visão Geral', 'Anamneses', 'Orçamentos', 'Tratamentos', 
    'Pagamentos', 'Evoluções', 'Documentos', 'Arquivos'
  ];

  // Helper to calculate age nicely
  const getAgeText = (birthDateStr?: string) => {
    if (!birthDateStr) return '';
    // Assume format YYYY-MM-DD or parseable by Date
    // If it comes as DD/MM/YYYY from BR input, we need to convert to parseable
    let isoStr = birthDateStr;
    if (birthDateStr.includes('/')) {
      const [d, m, y] = birthDateStr.split('/');
      isoStr = `${y}-${m}-${d}`;
    }
    const birth = new Date(isoStr);
    if (isNaN(birth.getTime())) return '';
    
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (now.getDate() < birth.getDate()) {
      months--;
    }
    if (months < 0) {
      months = 11;
    }
    return `${years} anos${months > 0 ? ` e ${months} meses` : ''}`;
  };

  const getFormattedPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 11) { // 5511999999999
      let noCountry = clean;
      if (clean.startsWith('55') && clean.length > 11) {
         noCountry = clean.substring(2);
      }
      return `(${noCountry.substring(0,2)}) ${noCountry.substring(2,7)}-${noCountry.substring(7)}`;
    }
    return phone;
  };

  const ageText = getAgeText(patient.dataNascimento);
  const displayPhone = getFormattedPhone(patient.phone);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 w-full h-full flex flex-col bg-[#f1f5f9] min-h-screen pb-10">
      {/* Top Banner & Header */}
      <div className="bg-white px-6 pt-6 pb-0 border-b border-gray-200">
        <button onClick={onBack} className="flex items-center text-[#64748b] hover:text-[#334155] text-[13px] font-medium mb-4 transition-colors">
          <ChevronLeft size={16} className="mr-1" />
          Voltar para lista
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 bg-[#f1f5f9] text-[#cbd5e1] rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mt-4"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            
            <div className="flex flex-col pt-0.5 relative">
              <h1 className="text-xl font-bold text-[#1e293b]">{patient.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-[13px] text-[#64748b]">
                <div className="flex items-center gap-1.5 font-medium">
                  <a href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#10b981] transition-colors">
                    <MessageCircle size={14} className="text-[#94a3b8]" />
                  </a>
                  {displayPhone}
                </div>
                {ageText && (
                  <span className="font-medium text-[#475569]">{ageText}</span>
                )}
              </div>
              <button 
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`flex items-center gap-1.5 text-[12.5px] transition-colors mt-2 cursor-pointer w-fit p-1 -ml-1 rounded ${isCategoryMenuOpen ? 'text-[#3b82f6] bg-blue-50' : 'text-[#64748b] hover:text-[#3b82f6] hover:bg-slate-50'}`}
              >
                <Tag size={13} /> Categorizar
              </button>

              {/* Categorizar Dropdown */}
              {isCategoryMenuOpen && (
                <div className="absolute top-16 left-0 mt-3 w-80 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100/80 z-[60] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100/80 bg-slate-50/50">
                    <h3 className="font-semibold text-gray-700 text-sm">Categorizar paciente</h3>
                    <button onClick={() => setIsCategoryMenuOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
                    {categories.map((cat) => (
                       <button
                         key={cat.id}
                         onClick={() => openEditCategory(cat)}
                         className="flex items-center justify-between w-full px-5 py-3 hover:bg-slate-50 group transition-colors text-left"
                       >
                         <div className="flex items-center gap-3">
                           <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                           <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{cat.name}</span>
                         </div>
                         <Edit2 size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-500" />
                       </button>
                    ))}
                  </div>

                  <div className="p-3 border-t border-gray-100/80 bg-white">
                    <button 
                      onClick={() => openEditCategory({ id: 'new', name: '', color: '#3b82f6' })}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus size={16} /> Criar categoria
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={onEdit}
            className="flex items-center border border-[#cbd5e1] text-[#475569] px-3 py-1.5 rounded-md hover:bg-[#f8fafc] transition-colors space-x-2 text-[13px] font-semibold"
          >
            <Edit2 size={14} />
            <span>Editar</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-8 mt-8 border-b border-white hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[14.5px] font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === tab 
                  ? 'text-[#2563eb]' 
                  : 'text-[#64748b] hover:text-[#475569]'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {activeTab === 'Visão Geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full max-w-[1400px] mx-auto">
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              
              {/* Tarefas Box */}
              <div className="bg-white border text-[#475569] border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="bg-[#f1f5f9] p-2 rounded-lg text-[#94a3b8] group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                    <CheckSquare size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-[#334155]">Tarefas</span>
                    <span className="text-[12px] text-[#94a3b8]">Nenhuma tarefa cadastrada</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[#94a3b8] group-hover:text-blue-500 text-[13px] font-semibold">
                  <span>+ Nova</span>
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* Informações Box */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative">
                <h3 className="text-[17px] font-bold text-[#1e293b] mb-6">Informações</h3>
                
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Código do paciente</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.id}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Preferência de lembretes</span>
                    <span className="text-[14px] font-medium text-[#334155]">WhatsApp</span>
                  </div>

                  <div className="flex flex-col border-b border-gray-100 pb-5">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Celular</span>
                    <span className="text-[14px] font-medium text-[#334155]">{displayPhone}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Data de nascimento</span>
                    <span className="text-[14px] font-medium text-[#334155]">
                      {patient.dataNascimento ? `${patient.dataNascimento} - ${ageText.split(' ')[0]} anos` : '-'}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Gênero</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.genero || 'Masculino'}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Convênio</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.plano || 'Particular'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              
              {/* Odontogram Section */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                 <div className="bg-slate-50 border-b border-gray-100 p-4">
                    <h3 className="font-bold text-gray-800">Odontograma</h3>
                 </div>
                 <div className="p-4 sm:p-6 lg:p-8 bg-blue-50/30 flex justify-center items-center">
                    <Odontogram 
                       patientName={patient.name} 
                       procedures={procedures}
                       setProcedures={setProcedures}
                       onAppendToBudget={handleAppendToBudgetFromOdontogram}
                    />
                 </div>
              </div>

              {/* Últimas Evoluções Box */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 min-h-[300px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[17px] font-bold text-[#1e293b]">Últimas Evoluções</h3>
                  <button className="flex items-center gap-2 border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] hover:border-[#94a3b8] transition-colors rounded-md px-3 py-1.5 text-[13px] font-semibold">
                    <FileText size={14} /> Adicionar
                  </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                   <div className="relative w-24 h-24 mb-4">
                     <span className="absolute -top-2 -left-2 text-yellow-400 text-2xl">⭐</span>
                     <span className="absolute bottom-2 right-0 text-yellow-200 text-xl">🌙</span>
                     <div className="w-20 h-20 bg-blue-100 rounded-fullmx-auto mt-4 border-[3px] border-blue-200"></div>
                   </div>
                   <p className="text-[14px] text-[#64748b]">Nenhum registro nas evoluções ainda.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Orçamentos Tab */}
        {activeTab === 'Orçamentos' && (
          <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1e293b]">Orçamentos e Planos de Tratamento</h2>
              <button 
                onClick={() => setIsNewBudgetModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-[13px] shadow-sm transition-colors"
              >
                <Plus size={16} /> Novo Orçamento
              </button>
            </div>

            {budgets.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                 <img src="/orcamento.png" alt="Sem orçamentos" className="w-64 h-auto opacity-80 mb-6 drop-shadow-sm" />
                 <h3 className="text-xl font-bold text-gray-700 mb-2">
                   Nenhum orçamento foi criado para esse paciente.
                 </h3>
                 <p className="text-gray-500 font-medium mb-6">
                   Vamos começar? 
                 </p>
                 <button 
                   onClick={() => setIsNewBudgetModalOpen(true)}
                   className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-[14px] shadow-md transition-all"
                 >
                   <Plus size={18} /> Novo Orçamento
                 </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2 animate-in fade-in">
                {budgets.map(budget => (
                  <div key={budget.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <button className="text-gray-400 hover:text-gray-600 mt-0.5"><ChevronDown size={20} /></button>
                        <div 
                          className="flex flex-col cursor-pointer group/title"
                          onClick={() => { setBudgetToEdit(budget); setIsNewBudgetModalOpen(true); }}
                        >
                          <h4 className="font-bold text-gray-800 tracking-tight text-[15px] group-hover/title:text-blue-600 transition-colors">{budget.name}</h4>
                          <span className="text-sm text-gray-500 font-medium">
                            {budget.date} <span className="mx-1 text-gray-300">|</span> #{budget.id}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                         <span className="font-bold text-gray-800 mr-2 text-[15px]">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total)}
                         </span>
                         
                         {budget.status === 'Pendente' ? (
                           <button 
                             onClick={() => setBudgets(prev => prev.map(b => b.id === budget.id ? { ...b, status: 'Aprovado' } : b))}
                             className="border border-gray-200 rounded-lg px-4 py-1.5 font-bold text-gray-700 hover:bg-gray-50 text-[13px] shadow-sm transition-all"
                           >
                             Aprovar
                           </button>
                         ) : (
                           <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
                             Aprovado
                           </span>
                         )}

                         <div className="relative">
                           <button 
                             onClick={() => setOpenBudgetMenuId(openBudgetMenuId === budget.id ? null : budget.id)} 
                             className="p-1.5 bg-gray-50 rounded border border-gray-100 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                           >
                              <MoreVertical size={18} />
                           </button>
                           
                           {openBudgetMenuId === budget.id && (
                             <>
                               <div className="fixed inset-0 z-10" onClick={() => setOpenBudgetMenuId(null)} />
                               <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2 animate-in fade-in zoom-in-95">
                                 <button className="w-full text-left px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                   <Copy size={14} className="text-gray-400" /> Duplicar orçamento
                                 </button>
                                 <button 
                                   onClick={() => { setBudgetToEdit(budget); setIsNewBudgetModalOpen(true); setOpenBudgetMenuId(null); }}
                                   className="w-full text-left px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                 >
                                   <Edit2 size={14} className="text-gray-400" /> Editar
                                 </button>
                                 <button className="w-full text-left px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                   <Printer size={14} className="text-gray-400" /> Imprimir
                                 </button>
                                 <button 
                                   onClick={() => setBudgets(prev => prev.filter(b => b.id !== budget.id))}
                                   className="w-full text-left px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 mt-1 border-t border-gray-50 pt-2"
                                 >
                                   <Trash2 size={14} className="text-red-400" /> Excluir
                                 </button>
                               </div>
                             </>
                           )}
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other Tabs content placeholder */}
        {activeTab !== 'Visão Geral' && activeTab !== 'Orçamentos' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center min-h-[400px] flex flex-col justify-center items-center h-full">
            <span className="text-gray-400 mb-2"><FileText size={48} /></span>
            <h3 className="text-lg font-medium text-gray-700">Aba em desenvolvimento</h3>
            <p className="text-gray-500 text-sm mt-1">O conteúdo de "{activeTab}" será exibido aqui.</p>
          </div>
        )}
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-800">
                {editingCategory.id === 'new' ? 'Nova Categoria' : 'Editar Categoria'}
              </h3>
              <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Nome da categoria</label>
                <input 
                  type="text" 
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  placeholder="Ex: Urgência"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Cor</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={editCatColor}
                    onChange={(e) => setEditCatColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-sm font-medium text-gray-500 uppercase">{editCatColor}</span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {/* Quick color picks */}
                  {['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setEditCatColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${editCatColor === c ? 'border-gray-800 shadow-md' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
              {editingCategory.id !== 'new' ? (
                <button 
                  onClick={() => {
                    setCategories(prev => prev.filter(c => c.id !== editingCategory.id));
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                  Excluir
                </button>
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveCategory}
                  disabled={!editCatName.trim()}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:shadow-none"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Budget Modal */}
      <ErrorBoundary>
      <NewBudgetModal 
        isOpen={isNewBudgetModalOpen}
        onClose={() => { setIsNewBudgetModalOpen(false); setBudgetToEdit(null); }}
        patientName={patient.name}
        proceduresSync={procedures}
        setProceduresSync={setProcedures}
        initialData={budgetToEdit}
        onSave={(budget) => {
          setBudgets(prev => {
             const existIdx = prev.findIndex(b => b.id === budget.id);
             if (existIdx >= 0) {
                const copy = [...prev];
                copy[existIdx] = budget;
                return copy;
             }
             return [budget, ...prev];
          });
        }}
      />
      </ErrorBoundary>
    </div>
  );
};
