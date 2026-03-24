import React, { useState } from 'react';
import { Patient } from '../types';
import { 
  ChevronLeft, Edit2, MessageCircle, Tag, CheckSquare, Plus, 
  MapPin, Phone, Calendar, User, FileText, ChevronRight, X,
  ChevronDown, MoreVertical, Copy, Printer, Trash2, Mic, Smile, Frown, Sparkles, Undo2, Square
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

import { useCompany } from '../contexts/CompanyContext';
import { budgetService } from '../services/budgetService';
import { evolutionService, Evolucao } from '../services/evolutionService';
import { supabase } from '../lib/supabase';

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
  const { empresaId } = useCompany();

  // Shared Procedures State (DB Sync)
  const [procedures, setProcedures] = React.useState<Record<number, OdontogramProcedure[]>>({});
  // Budgets State (DB Sync)
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  
  // Evolutions State
  const [evolutions, setEvolutions] = React.useState<Evolucao[]>([]);
  const [newEvoTratamentoId, setNewEvoTratamentoId] = React.useState<string>('');
  const [newEvoData, setNewEvoData] = React.useState(new Date().toISOString().split('T')[0]);
  const [newEvoProfissional, setNewEvoProfissional] = React.useState('Everton Oliveira');
  const [newEvoTexto, setNewEvoTexto] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [isImproving, setIsImproving] = React.useState(false);

  const handleImproveWithAI = async () => {
    if (!newEvoTexto.trim() || !empresaId) return;
    
    setIsImproving(true);
    try {
        let configData = null;
        const res = await supabase.from('integrations_config').select('client_secret, is_active').eq('service', 'OpenAi').eq('IDEmpresa', empresaId).maybeSingle();
        configData = res.data;
        if (res.error && res.error.code === '42703') {
            const fallback = await supabase.from('integrations_config').select('client_secret').in('service', ['openai', 'OpenAi']).eq('IDEmpresa', empresaId).maybeSingle();
            configData = fallback.data;
        }

        const apiKey = (configData && configData.is_active !== false) ? configData.client_secret : null;
        const finalKey = apiKey || (import.meta as any).env.VITE_OPENAI_API_KEY;

        if (!finalKey) {
            alert("Sua chave de API da IA não foi informada. Vá até Menu > Configurações > Integrações, e salve a sua chave OpenAI.");
            return;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Você é um assistente especializado em odontologia. Sua tarefa é receber um texto de evolução clínica (frequentemente transcrito por voz, podendo conter erros ou falta de formatação), corrigir erros, melhorar a coesão, usar terminologia técnica adequada e formatar o texto em tom altamente profissional. Mantenha o sentido original e seja direto e objetivo sem blábláblá. Não adicione informações clínicas não citadas no original.'
                    },
                    {
                        role: 'user',
                        content: newEvoTexto
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Sua chave de API OpenAI salva nas configurações é inválida ou incorreta.");
            }
            throw new Error("Erro na comunicação com a IA. Tente novamente.");
        }

        const apiData = await response.json();
        const improvedText = apiData.choices[0].message.content;
        setNewEvoTexto(improvedText.trim());

    } catch (error: any) {
        alert("Erro ao melhorar o texto com IA: " + error.message);
    } finally {
        setIsImproving(false);
    }
  };

  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (empresaId && patient?.id) {
       const load = async () => {
         const patientIdNum = Number(patient.id);
         const procs = await budgetService.fetchOdontogram(patientIdNum);
         setProcedures(procs);
         const fetchedBudgets = await budgetService.fetchBudgets(empresaId, patientIdNum);
         setBudgets(fetchedBudgets as Budget[]);
         
         const evos = await evolutionService.fetchEvolutions(empresaId, patientIdNum);
         setEvolutions(evos);

         setIsLoaded(true);
       };
       load();
    }
  }, [empresaId, patient?.id]);

  React.useEffect(() => {
    if (isLoaded && patient?.id) {
      budgetService.saveOdontogram(Number(patient.id), procedures);
    }
  }, [procedures, patient?.id, isLoaded]);

  const [openBudgetMenuId, setOpenBudgetMenuId] = React.useState<string | null>(null);
  const [openTreatmentMenuId, setOpenTreatmentMenuId] = React.useState<string | null>(null);
  const [expandedBudgets, setExpandedBudgets] = React.useState<Record<string, boolean>>({});

  // Budget Modal State
  const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = React.useState(false);
  const [budgetToEdit, setBudgetToEdit] = React.useState<Budget | null>(null);

  const handleAppendToBudgetFromOdontogram = async (newTreatments: any[]) => {
    let targetBudget: Budget | undefined;
    let isNew = false;
    
    setBudgets(prev => {
      const existingIdx = prev.findIndex(b => b.name === `Plano de tratamento de ${patient.name}` && b.status === 'Pendente');
      
      if (existingIdx >= 0) {
         const draft = prev[existingIdx];
         const mergedTreatments = [...draft.treatments, ...newTreatments];
         const total = mergedTreatments.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
         targetBudget = { ...draft, treatments: mergedTreatments, total };
         return prev; // We will update after DB call
      } else {
         const total = newTreatments.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);
         targetBudget = {
            id: Math.floor(Math.random() * 10000000).toString(),
            name: `Plano de tratamento de ${patient.name}`,
            date: new Date().toLocaleDateString('pt-BR'),
            total,
            status: 'Pendente',
            treatments: newTreatments
         };
         isNew = true;
         return prev; // We will update after DB call
      }
    });

    if (targetBudget && empresaId && patient?.id) {
       const saved = await budgetService.saveBudget(empresaId, Number(patient.id), targetBudget);
       if (saved) {
          setBudgets(prev => {
             if (isNew) return [saved, ...prev];
             return prev.map(b => b.id === saved.id || b.id === targetBudget!.id ? saved : b);
          });
          alert(`Procedimentos enviados para a aba Orçamentos com sucesso!`);
       } else {
          alert('Erro ao sincronizar orçamento no banco de dados.');
       }
    }
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
                        <button 
                          className="text-gray-400 hover:text-gray-600 mt-0.5"
                          onClick={() => setExpandedBudgets(prev => ({ ...prev, [budget.id]: !prev[budget.id] }))}
                        >
                          <ChevronDown size={20} className={`transition-transform duration-200 ${expandedBudgets[budget.id] ? 'rotate-180' : ''}`} />
                        </button>
                        <div 
                          className="flex flex-col cursor-pointer group/title"
                          onClick={() => { setBudgetToEdit(budget); setIsNewBudgetModalOpen(true); }}
                        >
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-gray-800 tracking-tight text-[15px] group-hover/title:text-blue-600 transition-colors">{budget.name}</h4>
                            {budget.treatments?.filter((t: any) => t.status === 'Pendente').length > 0 && (
                               <span className="bg-orange-100/80 text-orange-700 text-[11px] px-2 py-0.5 rounded shadow-sm font-bold tracking-wide border border-orange-200/60">
                                  {budget.treatments.filter((t: any) => t.status === 'Pendente').length} {budget.treatments.filter((t: any) => t.status === 'Pendente').length === 1 ? 'Pendência' : 'Pendências'}
                               </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500 font-medium mt-0.5">
                            {budget.date} <span className="mx-1 text-gray-300">|</span> #{budget.numero || '-'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                         <span className="font-bold text-gray-800 mr-2 text-[15px]">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total)}
                         </span>
                         
                         {budget.status !== 'Aprovado' ? (
                           <button 
                             onClick={async () => {
    if (!empresaId || !patient?.id) return;
    const pendingCount = budget.treatments?.filter((t: any) => t.status === 'Pendente').length || 0;
    if (pendingCount > 0) {
       alert("Não é possível aprovar um orçamento com tratamentos pendentes de preenchimento.");
       return;
    }

    const upd = { 
       ...budget, 
       status: 'Aprovado',
       treatments: budget.treatments.map((t: any) => ({
           ...t,
           status: t.status === 'Aguardando' || t.status === 'Adicionado' ? 'Em andamento' : t.status
       }))
    };
    const saved = await budgetService.saveBudget(empresaId, Number(patient.id), upd);
    if (saved) {
       setBudgets(prev => prev.map(b => b.id === budget.id ? saved : b));
       setActiveTab('Tratamentos');
    }
}}
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
                                   onClick={async () => {
    if (!window.confirm("Você tem certeza que deseja excluir esse orçamento permanentemente? (Isso limpará os dentes vinculados a ele)")) return;
    const success = await budgetService.deleteBudget(budget.id);
    if (success) {
      setBudgets(prev => prev.filter(b => b.id !== budget.id));
      // Clean up linked odontogram entries robustly (handles old data without matching IDs as well)
      setProcedures(prev => {
         const idsToRemove = new Set(budget.treatments?.map((t: any) => t.id));
         
         // Build a map of tooth -> names to remove (fallback for old unlinked data)
         const namesToRemoveByTooth: Record<number, Set<string>> = {};
         budget.treatments?.forEach((t: any) => {
            const num = parseInt(t.dente);
            if (!isNaN(num)) {
               if (!namesToRemoveByTooth[num]) namesToRemoveByTooth[num] = new Set();
               namesToRemoveByTooth[num].add(t.treatmentName || t.tratamento);
            }
         });

         const newState = { ...prev };
         let changed = false;
         for (const toothStr in newState) {
            const tooth = Number(toothStr);
            const procs = newState[tooth] || [];
            const fallbackNames = namesToRemoveByTooth[tooth] || new Set();

            const filtered = procs.filter(p => !idsToRemove.has(p.id) && !fallbackNames.has(p.treatmentName));
            if (filtered.length !== procs.length) {
                if (filtered.length === 0) delete newState[tooth];
                else newState[tooth] = filtered;
                changed = true;
            }
         }
         return changed ? newState : prev;
      });
    }
    else alert("Erro ao excluir orçamento!");
}}
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

                    {expandedBudgets[budget.id] && budget.treatments && budget.treatments.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-50/50 rounded-lg overflow-hidden border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/50 border-b border-slate-200">
                                <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tratamento</th>
                                <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dente/Face</th>
                                <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Profissional/Convênio</th>
                                <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {budget.treatments.map((t: any, i: number) => (
                                 <tr key={i} className="hover:bg-white transition-colors">
                                   <td className="px-4 py-2.5 text-sm font-semibold text-slate-700">{t?.treatmentName || 'Desconhecido'}</td>
                                   <td className="px-4 py-2.5 text-sm text-slate-500">
                                     Dente {t?.dente || '-'} {t?.faces ? `- ${t.faces}` : ''}
                                   </td>
                                   <td className="px-4 py-2.5 text-sm text-slate-500">
                                     <div className="flex flex-col">
                                       <span className="font-medium text-slate-600">{t?.profissional || '-'}</span>
                                       <span className="text-[10px] uppercase text-slate-400">{t?.convenio || '-'}</span>
                                     </div>
                                   </td>
                                   <td className="px-4 py-2.5 text-sm font-bold text-slate-700 text-right">
                                      {t?.valor ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(t.valor)) : '--'}
                                   </td>
                                 </tr>
                               ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Tratamentos' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 animate-in fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-between">
               Tratamentos em Andamento/Concluídos
               <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{budgets.filter(b => b.status === 'Aprovado').length} Orçamentos Aprovados</span>
            </h3>
            
            <Odontogram 
               patientName={patient.name}
               procedures={(() => {
                  const result: Record<number, OdontogramProcedure[]> = {};
                  budgets.filter(b => b.status === 'Aprovado').forEach(b => {
                      b.treatments?.forEach(t => {
                          const num = parseInt(t.dente);
                          if (!isNaN(num)) {
                              if (!result[num]) result[num] = [];
                              
                              // Carry over specific extraction state from main procedures if exists
                              const originalProcs = procedures[num] || [];
                              const matchedProc = originalProcs.find(op => op.id === t.id);
                              
                              result[num].push({
                                 id: t.id,
                                 treatmentName: t.treatmentName || t.tratamento,
                                 isExtraction: matchedProc ? matchedProc.isExtraction : false,
                                 notes: t.observacoes || '',
                                 sourceTreatment: t,
                                 sourceBudget: b
                              } as any);
                          }
                      });
                  });
                  return result;
               })()}
               setProcedures={setProcedures}
               viewMode={true}
               onUpdateTreatment={async (budget, treatmentId, updates) => {
                  if (!empresaId || !patient?.id) return;
                  const upd = { 
                     ...budget, 
                     treatments: budget.treatments.map((t: any) => t.id === treatmentId ? { ...t, ...updates } : t)
                  };
                  const saved = await budgetService.saveBudget(empresaId, Number(patient.id), upd);
                  if (saved) {
                     setBudgets(prev => prev.map(b => b.id === budget.id ? saved : b));
                  }
               }}
            />
            
            <div className="mt-12 pt-8 border-t border-gray-100">
               <div className="grid grid-cols-[100px_1fr_60px_60px_120px_150px] gap-6 px-6 border-b border-gray-100 pb-3 mb-4 text-[14px] font-semibold text-slate-700">
                  <div>Data</div>
                  <div>Tratamento</div>
                  <div className="text-center">Dente</div>
                  <div className="text-center">Faces</div>
                  <div>Valor</div>
                  <div></div>
               </div>
               
               <div className="flex flex-col gap-3">
                  {budgets.filter(b => b.status === 'Aprovado').flatMap(b => b.treatments.map((t: any) => ({ ...t, budget: b}))).map((t: any) => (
                      <div key={t.id} className="grid grid-cols-[100px_1fr_60px_60px_120px_150px] gap-6 items-center bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex flex-col items-start gap-1">
                            <span className="text-[14px] text-gray-600 font-medium">{t.budget.date}</span>
                            <span className="text-[11px] text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-md font-semibold font-mono border border-gray-200/50">Orç. #{t.budget.numero || '-'}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-[15px] text-[#2c3e50] font-semibold">{t.treatmentName || t.tratamento}</span>
                            <span className="text-[13px] text-gray-500 flex items-center gap-2">
                               {t.convenio || 'Particular'} 
                               <span className="w-px h-3 bg-gray-300"></span>
                               {t.valor ? `R$ ${t.valor}` : '--'}
                               {t.profissional && <span className="w-px h-3 bg-gray-300"></span>}
                               {t.profissional && `Dr(a) ${t.profissional.replace('Dr. ', '').replace('Dra. ', '')}`}
                            </span>
                         </div>
                         <div className="text-center text-[14px] text-gray-500 font-medium">{t.dente || '-'}</div>
                         <div className="text-center text-[14px] text-gray-500 font-medium">{t.faces || '-'}</div>
                         <div className="text-[14px] text-slate-700 font-semibold">{t.valor ? `R$ ${t.valor}` : '--'}</div>
                         
                         <div className="flex items-center justify-end gap-1 relative">
                             {t.status === 'Finalizado' || t.status === 'Concluído' ? (
                                <span className="px-5 py-2 text-[13px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">Finalizado</span>
                             ) : (
                                <button className="px-5 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-slate-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-colors" onClick={async () => {
                                      const upd = { ...t.budget, treatments: t.budget.treatments.map((x: any) => x.id === t.id ? {...x, status: 'Finalizado'} : x) };
                                      const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), upd);
                                      if (saved) setBudgets(prev => prev.map(b => b.id === t.budget.id ? saved : b));
                                }}>Finalizar</button>
                             )}
                             
                             <button className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ml-1" onClick={() => setOpenTreatmentMenuId(openTreatmentMenuId === t.id ? null : t.id)}>
                                <MoreVertical size={20} />
                             </button>
                             
                             {openTreatmentMenuId === t.id && (
                                <div className="absolute top-[110%] right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                   <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                                     onClick={async () => {
                                        const newName = window.prompt("Editar nome do tratamento:", t.treatmentName || t.tratamento);
                                        if (newName) {
                                            const upd = { ...t.budget, treatments: t.budget.treatments.map((x: any) => x.id === t.id ? {...x, treatmentName: newName} : x) };
                                            const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), upd);
                                            if (saved) setBudgets(prev => prev.map(b => b.id === t.budget.id ? saved : b));
                                        }
                                        setOpenTreatmentMenuId(null);
                                     }}
                                   >
                                      <Edit2 size={16} className="text-gray-400" /> Editar
                                   </button>
                                   <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                                     onClick={async () => {
                                        const newCost = window.prompt("Alterar custo (apenas número):", t.valor);
                                        if (newCost !== null) {
                                            const upd = { ...t.budget, treatments: t.budget.treatments.map((x: any) => x.id === t.id ? {...x, valor: newCost} : x) };
                                            const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), upd);
                                            if (saved) setBudgets(prev => prev.map(b => b.id === t.budget.id ? saved : b));
                                        }
                                        setOpenTreatmentMenuId(null);
                                     }}
                                   >
                                      <span className="text-gray-400 font-bold px-1">$</span> Alterar custo
                                   </button>
                                   <div className="h-px bg-gray-100 my-1"></div>
                                   <button className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                                     onClick={async () => {
                                        if (!window.confirm("Deseja realmente cancelar este tratamento e enviá-lo de volta ao orçamento pendente?")) return;
                                        setOpenTreatmentMenuId(null);
                                        
                                        const remainingTreatments = t.budget.treatments.filter((x: any) => x.id !== t.id);
                                        const updOriginal = { ...t.budget, treatments: remainingTreatments };
                                        
                                        let success = false;
                                        if (remainingTreatments.length === 0) {
                                            success = await budgetService.deleteBudget(t.budget.id);
                                        } else {
                                            const saved = await budgetService.saveBudget(empresaId!, Number(patient.id), updOriginal);
                                            success = !!saved;
                                        }
                                        
                                        if (success) {
                                           if (remainingTreatments.length === 0) {
                                               setBudgets(prev => prev.filter(b => b.id !== t.budget.id));
                                           } else {
                                              const saved = await budgetService.fetchBudgets(empresaId!, Number(patient.id));
                                              setBudgets(saved as Budget[]);
                                           }

                                           const restoredTreatment = { ...t, status: 'Pendente' };
                                           delete restoredTreatment.budget;
                                           await handleAppendToBudgetFromOdontogram([restoredTreatment]);
                                        }
                                     }}
                                   >
                                      <span className="rotate-180 text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></span> Cancelar tratamento
                                   </button>
                                </div>
                             )}
                         </div>
                      </div>
                  ))}
                  {budgets.filter(b => b.status === 'Aprovado').flatMap(b => b.treatments).length === 0 && (
                     <div className="text-center py-12 text-sm text-gray-500 bg-gray-50/50 rounded-xl border border-gray-100">Nenhum tratamento aprovado ainda.</div>
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'Evoluções' && (
          <div className="flex flex-col gap-6 animate-in fade-in">
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Evoluções</h3>
                
                {/* Form fields */}
                <div className="flex gap-4 mb-4">
                   <div className="w-1/3">
                      <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newEvoProfissional} onChange={e => setNewEvoProfissional(e.target.value)}>
                         <option>Everton Oliveira</option>
                         <option>Outro Profissional</option>
                      </select>
                   </div>
                   <div className="w-1/4">
                      <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newEvoData} onChange={e => setNewEvoData(e.target.value)} />
                   </div>
                   <div className="flex-1">
                      <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newEvoTratamentoId} onChange={e => setNewEvoTratamentoId(e.target.value)}>
                         <option value="">Vincular a um tratamento...</option>
                         {budgets.filter(b => b.status === "Aprovado").map(b => (
                             <optgroup label={`Orçamento #${b.numero || b.id.substring(0,4)}`} key={b.id}>
                                {b.treatments.map((t:any) => (
                                    <option key={t.id} value={`${b.id}|||${t.id}`}>
                                       {t.treatmentName || t.tratamento} - Dente {t.dente} {t.faces ? `(${t.faces})` : ''}
                                    </option>
                                ))}
                             </optgroup>
                         ))}
                      </select>
                   </div>
                </div>

                {/* Text editor mock */}
                <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                   <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2 overflow-x-auto">
                      <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 font-bold font-serif w-8 h-8 flex items-center justify-center">B</button>
                      <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 italic font-serif w-8 h-8 flex items-center justify-center">I</button>
                      <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 line-through font-serif w-8 h-8 flex items-center justify-center">S</button>
                      <div className="w-px h-5 bg-gray-300 mx-1"></div>
                      <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 font-bold w-8 h-8 flex items-center justify-center">🔗</button>
                   </div>
                   <textarea 
                      className="w-full h-48 p-4 text-[14px] text-gray-700 outline-none resize-y" 
                      placeholder="Descreva a evolução do tratamento aqui..."
                      value={newEvoTexto}
                      onChange={e => setNewEvoTexto(e.target.value)}
                   />
                </div>

                <div className="flex items-center justify-between mt-4">
                   <div className="flex items-center gap-4">
                      <button 
                         className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-[13px] font-semibold transition-colors shadow-sm ${isRecording ? 'border-red-400 text-red-600 bg-red-50 animate-pulse' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                         onClick={() => {
                            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                               alert("Seu navegador não suporta reconhecimento de voz.");
                               return;
                            }
                            if (isRecording) {
                               setIsRecording(false);
                               return;
                            }
                            setIsRecording(true);
                            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                            const recognition = new SpeechRecognition();
                            recognition.lang = 'pt-BR';
                            recognition.continuous = true;
                            recognition.interimResults = true;
                            
                            recognition.onresult = (event: any) => {
                               let finalMsg = '';
                               for (let i = event.resultIndex; i < event.results.length; ++i) {
                                   if (event.results[i].isFinal) finalMsg += event.results[i][0].transcript;
                               }
                               if (finalMsg) setNewEvoTexto(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + finalMsg);
                            };
                            recognition.onerror = () => setIsRecording(false);
                            recognition.onend = () => setIsRecording(false);
                            recognition.start();
                         }}
                      >
                         {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={16} />} 
                         {isRecording ? 'Parar gravação' : 'Gravar por voz'}
                      </button>

                      <button 
                         className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg text-[13px] font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                         onClick={handleImproveWithAI}
                         disabled={isImproving || !newEvoTexto.trim() || isRecording}
                      >
                         <Sparkles size={16} className={isImproving ? "animate-pulse" : ""} /> 
                         {isImproving ? 'Melhorando...' : 'Melhorar com IA'}
                      </button>
                      
                      {newEvoTexto.length > 5 && !isRecording && !isImproving && (
                         <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-500 animate-in fade-in zoom-in slide-in-from-left-4">
                            A transcrição ficou boa? 
                            <button className="text-emerald-500 hover:scale-110 transition-transform"><Smile size={18} /></button>
                            <button className="text-red-400 hover:scale-110 transition-transform"><Frown size={18} /></button>
                         </div>
                      )}
                   </div>

                   <button 
                     onClick={async () => {
                        if (!newEvoTratamentoId) { alert('Selecione um tratamento para vincular a evolução.'); return; }
                        if (!newEvoTexto.trim()) { alert('Digite o texto da evolução.'); return; }
                        
                        const [bId, tId] = newEvoTratamentoId.split('|||');
                        const b = budgets.find(x => x.id === bId);
                        const t = b?.treatments.find((x:any) => x.id === tId);

                        const novo: Evolucao = {
                           empresa_id: empresaId!,
                           paciente_id: Number(patient.id),
                           orcamento_id: bId,
                           tratamento_id: tId,
                           tratamento_nome: t?.treatmentName || t?.tratamento || 'Desconhecido',
                           dente: t?.dente || '',
                           faces: t?.faces || '',
                           orcamento_numero: b?.numero ? `#${b.numero}` : `#${bId.substring(0,4)}`,
                           texto: newEvoTexto,
                           data_evolucao: newEvoData.split('-').reverse().join('/'),
                           profissional: newEvoProfissional
                        };

                        const salvou = await evolutionService.saveEvolution(novo);
                        if (salvou) {
                           setEvolutions(prev => [salvou, ...prev]);
                           setNewEvoTexto('');
                           setNewEvoTratamentoId('');
                        } else {
                           alert('Falha ao salvar a evolução.');
                        }
                     }}
                     className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
                   >
                     Salvar evolução
                   </button>
                </div>
             </div>

             {/* Histórico Section */}
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-bold text-gray-800">Histórico</h3>
                   <div className="flex gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50/50 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors">
                         <FileText size={16} /> Assinar digitalmente
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                         <Printer size={16} /> Imprimir
                      </button>
                   </div>
                </div>

                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3">
                   <Sparkles className="text-blue-500 mt-0.5" size={18} />
                   <p className="text-[13px] text-blue-800 font-medium">Você tem 10 assinaturas digitais grátis para testar o novo recurso. Para assinar quantos documentos quiser, assine um plano.</p>
                </div>

                <div className="flex flex-col gap-4">
                   {evolutions.map(evo => (
                      <div key={evo.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow bg-white flex flex-col gap-3 relative group">
                         <p className="text-[15px] text-gray-800 whitespace-pre-wrap leading-relaxed">{evo.texto}</p>
                         <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[13px] font-semibold text-gray-500">
                               {evo.tratamento_nome} - Dente {evo.dente || '-'} {evo.faces ? `- ${evo.faces}` : ''} - Orç. {evo.orcamento_numero}
                            </span>
                            <span className="text-[12px] text-gray-400">
                               {evo.data_evolucao} <span className="mx-1">|</span> Dr(a) {evo.profissional.replace('Dr. ', '').replace('Dra. ', '')}
                            </span>
                         </div>
                         <button 
                           onClick={async () => {
                               if(window.confirm("Deseja deletar esta evolução?")) {
                                   if(evo.id && await evolutionService.deleteEvolution(evo.id)) {
                                       setEvolutions(prev => prev.filter(e => e.id !== evo.id));
                                   }
                               }
                           }}
                           className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={16} />
                         </button>
                      </div>
                   ))}
                   {evolutions.length === 0 && (
                      <div className="text-center py-8 text-sm text-gray-500 bg-gray-50/50 rounded-xl border border-gray-100">Nenhuma evolução registrada ainda.</div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Other Tabs content placeholder */}
        {activeTab !== 'Visão Geral' && activeTab !== 'Orçamentos' && activeTab !== 'Tratamentos' && activeTab !== 'Evoluções' && (
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
        onSave={async (budget) => {
          if (empresaId && patient?.id) {
             const saved = await budgetService.saveBudget(empresaId, Number(patient.id), budget);
             if (saved) {
                setBudgets(prev => {
                   const existIdx = prev.findIndex(b => b.id === saved.id || b.id === budget.id);
                   if (existIdx >= 0) {
                      const copy = [...prev];
                      copy[existIdx] = saved;
                      return copy;
                   }
                   return [saved, ...prev];
                });
             } else {
                alert('Erro ao salvar o orçamento no banco de dados!');
             }
          }
        }}
      />
      </ErrorBoundary>
    </div>
  );
};
