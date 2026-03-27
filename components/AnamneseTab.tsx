import React, { useState, useEffect } from 'react';
import { anamneseService } from '../services/anamneseService';
import { ChevronLeft, Save, Printer } from 'lucide-react';

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
   const [respostas, setRespostas] = useState<Record<string, any>>({});
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   useEffect(() => {
       const load = async () => {
           const existing = await anamneseService.fetchAnamnese(empresaId, Number(patient.id));
           if (existing && existing.respostas) {
               setRespostas(existing.respostas);
           }
           setLoading(false);
       };
       load();
   }, [empresaId, patient.id]);

   const handleSave = async () => {
       setSaving(true);
       const result = await anamneseService.saveAnamnese(empresaId, Number(patient.id), respostas);
       if (result) {
          alert('Anamnese salva com sucesso!');
       } else {
          alert('A tabela "anamneses" ainda não existe no seu banco de dados Supabase! Execute o código SQL informado pelo assistente no SQL Editor do seu painel e depois clique em Salvar novamente.');
       }
       setSaving(false);
   };

   const handlePrint = () => {
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
           td { padding: 6px 4px; vertical-align: top; border-bottom: 1px solid #fff; }
           tr:nth-child(even) { background-color: #fff; }
           tr:nth-child(odd) { background-color: #f1f5f9; }
           .footer-sig { margin-top: 50px; text-align: center; font-size: 12px; }
       </style></head><body>`;
       
       html += `
         <div class="header-top">
            <div>Clínica Odontológica</div>
            <div>${dataAtual}</div>
         </div>
         <h1>Ficha de Anamnese</h1>
         
         <div class="patient-info">
            <div>
               <div><strong>Nome:</strong> ${patient.name}</div>
               <div><strong>CPF:</strong> ${patient.cpf || ''}</div>
               <br/>
               <div><strong>Data de Nascimento:</strong> ${patient.dataNascimento || ''}</div>
            </div>
            <div>
               <div><strong>Endereço:</strong> ${patient.enderecoRua || ''}, ${patient.enderecoNumero || ''}</div>
               <div><strong>Bairro:</strong> ${patient.enderecoBairro || ''}</div>
               <div><strong>CEP:</strong> ${patient.cep || ''}</div>
               <div><strong>Cidade:</strong> ${patient.enderecoCidade || ''}</div>
               <div><strong>Estado:</strong> ${patient.enderecoEstado || ''}</div>
            </div>
         </div>
         <div style="border-bottom: 2px solid #000; margin-bottom: 10px;"></div>
         
         <table>
            <thead>
               <tr>
                  <th style="width: 65%;">Pergunta</th>
                  <th style="width: 35%;">Resposta</th>
               </tr>
            </thead>
            <tbody>
       `;
       
       ANAMNESE_QUESTIONS.forEach(q => {
           const ans = respostas[q.id];
           
           if (q.type === 'text_only') {
               html += `<tr><td>${q.label}</td><td>${ans?.info ? ans.info : ''}</td></tr>`;
           } else {
               const valueStr = ans?.value ? ans.value + '.' : 'Não respondido.';
               const infoStr = ans?.info ? ' ' + ans.info + '.' : '';
               html += `<tr><td>${q.label}</td><td>${valueStr}${infoStr}</td></tr>`;
           }
       });
       
       html += `
            </tbody>
         </table>
         
         <div class="footer-sig">
            Assino este declarando verdadeiras as informações ditas acima
         </div>
       `;
       
       html += `<script>window.onload = function() { window.print(); }</script></body></html>`;
       w.document.write(html);
       w.document.close();
   };

   if (loading) return <div className="p-8 text-center text-gray-500">Carregando questionário...</div>;

   return (
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full animate-in fade-in" style={{ height: 'calc(100vh - 150px)' }}>
           {/* Header with save and print */}
           <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10 shadow-sm rounded-t-2xl">
               <div className="flex items-center gap-4">
                  <div onClick={onBack} className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-gray-700 transition">
                      <ChevronLeft size={20} />
                      <span className="text-sm font-semibold">Voltar</span>
                  </div>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <h2 className="text-xl font-bold text-gray-800">Editar anamnese</h2>
               </div>
               
               <div className="flex items-center gap-3">
                   <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 border border-gray-200 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-colors text-sm">
                       <Printer size={16} /> Imprimir
                   </button>
                   <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-colors text-sm disabled:opacity-50">
                       <Save size={16} /> {saving ? 'Salvando...' : 'Salvar dados'}
                   </button>
               </div>
           </div>

           <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
               <div className="max-w-4xl mx-auto flex flex-col gap-8">
                   {ANAMNESE_QUESTIONS.map(q => {
                       const currentAns = respostas[q.id] || {};
                       return (
                           <div key={q.id} className="flex flex-col gap-3">
                               <label className="text-[15px] font-bold text-slate-800">{q.label}</label>
                               
                               {q.type !== 'text_only' && (
                                   <div className="flex items-center gap-6">
                                       {['Sim', 'Não', 'Não sei'].map(opt => (
                                           <label key={opt} className="flex items-center gap-2 cursor-pointer group" onClick={() => {
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
                               
                               {q.hasInfo && (
                                   <div className="mt-1">
                                       <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Informações adicionais</span>
                                       <input 
                                           type="text" 
                                           placeholder="Digite aqui..."
                                           className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm bg-gray-50 focus:bg-white"
                                           value={currentAns.info || ''}
                                           onChange={e => setRespostas(prev => ({
                                               ...prev,
                                               [q.id]: { ...prev[q.id], info: e.target.value }
                                           }))}
                                           onClick={(e) => {
                                               if (q.type !== 'text_only' && !currentAns.value) {
                                                   // Auto select Sim if user starts typing explanation
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
}
