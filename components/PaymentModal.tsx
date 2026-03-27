import React, { useState } from 'react';
import { X, CreditCard, Banknote, Landmark, QrCode, Receipt, CheckCircle, FileText } from 'lucide-react';
import { Patient } from '../types';

export interface PaymentData {
    id: string;
    method: string;
    amount: number;
    date: string;
    observations: string;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    treatments: any[]; // The array of treatment objects
    patient: Patient;
    onProcessPayment: (payment: PaymentData, isFullyPaid: boolean) => Promise<void>;
}

const PAYMENT_METHODS = [
    { id: 'Dinheiro', icon: Banknote, label: 'Dinheiro' },
    { id: 'Crédito', icon: CreditCard, label: 'Crédito' },
    { id: 'Débito', icon: CreditCard, label: 'Débito' },
    { id: 'Boleto', icon: Receipt, label: 'Boleto' },
    { id: 'Cheque', icon: FileText, label: 'Cheque' },
    { id: 'Pix', icon: QrCode, label: 'Pix' },
    { id: 'TED', icon: Landmark, label: 'TED' }
];

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, treatments, patient, onProcessPayment }) => {
    const totalCost = (treatments || []).reduce((sum, t) => sum + parseFloat(t?.valor || '0'), 0);
    // Calculate how much has been paid already
    const paidSoFar = (treatments || []).reduce((sum, t) => sum + (t?.payments || []).reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0), 0);
    const remainingCost = Math.max(0, totalCost - paidSoFar);

    const [method, setMethod] = useState<string>('Dinheiro');
    const [amountStr, setAmountStr] = useState<string>(remainingCost.toFixed(2));
    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [date, setDate] = useState<string>(defaultDate);
    const [observations, setObservations] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset amount when treatment changes
    React.useEffect(() => {
        setAmountStr(remainingCost.toFixed(2));
    }, [remainingCost]);

    if (!isOpen || !treatments || treatments.length === 0) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleSave = async () => {
        const val = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(val) || val <= 0) {
            alert('Por favor, insira um valor válido acima de zero.');
            return;
        }

        setIsProcessing(true);
        const p: PaymentData = {
            id: Math.random().toString(36).substring(2, 9),
            method,
            amount: val,
            date,
            observations
        };

        const newPaidSoFar = paidSoFar + val;
        // Se o valor recém pago + o que já foi pago atingir o custo total (com tolerância de arredondamento)
        const isFullyPaid = newPaidSoFar >= totalCost - 0.01; 

        await onProcessPayment(p, isFullyPaid);
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
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
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
                                <span className="font-semibold text-slate-800">R$ {totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                            {treatments.length === 1 && <span className="text-xs text-slate-500 mt-1">Dr(a) Profissional</span>}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center px-1">
                            {paidSoFar > 0 && (
                                <span className="text-sm font-semibold text-emerald-600">Já pago: R$ {paidSoFar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            )}
                            <div className="flex flex-col items-end flex-1">
                                <span className="text-sm text-slate-600 font-semibold">Falta pagar</span>
                                <span className="text-lg font-bold text-slate-900">R$ {remainingCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Forma de pagamento</label>
                        <div className="flex flex-wrap gap-2">
                            {PAYMENT_METHODS.map((m) => {
                                const Icon = m.icon;
                                const isSelected = method === m.id;
                                return (
                                    <button 
                                        key={m.id}
                                        onClick={() => setMethod(m.id)}
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

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {/* Final Value */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Valor pago</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                <input 
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Data do pagamento</label>
                            <input 
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Observations */}
                    <div className="space-y-2 mb-2">
                        <label className="text-sm font-bold text-slate-700">Observações <span className="text-slate-400 font-normal">(Opcional)</span></label>
                        <textarea 
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            rows={3}
                            className="w-full p-3 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="Descreva detalhes específicos do parcelamento, entrada ou anotações extras..."
                        ></textarea>
                    </div>

                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto shrink-0">
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
                        {isProcessing ? 'Processando...' : <><CreditCard size={16}/> Pagar</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

const UserIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 opacity-50"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
);
