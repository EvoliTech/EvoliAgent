import React, { useState, useEffect } from 'react';
import { X, Printer, Trash2, FileText } from 'lucide-react';
import { documentoService, DocumentoData } from '../services/documentoService';
import { medicamentoService, MedicamentoSugestao } from '../services/medicamentoService';

export interface ReceituarioModalProps {
    patient: any;
    empresaId: number;
    existingDocumentData?: DocumentoData | null;
    onClose: () => void;
    onSaved?: () => void;
}

interface Medicamento {
    nome: string;
    quantidade: string;
    medida: string;
    posologia: string;
}

export const ReceituarioModal: React.FC<ReceituarioModalProps> = ({ patient, empresaId, existingDocumentData, onClose, onSaved }) => {
    
    // Extract default values or existing content
    const existingContent = existingDocumentData?.conteudo || {};
    
    const [dataEmissao, setDataEmissao] = useState(
        existingContent.dataEmissao || new Date().toLocaleDateString('pt-BR')
    );
    const [profissional, setProfissional] = useState(
        existingContent.profissional || ''
    );
    const [medicamentos, setMedicamentos] = useState<Medicamento[]>(
        existingContent.medicamentos || []
    );

    // Form inputs for current medicine
    const [medNome, setMedNome] = useState('');
    const [medQtde, setMedQtde] = useState('');
    const [medMedida, setMedMedida] = useState('');
    const [medPosologia, setMedPosologia] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [medicamentosSugeridos, setMedicamentosSugeridos] = useState<MedicamentoSugestao[]>([]);

    useEffect(() => {
        const fetchMedicamentos = async () => {
            const result = await medicamentoService.getMedicamentos(empresaId);
            setMedicamentosSugeridos(result);
        };
        fetchMedicamentos();
    }, [empresaId]);

    const handleMedNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMedNome(e.target.value);
        setShowSuggestions(true);
    };

    const handleSelectSuggestion = (match: any) => {
        setMedNome(match.nome);
        setMedPosologia(match.posologia);
        if (match.medida) setMedMedida(match.medida);
        if (!medQtde) setMedQtde('1');
        setShowSuggestions(false);
    };

    const filteredSuggestions = medicamentosSugeridos.filter(m => 
        m.nome.toLowerCase().includes(medNome.toLowerCase())
    );

    const handleAddMedicine = () => {
        if (!medNome || !medQtde || !medMedida || !medPosologia) {
            alert('Por favor, preencha todos os campos do medicamento antes de adicionar.');
            return;
        }

        setMedicamentos(prev => [...prev, {
            nome: medNome,
            quantidade: medQtde,
            medida: medMedida,
            posologia: medPosologia
        }]);

        // Reset form
        setMedNome('');
        setMedQtde('');
        setMedMedida('');
        setMedPosologia('');
    };

    const handleRemoveMedicine = (index: number) => {
        setMedicamentos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!profissional) {
            alert('Por favor, informe o profissional responsável.');
            return;
        }

        setIsSaving(true);
        try {
            await documentoService.saveDocumento({
                id: existingDocumentData?.id,
                IDEmpresa: empresaId,
                patient_id: patient.id,
                tipo: 'Receituário',
                conteudo: {
                    dataEmissao,
                    profissional,
                    medicamentos
                }
            });
            if (onSaved) onSaved();
            else onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar o receituário. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita pop-ups no seu navegador para imprimir.');
            return;
        }

        const medicamentosHtml = medicamentos.map((med, index) => `
            <div class="med-item">
                <div class="med-header">
                    <strong>${index + 1}. ${med.nome}</strong> 
                    <span>.................................... ${med.quantidade} ${med.medida}</span>
                </div>
                <div class="med-posologia">
                    Uso: ${med.posologia.replace(/\n/g, '<br/>')}
                </div>
            </div>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Receituário - ${patient.name}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 40px;
                            color: #000;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 50px;
                            border-bottom: 2px solid #000;
                            padding-bottom: 20px;
                        }
                        h1 {
                            font-size: 24px;
                            margin: 0 0 10px 0;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                        }
                        .patient-info {
                            margin-bottom: 40px;
                            font-size: 16px;
                        }
                        .meds-list {
                            margin-bottom: 60px;
                        }
                        .med-item {
                            margin-bottom: 25px;
                        }
                        .med-header {
                            font-size: 16px;
                            margin-bottom: 5px;
                            display: flex;
                            justify-content: space-between;
                        }
                        .med-posologia {
                            font-size: 14px;
                            padding-left: 20px;
                            color: #333;
                        }
                        .footer {
                            margin-top: 80px;
                            text-align: center;
                        }
                        .signature-line {
                            width: 300px;
                            border-top: 1px solid #000;
                            margin: 0 auto 10px auto;
                        }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Receituário</h1>
                    </div>
                    
                    <div class="patient-info">
                        <p><strong>Para:</strong> ${patient.name}</p>
                    </div>

                    <div class="meds-list">
                        ${medicamentosHtml || '<p><em>Nenhum medicamento prescrito.</em></p>'}
                    </div>

                    <div class="footer">
                        <p style="text-align: right; margin-bottom: 50px;">Data: ${dataEmissao}</p>
                        <div class="signature-line"></div>
                        <strong>${profissional || 'Profissional Responsável'}</strong><br/>
                        Cirurgião-Dentista
                    </div>

                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.onafterprint = function() { window.close(); };
                            }, 300);
                        };
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] flex flex-col overflow-hidden animate-in zoom-in-95 max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
                    <h2 className="text-[19px] font-semibold text-gray-800">
                        {existingDocumentData ? 'Editar receita' : 'Emitir receita'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    
                    {/* Top Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-semibold text-gray-600">Data da emissão:</label>
                            <input 
                                type="text" 
                                value={dataEmissao}
                                onChange={e => setDataEmissao(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-semibold text-gray-600">Profissional responsável</label>
                            <input 
                                type="text" 
                                value={profissional}
                                onChange={e => setProfissional(e.target.value)}
                                placeholder="Nome do dentista"
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-semibold text-gray-600">Paciente</label>
                            <input 
                                type="text" 
                                value={patient.name}
                                disabled
                                className="border border-gray-200 bg-gray-50 text-gray-500 rounded-md px-3 py-2 text-[14px] outline-none cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Add Medicine Card */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex flex-col gap-1.5 flex-1 relative">
                                <label className="text-[13px] font-semibold text-gray-600">Nome</label>
                                <input 
                                    type="text" 
                                    placeholder="Digite o nome do medicamento"
                                    value={medNome}
                                    onChange={handleMedNomeChange}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="border border-blue-300 ring-1 ring-blue-100 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-blue-200 transition-all placeholder:text-gray-400"
                                />
                                {showSuggestions && filteredSuggestions.length > 0 && (
                                    <div className="absolute top-[100%] left-0 w-full bg-white border border-gray-200 shadow-lg rounded-md mt-1 z-50 max-h-[150px] overflow-y-auto custom-scrollbar">
                                        {filteredSuggestions.map((m, idx) => (
                                            <div 
                                                key={idx}
                                                className="px-3 py-2 text-[13px] text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                onClick={() => handleSelectSuggestion(m)}
                                            >
                                                {m.nome}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <div className="flex flex-col gap-1.5 w-[100px]">
                                    <label className="text-[13px] font-semibold text-gray-600">Quantidade</label>
                                    <input 
                                        type="number" 
                                        value={medQtde}
                                        onChange={e => setMedQtde(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5 w-[140px]">
                                    <label className="text-[13px] font-semibold text-gray-600">Medida</label>
                                    <div className="relative">
                                        <select 
                                            value={medMedida}
                                            onChange={e => setMedMedida(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 appearance-none bg-white transition-colors cursor-pointer"
                                        >
                                            <option value="" disabled>Selecione</option>
                                            <option value="Ampola(s)">Ampola(s)</option>
                                            <option value="Caixa(s)">Caixa(s)</option>
                                            <option value="Comprimido(s)">Comprimido(s)</option>
                                            <option value="Frasco(s)">Frasco(s)</option>
                                            <option value="Pacote(s)">Pacote(s)</option>
                                            <option value="Tubo(s)">Tubo(s)</option>
                                            <option value="Cápsula(s)">Cápsula(s)</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-semibold text-gray-600">Posologia</label>
                            <textarea 
                                value={medPosologia}
                                onChange={e => setMedPosologia(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 transition-colors min-h-[80px] resize-none"
                            />
                        </div>

                        <div className="flex justify-end mt-1">
                            <button 
                                onClick={handleAddMedicine}
                                className="bg-[#1565c0] hover:bg-[#0d47a1] text-white font-semibold py-2 px-5 rounded-md text-[14px] transition-colors shadow-sm"
                            >
                                Adicionar à receita
                            </button>
                        </div>
                    </div>

                    {/* Added Medicines List */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[15px] font-bold text-gray-800">Medicamentos adicionados ({medicamentos.length})</h3>
                        
                        {medicamentos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                                    <FileText size={24} className="text-blue-300" />
                                </div>
                                <p className="text-sm">Nenhum medicamento adicionado ainda.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {medicamentos.map((med, index) => (
                                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-start group">
                                        <div className="flex flex-col gap-1">
                                            <div className="font-bold text-gray-800 text-[14px]">
                                                {med.nome} <span className="text-gray-500 font-normal">({med.quantidade} {med.medida})</span>
                                            </div>
                                            <div className="text-[13px] text-gray-600 mt-1 whitespace-pre-wrap">
                                                <span className="font-semibold">Uso:</span> {med.posologia}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveMedicine(index)}
                                            className="text-gray-400 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-red-50"
                                            title="Remover"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-xl">
                    <button onClick={onClose} className="px-5 py-2 text-[14px] font-semibold text-gray-600 hover:bg-gray-200 rounded transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="px-5 py-2 text-[14px] font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Printer size={16} /> Imprimir
                    </button>
                    <button 
                        disabled={isSaving || medicamentos.length === 0}
                        onClick={handleSave}
                        className="px-6 py-2 text-[14px] font-bold text-white bg-[#4caf50] hover:bg-[#43a047] disabled:bg-gray-400 disabled:cursor-not-allowed rounded shadow-sm transition-colors"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Receita'}
                    </button>
                </div>

            </div>
        </div>
    );
};
