import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { patientService } from '../services/patientService';
import { Patient } from '../types';
import { Gift, CalendarClock, Search, MessageCircle, Edit3, X, Loader2, Send } from 'lucide-react';

interface BirthdayPatient extends Patient {
  birthdayType: 'hoje' | 'amanha';
  age: number;
}

export const MessageCenter: React.FC = () => {
  const { empresaId } = useCompany();
  const [activeTab, setActiveTab] = useState<'aniversariantes' | 'retorno'>('aniversariantes');
  const [loading, setLoading] = useState(true);
  const [birthdayPatients, setBirthdayPatients] = useState<BirthdayPatient[]>([]);
  
  // Customization Modal State
  const [selectedPatient, setSelectedPatient] = useState<BirthdayPatient | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  
  // Base default template for birthdays
  const defaultTemplate = "Olá {nome}, tudo bem?\nNós da Clínica desejamos a você um feliz aniversário! 🎉 Que seu dia seja cheio de alegrias!";

  useEffect(() => {
    const fetchAniversariantes = async () => {
      if (!empresaId) return;
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
          
          // dataNascimento format expected: YYYY-MM-DD
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

        // Sort by 'hoje' first, then alphabetical
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

    if (activeTab === 'aniversariantes') {
      fetchAniversariantes();
    }
  }, [empresaId, activeTab]);

  const generateMessage = (patient: BirthdayPatient, template: string) => {
     // Get first name
     const firstName = patient.name.split(' ')[0] || '';
     return template.replace(/\{nome\}/gi, firstName).replace(/\{nome_completo\}/gi, patient.name);
  };

  const handleFastSend = (patient: BirthdayPatient) => {
     const msg = generateMessage(patient, defaultTemplate);
     const encoded = encodeURIComponent(msg);
     // Format phone: remove non-digits
     let phone = patient.phone.replace(/\D/g, '');
     if (phone && !phone.startsWith('55')) phone = '55' + phone;
     window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const openCustomize = (patient: BirthdayPatient) => {
     const savedTemplate = localStorage.getItem('birthday_template') || defaultTemplate;
     setCustomMessage(generateMessage(patient, savedTemplate));
     setSelectedPatient(patient);
  };

  const handleCustomSend = () => {
     if (!selectedPatient) return;
     const encoded = encodeURIComponent(customMessage);
     let phone = selectedPatient.phone.replace(/\D/g, '');
     if (phone && !phone.startsWith('55')) phone = '55' + phone;
     window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
     setSelectedPatient(null);
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
        {/* Tabs */}
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
        </div>

        {/* Content */}
        <div className="p-6 flex-1 bg-slate-50/30">
           {activeTab === 'aniversariantes' && (
             loading ? (
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
             <div className="bg-white border text-center border-gray-200 rounded-2xl p-16 shadow-sm flex flex-col items-center">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                    <CalendarClock className="text-gray-300 w-10 h-10" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-800 mb-2">Retorno Semestral</h3>
                 <p className="text-gray-500 max-w-md mx-auto">
                    A aba de retornos semestrais está sendo implementada pela equipe. Em breve você poderá disparar mensagens automáticas de recall!
                 </p>
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
                     O WhatsApp será aberto com o texto preenchido abaixo. Você poderá revisar antes de disparar pelo próprio WhatsApp.
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
                  <button onClick={handleCustomSend} className="px-6 py-2.5 font-bold text-white bg-[#25D366] hover:bg-[#1ebd5a] rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-green-500/20">
                     <Send size={18} />
                     Abrir WhatsApp e Enviar
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
