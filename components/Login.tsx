
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle } from 'lucide-react';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Cadastro realizado! Verifique seu e-mail para confirmar.' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Session handled by onAuthStateChange in App.tsx
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro na autenticação' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (error) throw error;
            // Supabase redireciona para o Google; a sessÃ£o serÃ¡ capturada no retorno
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao autenticar com Google' });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">

            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] bg-blue-200/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-200/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative z-10 animate-in fade-in zoom-in duration-500">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200">
                        <span className="font-bold text-xl">C</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-2">
                        {isSignUp ? 'Preencha os dados para começar' : 'Acesse sua conta para continuar'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-4">

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {message.type === 'success' ? <CheckCircle size={16} /> : <div className="w-4 h-4 rounded-full bg-red-200 flex items-center justify-center text-[10px] font-bold">!</div>}
                            {message.text}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                required
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                                placeholder="seunome@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {!isSignUp && (
                        <div className="flex justify-end">
                            <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                Esqueceu a senha?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                {isSignUp ? 'Criar Conta' : 'Entrar'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-400">ou</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleGoogleSignIn}
                        className="w-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
                            <path fill="#fbc02d" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.8 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-3.5z" />
                            <path fill="#e53935" d="M6.3 14.7l6.6 4.8C14.6 15.3 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.8 4 24 4 15.5 4 8.4 8.8 6.3 14.7z" />
                            <path fill="#4caf50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.8 26.7 37 24 37c-5.2 0-9.6-3.4-11.2-8.1l-6.6 5.1C8.3 39.2 15.6 44 24 44z" />
                            <path fill="#1565c0" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.4 5.6-6.3 7.2l6.3 5.3C37.1 38.8 40 32.5 40 25c0-1.3-.1-2.7-.4-3.5z" />
                        </svg>
                        Entrar com Google
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
                    {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setMessage(null);
                        }}
                        className="ml-1 font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        {isSignUp ? 'Faça login' : 'Cadastre-se'}
                    </button>
                </div>

            </div>

            <div className="absolute bottom-4 text-xs text-gray-400">
                © 2024 ClínicaSync • Gestão Médica Inteligente
            </div>

        </div>
    );
};
