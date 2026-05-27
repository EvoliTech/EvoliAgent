import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ANAMNESE_QUESTIONS } from './AnamneseTab';
import { Loader2, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

export const PublicAnamnese = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState<string>('');
  const [respostas, setRespostas] = useState<Record<string, any>>({});

  useEffect(() => {
    const initialize = async () => {
      try {
        // Extract token from URL /anamnese/:token
        const pathParts = window.location.pathname.split('/');
        const token = pathParts[pathParts.length - 1];
        
        if (!token) throw new Error("Link inválido.");
        
        // Decode token
        const decoded = atob(token);
        const [empIdStr, patIdStr] = decoded.split('::');
        const empId = parseInt(empIdStr);
        const patId = parseInt(patIdStr);

        if (isNaN(empId) || isNaN(patId)) throw new Error("Link corrompido ou inválido.");

        setEmpresaId(empId);
        setPatientId(patId);

        // Fetch user data securely via RPC
        const { data, error } = await supabase
          .rpc('get_nome_paciente_publico', {
             p_empresa_id: empId,
             p_patient_id: patId
          });

        if (error || !data) throw new Error("Paciente não encontrado ou link expirado.");

        setPatientName(data as string);
        setLoading(false);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao carregar link.');
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  const allAnswered = ANAMNESE_QUESTIONS.every(q => {
     if (q.type === 'text_only') return respostas[q.id]?.info && respostas[q.id]?.info.trim().length > 0;
     return respostas[q.id] && respostas[q.id].value;
  });

  const handleSave = async () => {
    if (!allAnswered || !empresaId || !patientId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('anamneses')
        .insert({
           IDEmpresa: empresaId,
           patient_id: patientId,
           respostas
        });
        
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert("Ocorreu um erro ao enviar sua ficha: " + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-blue-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-medium text-slate-600">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-sm text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Erro no Acesso</h2>
          <p className="text-slate-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-emerald-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Ficha Enviada!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">Sua anamnese médica foi registrada com sucesso. Obrigado pela sua colaboração com nossa equipe clínica.</p>
          <button onClick={() => window.close()} className="w-full py-3.5 bg-slate-100 font-bold text-slate-700 rounded-xl hover:bg-slate-200 transition">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="max-w-2xl w-full flex flex-col gap-6 animate-in slide-in-from-bottom-5 duration-700">
        
        {/* Header */}
        <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2 text-blue-100">
               <Activity className="w-6 h-6" />
               <span className="font-bold tracking-widest text-sm uppercase">Ficha Clínica</span>
            </div>
            <h1 className="text-3xl font-black">Olá, {patientName.split(' ')[0]}</h1>
            <p className="text-blue-100 mt-2 font-medium leading-relaxed">
              Por favor, preencha este formulário rápido sobre sua saúde antes do seu próximo atendimento. Isso é fundamental para sua segurança.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100 flex flex-col gap-8">
            {!allAnswered && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-semibold text-center mb-2">
                    Responda todas as perguntas obrigatórias para liberar o botão de envio no fim da página.
                </div>
            )}

            {ANAMNESE_QUESTIONS.map((q, index) => {
                 const currentAns = respostas[q.id] || {};
                 return (
                     <div key={q.id} className="flex flex-col gap-3 group relative">
                         {/* Optional Divider except first */}
                         {index !== 0 && <div className="absolute -top-4 left-0 w-full h-px bg-slate-100"></div>}
                         
                         <label className="text-[16px] font-bold text-slate-800 flex items-start gap-2">
                             <span className="text-blue-500">{index + 1}.</span> 
                             {q.label}
                         </label>
                         
                         {q.type !== 'text_only' && (
                             <div className="flex flex-wrap gap-3 mt-1">
                                 {['Sim', 'Não', 'Não sei'].map(opt => (
                                     <button
                                        key={opt}
                                        onClick={() => setRespostas(prev => ({
                                           ...prev,
                                           [q.id]: { ...prev[q.id], value: opt }
                                        }))}
                                        className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                                            currentAns.value === opt
                                                ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                     >
                                        {opt}
                                     </button>
                                 ))}
                             </div>
                         )}
                         
                         {(q.hasInfo || q.type === 'text_only') && (
                             <div className={`mt-2 transition-all ${q.type !== 'text_only' && currentAns.value !== 'Sim' && currentAns.value ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                                 <input 
                                     type="text" 
                                     placeholder={q.type === 'text_only' ? "Descreva os motivos da consulta..." : "Se quiser/precisar, descreva aqui..."}
                                     className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-[15px] focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                                     value={currentAns.info || ''}
                                     onChange={e => setRespostas(prev => ({
                                         ...prev,
                                         [q.id]: { ...prev[q.id], info: e.target.value }
                                     }))}
                                     onClick={() => {
                                         if (q.type !== 'text_only' && !currentAns.value) {
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
             
             {/* Bottom Action */}
             <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
                 <button 
                    disabled={!allAnswered || saving}
                    onClick={handleSave}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-[15px] py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                 >
                    {saving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Enviando dados...
                        </>
                    ) : (
                        <>
                            Enviar Ficha Médica
                            <ChevronRight className="w-5 h-5" />
                        </>
                    )}
                 </button>
                 <p className="text-xs text-center font-medium text-slate-400">
                     Suas respostas são confidenciais e protegidas.
                 </p>
             </div>
        </div>
        
      </div>
    </div>
  );
};
