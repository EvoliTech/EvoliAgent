import React from 'react';
import { Calendar as CalendarIcon, Clock, User, MessageSquare, CheckCircle2 } from 'lucide-react';
import { WizardData } from './FluidAppointmentWizard';

interface StepConfirmationProps {
    data: WizardData;
    loading: boolean;
    onChangeObservations: (obs: string) => void;
    onChangeSendConfirmation: (v: boolean) => void;
    onChangeConfirmationMessage: (msg: string) => void;
    onSave: () => void;
}

export const StepConfirmation: React.FC<StepConfirmationProps> = ({ 
    data, 
    loading, 
    onChangeObservations, 
    onChangeSendConfirmation, 
    onChangeConfirmationMessage,
    onSave 
}) => {
    return (
        <div className="w-full max-w-md mx-auto flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Confirmação</h3>
            
            <div className="flex-1 overflow-y-auto space-y-6 pb-4">
                
                {/* Resumo */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-blue-900 text-lg">{data.patient?.nome || 'Paciente não selecionado'}</span>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{data.appointmentType || (data.useBudget ? `Orçamento #${data.budgetId}` : 'Atendimento')}</span>
                    </div>

                    <div className="h-px bg-gray-100 w-full my-2"></div>

                    <div className="flex items-center gap-4 text-slate-600">
                        <CalendarIcon size={18} className="text-slate-400" />
                        <span className="font-medium text-sm">Dia {data.date?.toLocaleDateString('pt-BR')}</span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-600">
                        <Clock size={18} className="text-slate-400" />
                        <div className="flex flex-col">
                            <span className="font-medium text-sm">Horário do agendamento</span>
                            <span className="font-bold text-slate-800">{data.time} ({data.duration} min)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-slate-600">
                        <User size={18} className="text-slate-400" />
                        <span className="font-medium text-sm">{data.professional?.name || 'Profissional'}</span>
                    </div>
                </div>

                {/* Observações */}
                <div className="relative">
                    <MessageSquare size={16} className="absolute left-4 top-4 text-slate-400" />
                    <textarea 
                        placeholder="Insira a observação aqui"
                        value={data.observations || ''}
                        onChange={(e) => onChangeObservations(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 min-h-[100px] text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm resize-none custom-scrollbar"
                    ></textarea>
                </div>

                {/* Enviar Confirmação Toggle */}
                <div className="flex items-center justify-between py-2 px-1">
                    <span className="font-bold text-slate-500 text-xs uppercase tracking-wider">ENVIAR CONFIRMAÇÃO</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={data.sendConfirmation}
                            onChange={(e) => onChangeSendConfirmation(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                {data.sendConfirmation && (
                    <div className="mt-2 relative animate-in fade-in slide-in-from-top-2 duration-300">
                        <textarea 
                            value={data.confirmationMessage || ''}
                            onChange={(e) => onChangeConfirmationMessage(e.target.value)}
                            placeholder="Mensagem de confirmação..."
                            className="w-full bg-white border border-gray-200 rounded-2xl p-4 min-h-[100px] text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none custom-scrollbar shadow-sm"
                        ></textarea>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-4">
                <button 
                    onClick={onSave}
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <CheckCircle2 size={20} />
                            Agendar
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
