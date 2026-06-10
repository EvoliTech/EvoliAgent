import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { StepProfessional } from './StepProfessional';
import { StepPatient } from './StepPatient';
import { StepBudgetType } from './StepBudgetType';
import { StepDateTime } from './StepDateTime';
import { StepConfirmation } from './StepConfirmation';
import { Specialist, SupabaseCustomer } from '../../types';
import { GoogleEvent } from '../../services/googleCalendarService';

export interface WizardData {
    professional?: Specialist;
    patient?: SupabaseCustomer;
    useBudget: boolean;
    budgetId?: number;
    appointmentType?: string;
    date?: Date;
    time?: string;
    duration?: number;
    observations?: string;
    sendConfirmation?: boolean;
}

interface FluidAppointmentWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    specialists: Specialist[];
    defaultDate?: Date;
    initialData?: GoogleEvent;
}

export const FluidAppointmentWizard: React.FC<FluidAppointmentWizardProps> = ({
    isOpen,
    onClose,
    onSave,
    specialists,
    defaultDate,
    initialData
}) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<WizardData>({
        useBudget: false,
        date: defaultDate || new Date(),
        time: '09:00',
        duration: 30,
        sendConfirmation: false
    });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (initialData && isOpen) {
            const getField = (text: string | undefined, label: string) => {
                if (!text) return '';
                const lines = text.split('\n');
                const line = lines.find(l => l.startsWith(label));
                return line ? line.replace(label, '').trim() : '';
            };

            const type = getField(initialData.description, 'Tipo:');
            const obs = getField(initialData.description, 'Obs:');
            const orcamentoIdStr = getField(initialData.description, 'OrcamentoID:');
            const patientName = getField(initialData.description, 'Paciente:');
            const patientPhone = getField(initialData.description, 'Telefone:');
            
            let budgetId: number | undefined;
            if (orcamentoIdStr && orcamentoIdStr !== '-') {
                budgetId = Number(orcamentoIdStr);
            }
            
            const startDate = initialData.start?.dateTime ? new Date(initialData.start.dateTime) : (defaultDate || new Date());
            const endDate = initialData.end?.dateTime ? new Date(initialData.end.dateTime) : startDate;
            
            const diffMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
            const duration = diffMins > 0 ? diffMins : 30;
            
            const hours = startDate.getHours().toString().padStart(2, '0');
            const mins = startDate.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${mins}`;

            const prof = specialists.find(s => s.calendarId === initialData.calendarId || s.id === initialData.calendarId);

            setData({
                professional: prof,
                patient: {
                    id: '',
                    nome: patientName || initialData.summary.replace(/\[.*?\]/g, '').trim(),
                    telefoneWhatsapp: patientPhone || '',
                    cpf: '',
                    email: '',
                    dataNascimento: ''
                },
                useBudget: !!budgetId,
                budgetId: budgetId,
                appointmentType: type !== '-' ? type : undefined,
                observations: obs !== '-' ? obs : '',
                date: startDate,
                time: timeStr,
                duration: duration,
                sendConfirmation: false
            });
            setStep(1);
        } else if (isOpen && !initialData) {
            setData({
                useBudget: false,
                date: defaultDate || new Date(),
                time: '09:00',
                duration: 30,
                sendConfirmation: false
            });
            setStep(1);
        }
    }, [initialData, isOpen, specialists, defaultDate]);

    if (!isOpen) return null;

    const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const updateData = (updates: Partial<WizardData>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Constroi o objeto final baseado no data
            if (!data.professional || !data.patient || !data.date || !data.time) {
                alert('Preencha os campos obrigatórios');
                setLoading(false);
                return;
            }

            const dateTimeString = `${data.date.toISOString().split('T')[0]}T${data.time}:00`;
            const startDate = new Date(dateTimeString);
            const endDate = new Date(startDate.getTime() + (data.duration || 30) * 60000);

            let phone = data.patient.telefoneWhatsapp || '';
            const cleanPhone = phone.replace(/\D/g, '');
            const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

            const payload = {
                summary: data.appointmentType || 'Consulta',
                description: `Paciente: ${data.patient.nome}\nTelefone: ${finalPhone}\nTipo: ${data.appointmentType || '-'}\nObs: ${data.observations || '-'}\nOrcamentoID: ${data.useBudget ? data.budgetId : '-'}`,
                start: { dateTime: startDate.toISOString() },
                end: { dateTime: endDate.toISOString() },
                calendarId: data.professional.calendarId || data.professional.id,
                cliente_id: finalPhone,
            };

            await onSave(payload);
            onClose();
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white relative animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* Header Navbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={step > 1 ? prevStep : onClose}
                            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                        >
                            <ChevronLeft size={20} />
                            {step > 1 ? 'Voltar' : 'Cancelar'}
                        </button>
                        <h2 className="text-2xl font-bold text-slate-800 hidden sm:block ml-4">Novo atendimento</h2>
                    </div>

                    {/* Progress indicator */}
                    <div className="hidden sm:flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div 
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : i < step ? 'w-4 bg-blue-200' : 'w-4 bg-slate-100'}`}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area - Horizontal Scroll / Flex */}
                <div className="flex-1 overflow-x-hidden flex relative bg-slate-50/50">
                    <div 
                        className="flex w-full h-full transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
                    >
                        {/* Passo 1 */}
                        <div className="w-full h-full shrink-0 p-6 overflow-y-auto custom-scrollbar">
                            <StepProfessional 
                                specialists={specialists} 
                                selected={data.professional} 
                                onSelect={(s) => { updateData({ professional: s }); nextStep(); }} 
                            />
                        </div>

                        {/* Passo 2 */}
                        <div className="w-full h-full shrink-0 p-6 overflow-y-auto custom-scrollbar">
                            <StepPatient 
                                selected={data.patient}
                                useBudget={data.useBudget}
                                onSelectPatient={(p) => updateData({ patient: p })}
                                onToggleBudget={(v) => updateData({ useBudget: v })}
                                onNext={() => {
                                    if (data.patient) nextStep();
                                    else alert('Selecione um paciente');
                                }}
                            />
                        </div>

                        {/* Passo 3 */}
                        <div className="w-full h-full shrink-0 p-6 overflow-y-auto custom-scrollbar">
                            <StepBudgetType 
                                useBudget={data.useBudget}
                                patientId={data.patient?.id}
                                selectedType={data.appointmentType}
                                selectedBudget={data.budgetId}
                                onSelectType={(t) => { updateData({ appointmentType: t }); nextStep(); }}
                                onSelectBudget={(bId) => { updateData({ budgetId: bId }); nextStep(); }}
                            />
                        </div>

                        {/* Passo 4 */}
                        <div className="w-full h-full shrink-0 p-6 overflow-y-auto custom-scrollbar">
                            <StepDateTime 
                                date={data.date}
                                time={data.time}
                                duration={data.duration}
                                professional={data.professional}
                                onChangeDate={(d) => updateData({ date: d })}
                                onChangeTime={(t) => updateData({ time: t })}
                                onChangeDuration={(d) => updateData({ duration: d })}
                                onNext={nextStep}
                            />
                        </div>

                        {/* Passo 5 */}
                        <div className="w-full h-full shrink-0 p-6 overflow-y-auto custom-scrollbar">
                            <StepConfirmation 
                                data={data}
                                loading={loading}
                                onChangeObservations={(o) => updateData({ observations: o })}
                                onChangeSendConfirmation={(v) => updateData({ sendConfirmation: v })}
                                onSave={handleSave}
                            />
                        </div>
                    </div>
                </div>

        </div>
    );
};
