import React from 'react';
import { X, Calendar as CalendarIcon, Clock, User, Phone, FileText, Trash2, Edit2, MoreVertical, Mail } from 'lucide-react';
import { GoogleEvent } from '../services/googleCalendarService';

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: GoogleEvent | null;
    onEdit: (event: GoogleEvent) => void;
    onDelete: (event: GoogleEvent) => void;
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
    isOpen,
    onClose,
    event,
    onEdit,
    onDelete
}) => {
    if (!isOpen || !event) return null;

    const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date();
    const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date();

    // Helper to extract patient info from description if structured
    // Expected format in description:
    // Paciente: Name
    // Telefone: Number
    // Obs: Text
    const getField = (text: string | undefined, label: string) => {
        if (!text) return '';
        const lines = text.split('\n');
        const line = lines.find(l => l.startsWith(label));
        return line ? line.replace(label, '').trim() : '';
    };

    const patientName = getField(event.description, 'Paciente:') || 'Paciente não identificado';
    const patientPhone = getField(event.description, 'Telefone:') || '';
    const observations = getField(event.description, 'Obs:') || event.description || 'Sem observações';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header Actions */}
                <div className="flex items-center justify-end p-2 px-3 gap-1 border-b border-gray-100 bg-gray-50/50">
                    <button onClick={() => onEdit(event)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full hover:text-blue-600 transition-colors" title="Editar">
                        <Edit2 size={18} />
                    </button>
                    <button onClick={() => onDelete(event)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full hover:text-red-600 transition-colors" title="Excluir">
                        <Trash2 size={18} />
                    </button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Enviar Email">
                        <Mail size={18} />
                    </button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                        <MoreVertical size={18} />
                    </button>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full hover:text-gray-600 transition-colors ml-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 pt-4 space-y-6">
                    {/* Header Info */}
                    <div className="flex gap-4">
                        <div className="w-3 h-3 mt-2 rounded bg-green-500 shrink-0 shadow-sm"></div>
                        <div>
                            <h2 className="text-xl font-medium text-gray-900 leading-tight mb-1">{event.summary}</h2>
                            <p className="text-sm text-gray-500 flex flex-wrap gap-1">
                                {startDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                <span>⋅</span>
                                {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} – {endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    {/* Patient Details Section */}
                    <div className="space-y-4">

                        {/* Patient */}
                        <div className="flex gap-4 items-start">
                            <div className="w-5 flex justify-center mt-0.5 text-gray-400"><User size={18} /></div>
                            <div>
                                <p className="text-sm text-gray-900 font-medium">Paciente: {patientName}</p>
                                {patientPhone && <p className="text-sm text-gray-500">Telefone: {patientPhone}</p>}
                                <p className="text-sm text-gray-500 mt-1">Obs: {observations}</p>
                            </div>
                        </div>

                        {/* Calendar Source */}
                        <div className="flex gap-4 items-center">
                            <div className="w-5 flex justify-center text-gray-400"><CalendarIcon size={18} /></div>
                            <div>
                                <p className="text-sm text-gray-700">Agenda Principal</p>
                                <p className="text-xs text-gray-400">Criado via EvoliAgent</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
