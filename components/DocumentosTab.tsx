import React, { useState } from 'react';
import { Plus, X, Printer } from 'lucide-react';
import { ContratoModal } from './ContratoModal';

const DocumentIcon = ({ color }: { color: string }) => (
    <div className={`w-[60px] h-[72px] rounded-2xl ${color} p-1.5 flex justify-center pb-0 relative`}>
        <div className="w-full bg-white rounded-b-[10px] rounded-t-lg shadow-sm flex flex-col gap-1.5 p-2.5 items-start mt-2">
            <div className="w-6 h-2 bg-gray-300 rounded-sm mb-1" />
            <div className="w-full h-1 bg-gray-200 rounded-full" />
            <div className="w-full h-1 bg-gray-200 rounded-full" />
            <div className="w-3/4 h-1 bg-gray-200 rounded-full" />
            
            <div className="flex gap-1.5 w-full mt-auto mb-1">
                <div className="w-4 h-1.5 bg-blue-200 rounded-sm" />
                <div className="w-4 h-1.5 bg-blue-200 rounded-sm" />
            </div>
        </div>
    </div>
);

const CustomIcon = () => (
    <div className="w-[60px] h-[72px] rounded-2xl border-2 border-dashed border-[#2196f3] text-[#2196f3] flex items-center justify-center bg-transparent">
        <Plus size={28} strokeWidth={2.5} />
    </div>
);

const docs = [
    { title: 'Contrato', icon: <DocumentIcon color="bg-[#2e7d32]" /> },
    { title: 'Termo de Consentimento', icon: <DocumentIcon color="bg-[#fbc02d]" /> },
    { title: 'Receituário', icon: <DocumentIcon color="bg-[#2196f3]" /> },
    { title: 'Atestados', icon: <DocumentIcon color="bg-[#4caf50]" /> },
    { title: 'Personalizado', icon: <CustomIcon /> },
];

export const DocumentosTab = ({ patient, empresaId, budgets }: { patient: any, empresaId: number, budgets: any[] }) => {
    const [selectedDocType, setSelectedDocType] = useState<string | null>(null);

    return (
        <div className="p-8 h-full bg-gray-50/50 rounded-2xl animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {docs.map((doc, i) => (
                     <div key={i} className="bg-white border border-gray-200 rounded-[4px] p-6 flex flex-col items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
                         <div className="mt-4 mb-6">
                            {doc.icon}
                         </div>
                         
                         <h3 className="text-[14px] font-semibold text-gray-700 mb-6 text-center">{doc.title}</h3>
                         
                         <button 
                             onClick={() => setSelectedDocType(doc.title)}
                             className="w-full bg-[#2196f3] hover:bg-[#1976d2] text-white font-bold py-2.5 rounded text-[12px] transition-colors"
                         >
                             NOVO
                         </button>
                     </div>
                 ))}
             </div>

             {/* Contrato Modal Handler */}
             {selectedDocType === 'Contrato' && (
                 <ContratoModal patient={patient} budgets={budgets} onClose={() => setSelectedDocType(null)} />
             )}

             {/* Simple Document Editor Placeholder */ }
             {selectedDocType && selectedDocType !== 'Contrato' && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white text-gray-800 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold">Novo {selectedDocType}</h2>
                                <p className="text-sm text-gray-500">Paciente: {patient.name}</p>
                            </div>
                            <button onClick={() => setSelectedDocType(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Editor content */}
                        <div className="flex-1 p-6 bg-gray-50 flex flex-col gap-4 overflow-y-auto">
                            <label className="text-sm font-semibold text-gray-700">Conteúdo do Documento</label>
                            <textarea 
                                className="flex-1 w-full border border-gray-200 rounded-xl p-4 text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none shadow-sm"
                                placeholder="Digite o conteúdo aqui..."
                                defaultValue={
                                    selectedDocType === 'Receituário' 
                                      ? `NOME DO PACIENTE: ${patient.name}\nDATA: ${new Date().toLocaleDateString('pt-BR')}\n\nPrescrição:\n1. `
                                      : selectedDocType === 'Atestados'
                                      ? `Atesto para os devidos fins que o(a) sr(a) ${patient.name}, portador(a) do CPF ${patient.cpf}, esteve sob meus cuidados odontológicos na data de ${new Date().toLocaleDateString('pt-BR')}, das ___ às ___.`
                                      : `Título: ${selectedDocType}\nPaciente: ${patient.name}\nCPF: ${patient.cpf || 'Não informado'}\n\n`
                                }
                            />
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setSelectedDocType(null)} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button className="px-5 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl flex items-center gap-2 shadow-sm transition-colors">
                                <Printer size={16} /> Imprimir
                            </button>
                            <button className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors" onClick={() => {
                                alert('Documento salvo! (Simulação)');
                                setSelectedDocType(null);
                            }}>
                                Salvar Documento
                            </button>
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
}
