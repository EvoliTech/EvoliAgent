import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { patientService } from '../services/patientService';
import { Patient } from '../types';
import { Gift, CalendarClock, Search, MessageCircle, Edit3, X, Loader2, Send, Check, Settings } from 'lucide-react';

interface BirthdayPatient extends Patient {
  birthdayType: 'hoje' | 'amanha';
  age: number;
}

export const MessageCenter: React.FC = () => {
  const { empresaId } = useCompany();
  const [activeTab, setActiveTab] = useState<'aniversariantes' | 'retorno'>('aniversariantes');
  const [loading, setLoading] = useState(true);
  const [birthdayPatients, setBirthdayPatients] = useState<BirthdayPatient[]>([]);
  
  const [selectedPatient, setSelectedPatient] = useState<BirthdayPatient | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});
  
  // Template Editor State
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState('');
  
  useEffect(() => {
    if (!empresaId) return;
    const todayISO = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`sent_messages_${empresaId}_${todayISO}`);
    if (saved) {
      setSentMessages(JSON.parse(saved));
    }
  }, [empresaId]);

  const markAsSent = (patientId: string) => {
    if (!empresaId) return;
    const todayISO = new Date().toISOString().split('T')[0];
    const updated = [...sentMessages, patientId];
    setSentMessages(updated);
    localStorage.setItem(`sent_messages_${empresaId}_${todayISO}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('messages_sent_updated'));
  };
  
  // Base default template for birthdays
  const defaultTemplate = "Olá {nome}, tudo bem?\nNós da Clínica desejamos a você um feliz aniversário! 🎉 Que seu dia seja cheio de alegrias!";
  
  // Retorno Semestral State
  const [retornoPatients, setRetornoPatients] = useState<Patient[]>([]);
  const defaultRetornoTemplate = "Olá {nome}, tudo bem?\nNotamos que já faz um tempo desde a sua última consulta conosco. Que tal agendarmos um retorno preventivo para cuidarmos da sua saúde?";
  
  const isRetornoActive = (() => {
    try {
      if (!empresaId) return false;
      const saved = localStorage.getItem(`campaigns_config_${empresaId}`);
      if (saved) {
        return JSON.parse(saved)['retorno_semestral'] === true;
      }
    } catch {}
    return false;
  })();

  const isAniversarioActive = (() => {
    try {
      if (!empresaId) return false;
      const saved = localStorage.getItem(`campaigns_config_${empresaId}`);
      if (saved) {
        // Updated to use the correct ID 'aniversariantes'
        return JSON.parse(saved)['aniversariantes'] === true;
      }
    } catch {}
    return false;
  })();

  useEffect(() => {
    const fetchAniversariantes = async () => {
      if (!empresaId || !isAniversarioActive) return;
      try {
        setLoading(true);
        const allPatients = await patientService.fetchPatients(empresaId);
        
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
          
          if (bMonth === currentMonth && bDay === currentDay) {
            bType = 'hoje';
          } else if (bMonth === tmrwMonth && bDay === tmrwDay) {
            bType = 'amanha';
          }
          
          if (bType) {
             const age = today.getFullYear() - bYear;
             filtered.push({ ...p, birthdayType: bType, age });
          }
        });

        filtered.sort((a, b) => {
           if (a.birthdayType !== b.birthdayType) {
              return a.birthdayType === 'hoje' ? -1 : 1;
           }
           return a.name.localeCompare(b.name);
        });

        setBirthdayPatients(filtered);
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRetorno = async () => {
      if (!empresaId) return;
      try {
        setLoading(true);
        const allPatients = await patientService.fetchPatients(empresaId);
        
        let agData: any[] = [];
        try {
            const { supabase: sb } = await import('../lib/supabase');
            const { data } = await sb.from('agendamentos').select('cliente_id, data_inicio').eq('IDEmpresa', empresaId);
            agData = data || [];
        } catch (err) {
            console.error('Falha ao buscar agendamentos:', err);
        }

        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const filtered = allPatients.filter(p => {
            const cleanPhone = p.phone ? p.phone.replace(/\D/g, '') : null;
            
            const patientAppts = agData.filter(ag => {
                const isIdMatch = String(ag.cliente_id) === String(p.id);
                const isPhoneMatch = cleanPhone && String(ag.cliente_id) === cleanPhone;
                const isTitleMatch = ag.titulo && p.name && ag.titulo.toLowerCase().includes(p.name.toLowerCase());
                return isIdMatch || isPhoneMatch || isTitleMatch;
            });

            let lastVisitDate: Date | null = null;
            let hasFutureAppt = false;

            if (patientAppts.length > 0) {
                patientAppts.forEach(ag => {
                    if (!ag.data_inicio) return;
                    const statusStr = (ag.status || '').toLowerCase();
                    if (statusStr.includes('cancel')) return;

                    const agDate = new Date(ag.data_inicio);
                    if (agDate > now) {
                        hasFutureAppt = true;
                    } else {
                        if (!lastVisitDate || agDate > lastVisitDate) {
                            lastVisitDate = agDate;
                        }
                    }
                });
            }

            if (hasFutureAppt) return false;

            if (!lastVisitDate) {
                if (!p.lastVisit || p.lastVisit === '-') return false;
                
                if (p.lastVisit.includes('/')) {
                    const [day, month, year] = p.lastVisit.split('/').map(Number);
                    if (day && month && year) {
                       lastVisitDate = new Date(year, month - 1, day);
                    }
                } else if (p.lastVisit.includes('-')) {
                    const [year, month, day] = p.lastVisit.split('T')[0].split('-').map(Number);
                    if (year && month && day) {
                       lastVisitDate = new Date(year, month - 1, day);
                    }
                } else {
                   lastVisitDate = new Date(p.lastVisit);
                }
            }
            
            if (!lastVisitDate || isNaN(lastVisitDate.getTime())) return false;
            
            p.lastVisit = lastVisitDate.toISOString();
            return lastVisitDate <= sixMonthsAgo;
        });
        
        filtered.sort((a,b) => {
           const dA = new Date(a.lastVisit!).getTime();
           const dB = new Date(b.lastVisit!).getTime();
           return dA - dB;
        });
        
        setRetornoPatients(filtered);
      } catch (error) {
        console.error("Erro ao buscar pacientes retorno:", error);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'aniversariantes' && isAniversarioActive) {
      fetchAniversariantes();
    } else if (activeTab === 'retorno' && isRetornoActive) {
      fetchRetorno();
    } else {
      setLoading(false);
    }
  }, [empresaId, activeTab, isRetornoActive, isAniversarioActive]);

  const generateMessage = (patient: BirthdayPatient, template: string) => {
     const firstName = patient.name.split(' ')[0] || '';
     return template.replace(/\{nome\}/gi, firstName).replace(/\{nome_completo\}/gi, patient.name);
  };

  const handleFastSend = (patient: any) => {
     const isRetornoTab = activeTab === 'retorno';
     const savedTemplate = isRetornoTab 
        ? (localStorage.getItem('retorno_template') || defaultRetornoTemplate)
        : (localStorage.getItem('birthday_template') || defaultTemplate);
        
     const msg = customDrafts[patient.id] || generateMessage(patient as BirthdayPatient, savedTemplate);
     const encoded = encodeURIComponent(msg);
     
     let phone = patient.phone.replace(/\D/g, '');
     if (phone && !phone.startsWith('55')) phone = '55' + phone;
     
     markAsSent(patient.id);
     window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const openCustomize = (patient: Patient, isRetorno: boolean = false) => {
     if (customDrafts[patient.id]) {
        setCustomMessage(customDrafts[patient.id]);
     } else {
        const savedTemplate = isRetorno 
           ? (localStorage.getItem('retorno_template') || defaultRetornoTemplate)
           : (localStorage.getItem('birthday_template') || defaultTemplate);
           
        setCustomMessage(generateMessage(patient as BirthdayPatient, savedTemplate));
     }
     setSelectedPatient(patient as BirthdayPatient);
  };

  const handleSaveCustomMessage = () => {
     if (!selectedPatient) return;
     setCustomDrafts(prev => ({ ...prev, [selectedPatient.id]: customMessage }));
     setSelectedPatient(null);
  };

  const handleOpenTemplateEditor = () => {
     const isRetorno = activeTab === 'retorno';
     const current = isRetorno 
        ? (localStorage.getItem('retorno_template') || defaultRetornoTemplate)
        : (localStorage.getItem('birthday_template') || defaultTemplate);
     setTemplateToEdit(current);
     setIsEditingTemplate(true);
  };

  const handleSaveTemplate = () => {
     const isRetorno = activeTab === 'retorno';
     localStorage.setItem(isRetorno ? 'retorno_template' : 'birthday_template', templateToEdit);
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
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('aniversariantes')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'aniversariantes' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Gift size={18} />
            Aniversariantes
            {birthdayPatients.length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">
                 {birthdayPatients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('retorno')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'retorno' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <CalendarClock size={18} />
            Retorno Semestral
          </button>
          <div className="flex-1"></div>
          <div className="flex items-center px-6">
             <button 
               onClick={handleOpenTemplateEditor}
               className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-xs bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
             >
                <Settings size={14} /> Configurar Modelo Padrão
             </button>
          </div>
        </div>

        <div className="p-6 flex-1 bg-slate-50/30">
           {activeTab === 'aniversariantes' && (
             !isAniversarioActive ? (
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
                 <p className="text-gray-500 font-medium">Buscando aniversariantes...</p>
               </div>
             ) : birthdayPatients.length === 0 ? (
               <div className="bg-white border text-center border-gray-200 rounded-2xl p-16 shadow-sm flex flex-col items-center">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                    <Gift className="text-gray-300 w-10 h-10" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-800 mb-2">Nenhum aniversariante</h3>
                 <p className="text-gray-500 max-w-md mx-auto">
                    Não há pacientes fazendo aniversário hoje ou amanhã em seu cadastro.
                 </p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {birthdayPatients.map(patient => (
                   <div key={patient.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col relative group">
                      {patient.birthdayType === 'hoje' && (
                         <div className="absolute -top-3 -right-3 bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 animate-pulse">
                           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                           Hoje!
                         </div>
                      )}
                      {patient.birthdayType === 'amanha' && (
                         <div className="absolute -top-3 -right-3 bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                           Amanhã
                         </div>
                      )}

                      <div className="flex items-center gap-4 mb-5">
                         <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
                            {patient.name.substring(0,2).toUpperCase()}
                         </div>
                         <div>
                            <h4 className="font-bold text-gray-800 text-base leading-tight line-clamp-1 truncate mr-6" title={patient.name}>{patient.name}</h4>
                            <p className="text-sm text-gray-500 mt-0.5 font-medium">{patient.age} anos</p>
                         </div>
                         {sentMessages.includes(patient.id) && (
                            <div className="ml-auto bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 border border-green-200">
                               <Check size={14} strokeWidth={3} /> Enviado
                            </div>
                         )}
                      </div>

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
                   </div>
                 ))}
               </div>
             )
           )}

           {activeTab === 'retorno' && (
             !isRetornoActive ? (
                 <div className="bg-white border text-center border-gray-200 rounded-2xl p-16 shadow-sm flex flex-col items-center">
                     <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                        <CalendarClock className="text-gray-300 w-10 h-10" />
                     </div>
                     <h3 className="text-lg font-bold text-gray-800 mb-2">Campanha Inativa</h3>
                     <p className="text-gray-500 max-w-md mx-auto">
                        A campanha de "Retorno Semestral" não está ativada. Vá em 'Campanhas automáticas' no menu principal para ativá-la.
                     </p>
                 </div>
             ) : loading ? (
                 <div className="flex flex-col items-center justify-center py-20">
                   <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                   <p className="text-gray-500 font-medium">Buscando pacientes para retorno...</p>
                 </div>
             ) : retornoPatients.length === 0 ? (
                 <div className="bg-white border text-center border-gray-200 rounded-2xl p-16 shadow-sm flex flex-col items-center">
                     <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                        <CalendarClock className="text-emerald-500 w-10 h-10" />
                     </div>
                     <h3 className="text-lg font-bold text-gray-800 mb-2">Tudo em dia!</h3>
                     <p className="text-gray-500 max-w-md mx-auto">
                        Não há nenhum paciente com a última consulta registrada há mais de 6 meses.
                     </p>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {retornoPatients.map(patient => (
                     <div key={patient.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col">
                        <div className="flex items-center gap-4 mb-5">
                           <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-lg shrink-0">
                              {patient.name.substring(0,2).toUpperCase()}
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-800 text-base leading-tight line-clamp-1 truncate mr-6" title={patient.name}>{patient.name}</h4>
                              <p className="text-xs text-amber-600 font-bold bg-amber-100/50 px-2 py-0.5 rounded-md mt-1 w-fit border border-amber-200/50">
                                Última vez: {new Date(patient.lastVisit!).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                              </p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-100">
                           <button 
                             onClick={() => openCustomize(patient, true)}
                             className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 px-3 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors text-sm shadow-sm"
                           >
                              <Edit3 size={15} /> Personalizar
                           </button>
                           <button 
                             onClick={() => handleFastSend(patient)}
                             className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-2.5 px-3 rounded-lg hover:bg-[#1ebd5a] transition-colors text-sm shadow-sm shadow-green-500/20"
                           >
                              <Send size={15} /> Lembrar
                           </button>
                        </div>
                     </div>
                   ))}
                 </div>
             )
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
                    <p className="text-sm text-gray-500">Defina o texto base para {activeTab === 'aniversariantes' ? 'Aniversários' : 'Retornos'}</p>
                  </div>
                  <button onClick={() => setIsEditingTemplate(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                     <X size={20} />
                  </button>
               </div>
               <div className="p-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4 text-sm text-blue-800">
                     Utilize as tags abaixo para personalizar automaticamente:<br/>
                     <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-indigo-600">{"{nome}"}</code> - Primeiro Nome<br/>
                     <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-indigo-600">{"{nome_completo}"}</code> - Nome Completo
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
