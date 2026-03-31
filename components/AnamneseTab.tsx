import React, { useState, useEffect } from 'react';
import { anamneseService, Anamnese } from '../services/anamneseService';
import { ChevronLeft, Save, Printer, Plus, Link, Check, Clock, Eye } from 'lucide-react';

export const ANAMNESE_QUESTIONS = [
  { id: 'queixa_principal', label: 'Queixa principal', hasInfo: true, type: 'text_only' },
  { id: 'pressao_alta', label: 'Tem pressão alta?', hasInfo: true },
  { id: 'alergia', label: 'Possui alguma alergia? (Como penicilinas, AAS ou outra)', hasInfo: true },
  { id: 'alteracao_sanguinea', label: 'Possui alguma alteração sanguínea?', hasInfo: true },
  { id: 'hemorragia', label: 'Já teve hemorragia diagnosticada?', hasInfo: false },
  { id: 'alteracao_cardiovascular', label: 'Possui alguma alteração cardiovascular?', hasInfo: true },
  { id: 'diabetes', label: 'Possui diabetes?', hasInfo: true },
  { id: 'asma', label: 'Possui asma?', hasInfo: false },
  { id: 'anemia', label: 'Possui anemia?', hasInfo: false },
  { id: 'disfuncao_hepatica', label: 'Possui alguma disfunção hepática?', hasInfo: true },
  { id: 'disfuncao_renal', label: 'Apresenta alguma disfunção renal', hasInfo: true },
  { id: 'disfuncao_respiratoria', label: 'Possui alguma disfunção respiratória?', hasInfo: true },
  { id: 'alteracao_ossea', label: 'Possui alguma alteração óssea?', hasInfo: true },
  { id: 'doenca_transmissivel', label: 'Possui alguma doença transmissível?', hasInfo: true },
  { id: 'outra_doenca', label: 'Possui alguma outra doença/síndrome não mencionada?', hasInfo: true },
  { id: 'reacao_anestesia', label: 'Já sofreu alguma reação alérgica ao receber anestesia?', hasInfo: true },
  { id: 'azia_gastrite', label: 'Possui azia, má digestão, refluxo, úlcera ou gastrite?', hasInfo: false },
  { id: 'dificuldade_abrir_boca', label: 'Tem dificuldade de abrir a boca?', hasInfo: false },
  { id: 'febre_reumatica', label: 'Possui algum antecedente de febre reumática?', hasInfo: false },
  { id: 'estalado_boca', label: 'Escuta algum estalado ao abrir a boca?', hasInfo: false },
  { id: 'gravida', label: 'Está grávida?', hasInfo: true },
  { id: 'amamentando', label: 'Está amamentando?', hasInfo: false },
  { id: 'anticoncepcional', label: 'Toma anticoncepcional?', hasInfo: true },
];

