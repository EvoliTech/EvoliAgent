import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { PageType } from '../types';
import { useCompany } from '../contexts/CompanyContext';

interface GoogleCallbackProps {
    onNavigate: (page: PageType) => void;
}

export const GoogleCallback: React.FC<GoogleCallbackProps> = ({ onNavigate }) => {
    const { empresaId } = useCompany();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processando autenticação com Google...');

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const error = params.get('error');

            if (error) {
                setStatus('error');
                setMessage(`Erro do Google: ${error}`);
                return;
            }

            if (!code) {
                setStatus('error');
                setMessage('Código de autenticação não encontrado.');
                return;
            }

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.email) throw new Error('Usuário não identificado. Faça login novamente.');
                if (!empresaId) throw new Error('Empresa não identificada.');

                // Redirect URI must match what was sent in Settings.tsx
                const redirectUri = window.location.origin + '/settings/callback';

                console.log('Exchanging code for token with redirectUri:', redirectUri);

                const { data, error: fnError } = await supabase.functions.invoke('google-auth', {
                    body: {
                        action: 'exchange-token',
                        code,
                        redirectUri,
                        userEmail: user.email,
                        empresaId: empresaId
                    }
                });

                if (fnError || (data && data.error)) {
                    throw new Error(fnError?.message || data?.error || 'Falha na troca de tokens.');
                }

                setStatus('success');
                setMessage(`Conexão realizada com sucesso para: ${data?.email || user.email}`);

                // Wait a bit and redirect
                setTimeout(() => {
                    // Clean URL to avoid code reuse issues if refreshed
                    window.history.replaceState({}, '', '/');
                    onNavigate('settings');
                }, 2500);

            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setMessage(err.message || 'Erro desconhecido.');
            }
        };

        handleCallback();
    }, [onNavigate]);

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 bg-gray-50/50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
                {status === 'loading' && (
                    <>
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Conectando...</h2>
                        <p className="text-gray-500">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-green-700 mb-2">Sucesso!</h2>
                        <p className="text-gray-600 mb-4">{message}</p>
                        <p className="text-xs text-gray-400">Redirecionando para configurações...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-red-700 mb-2">Falha na Conexão</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <button
                            onClick={() => {
                                window.history.replaceState({}, '', '/');
                                onNavigate('settings');
                            }}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
                        >
                            Voltar para Configurações
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
