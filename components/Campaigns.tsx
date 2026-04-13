import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  MessageSquare, Gift, ArrowLeft, ArrowRight, UserX, 
  Receipt, FileCheck, AlertTriangle, SmilePlus, FileText, CheckCircle2,
  Phone, Check, CalendarClock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Campaign } from '../types';

const campaignTypes = [
  { id: 'aniversariantes', title: 'Aniversário', icon: Gift, color: 'text-amber-500', bg: 'bg-amber-100', defaultMessage: 'Olá {nome_cliente}!\nNós da Clínica desejamos a você um feliz aniversário! 🎉 Que seu dia seja cheio de alegrias!', description: 'Aproveite para marcar presença na vida do seus pacientes no dia mais importante para eles, o aniversário! A EvoliSync envia uma mensagem, seja feriado ou final de semana.' },
  { id: 'retorno_semestral', title: 'Recuperação de inativos', icon: ArrowLeft, color: 'text-emerald-500', bg: 'bg-emerald-100', defaultMessage: 'Olá {nome_cliente}!\nJá faz tempo desde sua última visita. Não fique tanto tempo sem cuidar do seu sorriso.\nVocê pode nos contatar para agendar sua revisão!' },
  { id: 'pos_operatorio', title: 'Pós-operatório', icon: FileCheck, color: 'text-orange-500', bg: 'bg-orange-100', defaultMessage: 'Olá {nome_cliente}, como você está se sentindo após o procedimento?' },
  { id: 'satisfacao', title: 'Satisfação', icon: SmilePlus, color: 'text-green-500', bg: 'bg-green-100', defaultMessage: 'Olá {nome_cliente}, o que achou do seu último atendimento?' },
  { id: 'orcamentos_aberto', title: 'Recuperação de Orçamentos', icon: FileText, color: 'text-pink-500', bg: 'bg-pink-100', defaultMessage: 'Olá {nome_cliente}, seu orçamento ainda está disponível!' },
  { id: 'tratamentos_finalizados', title: 'Retorno de tratamentos', icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-100', defaultMessage: 'Olá {nome_cliente}, parabéns por finalizar seu tratamento!' },
];

export const Campaigns: React.FC = () => {
  const { empresaId } = useCompany();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  
  // Filters
  const [inativosTime, setInativosTime] = useState('6 meses');
  const [plano, setPlano] = useState('Todos');
  const [especialidade, setEspecialidade] = useState('Todos');
  const [genero, setGenero] = useState('Todos');
  const [inadimplentes, setInadimplentes] = useState(false);

  const [saving, setSaving] = useState(false);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);

  useEffect(() => {
    if (empresaId) {
      try {
        const str = localStorage.getItem(`campaigns_instances_${empresaId}`);
        if (str) {
            const arr = JSON.parse(str);
            setActiveTypes(arr.map((a: any) => a.type));
        }
      } catch (e) {}
    }
  }, [empresaId]);

  useEffect(() => {
    if (selectedType) {
      const ct = campaignTypes.find(c => c.id === selectedType);
      if (ct && !message) {
        setMessage(ct.defaultMessage);
      }
    }
  }, [selectedType]);

  const handleNext = () => {
    if (step === 1 && selectedType) setStep(2);
    else if (step === 2 && message) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const selectedCampaignInfo = campaignTypes.find(c => c.id === selectedType);

  const saveCampaign = async () => {
    if (!empresaId || !selectedType) return;
    setSaving(true);
    
    const ct = campaignTypes.find(c => c.id === selectedType);
    
    // Store in active instances local memory (to support dynamic 001, 002...)
    let newId = '001';
    let instanceTitle = 'Campanha 001';
    try {
      const savedInstancesStr = localStorage.getItem(`campaigns_instances_${empresaId}`);
      const instances = savedInstancesStr ? JSON.parse(savedInstancesStr) : [];
      
      const count = instances.length + 1;
      newId = count.toString().padStart(3, '0');
      instanceTitle = `Campanha ${newId}`;
      
      const newInstanceInfo = {
        id: `camp_${Date.now()}`,
        instanceId: newId,
        title: `${instanceTitle} - ${ct?.title}`,
        type: selectedType,
        messageTemplate: message,
        filters: { inativosTime, plano, especialidade, genero, inadimplentes },
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      instances.push(newInstanceInfo);
      localStorage.setItem(`campaigns_instances_${empresaId}`, JSON.stringify(instances));
      
      // Save templates if needed by old logic
      if (selectedType === 'retorno_semestral') {
          localStorage.setItem('retorno_template', message);
      } else if (selectedType === 'aniversariantes') {
          localStorage.setItem('birthday_template', message);
      }
    } catch (e) { console.error(e); }

    // Save to Database
    try {
      if (supabase) {
        const { error } = await supabase.from('campaigns').insert({
          empresa_id: empresaId,
          title: `${instanceTitle} - ${ct?.title}`,
          type: selectedType,
          status: 'active',
          message_template: message,
          filters: { inativosTime, plano, especialidade, genero, inadimplentes }
        });
        if (error) console.error("Error saving campaign:", error);
      }
    } catch (e) {
      console.error(e);
    }
    
    setSaving(false);
    setStep(4); // Vai para tela de sucesso com as opções
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 font-sans bg-gray-50 flex flex-col min-h-screen">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-blue-100 rounded-xl">
          <MessageSquare className="text-blue-600 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campanhas Automáticas</h1>
          <p className="text-sm text-gray-500 mt-1">Configure disparos automatizados de mensagens para engajar seus pacientes.</p>
        </div>
      </div>

      {/* Wizard Header (Hide on Step 4 - Success) */}
      {step < 4 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 flex justify-center p-4">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold text-sm">Definir tipo de campanha</span>
            </div>
            <div className="h-[2px] w-8 bg-gray-200" />
            <div className={`flex items-center space-x-2 ${step >= 2 ? (step > 2 ? 'text-emerald-600' : 'text-blue-600') : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${step >= 2 ? (step > 2 ? 'bg-emerald-600' : 'bg-blue-600') : 'bg-gray-300'}`}>2</div>
              <span className="font-semibold text-sm">Definir público</span>
            </div>
            <div className="h-[2px] w-8 bg-gray-200" />
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
               <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}>3</div>
              <span className="font-semibold text-sm">Resumo e ativação</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Tipo de campanha</h2>
          <p className="text-sm text-gray-500 mb-6">Selecione o modelo de campanha de marketing que você deseja enviar para seus pacientes.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {campaignTypes.map(c => {
              const isDisabled = c.id === 'aniversariantes' && activeTypes.includes('aniversariantes');
              return (
                <div 
                  key={c.id} 
                  onClick={() => !isDisabled && setSelectedType(c.id)}
                  className={`border rounded-xl p-6 flex flex-col items-center justify-center transition-all relative overflow-hidden ${
                     isDisabled 
                       ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200' 
                       : selectedType === c.id 
                          ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500 cursor-pointer shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer hover:shadow-sm'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full ${isDisabled ? 'bg-gray-200' : c.bg} flex items-center justify-center mb-4 shrink-0`}>
                     <c.icon className={`${isDisabled ? 'text-gray-400' : c.color} w-7 h-7`} />
                  </div>
                  <span className={`font-bold text-[15px] text-center mb-2 ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}>{c.title}</span>
                  {c.description && (
                     <p className={`text-[12px] leading-relaxed text-center hidden md:block ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                        {c.description}
                     </p>
                  )}
                  {isDisabled && (
                     <div className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold py-1 px-2.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Ativa
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 flex flex-col lg:flex-row gap-8">
           <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Definir público</h2>
              <p className="text-sm text-gray-500 mb-6">Define o público que você deseja alcançar com a campanha de <strong>{selectedCampaignInfo?.title}</strong>.</p>
              
              <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-6">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">Enviar campanha para</span>
                  {selectedType === 'retorno_semestral' ? (
                     <>
                        <span className="text-sm font-bold text-emerald-600">os pacientes sem consultas marcadas há</span>
                        <select 
                           value={inativosTime}
                           onChange={e => setInativosTime(e.target.value)}
                           className="border border-gray-300 rounded-md text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                           <option>3 meses</option>
                           <option>6 meses</option>
                           <option>1 ano</option>
                        </select>
                     </>
                  ) : selectedType === 'aniversariantes' ? (
                     <span className="text-sm font-bold text-amber-600">os aniversariantes do dia</span>
                  ) : (
                     <span className="text-sm font-bold text-blue-600">pacientes qualificados</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">Plano</label>
                     <select value={plano} onChange={e => setPlano(e.target.value)} className="w-full border border-gray-300 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Todos</option>
                        <option>Particular</option>
                        <option>Convênio</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">Especialidades</label>
                     <select value={especialidade} onChange={e => setEspecialidade(e.target.value)} className="w-full border border-gray-300 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Todos</option>
                        <option>Ortodontia</option>
                        <option>Clínico Geral</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">Gênero</label>
                     <select value={genero} onChange={e => setGenero(e.target.value)} className="w-full border border-gray-300 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Todos</option>
                        <option>Masculino</option>
                        <option>Feminino</option>
                     </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                   <input type="checkbox" id="inadim" checked={inadimplentes} onChange={e => setInadimplentes(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                   <label htmlFor="inadim" className="text-sm font-medium text-gray-700">Não enviar para pacientes inadimplentes</label>
                </div>
              </div>
           </div>

           {/* Mobile Preview */}
           <div className="w-full lg:w-80 flex flex-col items-center">
              <span className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
                 Como seu paciente irá receber <span className="text-xl">👇</span>
              </span>
              <div className="relative w-[300px] h-[600px] bg-white border-[8px] border-gray-100 rounded-[40px] shadow-xl overflow-hidden flex flex-col">
                 {/* iPhone Notch */}
                 <div className="absolute top-0 inset-x-0 h-6 bg-gray-100 rounded-b-3xl w-40 mx-auto z-20"></div>
                 
                 {/* WhatsApp Header */}
                 <div className="bg-[#075e54] text-white pt-10 pb-3 px-4 flex items-center gap-3 relative z-10">
                    <ArrowLeft className="w-5 h-5" />
                    <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                       <UserX className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="font-semibold text-sm">Clínica (Você)</div>
                 </div>
                 
                 {/* Chat Background */}
                 <div className="flex-1 bg-[#efeae2] p-4 flex flex-col relative overflow-y-auto">
                    {/* Background Pattern Mock */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")' }}></div>
                    
                    <div className="bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm text-[13px] text-gray-800 relative z-10 w-fit max-w-[90%] self-end">
                       <textarea 
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          className="w-full min-w-[220px] bg-transparent border-none p-0 focus:ring-0 resize-none outline-none leading-relaxed"
                          rows={10}
                       />
                       <div className="text-[10px] text-gray-500 text-right mt-1">Agora</div>
                    </div>
                 </div>
                 
                 {/* WhatsApp Input */}
                 <div className="bg-[#f0f0f0] p-2 flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-full py-2 px-4 text-sm text-gray-400">Mensagem</div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 flex flex-col lg:flex-row gap-8">
           <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Resumo e ativação da campanha de {selectedCampaignInfo?.title}</h2>
              <p className="text-sm text-gray-500 mb-8">Estamos quase lá! Confira se as informações estão de acordo antes de ativar a campanha. Caso precise fazer alguma alteração, você pode retornar aos passos anteriores.</p>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                 <div className="flex gap-4">
                    <Phone className="w-6 h-6 text-emerald-500 mt-1" />
                    <div>
                       <div className="text-sm font-bold text-gray-700">Plataforma</div>
                       <div className="text-sm text-gray-500">WhatsApp</div>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <MessageSquare className="w-6 h-6 text-blue-500 mt-1" />
                    <div>
                       <div className="text-sm font-bold text-gray-700">Campanha</div>
                       <div className="text-sm text-gray-500">{selectedCampaignInfo?.title}</div>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <UserX className="w-6 h-6 text-emerald-500 mt-1" />
                    <div>
                       <div className="text-sm font-bold text-gray-700">Público</div>
                       <div className="text-sm text-gray-500">{selectedType === 'retorno_semestral' ? inativosTime + ' - ' : ''}Todos os pacientes</div>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <CalendarClock className="w-6 h-6 text-emerald-500 mt-1" />
                    <div>
                       <div className="text-sm font-bold text-gray-700">Envio da campanha</div>
                       <div className="text-sm text-gray-500">A partir da data de ativação</div>
                    </div>
                 </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                 <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">i</div>
                 <p className="text-sm text-blue-800">
                    Com essa campanha o sistema envia um WhatsApp convidando o paciente com base nos filtros selecionados {selectedType === 'retorno_semestral' ? 'no dia em que ele completar ' + inativosTime + ' sem consultas marcadas.' : ''}
                 </p>
              </div>
           </div>

           {/* Mobile Preview Repeated in Step 3 */}
           <div className="w-full lg:w-80 flex flex-col items-center">
              <span className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
                 Como seu paciente irá receber <span className="text-xl">👇</span>
              </span>
              <div className="relative w-[300px] h-[500px] bg-white border-[8px] border-gray-100 rounded-[40px] shadow-xl overflow-hidden flex flex-col transform scale-90 origin-top">
                 <div className="bg-[#075e54] text-white pt-10 pb-3 px-4 flex items-center gap-3 relative z-10">
                    <ArrowLeft className="w-5 h-5" />
                    <div className="font-semibold text-sm">Clínica (Você)</div>
                 </div>
                 <div className="flex-1 bg-[#efeae2] p-4 flex flex-col relative">
                    <div className="bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm text-[13px] text-gray-800 relative z-10 w-fit max-w-[90%] self-end">
                       <div className="whitespace-pre-wrap">{message}</div>
                       <div className="text-[10px] text-gray-500 text-right mt-1">Agora</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center flex-1 text-center py-20">
           <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="text-emerald-600 w-12 h-12" />
           </div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">Campanha Ativada com Sucesso!</h2>
           <p className="text-gray-500 mb-8 max-w-md">Sua campanha foi criada e a lista de pacientes correspondentes já está gerada. Você pode iniciar os disparos imediatamente pela Central de Mensagens.</p>
           
           <div className="flex gap-4">
              <button 
                onClick={() => { setStep(1); setSelectedType(null); setMessage(''); }} 
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 uppercase text-sm transition-colors"
              >
                 Nova Campanha
              </button>
              <button 
                onClick={() => { window.location.hash = '#message-center'; window.dispatchEvent(new Event('hashchange')); }} 
                className="px-6 py-2.5 bg-[#1ebe5a] text-white font-bold rounded-lg hover:bg-[#1ebd5a] uppercase text-sm transition-colors"
              >
                 Ir para a Lista (Central)
              </button>
           </div>
        </div>
      )}

      {/* Footer Actions */}
      {step < 4 && (
          <div className="mt-6 flex justify-between items-center bg-transparent">
            {step > 1 ? (
               <button onClick={handleBack} className="text-sm font-bold text-gray-600 hover:text-gray-800 px-4 py-2 uppercase">
                  Voltar
               </button>
            ) : <div></div>}
            
            <div className="flex gap-4">
               {step > 1 && (
                  <button 
                    onClick={() => {setStep(1); setSelectedType(null);}} 
                    className="text-sm font-bold text-gray-600 hover:text-gray-800 px-4 py-2 uppercase"
                  >
                     Cancelar
                  </button>
               )}
               {step < 3 ? (
                  <button 
                     onClick={handleNext} 
                     disabled={!selectedType}
                     className={`px-8 py-3 rounded-md font-bold text-sm uppercase transition-colors ${!selectedType ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#1ebe5a] text-white hover:bg-[#1ebd5a]'}`}
                  >
                     Continuar
                  </button>
               ) : (
                  <button 
                     onClick={saveCampaign} 
                     disabled={saving}
                     className="px-8 py-3 bg-[#1ebe5a] text-white rounded-md font-bold text-sm uppercase hover:bg-[#1ebd5a] transition-colors flex items-center gap-2"
                  >
                     {saving ? 'Ativando...' : 'Ativar Campanha'}
                  </button>
               )}
            </div>
          </div>
      )}
    </div>
  );
};
