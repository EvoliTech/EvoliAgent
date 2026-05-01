import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, FileText, User, Stethoscope } from 'lucide-react';
import { ProteseSolicitacao } from '../types';

export const PublicProsthesisView = () => {
  const [solicitacao, setSolicitacao] = useState<ProteseSolicitacao | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSolicitacao = async () => {
      const id = window.location.pathname.split('/').pop();
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('protese_solicitacoes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (data) setSolicitacao(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSolicitacao();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!solicitacao) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Solicitação não encontrada</h2>
          <p className="text-slate-500">O link acessado é inválido ou a solicitação foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-start">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-center text-white relative">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-5 border border-white/30 shadow-lg">
            <Stethoscope size={40} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Detalhes da Solicitação</h1>
          <div className="inline-block px-4 py-1.5 bg-black/20 rounded-full backdrop-blur-sm">
            <p className="text-blue-50 font-medium tracking-wider text-sm">ID: {solicitacao.id.split('-')[0].toUpperCase()}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 bg-slate-50/50">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-blue-200 group">
              <div className="flex items-center gap-3 text-slate-500 mb-3 border-b border-slate-100 pb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors"><User size={20} /></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Paciente</span>
              </div>
              <p className="font-semibold text-slate-800 text-lg ml-2">{solicitacao.paciente_nome}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 group">
              <div className="flex items-center gap-3 text-slate-500 mb-3 border-b border-slate-100 pb-3">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors"><Stethoscope size={20} /></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Responsável</span>
              </div>
              <p className="font-semibold text-slate-800 text-lg ml-2">{solicitacao.responsavel_nome}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
            <div className="flex items-center gap-3 text-slate-500 mb-6 border-b border-slate-100 pb-4">
              <FileText size={22} className="text-blue-500" />
              <span className="font-bold uppercase tracking-widest text-sm text-slate-700">Especificações do Serviço</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8">
              <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <span className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Serviço Solicitado</span>
                <span className="block font-semibold text-slate-800 text-base">{solicitacao.descricao_servico || 'Não informado'}</span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <span className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Dente(s)</span>
                <span className="block font-semibold text-slate-800 text-base">{solicitacao.dentes || 'Não informado'}</span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <span className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Cor</span>
                <span className="block font-semibold text-slate-800 text-base">{solicitacao.cor || 'Não informado'}</span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <span className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Status Atual</span>
                <span className="inline-flex items-center px-3.5 py-1.5 bg-blue-100/50 text-blue-700 text-sm font-bold rounded-full border border-blue-200">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
                  {solicitacao.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-400 to-indigo-600"></div>
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="text-indigo-500">✍️</span> Trabalho a ser executado
            </h3>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-base bg-slate-50/80 p-5 rounded-lg border border-slate-100">
              {solicitacao.trabalho_executado || 'Nenhuma descrição detalhada fornecida pelo responsável.'}
            </p>
          </div>

        </div>
        
        {/* Footer */}
        <div className="bg-slate-100 px-8 py-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs font-semibold text-slate-400 gap-4">
          <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            📅 Emitido em {new Date(solicitacao.created_at).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1.5 tracking-wider">
            Powered by <span className="font-bold text-slate-600">ClínicaSync</span>
          </span>
        </div>
      </div>
    </div>
  );
};
