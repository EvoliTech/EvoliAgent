import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, FileText, Check } from 'lucide-react';
import { documentoService, DocumentoData } from '../services/documentoService';

export interface AtestadoModalProps {
    patient: any;
    empresaId: number;
    existingDocumentData?: DocumentoData | null;
    onClose: () => void;
    onSaved?: () => void;
}

const CID_LIST = [
    { code: 'K02.0', description: 'Cárie limitada ao esmalte.' },
    { code: 'K02.1', description: 'Cárie da dentina.' },
    { code: 'K02.2', description: 'Cárie do cemento.' },
    { code: 'K03.0', description: 'Atrição dentária excessiva (desgaste).' },
    { code: 'K03.1', description: 'Abrasão dentária.' },
    { code: 'K03.2', description: 'Erosão dentária.' },
    { code: 'K03.6', description: 'Depósitos (acréscimos) nos dentes (tártaro/placa).' },
    { code: 'K08.1', description: 'Perda de dentes devido a acidente, extração ou doença periodontal.' },
    { code: 'K04.0', description: 'Pulpite (reversível ou irreversível).' },
    { code: 'K04.1', description: 'Necrose da polpa.' },
    { code: 'K04.4', description: 'Periodontite apical aguda de origem pulpar.' },
    { code: 'K04.5', description: 'Periodontite apical crônica (granuloma apical).' },
    { code: 'K04.7', description: 'Abscesso periapical sem fístula.' },
    { code: 'K05.0', description: 'Gengivite aguda.' },
    { code: 'K05.1', description: 'Gengivite crônica.' },
    { code: 'K05.2', description: 'Periodontite aguda.' },
    { code: 'K05.3', description: 'Periodontite crônica.' },
    { code: 'K07.0', description: 'Anomalias de tamanho dos maxilares (macrognatismo/micrognatismo).' },
    { code: 'K07.2', description: 'Anomalias da relação entre as arcadas dentárias.' },
    { code: 'K07.6', description: 'Transtornos da articulação temporomandibular (ATM).' },
    { code: 'L71.9', description: 'Rosácea, não especificada.' },
    { code: 'L81.1', description: 'Melasma (Chloasma).' },
    { code: 'L90.0', description: 'Liquen escleroso e atrófico.' },
    { code: 'L90.9', description: 'Afecção atrófica da pele, não especificada.' },
    { code: 'R60.0', description: 'Edema localizado.' },
    { code: 'M79.1', description: 'Mialgia.' },
    { code: 'G24.5', description: 'Blefaroespasmo.' }
];

