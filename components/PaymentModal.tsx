import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Landmark, QrCode, Receipt, FileText, Plus, Calendar } from 'lucide-react';
import { Patient, HealthPlan } from '../types';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { plansService } from '../services/plansService';

export interface PaymentData {
    id: string;
    method: string;
    amount: number;
    date: string;
    observations: string;
    installments?: number;
    maquininha_id?: string;
    plano_id?: string;
    receiveDate?: string;
    planAmount?: number;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    treatments: any[]; // The array of treatment objects
    patient: Patient;
    onProcessPayment: (payments: PaymentData[], isFullyPaid: boolean, nextPaymentDate?: string) => Promise<void>;
}

const PAYMENT_METHODS = [
    { id: 'Dinheiro', icon: Banknote, label: 'Dinheiro' },
    { id: 'Crédito', icon: CreditCard, label: 'Crédito' },
    { id: 'Débito', icon: CreditCard, label: 'Débito' },
    { id: 'Boleto', icon: Receipt, label: 'Boleto' },
    { id: 'Pix', icon: QrCode, label: 'Pix' },
    { id: 'TED', icon: Landmark, label: 'TED' },
    { id: 'Plano', icon: FileText, label: 'Plano' }
];

interface PaymentPartState {
    id: string;
    method: string;
    amountStr: string;
    date: string;
    observations: string;
    installments: number;
    maquininha_id: string;
    plano_id: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, treatments, patient, onProcessPayment }) => {
    const totalCost = (treatments || []).reduce((sum, t) => sum + parseFloat(t?.valor || '0'), 0);
    const paidSoFar = (treatments || []).reduce((sum, t) => sum + (t?.payments || []).reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0), 0);
    const remainingCost = Math.max(0, totalCost - paidSoFar);

    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [paymentParts, setPaymentParts] = useState<PaymentPartState[]>([]);
    const [nextPaymentDate, setNextPaymentDate] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Maquininhas and Plans state
    const { empresaId } = useCompany();
    const [maquininhas, setMaquininhas] = useState<any[]>([]);
    const [plans, setPlans] = useState<HealthPlan[]>([]);

    useEffect(() => {
        const loadMaquininhasAndPlans = async () => {
            if (!empresaId) return;
            const { data } = await supabase.from('maquininhas').select('*').eq('empresa_id', empresaId);
            if (data && data.length > 0) {
                setMaquininhas(data);
            }
            
            const fetchedPlans = await plansService.fetchPlans(empresaId);
            if (fetchedPlans && fetchedPlans.length > 0) {
                setPlans(fetchedPlans);
            }
        };
        loadMaquininhasAndPlans();
    }, [empresaId]);

    useEffect(() => {
        if (isOpen) {
            setPaymentParts([{
                id: Math.random().toString(),
                method: 'Dinheiro',
                amountStr: remainingCost.toFixed(2),
                date: defaultDate,
                installments: 1,
                observations: '',
                maquininha_id: '',
                plano_id: ''
            }]);
            setNextPaymentDate('');
        }
    }, [isOpen, remainingCost]);

    if (!isOpen || !treatments || treatments.length === 0) return null;

    const currentPaidSum = paymentParts.reduce((sum, p) => sum + (parseFloat(p.amountStr.replace(',', '.')) || 0), 0);
    const newPaidSoFar = paidSoFar + currentPaidSum;
    const isPartial = newPaidSoFar < (totalCost - 0.01);
    const newRemaining = Math.max(0, totalCost - newPaidSoFar);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const addPaymentPart = () => {
        setPaymentParts(prev => [
            ...prev,
            {
                id: Math.random().toString(),
                method: 'Dinheiro',
                amountStr: isPartial ? newRemaining.toFixed(2) : '0.00',
                date: defaultDate,
                installments: 1,
                observations: '',
                maquininha_id: maquininhas[0]?.id || '',
                plano_id: plans[0]?.id || ''
            }
        ]);
    };

    const removePaymentPart = (id: string) => {
        setPaymentParts(prev => prev.filter(p => p.id !== id));
    };

    const updatePaymentPart = (id: string, field: keyof PaymentPartState, value: any) => {
        setPaymentParts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSave = async () => {
        if (currentPaidSum <= 0) {
            alert('Por favor, insira valores válidos acima de zero.');
            return;
        }

        const invalidPart = paymentParts.find(p => isNaN(parseFloat(p.amountStr.replace(',', '.'))) || parseFloat(p.amountStr.replace(',', '.')) <= 0);
        if (invalidPart) {
            alert('Um dos pagamentos possui valor inválido.');
            return;
        }

        if (isPartial && !nextPaymentDate) {
            alert('Como este é um pagamento parcial, você deve informar a data prevista para o pagamento do restante.');
            return;
        }

        setIsProcessing(true);

        const processedPayments: PaymentData[] = paymentParts.flatMap(part => {
            const val = parseFloat(part.amountStr.replace(',', '.'));
            
            let receiveDate: string | undefined;
            let planAmount: number | undefined;

            if (part.method === 'Plano' && part.plano_id) {
                const selectedPlan = plans.find(p => p.id === part.plano_id);
                if (selectedPlan) {
                    let maxDays = 0;
                    let totalCostDeduction = 0;
                    treatments.forEach(t => {
                        const tName = t.treatmentName || t.tratamento;
                        const pTreat = selectedPlan.treatments.find(pt => pt.name === tName);
                        if (pTreat) {
                            maxDays = Math.max(maxDays, pTreat.receiveDays || 0);
                            totalCostDeduction += pTreat.cost;
                        }
                    });

                    planAmount = Math.max(0, val - totalCostDeduction);
                    
                    const baseDate = new Date();
                    baseDate.setDate(baseDate.getDate() + maxDays);
                    receiveDate = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
                }
            }

            const isInstallment = (part.method === 'Crédito' || part.method === 'Boleto') && part.installments > 1;

            if (isInstallment) {
                const instAmount = val / part.installments;
                const arr: PaymentData[] = [];
                for (let i = 0; i < part.installments; i++) {
                    const instDate = new Date(part.date + 'T12:00:00');
                    instDate.setMonth(instDate.getMonth() + i);
                    const strDate = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}-${String(instDate.getDate()).padStart(2, '0')}`;

                    arr.push({
                        id: Math.random().toString(36).substring(2, 9),
                        method: part.method,
                        amount: instAmount,
                        date: strDate,
                        observations: part.observations ? `${part.observations} (Parcela ${i+1}/${part.installments})` : `Parcela ${i+1}/${part.installments}`,
                        installments: part.installments,
                        ...((part.method === 'Crédito' || part.method === 'Débito' || part.method === 'Pix') && part.maquininha_id ? { maquininha_id: part.maquininha_id } : {}),
                        ...(part.method === 'Plano' && part.plano_id ? { plano_id: part.plano_id } : {}),
                        ...(receiveDate ? { receiveDate } : {}),
                        ...(planAmount !== undefined ? { planAmount } : {})
                    });
                }
                return arr;
            }

            return [{
                id: Math.random().toString(36).substring(2, 9),
                method: part.method,
                amount: val,
                date: part.date,
                observations: part.observations,
                ...((part.method === 'Crédito' || part.method === 'Boleto') ? { installments: part.installments } : {}),
                ...((part.method === 'Crédito' || part.method === 'Débito' || part.method === 'Pix') && part.maquininha_id ? { maquininha_id: part.maquininha_id } : {}),
                ...(part.method === 'Plano' && part.plano_id ? { plano_id: part.plano_id } : {}),
                ...(receiveDate ? { receiveDate } : {}),
                ...(planAmount !== undefined ? { planAmount } : {})
            }];
        });

        const isFullyPaid = !isPartial;

        await onProcessPayment(processedPayments, isFullyPaid, isPartial ? nextPaymentDate : undefined);
        setIsProcessing(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={handleBackdropClick}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800">Realizar pagamento</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    {/* Patient / Treatment Info Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden shrink-0">
                                {patient.photo ? <img src={patient.photo} alt="P" className="w-full h-full object-cover" /> : <UserIcon />}
                            </div>
                            <span className="font-semibold text-slate-700">{patient.name}</span>
                        </div>

                        <div className="flex flex-col gap-1 border-t border-slate-200 pt-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tratamentos ({treatments.length})</span>
                            <div className="flex justify-between items-start mt-2">
                                <span className="font-semibold text-slate-800 flex-1">
                                    {treatments.length === 1 ? (treatments[0].treatmentName || treatments[0].tratamento) : `${treatments.length} tratamentos selecionados`}
                                </span>
                                <span className="font-semibold text-slate-800">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {treatments.length === 1 && <span className="text-xs text-slate-500 mt-1">Dr(a) {treatments[0].profissional || 'Profissional'}</span>}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center px-1">
                            {paidSoFar > 0 && (
                                <span className="text-sm font-semibold text-emerald-600">Já pago: R$ {paidSoFar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            )}
                            <div className="flex flex-col items-end flex-1">
                                <span className="text-sm text-slate-600 font-semibold">Valor em aberto</span>
                                <span className="text-lg font-bold text-slate-900">R$ {remainingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Parts */}
                    <div className="flex flex-col gap-5">
                        {paymentParts.map((part, index) => (
                            <div key={part.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm relative">
                                {paymentParts.length > 1 && (
                                    <button 
                                        onClick={() => removePaymentPart(part.id)}
                                        className="absolute -top-3 -right-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-1 shadow-sm transition-colors"
                                        title="Remover este pagamento"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700">
                                        {paymentParts.length > 1 ? `Forma de pagamento ${index + 1}` : 'Forma de pagamento'}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {PAYMENT_METHODS.map((m) => {
                                            const Icon = m.icon;
                                            const isSelected = part.method === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => updatePaymentPart(part.id, 'method', m.id)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm transition-all
                                                        ${isSelected
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <Icon size={16} className={isSelected ? 'text-blue-100' : 'text-slate-400'} />
                                                    {m.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {(part.method === 'Crédito' || part.method === 'Boleto') && (
                                    <div className="space-y-2 shrink-0 mt-3">
                                        <label className="text-sm font-bold text-slate-700">Parcelas</label>
                                        <select
                                            value={part.installments}
                                            onChange={(e) => updatePaymentPart(part.id, 'installments', Number(e.target.value))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>{i + 1}x</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(part.method === 'Crédito' || part.method === 'Débito' || part.method === 'Pix') && maquininhas.length > 0 && (
                                    <div className="space-y-2 shrink-0 mt-3">
                                        <label className="text-sm font-bold text-slate-700">Maquininha / Conta (Taxas)</label>
                                        <select 
                                            value={part.maquininha_id || (maquininhas[0]?.id || '')}
                                            onChange={(e) => updatePaymentPart(part.id, 'maquininha_id', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {maquininhas.map(m => (
                                                <option key={m.id} value={m.id}>{m.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {part.method === 'Plano' && plans.length > 0 && (
                                    <div className="space-y-2 shrink-0 mt-3">
                                        <label className="text-sm font-bold text-slate-700">Plano Associado</label>
                                        <select 
                                            value={part.plano_id || (plans[0]?.id || '')}
                                            onChange={(e) => updatePaymentPart(part.id, 'plano_id', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {plans.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Valor a pagar</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={part.amountStr}
                                                onChange={(e) => updatePaymentPart(part.id, 'amountStr', e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Data do pagamento</label>
                                        <input
                                            type="date"
                                            value={part.date}
                                            onChange={(e) => updatePaymentPart(part.id, 'date', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mt-4 shrink-0">
                                    <label className="text-sm font-bold text-slate-700">Observações <span className="text-slate-400 font-normal">(Opcional)</span></label>
                                    <textarea
                                        value={part.observations}
                                        onChange={(e) => updatePaymentPart(part.id, 'observations', e.target.value)}
                                        rows={2}
                                        className="w-full p-3 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="Descreva detalhes ou anotações extras para esta forma de pagamento..."
                                    ></textarea>
                                </div>
                            </div>
                        ))}

                        <button 
                            onClick={addPaymentPart}
                            className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-blue-300 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-xl font-semibold text-sm transition-colors"
                        >
                            <Plus size={16} /> Adicionar outra forma de pagamento
                        </button>
                    </div>

                    {/* Resumo & Saldo Restante */}
                    {isPartial && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mt-2 animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                <Calendar size={18} />
                                Saldo Pendente: R$ {newRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h4>
                            <p className="text-sm text-orange-700 mb-4">
                                Identificamos que este é um pagamento parcial. Por favor, defina a data prevista para o recebimento do valor restante.
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Data prevista para pagamento do restante</label>
                                <input
                                    type="date"
                                    value={nextPaymentDate}
                                    onChange={(e) => setNextPaymentDate(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-orange-400 outline-none"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    setPaymentParts(prev => [
                                        ...prev,
                                        {
                                            id: Math.random().toString(),
                                            method: 'Boleto',
                                            amountStr: newRemaining.toFixed(2),
                                            date: nextPaymentDate || defaultDate,
                                            installments: 1,
                                            observations: 'Boleto gerado para o saldo restante',
                                            maquininha_id: '',
                                            plano_id: ''
                                        }
                                    ]);
                                    setNextPaymentDate('');
                                }}
                                className="w-full mt-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Receipt size={18} />
                                Gerar Boleto para o saldo restante
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3 mt-auto shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors"
                        disabled={isProcessing}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isProcessing}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-md shadow-blue-200 transition-all flex items-center gap-2"
                    >
                        {isProcessing ? 'Processando...' : <><CreditCard size={16} /> Confirmar Pagamento</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

const UserIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 opacity-50"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
);
