import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Building, User, MapPin } from 'lucide-react';

interface PaymentSettingsProps {
    empresaId: string;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({ empresaId }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

    // Form states
    const [cnpj, setCnpj] = useState('');
    const [razaoSocial, setRazaoSocial] = useState('');
    const [email, setEmail] = useState('');
    const [telefone, setTelefone] = useState('');

    const [cep, setCep] = useState('');
    const [rua, setRua] = useState('');
    const [numero, setNumero] = useState('');
    const [bairro, setBairro] = useState('');
    const [cidade, setCidade] = useState('');
    const [estado, setEstado] = useState('');

    const [nomeRepresentante, setNomeRepresentante] = useState('');
    const [cpfRepresentante, setCpfRepresentante] = useState('');
    const [dataNascimento, setDataNascimento] = useState('');

    const [banco, setBanco] = useState('');
    const [agencia, setAgencia] = useState('');
    const [conta, setConta] = useState('');

    useEffect(() => {
        loadSettings();
    }, [empresaId]);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('Empresa')
                .select('stripe_account_id, nome, email, telefoneWhatsapp')
                .eq('id', empresaId)
                .single();

            if (error) throw error;
            if (data) {
                setStripeAccountId(data.stripe_account_id);
                if (data.nome) setRazaoSocial(data.nome);
                if (data.email) setEmail(data.email);
                if (data.telefoneWhatsapp) setTelefone(data.telefoneWhatsapp);
            }
        } catch (error) {
            console.error("Erro ao carregar dados da empresa", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivate = async () => {
        if (!cnpj || !razaoSocial || !email || !nomeRepresentante || !cpfRepresentante) {
            alert("Por favor, preencha os dados obrigatórios para ativar o gateway.");
            return;
        }

        try {
            setIsActivating(true);
            const { data, error } = await supabase.functions.invoke('stripe-create-account', {
                body: {
                    empresa_id: empresaId,
                    email: email,
                    name: razaoSocial,
                    cnpj: cnpj,
                    // Poderíamos enviar mais dados do formulário aqui para a Stripe
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            if (data && data.success) {
                setStripeAccountId(data.stripe_account_id);
                alert("Gateway de Pagamentos ativado com sucesso!");
            }
        } catch (error: any) {
            console.error("Erro ao ativar gateway", error);
            alert("Ocorreu um erro ao tentar ativar o gateway: " + error.message);
        } finally {
            setIsActivating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (stripeAccountId) {
        return (
            <div className="p-6 bg-green-50 border border-green-200 rounded-2xl flex flex-col items-center justify-center text-center">
                <CheckCircle size={48} className="text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-green-800">Gateway de Pagamentos Ativo</h3>
                <p className="text-green-700 mt-2 max-w-md">
                    Sua conta na Stripe (ID: <span className="font-mono text-sm bg-green-100 px-2 py-1 rounded">{stripeAccountId}</span>) está configurada.
                    Todos os boletos gerados agora serão processados pela Stripe e os valores serão creditados no saldo da sua conta.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Gateway de Pagamentos (Stripe)</h2>
                <p className="text-gray-500 mt-1">
                    Preencha os dados abaixo para criar sua subconta e começar a emitir boletos.
                </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-800 border border-blue-100">
                <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm">
                    <strong>Atenção:</strong> Os dados abaixo devem ser reais e corresponder aos documentos do representante legal para aprovação pelo Banco Central e recebimento de repasses.
                </div>
            </div>

            {/* Dados da Empresa */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                    <Building size={20} className="text-gray-400" /> Dados da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Razão Social</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email Profissional</label>
                        <input type="email" className="w-full p-3 border rounded-xl" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={telefone} onChange={e => setTelefone(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                    <MapPin size={20} className="text-gray-400" /> Endereço Comercial
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">CEP</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={cep} onChange={e => setCep(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Rua</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={rua} onChange={e => setRua(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Número</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={numero} onChange={e => setNumero(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Bairro</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={bairro} onChange={e => setBairro(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cidade / Estado</label>
                        <div className="flex gap-2">
                            <input type="text" className="w-full p-3 border rounded-xl" placeholder="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
                            <input type="text" className="w-20 p-3 border rounded-xl" placeholder="UF" value={estado} onChange={e => setEstado(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Representante Legal */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                    <User size={20} className="text-gray-400" /> Representante Legal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">CPF</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={cpfRepresentante} onChange={e => setCpfRepresentante(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={nomeRepresentante} onChange={e => setNomeRepresentante(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Data de Nascimento</label>
                        <input type="date" className="w-full p-3 border rounded-xl" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Dados Bancários */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                    <CreditCard size={20} className="text-gray-400" /> Dados Bancários (Vinculados ao CNPJ)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Código do Banco</label>
                        <input type="text" className="w-full p-3 border rounded-xl" placeholder="Ex: 341 (Itaú)" value={banco} onChange={e => setBanco(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Agência</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={agencia} onChange={e => setAgencia(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Conta (com dígito)</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={conta} onChange={e => setConta(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t flex justify-end">
                <button
                    onClick={handleActivate}
                    disabled={isActivating}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                    {isActivating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    Ativar Gateway de Pagamentos
                </button>
            </div>
        </div>
    );
};
