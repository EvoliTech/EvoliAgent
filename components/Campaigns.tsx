import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import {
   MessageSquare, Gift, ArrowLeft, ArrowRight, UserX,
   Receipt, FileCheck, AlertTriangle, SmilePlus, FileText, CheckCircle2,
   Phone, Check, CalendarClock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Campaign } from '../types';
import { patientService } from '@/services/patientService';
import { plansService } from '../services/plansService';

const campaignTypes = [
   { id: 'aniversariantes', title: 'Aniversário', icon: Gift, color: 'text-amber-500', bg: 'bg-amber-100', defaultMessage: 'Olá {nome_cliente}!\nNós da Clínica desejamos a você um feliz aniversário! 🎉 Que seu dia seja cheio de alegrias!', description: 'Aproveite para marcar presença na vida do seus pacientes no dia mais importante para eles, o aniversário! A EvoliSync envia uma mensagem, seja feriado ou final de semana.' },
   { id: 'retorno_semestral', title: 'Recuperação de inativos', icon: ArrowLeft, color: 'text-emerald-500', bg: 'bg-emerald-100', defaultMessage: 'Olá {nome_cliente}!\nJá faz tempo desde sua última visita. Não fique tanto tempo sem cuidar do seu sorriso.\nVocê pode nos contatar para agendar sua revisão!', description: 'Não deixe que seus pacientes se esqueçam de você. Envie mensagens para eles fazerem um check-up assim que completarem 3, 6 ou 12 meses sem consultas marcadas.' },
   { id: 'pos_operatorio', title: 'Pós-operatório', icon: FileCheck, color: 'text-orange-500', bg: 'bg-orange-100', defaultMessage: 'Olá {nome_cliente}, como você está se sentindo após o procedimento?', description: 'Envie mensagens após um procedimento cirúrgico e mostre que você se importa de verdade! A EvoliSync envia a mensagem para seu paciente automaticamente, um dia depois do tratamento finalizado no sistema.' },
   { id: 'satisfacao', title: 'Satisfação', icon: SmilePlus, color: 'text-green-500', bg: 'bg-green-100', defaultMessage: 'Olá, {nome_cliente}! Sua opinião é muito importante para nós. Gostaríamos de saber como foi sua experiência na Clínica. Poderia nos dar seu feedback rapidinho?', description: 'Saiba o que seus pacientes estão achando do seu atendimento com a nossa Campanha de Satisfação. Ao ativar ela, o sistema envia automaticamente a mensagem para 40% dos pacientes que foram atendidos e finalizaram tratamentos.' },
   { id: 'orcamentos_aberto', title: 'Recuperação de Orçamentos', icon: FileText, color: 'text-pink-500', bg: 'bg-pink-100', defaultMessage: 'Olá, {nome_cliente}! Tudo bem? Vi que seu orçamento está em aberto. Conseguimos verificar a melhor data para você iniciar sua transformação? 😊', description: 'Crie uma campanha automatizada para aprovação de orçamentos em aberto. Ative a campanha para enviar mensagens aos seus pacientes que ainda não aprovaram orçamentos e fature mais.' },
   { id: 'tratamentos_finalizados', title: 'Retorno de tratamentos', icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-100', defaultMessage: 'Olá, {nome_cliente}! Já faz um tempinho desde sua última visita. Que tal agendar seu check-up anual ou sua limpeza preventiva? Sua saúde bucal é nossa prioridade!', description: 'Agora ficou muito mais fácil alertar de forma automática pacientes que finalizaram tratamentos e precisam retornar para uma nova consulta.' },
];

export const Campaigns: React.FC = () => {
   const { empresaId } = useCompany();
   const [step, setStep] = useState(1);
   const [selectedType, setSelectedType] = useState<string | null>(null);
   const [message, setMessage] = useState('');

   // Filters
   const [inativosTime, setInativosTime] = useState('6 meses');
   const [customDays, setCustomDays] = useState('30');
   const [plano, setPlano] = useState('Todos');
   const [especialidade, setEspecialidade] = useState('Todos');
   const [genero, setGenero] = useState('Todos');
   const [inadimplentes, setInadimplentes] = useState(false);

   const [saving, setSaving] = useState(false);
   const [activeTypes, setActiveTypes] = useState<string[]>([]);

   useEffect(() => {
      if (empresaId && supabase) {
         const fetchActive = async () => {
            const { data } = await supabase.from('campaigns').select('type').eq('empresa_id', empresaId).eq('status', 'active');
            if (data) {
               setActiveTypes(data.map((d: any) => d.type));
            }
         };
         fetchActive();
      }
   }, [empresaId]);

   const handleDeactivate = async (typeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!empresaId || !supabase) return;

      const { error } = await supabase.from('campaigns').update({ status: 'inactive' }).eq('type', typeId).eq('empresa_id', empresaId);
      if (!error) {
         setActiveTypes(prev => prev.filter(t => t !== typeId));
      } else {
         console.error("Erro ao desativar:", error);
      }
   };

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

      // Dynamically calculate the instance title from Supabase count
      let newId = '001';
      let instanceTitle = 'Campanha 001';

      try {
         if (supabase) {
            const { count } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId);
            const actualCount = (count || 0) + 1;
            newId = actualCount.toString().padStart(3, '0');
            instanceTitle = `Campanha ${newId}`;
         }

         // Save templates if needed by old logic
         if (selectedType === 'retorno_semestral') {
            localStorage.setItem('retorno_template', message);
         } else if (selectedType === 'aniversariantes') {
            localStorage.setItem('birthday_template', message);
         }
      } catch (e) { console.error(e); }

      // Save to Database and generate snapshot
      try {
         if (supabase) {
            const { data: campaignData, error } = await supabase.from('campaigns').insert({
               empresa_id: empresaId,
               title: `${instanceTitle} - ${ct?.title}`,
               type: selectedType,
               status: 'active',
               message_template: message,
               filters: { inativosTime, customDays, plano, especialidade, genero, inadimplentes }
            }).select().single();

            if (error) {
               console.error("Error saving campaign:", error);
               alert(`Erro no banco de dados (Supabase): ${error.message || 'Verifique as permissões de RLS/SQL.'}`);
               setSaving(false);
               return; // DO NOT PROCEED TO STEP 4
            } else if (campaignData) {
               setActiveTypes(prev => [...prev, selectedType]);

               if (selectedType !== 'aniversariantes') {
                  // We need to generate the snapshot of contacts for this campaign!
                  const allPatients = await patientService.fetchPatients(empresaId);
                  let finalContacts: any[] = [];
                  let matchContext: Record<string, string> = {};

                  if (selectedType !== 'aniversariantes') {
                     let agData: any[] = [];
                     let orcamentos: any[] = [];
                     let allClinicTreatments: any[] = [];
                     
                     try {
                        const [{ data: ag }, { data: orc }, clinicPlans] = await Promise.all([
                           supabase.from('agendamentos').select('cliente_id, data_inicio, status').eq('IDEmpresa', empresaId),
                           supabase.from('orcamentos').select('paciente_id, status, data_orcamento, created_at, tratamentos').eq('empresa_id', empresaId),
                           plansService.fetchPlans(empresaId)
                        ]);
                        agData = ag || [];
                        orcamentos = orc || [];
                        allClinicTreatments = (clinicPlans || []).flatMap(p => p.treatments);
                     } catch (err) { console.error(err); }

                     const now = new Date();

                     finalContacts = allPatients.filter(p => {
                        const patientAppts = agData.filter(ag => String(ag.cliente_id) === String(p.id) || (p.phone && String(ag.cliente_id) === p.phone.replace(/\D/g, '')));
                        const patientOrcs = orcamentos.filter(o => String(o.paciente_id) === String(p.id));

                        if (selectedType === 'orcamentos_aberto') {
                           return patientOrcs.some(o =>
                              String(o.status).trim().toLowerCase() === 'aguardando'
                           );
                        }

                        if (selectedType === 'satisfacao') {
                           return patientOrcs.some(o => o.status === 'Aprovado' || o.status === 'Finalizado');
                        }

                        if (selectedType === 'pos_operatorio') {
                           let limitDays = 7;
                           if (inativosTime === '7 dias') limitDays = 7;
                           else if (inativosTime === '15 dias') limitDays = 15;
                           else if (inativosTime === '1 mês') limitDays = 30;
                           else if (inativosTime === 'Personalizado') limitDays = parseInt(customDays) || 30;
                           else if (inativosTime.includes('meses')) limitDays = (parseInt(inativosTime) || 6) * 30;

                           const limitDate = new Date();
                           limitDate.setDate(limitDate.getDate() - limitDays);

                           const meets = patientOrcs.some(o => {
                              if (o.status !== 'Aprovado' && o.status !== 'Finalizado') return false;
                              let trats = o.tratamentos;
                              if (typeof trats === 'string') {
                                 try { 
                                    trats = JSON.parse(trats); 
                                    if (typeof trats === 'string') trats = JSON.parse(trats);
                                 } catch(e) {}
                              }
                              if (!Array.isArray(trats)) return false;

                              return trats.some((t: any) => {
                                 const trName = (t.treatmentName || t.tratamento || t.nome || '').toLowerCase();
                                 let isSurgery = (t.categoria && t.categoria.toLowerCase().includes('cirurgia')) || 
                                    (t.nome && t.nome.toLowerCase().includes('cirurgia')) ||
                                    (t.procedimento && t.procedimento.toLowerCase().includes('cirurgia')) ||
                                    trName.includes('cirurgia') || trName.includes('amputação') || trName.includes('exodontia') || trName.includes('implante') || trName.includes('enxerto');
                                 
                                 if (!isSurgery && trName) {
                                    const matched = allClinicTreatments.find(ct => ct.name.toLowerCase() === trName);
                                    if (matched && (matched.category.toLowerCase().includes('cirurgia') || matched.category.toLowerCase().includes('endodontia'))) {
                                       isSurgery = true;
                                    }
                                 }

                                 if (!isSurgery) return false;
                                 if (t.status !== 'Finalizado' && t.status !== 'Concluído') return false;

                                 const d = new Date(t.data_finalizacao || o.data_orcamento || o.created_at);
                                 if (d >= limitDate) {
                                    matchContext[p.id] = `Cirurgia: ${t.treatmentName || t.tratamento || t.nome || 'Não especificada'} (Finalizada em ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`;
                                    return true;
                                 }
                                 return false;
                              });
                           });
                           return meets;
                        }

                        if (selectedType === 'tratamentos_finalizados') {
                           let limitMonths = parseInt(inativosTime.split(' ')[0]) || 6;
                           const targetDate = new Date();
                           targetDate.setMonth(targetDate.getMonth() - limitMonths);
                           const upperDate = new Date(targetDate);
                           upperDate.setMonth(upperDate.getMonth() + 1); // 1 month window

                           const meets = patientOrcs.some(o => {
                              if (o.status !== 'Aprovado' && o.status !== 'Finalizado') return false;
                              const d = new Date(o.data_orcamento || o.created_at);
                              if (d >= targetDate && d <= upperDate) {
                                 matchContext[p.id] = `Tratamentos Finalizados: Orçamento de ${limitMonths} meses atrás`;
                                 return true;
                              }
                              return false;
                           });
                           return meets;
                        }

                        if (selectedType === 'retorno_semestral') {
                           let limitMonths = parseInt(inativosTime.split(' ')[0]) || 6;
                           if (inativosTime.includes('ano')) limitMonths = 12;

                           const limitDate = new Date();
                           limitDate.setMonth(limitDate.getMonth() - limitMonths);

                           const hasRecentAppt = patientAppts.some(ag => ag.data_inicio && new Date(ag.data_inicio) > limitDate && !(ag.status || '').toLowerCase().includes('cancel'));
                           const hasRecentOrcamento = patientOrcs.some(o => new Date(o.data_orcamento || o.created_at) > limitDate);

                           // Se não tem orçamento recente/futuro e não tem consulta recente/futura
                           return !hasRecentAppt && !hasRecentOrcamento;
                        }

                        return false;
                     });

                     if (selectedType === 'satisfacao') {
                        // "40% dos pacientes que foram atendidos"
                        const limit = Math.ceil(finalContacts.length * 0.4);
                        finalContacts = finalContacts.sort(() => 0.5 - Math.random()).slice(0, limit);
                     }
                  }

                  if (finalContacts.length > 0) {
                     const contactsInserts = finalContacts.map(c => ({
                        campaign_id: campaignData.id,
                        cliente_id: c.id,
                        status: 'pendente'
                     }));

                     const { error: insErr } = await supabase.from('campaign_contacts').insert(contactsInserts);
                     if (insErr) console.error("Error inserting contacts snapshot:", insErr);
                     
                     if (Object.keys(matchContext).length > 0) {
                        const updatedFilters = { ...campaignData.filters, matchContext };
                        await supabase.from('campaigns').update({ filters: updatedFilters }).eq('id', campaignData.id);
                     }
                  }
               }
               
               setSaving(false);
               setStep(4); // Only advance on success!
            }
         }
      } catch (e: any) {
         console.error(e);
         alert("Erro inesperado: " + (e.message || e));
         setSaving(false);
      }
   };
   const handleSelectType = (type: string) => {
      setSelectedType(type);
      if (type === 'pos_operatorio') setInativosTime('7 dias');
      else if (type === 'tratamentos_finalizados' || type === 'retorno_semestral') setInativosTime('6 meses');
      else if (type === 'recuperacao_inativos') setInativosTime('1 ano');
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
                           onClick={() => !isDisabled && handleSelectType(c.id)}
                           className={`border rounded-xl p-6 flex flex-col items-center justify-center transition-all relative overflow-hidden ${isDisabled
                                 ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-80'
                                 : selectedType === c.id
                                    ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500 cursor-pointer shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer hover:shadow-sm'
                              }`}
                        >
                           <div className={`w-14 h-14 rounded-full ${isDisabled ? 'bg-gray-200' : c.bg} flex items-center justify-center mb-4 shrink-0`}>
                              <c.icon className={`${isDisabled ? 'text-gray-400' : c.color} w-7 h-7`} />
                           </div>
                           <span className={`font-bold text-[15px] text-center mb-2 ${isDisabled ? 'text-gray-500' : 'text-gray-800'}`}>{c.title}</span>
                           {c.description && (
                              <p className={`text-[12px] leading-relaxed text-center hidden md:block ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                                 {c.description}
                              </p>
                           )}
                           {isDisabled && (
                              <div className="absolute top-0 right-0 p-3 flex flex-col items-end gap-1.5">
                                 <div className="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold py-1 px-2.5 rounded-full border border-emerald-200 flex items-center gap-1 shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Ativa
                                 </div>
                                 <button
                                    onClick={(e) => handleDeactivate(c.id, e)}
                                    className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-[10px] font-bold py-1 px-2.5 rounded-full border border-red-200 shadow-sm transition-colors"
                                 >
                                    Desativar
                                 </button>
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
                              <span className="text-sm font-bold text-emerald-600">pacientes sem consultas e orçamentos há</span>
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
                        ) : selectedType === 'tratamentos_finalizados' ? (
                           <>
                              <span className="text-sm font-bold text-indigo-600">pacientes que finalizaram tratamento há</span>
                              <select
                                 value={inativosTime}
                                 onChange={e => setInativosTime(e.target.value)}
                                 className="border border-gray-300 rounded-md text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                 <option>3 meses</option>
                                 <option>4 meses</option>
                                 <option>5 meses</option>
                                 <option>6 meses</option>
                              </select>
                           </>
                        ) : selectedType === 'pos_operatorio' ? (
                           <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-orange-600">pacientes com cirurgia nos últimos</span>
                              <select
                                 value={inativosTime}
                                 onChange={e => setInativosTime(e.target.value)}
                                 className="border border-gray-300 rounded-md text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              >
                                 <option>7 dias</option>
                                 <option>15 dias</option>
                                 <option>1 mês</option>
                                 <option>Personalizado</option>
                              </select>
                              {inativosTime === 'Personalizado' && (
                                 <div className="flex items-center gap-2">
                                    <input 
                                       type="number" 
                                       value={customDays} 
                                       onChange={e => setCustomDays(e.target.value)} 
                                       className="border border-gray-300 rounded-md text-sm px-3 py-1.5 w-20 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                       placeholder="Dias"
                                    />
                                    <span className="text-sm font-bold text-orange-600">dias</span>
                                 </div>
                              )}
                           </div>
                        ) : selectedType === 'satisfacao' ? (
                           <span className="text-sm font-bold text-green-600">40% aleatório dos pacientes que finalizaram tratamento</span>
                        ) : selectedType === 'orcamentos_aberto' ? (
                           <span className="text-sm font-bold text-pink-600">pacientes que possuem orçamentos não aprovados ("Aberto")</span>
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
                           <div className="text-sm text-gray-500">
                             {selectedType === 'retorno_semestral' ? `Ausentes e sem orçamento há ${inativosTime}` :
                              selectedType === 'tratamentos_finalizados' ? `Tratamentos finalizados há ${inativosTime}` :
                              selectedType === 'pos_operatorio' ? `Cirurgia nos últimos ${inativosTime === 'Personalizado' ? customDays + ' dias' : inativosTime}` :
                              selectedType === 'satisfacao' ? '40% clientes com trat. finalizados' :
                              selectedType === 'orcamentos_aberto' ? 'Possuem orçamentos abertos' : 'Todos os pacientes qualificados'}
                           </div>
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
                        Com essa campanha o sistema envia um WhatsApp convidando o paciente com base nos filtros selecionados {selectedType === 'retorno_semestral' || selectedType === 'tratamentos_finalizados' ? ' e respeitando a trava de tempo indicada de ' + inativosTime + '.' : '.'}
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
                        onClick={() => { setStep(1); setSelectedType(null); }}
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
