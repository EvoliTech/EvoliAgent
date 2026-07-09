import React, { useState } from 'react';
import { X, User as UserIcon } from 'lucide-react';
import { Patient } from '../types';

interface PaymentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetTreatments: any[];
    budget: any;
    patient: Patient;
    patientReceitas?: any[];
    onSave: (updatedBudget: any) => Promise<void>;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ isOpen, onClose, budgetTreatments, budget, patient, patientReceitas = [], onSave }) => {
    const [localTreatments, setLocalTreatments] = useState<any[]>(budgetTreatments || []);
    const [isSaving, setIsSaving] = useState(false);
    const [paymentToConfirm, setPaymentToConfirm] = useState<{tId: string, pIndex: number} | null>(null);

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

                                        {t.payments && t.payments.length > 0 ? (
                                            <div className="mt-4 flex flex-col gap-3">
                                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Parcelas / Boletos</span>
                                                <div className="flex flex-col gap-2">
                                                    {t.payments.map((p: any, pIndex: number) => {
                                                        const isBoleto = p.method === 'Boleto';
                                                        const isPago = p.status === 'Pago' || p.isPaid;
                                                        let dateStr = '';
                                                        if (p.date) {
                                                            const d = new Date(p.date.includes('T') ? p.date : p.date + 'T12:00:00');
                                                            if (!isNaN(d.getTime())) {
                                                                dateStr = d.toLocaleDateString('pt-BR');
                                                            }
                                                        }
                                                        
                                                        const receitaVal = patientReceitas?.find(r => r.payment_id === p.id || (p.asaas_payment_id && r.asaas_payment_id === p.asaas_payment_id));
                                                        const linkComprovante = receitaVal?.link_comprovantePG;
                                                        
                                                        return (
                                                            <div key={p.id || pIndex} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`px-2.5 py-1 rounded-md text-[12px] font-bold border ${isPago ? 'bg-green-50 text-green-700 border-green-200' : isBoleto ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                                        {p.method || 'Dinheiro'}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[14px] text-slate-800 font-bold">
                                                                            R$ {parseFloat(p.amount || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                                                                        </span>
                                                                        {dateStr && (
                                                                            <span className="text-[11px] text-slate-500 font-medium">Vencimento: {dateStr}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isBoleto && p.link_boleto && !isPago && (
                                                                        <button onClick={() => window.open(p.link_boleto, '_blank')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition-colors">
                                                                            Visualizar
                                                                        </button>
                                                                    )}
                                                                    {!isPago && (
                                                                        <button onClick={() => {
                                                                            setPaymentToConfirm({ tId: t.id, pIndex: pIndex });
                                                                        }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
                                                                            Dar Baixa
                                                                        </button>
                                                                    )}
                                                                    {isPago && (
                                                                        <button onClick={() => {
                                                                             if (linkComprovante) {
                                                                                 window.open(linkComprovante, '_blank');
                                                                             } else {
                                                                                 const win = window.open('', '_blank');
                                                                                 if (win) {
                                                                                     win.document.write(`
                                                                                         <html><head><title>Recibo</title></head><body style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                                                                                             <h1 style="text-align: center; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">RECIBO DE PAGAMENTO</h1>
                                                                                             <div style="margin-top: 30px;">
                                                                                                 <p>Recebemos de <strong>${patient.name}</strong>, a quantia de <strong>R$ ${parseFloat(p.amount||0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong>,</p>
                                                                                                 <p>referente ao tratamento: <strong>${t.treatmentName || t.tratamento}</strong>.</p>
                                                                                                 <p style="margin-top: 40px;">Data do pagamento: <strong>${new Date().toLocaleDateString()}</strong></p>
                                                                                                 <div style="margin-top: 80px; text-align: center; border-top: 1px solid #000; width: 300px; margin-left: auto; margin-right: auto; padding-top: 10px;">
                                                                                                     Assinatura
                                                                                                 </div>
                                                                                             </div>
                                                                                             <div style="margin-top: 40px; text-align: center;">
                                                                                                  <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir</button>
                                                                                             </div>
                                                                                         </body></html>
                                                                                     `);
                                                                                     win.document.close();
                                                                                 }
                                                                             }
                                                                        }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
                                                                            Recibo
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col mt-3 border-t border-gray-100 pt-3">
                                                <div className="flex flex-col gap-1 w-full max-w-[200px]">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Editar Valor (R$)</label>
                                                    <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                                        <span className="text-sm font-semibold text-gray-500">R$</span>
                                                        <input 
                                                            type="number"
                                                            className="w-full outline-none text-right font-bold text-gray-800 text-[15px] bg-transparent"
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
                                        )}
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

            {/* Modal de Confirmação para Dar Baixa */}
            {paymentToConfirm && (
                <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={(e) => { e.stopPropagation(); setPaymentToConfirm(null); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 bg-orange-50/50 border-b border-orange-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                <span className="text-xl font-bold">!</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Confirmar Baixa Manual</h3>
                        </div>
                        <div className="p-6 text-slate-600 text-sm leading-relaxed flex flex-col gap-3">
                            <p>O boleto tem <strong>até 3 dias úteis</strong> para ser compensado automaticamente pelo sistema.</p>
                            <p>Tem certeza que deseja compensar o boleto e reconhecer o pagamento agora?</p>
                            <p className="text-orange-600 text-[13px] font-semibold bg-orange-50 p-2.5 rounded-lg border border-orange-100 mt-2">
                                Atenção: Desta forma não será gerado o comprovante automático pela plataforma de pagamento.
                            </p>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setPaymentToConfirm(null)} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => {
                                const newT = [...localTreatments];
                                const tIdx = newT.findIndex(xt => xt.id === paymentToConfirm.tId);
                                if (tIdx >= 0) {
                                    const newPayments = [...newT[tIdx].payments];
                                    newPayments[paymentToConfirm.pIndex] = { ...newPayments[paymentToConfirm.pIndex], status: 'Pago', isPaid: true, paymentDate: new Date().toISOString() };
                                    newT[tIdx] = { ...newT[tIdx], payments: newPayments };
                                    setLocalTreatments(newT);
                                }
                                setPaymentToConfirm(null);
                            }} className="px-5 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-sm">
                                Sim, Confirmar Baixa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