export const AtestadoModal: React.FC<AtestadoModalProps> = ({ patient, empresaId, existingDocumentData, onClose, onSaved }) => {
    const today = new Date().toLocaleDateString('pt-BR');
    
    // Initial states
    const [tipoAtestado, setTipoAtestado] = useState<'dias' | 'comparecimento'>('dias');
    const [profissional, setProfissional] = useState('');
    const [dataEmissao, setDataEmissao] = useState(today);
    const [qtdDias, setQtdDias] = useState('');
    const [horaEntrada, setHoraEntrada] = useState('');
    const [horaSaida, setHoraSaida] = useState('');
    const [cidSearch, setCidSearch] = useState('');
    const [cidSelecionado, setCidSelecionado] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // CID Autocomplete logic
    const [showCidSuggestions, setShowCidSuggestions] = useState(false);
    
    // Fill from existing data
    useEffect(() => {
        if (existingDocumentData?.conteudo) {
            const ctx = existingDocumentData.conteudo;
            if (ctx.tipoAtestado) setTipoAtestado(ctx.tipoAtestado);
            if (ctx.profissional) setProfissional(ctx.profissional);
            if (ctx.dataEmissao) setDataEmissao(ctx.dataEmissao);
            if (ctx.qtdDias) setQtdDias(ctx.qtdDias);
            if (ctx.horaEntrada) setHoraEntrada(ctx.horaEntrada);
            if (ctx.horaSaida) setHoraSaida(ctx.horaSaida);
            if (ctx.cidSelecionado) {
                setCidSelecionado(ctx.cidSelecionado);
                setCidSearch(ctx.cidSelecionado);
            }
        }
    }, [existingDocumentData]);

    const handleCidSelect = (cid: string) => {
        setCidSearch(cid);
        setCidSelecionado(cid);
        setShowCidSuggestions(false);
    };

    const filteredCids = CID_LIST.filter(c => 
        c.code.toLowerCase().includes(cidSearch.toLowerCase()) || 
        c.description.toLowerCase().includes(cidSearch.toLowerCase())
    );

    // Document Text Generation
    const generateAtestadoText = () => {
        const cpfText = patient.cpf ? patient.cpf : '___________________';
        let cidText = cidSelecionado ? `\nCID: ${cidSelecionado}` : '';

        if (tipoAtestado === 'dias') {
            return `Atesto para os devidos fins que o(a) Sr(a) ${patient.name}, inscrito(a) sob o CPF ${cpfText}, foi submetido(a) a tratamento odontológico/médico nesta data e necessita de ${qtdDias || '____'} dias de repouso absoluto, a partir de ${dataEmissao}, por motivo de saúde.${cidText}`;
        } else {
            return `Atesto com o fim específico de dispensa de atividades trabalhistas (ou escolares, ou judiciárias), que ${patient.name}, portador(a) do CPF ${cpfText} esteve sob meus cuidados profissionais no dia ${dataEmissao} das ${horaEntrada || '___'} às ${horaSaida || '___'} horas.${cidText}`;
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const documentContent = {
                tipoAtestado,
                profissional,
                dataEmissao,
                qtdDias,
                horaEntrada,
                horaSaida,
                cidSearch,
                cidSelecionado,
                textoGerado: generateAtestadoText()
            };

            const docData: DocumentoData = {
                id: existingDocumentData?.id,
                patient_id: patient.id,
                IDEmpresa: empresaId,
                tipo: 'Atestado',
                conteudo: documentContent,
                created_at: existingDocumentData?.created_at || new Date().toISOString()
            };
            
            await documentoService.saveDocumento(docData);

            if (onSaved) onSaved();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar Atestado:', error);
            alert('Não foi possível salvar o atestado. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const textContent = generateAtestadoText();

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Atestado - ${patient.name}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 40px;
                        margin: 0;
                        color: #333;
                        display: flex;
                        flex-direction: column;
                        min-height: 100vh;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 50px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                    }
                    .title {
                        font-size: 24px;
                        font-weight: bold;
                        text-transform: uppercase;
                        margin: 0;
                        letter-spacing: 2px;
                    }
                    .content {
                        flex: 1;
                        font-size: 16px;
                        line-height: 2;
                        text-align: justify;
                        margin-top: 40px;
                    }
                    .signature-area {
                        margin-top: 100px;
                        text-align: center;
                    }
                    .signature-line {
                        width: 300px;
                        border-top: 1px solid #333;
                        margin: 0 auto 10px auto;
                    }
                    .professional-name {
                        font-weight: bold;
                    }
                    .date-location {
                        text-align: right;
                        margin-top: 60px;
                        margin-bottom: 20px;
                        font-style: italic;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="title">${tipoAtestado === 'dias' ? 'Atestado Médico / Odontológico' : 'Atestado de Comparecimento'}</h1>
                </div>
                
                <div class="content">
                    ${textContent.replace(/\n/g, '<br/>')}
                </div>

                <div class="date-location">
                    Local, ${dataEmissao}
                </div>

                <div class="signature-area">
                    <div class="signature-line"></div>
                    <div class="professional-name">${profissional || 'Assinatura do Profissional'}</div>
                    <div style="font-size: 14px; color: #666; margin-top: 5px;">Carimbo e Registro (CRM/CRO)</div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Emitir atestado</h2>
                            <p className="text-xs text-gray-500">
                                {tipoAtestado === 'dias' ? 'Atestado de Repouso' : 'Atestado de Comparecimento'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={handlePrint}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-2"
                            title="Imprimir"
                        >
                            <Printer className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={onClose} 
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 bg-gray-50 flex-1 overflow-y-auto w-full custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-[13px] font-semibold text-gray-600">Profissional</label>
                            <input 
                                type="text"
                                placeholder="Nome do profissional"
                                value={profissional}
                                onChange={e => setProfissional(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full"
                            />
                        </div>
                         <div className="flex flex-col gap-1.5 flex-1 opacity-80 pointer-events-none">
                            <label className="text-[13px] font-semibold text-gray-600">Paciente</label>
                            <input 
                                type="text" 
                                value={patient.name}
                                readOnly
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none bg-gray-100 w-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 mb-6">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                            <input 
                                type="radio" 
                                name="tipoAtestado" 
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                                checked={tipoAtestado === 'dias'}
                                onChange={() => setTipoAtestado('dias')}
                            />
                            Atestado para dias
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                            <input 
                                type="radio" 
                                name="tipoAtestado" 
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                                checked={tipoAtestado === 'comparecimento'}
                                onChange={() => setTipoAtestado('comparecimento')}
                            />
                            Atestado de comparecimento
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-semibold text-gray-600">* Data</label>
                            <input 
                                type="text" 
                                value={dataEmissao}
                                onChange={e => setDataEmissao(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-[13px] font-semibold text-gray-600">CID - Classificação Internacional de Doenças</label>
                            <input 
                                type="text" 
                                placeholder="Digite o CID ou descrição"
                                value={cidSearch}
                                onChange={e => setCidSearch(e.target.value)}
                                onFocus={() => setShowCidSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowCidSuggestions(false), 200)}
                                className="border border-blue-300 ring-1 ring-blue-100 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-blue-200 transition-all w-full"
                            />
                            {showCidSuggestions && filteredCids.length > 0 && (
                                <div className="absolute top-[100%] left-0 w-full bg-white border border-gray-200 shadow-lg rounded-md mt-1 z-50 max-h-[180px] overflow-y-auto custom-scrollbar">
                                    {filteredCids.map((cidItem, idx) => (
                                        <div 
                                            key={idx}
                                            className="px-3 py-2 text-[13px] text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            onClick={() => handleCidSelect(`${cidItem.code} - ${cidItem.description}`)}
                                        >
                                            <strong>{cidItem.code}</strong> - {cidItem.description}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 animate-in slide-in-from-top-2 duration-300">
                        {tipoAtestado === 'dias' ? (
                            <div className="flex flex-col gap-1.5 col-span-1">
                                <label className="text-[13px] font-semibold text-gray-600">* Quantidade de dias</label>
                                <input 
                                    type="number" 
                                    placeholder="Digite a quantidade"
                                    value={qtdDias}
                                    onChange={e => setQtdDias(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[13px] font-semibold text-gray-600">* Hora de entrada</label>
                                    <input 
                                        type="time" 
                                        value={horaEntrada}
                                        onChange={e => setHoraEntrada(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[13px] font-semibold text-gray-600">* Hora de saída</label>
                                    <input 
                                        type="time" 
                                        value={horaSaida}
                                        onChange={e => setHoraSaida(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Preview Area */}
                    <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100 flex flex-col gap-3">
                        <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                             Pré-visualização do Documento
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed text-justify">
                            {generateAtestadoText()}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Atestado'}
                    </button>
                </div>
            </div>
        </div>
    );
};