export const AnamneseTab = ({ empresaId, patient, onBack }: { empresaId: number, patient: any, onBack: () => void }) => {
   const [history, setHistory] = useState<Anamnese[]>([]);
   const [viewingAnamnese, setViewingAnamnese] = useState<Anamnese | null>(null);
   const [isCreating, setIsCreating] = useState(false);
   const [respostas, setRespostas] = useState<Record<string, any>>({});
   
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [copiedLink, setCopiedLink] = useState(false);

   const loadHistory = async () => {
       setLoading(true);
       const records = await anamneseService.fetchAnamneses(empresaId, Number(patient.id));
       setHistory(records);
       setLoading(false);
   };

   useEffect(() => {
       loadHistory();
   }, [empresaId, patient.id]);

   const allAnswered = ANAMNESE_QUESTIONS.every(q => {
      if (q.type === 'text_only') return respostas[q.id]?.info && respostas[q.id]?.info.trim().length > 0;
      return respostas[q.id] && respostas[q.id].value;
   });

   const handleSave = async () => {
       if (!allAnswered) {
           alert('Por favor, preencha todas as perguntas antes de salvar!');
           return;
       }
       setSaving(true);
       const result = await anamneseService.saveAnamnese(empresaId, Number(patient.id), respostas);
       if (result) {
          alert('Anamnese salva e arquivada com sucesso!');
          setIsCreating(false);
          await loadHistory();
       } else {
          alert('A tabela "anamneses" ainda não existe no seu banco de dados Supabase! Execute o código SQL informado pelo assistente no SQL Editor do seu painel e depois clique em Salvar novamente.');
       }
       setSaving(false);
   };

   const generateLink = () => {
       const token = btoa(`${empresaId}::${patient.id}`);
       return `${window.location.origin}/anamnese/${token}`;
   };

   const handleCopyLink = () => {
       navigator.clipboard.writeText(generateLink());
       setCopiedLink(true);
       setTimeout(() => setCopiedLink(false), 2000);
   };

   const handlePrint = (respostasToPrint: Record<string, any>) => {
       const w = window.open('', '_blank');
       if (!w) return;
       const dataAtual = new Date().toLocaleDateString('pt-BR');
       let html = `<html><head><title>Anamnese - ${patient.name}</title><style>
           body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.5; font-size: 13px; }
           .header-top { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px; }
           h1 { text-align: center; margin-bottom: 30px; font-size: 20px; font-weight: bold; }
           .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 12px; }
           .patient-info div { margin-bottom: 6px; }
           table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
           th { border-bottom: 2px solid #000; text-align: left; padding: 8px 4px; font-weight: bold; }
           td { padding: 6px 4px; vertical-align: top; border-bottom: 1px solid #ddd; }
           tr:nth-child(even) { background-color: #fff; }
           tr:nth-child(odd) { background-color: #f8fafc; }
           .footer-sig { margin-top: 50px; text-align: center; font-size: 12px; }
       </style></head><body>`;
       html += `
         <div class="header-top"><div>Clínica Odontológica</div><div>${dataAtual}</div></div>
         <h1>Ficha de Anamnese</h1>
         <div class="patient-info">
            <div>
               <div><strong>Nome:</strong> ${patient.name}</div>
               <div><strong>CPF:</strong> ${patient.cpf || ''}</div><br/>
               <div><strong>Nascimento:</strong> ${patient.dataNascimento || ''}</div>
            </div>
            <div>
               <div><strong>Endereço:</strong> ${patient.enderecoRua || ''}, ${patient.enderecoNumero || ''}</div>
               <div><strong>Contato:</strong> ${patient.phone || ''}</div>
            </div>
         </div>
         <div style="border-bottom: 2px solid #000; margin-bottom: 10px;"></div>
         <table><thead><tr><th style="width: 60%;">Pergunta</th><th style="width: 40%;">Resposta</th></tr></thead><tbody>`;
       ANAMNESE_QUESTIONS.forEach(q => {
           const ans = respostasToPrint[q.id];
           if (q.type === 'text_only') {
               html += `<tr><td>${q.label}</td><td>${ans?.info || ''}</td></tr>`;
           } else {
               const valueStr = ans?.value ? ans.value + '.' : 'N/A.';
               const infoStr = ans?.info ? ' ' + ans.info + '.' : '';
               html += `<tr><td>${q.label}</td><td>${valueStr}${infoStr}</td></tr>`;
           }
       });
       html += `</tbody></table>
         <div class="footer-sig">Assino este declarando verdadeiras as informações ditas acima</div>
         <script>window.onload = function() { window.print(); }</script></body></html>`;
       w.document.write(html);
       w.document.close();
   };

   if (loading) return <div className="p-8 text-center text-gray-500">Carregando questionários...</div>;

   const renderList = () => (
       <div className="flex flex-col gap-6 p-8 overflow-y-auto">
           <div className="flex items-center justify-between mb-4">
               <div>
                   <h3 className="text-xl font-bold text-gray-800">Histórico de Anamneses</h3>
                   <p className="text-sm text-gray-500">Listagem de todas as anamneses preenchidas</p>
               </div>
               <div className="flex items-center gap-3">
                   <button onClick={handleCopyLink} className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-colors text-sm">
                       {copiedLink ? <Check size={16} className="text-emerald-500" /> : <Link size={16} />} 
                       {copiedLink ? 'Link Copiado!' : 'Copiar Link Externo'}
                   </button>
                   <button onClick={() => { setIsCreating(true); setRespostas({}); setViewingAnamnese(null); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-colors text-sm">
                       <Plus size={16} /> Nova Anamnese
                   </button>
               </div>
           </div>

           {history.length === 0 ? (
               <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center">
                   <Clock size={48} className="text-gray-300 mb-4" />
                   <p className="text-gray-500">Nenhuma anamnese registrada para este paciente ainda.</p>
               </div>
           ) : (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   {history.map((anamnese, idx) => (
                       <div key={anamnese.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative group flex flex-col justify-between">
                           <div>
                               <div className="flex items-center justify-between mb-3">
                                   <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                                       Versão {history.length - idx}
                                   </span>
                                   <span className="text-xs text-gray-400 font-medium">
                                       {new Date(anamnese.created_at).toLocaleDateString('pt-BR')}
                                   </span>
                               </div>
                               <p className="text-sm text-gray-600 mb-4 font-medium line-clamp-2">
                                   Queixa: {anamnese.respostas['queixa_principal']?.info || 'Não informada'}
                               </p>
                           </div>
                           <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                               <button onClick={() => { setViewingAnamnese(anamnese); setRespostas(anamnese.respostas); setIsCreating(false); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[13px] rounded-lg border border-slate-200 transition-colors">
                                   <Eye size={14} /> Visualizar
                               </button>
                               <button onClick={() => handlePrint(anamnese.respostas)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors" title="Imprimir">
                                   <Printer size={15} />
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
           )}
       </div>
   );

   const renderForm = () => {
       const isReadonly = viewingAnamnese !== null;
       
       return (
           <div className="flex flex-col h-full bg-white animate-in slide-in-from-right-4 relative">
               <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50 rounded-t-2xl sticky top-0 z-10">
                   <div className="flex items-center gap-4">
                      <div onClick={() => { setIsCreating(false); setViewingAnamnese(null); }} className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-gray-700 transition">
                          <ChevronLeft size={20} />
                          <span className="text-sm font-semibold">Voltar para a lista</span>
                      </div>
                      <div className="h-6 w-px bg-gray-200"></div>
                      <h2 className="text-xl font-bold text-gray-800">
                          {isReadonly ? `Anamnese de ${new Date(viewingAnamnese.created_at).toLocaleDateString()}` : 'Nova Anamnese'}
                      </h2>
                   </div>
                   
                   <div className="flex items-center gap-3">
                       {isReadonly && (
                           <button onClick={() => handlePrint(viewingAnamnese.respostas)} className="flex items-center gap-2 px-5 py-2 border border-gray-200 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-colors text-sm">
                               <Printer size={16} /> Imprimir
                           </button>
                       )}
                       {!isReadonly && (
                           <button onClick={handleSave} disabled={saving || !allAnswered} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                               <Save size={16} /> {saving ? 'Salvando...' : 'Salvar dados'}
                           </button>
                       )}
                   </div>
               </div>
    
               <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                   <div className="max-w-4xl mx-auto flex flex-col gap-8">
                       {!allAnswered && !isReadonly && (
                           <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-sm font-medium flex items-center justify-between">
                               É necessário responder a todas as perguntas para liberar o salvamento.
                           </div>
                       )}

                       {ANAMNESE_QUESTIONS.map(q => {
                           const currentAns = respostas[q.id] || {};
                           return (
                               <div key={q.id} className="flex flex-col gap-3">
                                   <label className="text-[15px] font-bold text-slate-800">{q.label} {!isReadonly && <span className="text-red-500">*</span>}</label>
                                   
                                   {q.type !== 'text_only' && (
                                       <div className="flex items-center gap-6">
                                           {['Sim', 'Não', 'Não sei'].map(opt => (
                                               <label key={opt} className={`flex items-center gap-2 group ${isReadonly ? 'cursor-default opacity-80' : 'cursor-pointer'}`} onClick={() => {
                                                   if (isReadonly) return;
                                                   setRespostas(prev => ({
                                                      ...prev,
                                                      [q.id]: { ...prev[q.id], value: opt }
                                                   }));
                                               }}>
                                                   <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${currentAns.value === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-300 group-hover:border-blue-400'}`}>
                                                       {currentAns.value === opt && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                                                   </div>
                                                   <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-900">{opt}</span>
                                               </label>
                                           ))}
                                       </div>
                                   )}
                                   
                                   {(q.hasInfo || q.type === 'text_only') && (
                                       <div className="mt-1">
                                           {q.type !== 'text_only' && <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Informações adicionais</span>}
                                           <input 
                                               type="text" 
                                               placeholder="Digite aqui..."
                                               disabled={isReadonly}
                                               className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm bg-gray-50 focus:bg-white disabled:opacity-80 disabled:bg-gray-100"
                                               value={currentAns.info || ''}
                                               onChange={e => setRespostas(prev => ({
                                                   ...prev,
                                                   [q.id]: { ...prev[q.id], info: e.target.value }
                                               }))}
                                               onClick={() => {
                                                   if (!isReadonly && q.type !== 'text_only' && !currentAns.value) {
                                                       setRespostas(prev => ({
                                                          ...prev,
                                                          [q.id]: { ...prev[q.id], value: 'Sim' }
                                                       }));
                                                   }
                                               }}
                                           />
                                       </div>
                                   )}
                               </div>
                           )
                       })}
                   </div>
               </div>
           </div>
       );
   };

   return (
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full animate-in fade-in" style={{ height: 'calc(100vh - 150px)' }}>
           {(isCreating || viewingAnamnese) ? renderForm() : renderList()}
       </div>
   );
}
