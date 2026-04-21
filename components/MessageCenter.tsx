import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { patientService } from '../services/patientService';
import { Patient } from '../types';
import { Gift, CalendarClock, Search, MessageCircle, Edit3, X, Loader2, Send, Check, Settings, ShieldAlert, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BirthdayPatient extends Patient {
   birthdayType: 'hoje' | 'amanha';
   age: number;
}

const campaignTypesInfo = [
   { id: 'aniversariantes', title: 'Aniversário', icon: Gift },
   { id: 'retorno_semestral', title: 'Recuperação de Inativos', icon: CalendarClock },
   { id: 'pos_operatorio', title: 'Pós-operatório', icon: MessageCircle },
   { id: 'satisfacao', title: 'Satisfação', icon: MessageCircle },
   { id: 'orcamentos_aberto', title: 'Recuperação de Orçamentos', icon: MessageCircle },
   { id: 'tratamentos_finalizados', title: 'Retorno de tratamentos', icon: MessageCircle },
];

export const MessageCenter: React.FC = () => {
   const { empresaId } = useCompany();
   const [activeTab, setActiveTab] = useState<string>('aniversariantes');
   const [loading, setLoading] = useState(false);

   const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
   const [selectedInstance, setSelectedInstance] = useState<any | null>(null);
   const [patientsList, setPatientsList] = useState<any[]>([]);

   const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
   const [customMessage, setCustomMessage] = useState('');

   // Anti-spam logs
   const [sentLogs, setSentLogs] = useState<{ patientId: string, campaignId: string, timestamp: number }[]>([]);

   const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});

   // Template Editor State
   const [isEditingTemplate, setIsEditingTemplate] = useState(false);
   const [templateToEdit, setTemplateToEdit] = useState('');

   // Base default templates
   const defaultTemplates: Record<string, string> = {
      'aniversariantes': "Olá {nome}, tudo bem?\nNós da Clínica desejamos a você um feliz aniversário! 🎉 Que seu dia seja cheio de alegrias!",
      'retorno_semestral': "Olá {nome}, tudo bem?\nNotamos que já faz um tempo desde a sua última consulta conosco. Que tal agendarmos um retorno preventivo para cuidarmos da sua saúde?",
   };

   const getTemplate = (campId: string) => {
      const saved = localStorage.getItem(`${campId}_template`);
      return saved || defaultTemplates[campId] || "Olá {nome}, venha nos visitar!";
   };

   useEffect(() => {
      if (!empresaId) return;

      const fetchCampaigns = async () => {
         let instances: any[] = [];
         if (supabase) {
            const { data } = await supabase.from('campaigns').select('*').eq('empresa_id', empresaId).eq('status', 'active');
            if (data) {
               instances = data.map((d: any) => ({
                  id: d.id,
                  title: d.title,
                  type: d.type,
                  messageTemplate: d.message_template,
                  status: d.status
               }));
            }
         }

         const campaignsList = [...instances];

         // Ensure Aniversariantes is ALWAYS a fixed available tab
         if (!campaignsList.find(c => c.type === 'aniversariantes')) {
            campaignsList.unshift({
               id: 'aniversariantes',
               title: 'Aniversariantes',
               type: 'aniversariantes',
               messageTemplate: getTemplate('aniversariantes'),
               status: 'inactive'
            });
         }

         setActiveCampaigns(campaignsList);
         const uniqueTypes = Array.from(new Set(campaignsList.map(c => c.type)));
         if (uniqueTypes.length > 0 && (!activeTab || !uniqueTypes.includes(activeTab))) {
            setActiveTab(uniqueTypes[0] as string);
            setSelectedInstance(null);
         }

         if (supabase) {
            try {
               const { data: logsData } = await supabase.from('campaign_logs').select('cliente_id, campaign_id, data_envio').eq('empresa_id', empresaId);
               if (logsData) {
                  const mappedLogs = logsData.map((l: any) => ({
                     patientId: l.cliente_id,
                     campaignId: l.campaign_id,
                     timestamp: new Date(l.data_envio).getTime()
                  }));
                  setSentLogs(mappedLogs);
               }
            } catch (e) { }
         } else {
            const savedLogs = localStorage.getItem(`campaign_logs_${empresaId}`);
            if (savedLogs) {
               setSentLogs(JSON.parse(savedLogs));
            }
         }
      };

      fetchCampaigns();
   }, [empresaId]);

   const markAsSent = async (patientId: string, campaignId: string) => {
      if (!empresaId) return;
      const now = Date.now();
      const newLog = { patientId, campaignId, timestamp: now };
      const updated = [...sentLogs, newLog];
      setSentLogs(updated);
      localStorage.setItem(`campaign_logs_${empresaId}`, JSON.stringify(updated));

      // Attempt Supabase insert if applicable
      if (supabase) {
         try {
            await supabase.from('campaign_logs').insert({
               empresa_id: empresaId,
               cliente_id: patientId,
               campaign_id: campaignId // Ideally a UUID, but we use string ID here for logic fallback
            });
         } catch (e) {
            console.error("Failed to log to supabase", e);
         }
      }
   };

   const isRecentlyContacted = (patientId: string, campaignId: string) => {
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      return sentLogs.some(log =>
         log.patientId === patientId &&
         log.campaignId === campaignId &&
         (now - log.timestamp) < THIRTY_DAYS
      );
   };

   const handleDeleteCampaign = async (campaignId: string) => {
      if (!window.confirm("Atenção: Tem certeza que deseja excluir esta campanha? Ela não enviará mais novas mensagens. Históricos anteriores serão mantidos.")) return;

      // Optimistically update UI
      setActiveCampaigns(prev => prev.filter(c => c.id !== campaignId));

      if (supabase) {
         try {
            await supabase.from('campaigns').delete().eq('id', campaignId);
         } catch (e) {
            console.error("Error deleting campaign:", e);
            alert("Houve um erro ao excluir a campanha da nuvem.");
         }
      } else {
         const localData = JSON.parse(localStorage.getItem(`campaigns_${empresaId}`) || '[]');
         const updatedData = localData.filter((c: any) => c.id !== campaignId);
         localStorage.setItem(`campaigns_${empresaId}`, JSON.stringify(updatedData));
      }
   };

   useEffect(() => {
      const handleOpenAniv = () => setActiveTab('aniversariantes');
      window.addEventListener('open_aniversariantes', handleOpenAniv);
      return () => window.removeEventListener('open_aniversariantes', handleOpenAniv);
   }, []);

   useEffect(() => {
      const fetchData = async () => {
         const campToUse = (activeTab === 'aniversariantes') ? activeCampaigns.find(c => c.type === 'aniversariantes') : selectedInstance;
         if (!empresaId || !campToUse) {
            setLoading(false);
            setPatientsList([]);
            return;
         }
         setLoading(true);
         try {
            const allPatients = await patientService.fetchPatients(empresaId);
            const cType = campToUse.type;

            if (cType === 'aniversariantes') {
               const today = new Date();
               const tomorrow = new Date(today);
               tomorrow.setDate(today.getDate() + 1);

               const currentMonth = today.getMonth() + 1;
               const currentDay = today.getDate();
               const tmrwMonth = tomorrow.getMonth() + 1;
               const tmrwDay = tomorrow.getDate();

               const filtered: BirthdayPatient[] = [];

               allPatients.forEach(p => {
                  if (!p.dataNascimento) return;
                  const [yearStr, monthStr, dayStr] = p.dataNascimento.split('-');
                  if (!monthStr || !dayStr) return;
                  const bMonth = parseInt(monthStr, 10);
                  const bDay = parseInt(dayStr, 10);
                  const bYear = parseInt(yearStr, 10);

                  let bType: 'hoje' | 'amanha' | null = null;
                  if (bMonth === currentMonth && bDay === currentDay) bType = 'hoje';
                  else if (bMonth === tmrwMonth && bDay === tmrwDay) bType = 'amanha';

                  if (bType) {
                     const age = today.getFullYear() - bYear;
                     filtered.push({ ...p, birthdayType: bType, age });
                  }
               });

               filtered.sort((a, b) => a.birthdayType === 'hoje' ? -1 : 1);
               setPatientsList(filtered);

            } else if (campToUse.id) {
               if (supabase) {
                  const { data: contactsData } = await supabase.from('campaign_contacts').select('cliente_id').eq('campaign_id', campToUse.id);
                  if (contactsData) {
                     const tiedPatientIds = contactsData.map((c: any) => String(c.cliente_id));
                     const filtered = allPatients.filter(p => tiedPatientIds.includes(String(p.id)));
                     setPatientsList(filtered);
                  } else {
                     setPatientsList([]);
                  }
               } else {
                  setPatientsList([]);
               }
            }
         } catch (e) {
            console.error(e);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, [empresaId, selectedInstance, activeTab, activeCampaigns]);

   const generateMessage = (patient: any, template: string) => {
      const firstName = patient.name.split(' ')[0] || '';
      return template.replace(/\{nome_cliente\}/gi, firstName)
         .replace(/\{nome\}/gi, firstName)
         .replace(/\{nome_completo\}/gi, patient.name);
   };

   const getActiveTemplate = () => {
      const campToUse = (activeTab === 'aniversariantes') ? activeCampaigns.find(c => c.type === 'aniversariantes') : selectedInstance;
      if (campToUse && campToUse.messageTemplate) return campToUse.messageTemplate;
      return getTemplate(activeTab);
   };

   const handleFastSend = (patient: any) => {
      const savedTemplate = getActiveTemplate();
      const msg = customDrafts[patient.id] || generateMessage(patient, savedTemplate);
      const encoded = encodeURIComponent(msg);

      let phone = patient.phone.replace(/\D/g, '');
      if (phone && !phone.startsWith('55')) phone = '55' + phone;

      const campToUse = (activeTab === 'aniversariantes') ? activeCampaigns.find(c => c.type === 'aniversariantes') : selectedInstance;
      const campId = campToUse ? campToUse.id : activeTab;
      markAsSent(patient.id, campId);
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
   };

   const openCustomize = (patient: any) => {
      if (customDrafts[patient.id]) {
         setCustomMessage(customDrafts[patient.id]);
      } else {
         const savedTemplate = getActiveTemplate();
         setCustomMessage(generateMessage(patient, savedTemplate));
      }
      setSelectedPatient(patient);
   };

   const handleSaveCustomMessage = () => {
      if (!selectedPatient) return;
      setCustomDrafts(prev => ({ ...prev, [selectedPatient.id]: customMessage }));
      setSelectedPatient(null);
   };

   const handleOpenTemplateEditor = () => {
      setTemplateToEdit(getTemplate(activeTab));
      setIsEditingTemplate(true);
   };

   const handleSaveTemplate = () => {
      localStorage.setItem(`${activeTab}_template`, templateToEdit);
      setIsEditingTemplate(false);
   };

   return (
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen flex flex-col">
         <div className="flex items-center space-x-3 mb-8">
            <div className="p-3 bg-indigo-100 rounded-xl">
               <MessageCircle className="text-indigo-600 w-6 h-6" />
            </div>
            <div>
               <h1 className="text-2xl font-bold text-gray-800">Central de Mensagens</h1>
               <p className="text-sm text-gray-500 mt-1">Gerencie os alertas ativos para envio de mensagens automáticas.</p>
            </div>
         </div>

         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
            {/* Dynamic Tabs based on campaign Types */}
            <div className="flex border-b border-gray-200 px-6 overflow-x-auto no-scrollbar">
               {Array.from(new Set(activeCampaigns.map(c => c.type))).map(type => {
                  const info = campaignTypesInfo.find(c => c.id === type) || { title: type, icon: MessageCircle };
                  const Icon = info.icon;
                  const isSelected = activeTab === type;
                  return (
                     <button
                        key={type}
                        onClick={() => { setActiveTab(type as string); setSelectedInstance(null); }}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${isSelected
                              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                           }`}
                     >
                        <Icon size={18} />
                        {info.title}
                     </button>
                  );
               })}

               {activeCampaigns.length === 0 && (
                  <div className="px-6 py-4 text-sm font-medium text-gray-400">Nenhuma campanha ativa</div>
               )}

               <div className="flex-1"></div>
            </div>

            <div className="p-6 flex-1 bg-slate-50/30">
               {activeCampaigns.length === 0 ? (
                  <div className="bg-white border text-center border-gray-200 rounded-2xl p-16 shadow-sm flex flex-col items-center">
                     <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                        <MessageCircle className="text-gray-300 w-10 h-10" />
                     </div>
                     <h3 className="text-lg font-bold text-gray-800 mb-2">Nenhuma Campanha Ativa</h3>
                     <p className="text-gray-500 max-w-md mx-auto">
                        Vá em 'Campanhas automáticas' no menu principal para ativar e configurar suas campanhas de CRM.
                     </p>
                  </div>
               ) : (!selectedInstance && activeTab !== 'aniversariantes') ? (
                  /* List of Instances */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {activeCampaigns.filter(c => c.type === activeTab).map(camp => (
                        <div key={camp.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col">
                           <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-1" title={camp.title}>{camp.title}</h3>
                           <div className="text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100 italic line-clamp-3">
                              "{camp.messageTemplate}"
                           </div>
                           <div className="mt-auto flex items-center gap-3">
                              <button
                                 onClick={() => setSelectedInstance(camp)}
                                 className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 transition-colors shadow-sm"
                              >
                                 Ver Contatos
                              </button>
                              <button
                                 onClick={() => handleDeleteCampaign(camp.id)}
                                 className="py-2.5 px-3.5 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                                 title="Excluir campanha"
                              >
                                 <Trash2 className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (activeTab === 'aniversariantes' && activeCampaigns.find(c => c.type === 'aniversariantes')?.status === 'inactive') ? (
                  <div className="bg-white border text-center border-gray-200 rounded-2xl p-16 shadow-sm flex flex-col items-center">
                     <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                        <Gift className="text-gray-300 w-10 h-10" />
                     </div>
                     <h3 className="text-lg font-bold text-gray-800 mb-2">Campanha Inativa</h3>
                     <p className="text-gray-500 max-w-md mx-auto">
                        A campanha de "Aniversariantes" não está ativada. Vá em 'Campanhas automáticas' no menu principal para ativá-la.
                     </p>
                  </div>
               ) : loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                     <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                     <p className="text-gray-500 font-medium">Buscando público alvo...</p>
                  </div>
               ) : patientsList.length === 0 ? (
                  <div className="bg-white border text-center border-gray-200 rounded-2xl p-16 shadow-sm flex flex-col items-center relative">
                     <button onClick={() => setSelectedInstance(null)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 font-semibold text-sm flex items-center gap-1">
                        ← Voltar
                     </button>
                     <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                        <Check className="text-emerald-500 w-10 h-10" />
                     </div>
                     <h3 className="text-lg font-bold text-gray-800 mb-2">Lista Vazia</h3>
                     <p className="text-gray-500 max-w-md mx-auto">
                        {activeTab === 'aniversariantes' ? 'Não há aniversariantes hoje nem amanhã.' : 'Não há pacientes qualificados para esta campanha no momento.'}
                     </p>
                  </div>
               ) : (
                  <div className="flex flex-col h-full">
                     <div className="mb-6 flex items-center gap-4">
                        {activeTab !== 'aniversariantes' && (
                           <button onClick={() => setSelectedInstance(null)} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-800 uppercase px-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all">
                              ← Voltar
                           </button>
                        )}
                        <h2 className="font-bold text-xl text-gray-800 tracking-tight">
                           {activeTab === 'aniversariantes' ? 'Aniversariantes' : (selectedInstance ? selectedInstance.title : '')}
                        </h2>
                        <div className="ml-auto bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                           {patientsList.length} contatos
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {patientsList.map(patient => {
                           const campToUse = (activeTab === 'aniversariantes') ? activeCampaigns.find(c => c.type === 'aniversariantes') : selectedInstance;
                           const campId = campToUse ? campToUse.id : activeTab;
                           const isContacted = isRecentlyContacted(patient.id, campId);

                           return (
                              <div key={patient.id} className={`bg-white border ${isContacted ? 'border-gray-200 opacity-70' : 'border-gray-200 hover:border-indigo-200'} rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative`}>

                                 {/* Tags */}
                                 {patient.birthdayType === 'hoje' && (
                                    <div className="absolute -top-3 -right-3 bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 animate-pulse">
                                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Hoje!
                                    </div>
                                 )}

                                 <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
                                       {patient.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-gray-800 text-base leading-tight line-clamp-1 truncate mr-6" title={patient.name}>{patient.name}</h4>
                                       {patient.age && <p className="text-sm text-gray-500 mt-0.5 font-medium">{patient.age} anos</p>}
                                       {patient.lastVisit && (
                                          <p className="text-[11px] text-amber-600 font-bold bg-amber-100/50 px-2 py-0.5 rounded-md mt-1 w-fit border border-amber-200/50">
                                             Última consulta: {new Date(patient.lastVisit).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                          </p>
                                       )}
                                    </div>
                                 </div>

                                 {/* Anti-spam UI Block */}
                                 {isContacted ? (
                                    <div className="mt-auto pt-4 border-t border-gray-100">
                                       <div className="bg-gray-100 text-gray-500 font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm">
                                          <ShieldAlert size={16} /> Já Contatado (Últimos 30 dias)
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-100">
                                       <button
                                          onClick={() => openCustomize(patient)}
                                          className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 px-3 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors text-sm shadow-sm"
                                       >
                                          <Edit3 size={15} /> Personalizar
                                       </button>
                                       <button
                                          onClick={() => handleFastSend(patient)}
                                          className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-2.5 px-3 rounded-lg hover:bg-[#1ebd5a] transition-colors text-sm shadow-sm shadow-green-500/20"
                                       >
                                          <Send size={15} /> Enviar Msg
                                       </button>
                                    </div>
                                 )}
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Customize Modal */}
         {selectedPatient && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                     <div>
                        <h3 className="text-lg font-bold text-gray-800">Mensagem Personalizada</h3>
                        <p className="text-sm text-gray-500">Editando mensagem para <strong className="text-indigo-600">{selectedPatient.name.split(' ')[0]}</strong></p>
                     </div>
                     <button onClick={() => setSelectedPatient(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={20} />
                     </button>
                  </div>
                  <div className="p-6">
                     <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4 text-sm text-yellow-800">
                        Abaixo você pode editar a mensagem. Clique em **Salvar** para manter as alterações para este paciente antes de enviar.
                     </div>
                     <label className="block text-sm font-semibold text-gray-700 mb-2">Mensagem a ser enviada</label>
                     <textarea
                        value={customMessage}
                        onChange={e => setCustomMessage(e.target.value)}
                        className="w-full h-40 border border-gray-300 rounded-xl p-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium text-[15px] leading-relaxed"
                     />
                  </div>
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                     <button onClick={() => setSelectedPatient(null)} className="px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                        Cancelar
                     </button>
                     <button onClick={handleSaveCustomMessage} className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-indigo-500/20">
                        <Check size={18} />
                        Salvar
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Template Editor Modal */}
         {isEditingTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                     <div>
                        <h3 className="text-lg font-bold text-gray-800">Modelo de Mensagem Padrão</h3>
                        <p className="text-sm text-gray-500">Defina o texto para a aba atual</p>
                     </div>
                     <button onClick={() => setIsEditingTemplate(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={20} />
                     </button>
                  </div>
                  <div className="p-6">
                     <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4 text-sm text-blue-800">
                        Utilize as tags abaixo para personalizar automaticamente:<br />
                        <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-indigo-600">{"{nome_cliente}"}</code> - Primeiro Nome
                     </div>
                     <textarea
                        value={templateToEdit}
                        onChange={e => setTemplateToEdit(e.target.value)}
                        className="w-full h-40 border border-gray-300 rounded-xl p-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium text-[15px] leading-relaxed"
                     />
                  </div>
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                     <button onClick={() => setIsEditingTemplate(false)} className="px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                        Cancelar
                     </button>
                     <button onClick={handleSaveTemplate} className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-indigo-500/20">
                        <Check size={18} />
                        Salvar Modelo
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
