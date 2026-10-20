import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CreditCard, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface PaymentSettingsProps {
    empresaId: string;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({ empresaId }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    
    const [stripeSubaccountId, setStripeSubaccountId] = useState<string | null>(null);
    const [isGatewayActive, setIsGatewayActive] = useState(false);
    const [isRestricted, setIsRestricted] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);

    useEffect(() => {
        loadSettings();
    }, [empresaId]);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('Empresa')
                .select('stripe_subaccount_id, stripe_gateway_active')
                .eq('id', empresaId)
                .single();

            if (error) throw error;
            if (data) {
                setStripeSubaccountId(data.stripe_subaccount_id);
                setIsGatewayActive(data.stripe_gateway_active || false);
                
                if (data.stripe_subaccount_id && data.stripe_gateway_active) {
                    checkAccountStatus(data.stripe_subaccount_id);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados da empresa", error);
        } finally {
            setIsLoading(false);
        }
    };

    const checkAccountStatus = async (subaccountId: string) => {
        try {
            setCheckingStatus(true);
            const { data, error } = await supabase.functions.invoke('stripe-account-status', {
                body: { stripe_subaccount_id: subaccountId }
            });
            if (error) throw error;
            if (data && data.success) {
                setIsRestricted(data.isRestricted);
            }
        } catch (error) {
            console.error("Erro ao verificar status da conta", error);
        } finally {
            setCheckingStatus(false);
        }
    };

    // Reativação 100% interna quando a conta já está conectada
    const handleReactivate = async () => {
        try {
            setIsActivating(true);
            const { error } = await supabase
                .from('Empresa')
                .update({ stripe_gateway_active: true })
                .eq('id', empresaId);

            if (error) throw error;

            setIsGatewayActive(true);
            if (stripeSubaccountId) {
                checkAccountStatus(stripeSubaccountId);
            }
        } catch (error: any) {
            console.error("Erro ao ativar gateway", error);
            alert("Ocorreu um erro ao tentar ativar o gateway: " + error.message);
        } finally {
            setIsActivating(false);
        }
    };

    // Primeira ativação (criação da subconta no Stripe)
    const handleFirstTimeActivate = async () => {
        try {
            setIsActivating(true);
            const { data, error } = await supabase.functions.invoke('stripe-create-account', {
                body: {
                    empresa_id: empresaId
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            if (data && data.success) {
                setStripeSubaccountId(data.stripe_subaccount_id);
                setIsGatewayActive(true);
                if (data.account_link_url) {
                    window.location.href = data.account_link_url;
                } else {
                    checkAccountStatus(data.stripe_subaccount_id);
                }
            }
        } catch (error: any) {
            console.error("Erro ao criar conta na Stripe", error);
            alert("Ocorreu um erro ao tentar criar a conta na Stripe: " + error.message);
        } finally {
            setIsActivating(false);
        }
    };

    // Apenas para quando o usuário explicitamente clica para completar dados na Stripe
    const handleCompleteOnboarding = async () => {
        try {
            setIsActivating(true);
            const { data, error } = await supabase.functions.invoke('stripe-create-account', {
                body: {
                    empresa_id: empresaId,
                    force_onboarding: true
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            if (data?.account_link_url) {
                window.location.href = data.account_link_url;
            }
        } catch (error: any) {
            console.error("Erro ao gerar link de cadastro", error);
            alert("Ocorreu um erro ao tentar acessar a Stripe: " + error.message);
        } finally {
            setIsActivating(false);
        }
    };

    const handleDeactivate = async () => {
        if (!window.confirm("Tem certeza que deseja desativar o gateway de pagamentos? O sistema passará a operar no modo de controle interno manual para boletos.")) return;
        try {
            setIsActivating(true);
            const { error } = await supabase
                .from('Empresa')
                .update({ stripe_gateway_active: false })
                .eq('id', empresaId);
            
            if (error) throw error;
            setIsGatewayActive(false);
            alert("Gateway desativado. Modo de controle interno ativado.");
        } catch (error: any) {
            console.error("Erro ao desativar gateway", error);
            alert("Ocorreu um erro ao desativar: " + error.message);
        } finally {
            setIsActivating(false);
        }
    };

    if (isLoading || checkingStatus) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (isGatewayActive && stripeSubaccountId) {
        return (
            <div className={`p-8 border rounded-2xl flex flex-col items-center justify-center text-center animate-in fade-in duration-300 ${isRestricted ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                {isRestricted ? (
                    <AlertCircle size={56} className="text-amber-500 mb-4" />
                ) : (
                    <CheckCircle size={56} className="text-green-500 mb-4" />
                )}
                
                <h3 className={`text-2xl font-bold ${isRestricted ? 'text-amber-800' : 'text-green-800'}`}>
                    {isRestricted ? 'Sua conta Stripe está restrita' : 'Você ativou o gateway de pagamentos Stripe!'}
                </h3>
                
                {isRestricted ? (
                    <p className="text-amber-700 mt-4 max-w-2xl text-base leading-relaxed">
                        Para começar a emitir boletos e receber pagamentos, você precisa completar o cadastro e enviar os documentos necessários no painel da Stripe.
                    </p>
                ) : (
                    <p className="text-green-700 mt-4 max-w-2xl text-base leading-relaxed">
                        As transações, pagamentos e processamentos serão feitos exclusivamente pela Stripe.
                        Pagamentos serão todo dia útil de forma automática, compensação do boleto de até 3 dias,
                        e liberação do pagamento de 3 a 14 dias úteis direto para a conta bancária.
                    </p>
                )}
                
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    {isRestricted && (
                        <button 
                            onClick={handleCompleteOnboarding} 
                            disabled={isActivating}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            {isActivating ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
                            Completar Cadastro na Stripe
                        </button>
                    )}
                    <button 
                        onClick={handleDeactivate} 
                        disabled={isActivating}
                        className="px-6 py-3 bg-white border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        {isActivating ? <Loader2 size={18} className="animate-spin" /> : null}
                        Desativar Gateway
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Gateway de Pagamentos (Stripe)</h2>
                <p className="text-gray-500 mt-2 text-lg">
                    {stripeSubaccountId 
                        ? 'Sua conta Stripe está conectada. Ative o gateway para emitir boletos e receber pagamentos online.'
                        : 'Crie sua subconta de pagamentos para começar a emitir boletos e receber pagamentos online.'}
                </p>
            </div>

            {stripeSubaccountId ? (
                <div className="bg-emerald-50 p-6 rounded-2xl flex gap-4 text-emerald-800 border border-emerald-100 shadow-sm">
                    <CheckCircle className="flex-shrink-0 mt-1 text-emerald-600" size={24} />
                    <div className="text-base leading-relaxed">
                        <strong>Conta Vinculada:</strong> Sua subconta Stripe Connect já está configurada ({stripeSubaccountId}).
                        Ao clicar no botão abaixo, o gateway será ativado imediatamente sem precisar passar pela Stripe novamente.
                    </div>
                </div>
            ) : (
                <div className="bg-blue-50 p-6 rounded-2xl flex gap-4 text-blue-800 border border-blue-100 shadow-sm">
                    <AlertCircle className="flex-shrink-0 mt-1 text-blue-600" size={24} />
                    <div className="text-base leading-relaxed">
                        <strong>Processo Simplificado:</strong> Você não precisa preencher dados complexos aqui. 
                        Ao clicar no botão abaixo, você será direcionado para a página segura da Stripe, 
                        onde fará o cadastro da sua conta e dos seus dados bancários diretamente com eles.
                    </div>
                </div>
            )}

            <div className="pt-6 border-t flex justify-start">
                <button
                    onClick={stripeSubaccountId ? handleReactivate : handleFirstTimeActivate}
                    disabled={isActivating}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg flex items-center gap-3 disabled:opacity-50 transition-transform active:scale-95"
                >
                    {isActivating ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                    {stripeSubaccountId ? 'Ativar Gateway Novamente' : 'Criar e Ativar Conta na Stripe'}
                </button>
            </div>
        </div>
    );
};
