import React, { useState } from 'react';
import { X, User as UserIcon } from 'lucide-react';
import { Patient } from '../types';

interface PaymentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetTreatments: any[];
    budget: any;
    patient: Patient;
    onSave: (updatedBudget: any) => Promise<void>;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ isOpen, onClose, budgetTreatments, budget, patient, onSave }) => {
    const [localTreatments, setLocalTreatments] = useState<any[]>(budgetTreatments || []);
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        setLocalTreatments(budgetTreatments || []);
    }, [budgetTreatments]);

    if (!isOpen || !budget) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Calculate the new total for the budget based on the edited treatment values
        const newTotal = localTreatments.reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const updBudget = { ...budget, treatments: localTreatments, total: newTotal };
        await onSave(updBudget);
        setIsSaving(false);
        onClose();
    };

    const totalCost = localTreatments.reduce((sum, t) => sum + parseFloat(t.valor || '0'), 0);

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={handleBackdropClick}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800">Detalhes do pagamento</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    {/* Patient Info */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden shrink-0">
                            {patient.photo ? <img src={patient.photo} alt="P" className="w-full h-full object-cover" /> : <UserIcon size={24} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-[15px]">{patient.name}</span>
                            <span className="text-slate-500 text-[13px]">{patient.cpf || 'Sem CPF'}</span>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl border border-slate-100">
                        <div className="px-5 py-3 border-b border-slate-100 bg-white rounded-t-xl">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tratamentos</span>
                        </div>
                        <div className="flex flex-col">
                            {localTreatments.map((t, index) => (
                                <div key={t.id || index} className="p-5 border-b border-gray-100 last:border-0 flex items-start justify-between gap-4 bg-white hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <span className="font-semibold text-slate-800 text-[14px]">
                                            {t.treatmentName || t.tratamento}
                                        </span>
                                        <div className="flex items-center gap-3 text-[12px] text-gray-500">
                                            <span>{t.convenio || 'Particular'}</span>
                                            {t.dente && <span>Dente {t.dente}</span>}
                                            {t.profissional && <span>Dr(a) {t.profissional.replace('Dr. ', '').replace('Dra. ', '')}</span>}
                                        </div>
                                        <div className="inline-flex mt-1 bg-gray-100 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold text-gray-500 w-fit">
                                            Orç. #{budget.numero || budget.id.substring(0,8)}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                            <span className="text-sm font-semibold text-gray-500">R$</span>
                                            <input 
                                                type="number"
                                                className="w-20 outline-none text-right font-bold text-gray-800 text-[15px] bg-transparent"
                                                value={t.valor || ''}
                                                onChange={(e) => {
                                                    const newT = [...localTreatments];
                                                    newT[index] = { ...newT[index], valor: e.target.value };
                                                    setLocalTreatments(newT);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 bg-slate-50 flex items-center justify-end rounded-b-xl border-t border-slate-200">
                            <span className="text-[13px] font-bold text-slate-600 mr-2">TOTAL</span>
                            <span className="text-[16px] font-bold text-slate-800">R$ {totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
