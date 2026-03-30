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
    const [croProfissional, setCroProfissional] = useState('');
    const [ufProfissional, setUfProfissional] = useState('');
    const [dataEmissao, setDataEmissao] = useState(today);
    const [qtdDias, setQtdDias] = useState('');
    const [horaEntrada, setHoraEntrada] = useState('');
    const [horaSaida, setHoraSaida] = useState('');
    const [cidSearch, setCidSearch] = useState('');
    const [cidSelecionado, setCidSelecionado] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // CPF do paciente vindo do cadastro
    const patientCpf = patient?.cpf || '';

    // CID Autocomplete logic
    const [showCidSuggestions, setShowCidSuggestions] = useState(false);
    
    // Fill from existing data
    useEffect(() => {
        if (existingDocumentData?.conteudo) {
            const ctx = existingDocumentData.conteudo;
            if (ctx.tipoAtestado) setTipoAtestado(ctx.tipoAtestado);
            if (ctx.profissional) setProfissional(ctx.profissional);
            if (ctx.croProfissional) setCroProfissional(ctx.croProfissional);
            if (ctx.ufProfissional) setUfProfissional(ctx.ufProfissional);
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
        const cpfText = patientCpf ? patientCpf : '___________________';
        let cidText = cidSelecionado ? `\nCID-10: ${cidSelecionado}` : '';

        if (tipoAtestado === 'dias') {
            return `Atesto para os devidos fins que o(a) Sr(a) ${patient.name}, portador(a) do CPF ${cpfText}, foi submetido(a) a tratamento odontológico nesta data e necessita de ${qtdDias || '____'} dia(s) de repouso absoluto, a partir de ${dataEmissao}, por motivo de saúde.${cidText}`;
        } else {
            return `Atesto com o fim específico de dispensa de atividades, que ${patient.name}, portador(a) do CPF ${cpfText}, esteve sob meus cuidados profissionais, no período das ${horaEntrada || '___'} às ${horaSaida || '___'} horas, do dia ${dataEmissao}.${cidText}`;
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const documentContent = {
                tipoAtestado,
                profissional,
                croProfissional,
                ufProfissional,
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

        const croLine = croProfissional
            ? `CRO-${ufProfissional || 'UF'} nº ${croProfissional}`
            : 'CRO/UF: _______________';

        const dataPartes = dataEmissao.split('/');
        const diaPrint = dataPartes[0] || '__';
        const mesPrint = dataPartes[1] || '__';
        const anoPrint = dataPartes[2] || '____';

        const cidLine = cidSelecionado
            ? `<div class="cid-block"><strong>CID-10:</strong> ${cidSelecionado}</div>`
            : '';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Atestado Odontológico - ${patient.name}</title>
                <style>
                    @page { size: A4; margin: 25mm 20mm 20mm 20mm; }
                    * { box-sizing: border-box; }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 12pt;
                        color: #000;
                        margin: 0;
                        padding: 0;
                        line-height: 1.6;
                    }
                    .page {
                        max-width: 170mm;
                        margin: 0 auto;
                        min-height: 240mm;
                        display: flex;
                        flex-direction: column;
                    }
                    /* Cabeçalho do profissional */
                    .cabecalho-profissional {
                        text-align: right;
                        margin-bottom: 8px;
                        font-size: 10pt;
                        line-height: 1.5;
                    }
                    .cabecalho-profissional .nome-prof {
                        font-weight: bold;
                        font-size: 11pt;
                    }
                    .cabecalho-profissional .cro-prof {
                        font-weight: bold;
                    }
                    /* Título principal */
                    .titulo-principal {
                        text-align: center;
                        font-size: 15pt;
                        font-weight: bold;
                        color: #003399;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin: 10px 0 2px 0;
                    }
                    .subtitulo {
                        text-align: center;
                        font-size: 8pt;
                        color: #333;
                        margin-bottom: 10px;
                    }
                    
                    /* Divisor */
                    hr.divisor { border: none; border-top: 1.5px solid #003399; margin: 8px 0; }
                    
                    /* Informações do prontuário */
                    .info-prontuario {
                        display: flex;
                        justify-content: space-between;
                        font-size: 10pt;
                        margin: 6px 0 4px 0;
                        gap: 20px;
                    }
                    .info-prontuario .numero-bloco {
                        text-align: right;
                        font-size: 10pt;
                    }
                    .info-prontuario .vias {
                        font-size: 9pt;
                        line-height: 1.4;
                        text-align: right;
                        color: #333;
                    }
                    
                    /* Corpo */
                    .corpo {
                        flex: 1;
                        font-size: 11pt;
                        line-height: 2.0;
                        text-align: justify;
                        margin-top: 18px;
                    }
                    
                    /* Linha de dados */
                    .linha {
                        display: block;
                        border-bottom: 1px solid #000;
                        min-width: 80px;
                        display: inline-block;
                        margin: 0 3px;
                    }
                    
                    /* Texto gerado */
                    .texto-atestado {
                        text-align: justify;
                        line-height: 2.0;
                        font-size: 11pt;
                        margin-top: 14px;
                    }
                    
                    .cid-block {
                        margin-top: 14px;
                        font-size: 10pt;
                    }
                    
                    /* Data e local */
                    .data-local {
                        margin-top: 30px;
                        font-size: 10pt;
                        text-align: right;
                    }
                    
                    /* Assinatura */
                    .assinatura {
                        margin-top: 60px;
                        text-align: center;
                    }
                    .linha-assinatura {
                        width: 260px;
                        border-top: 1px solid #000;
                        margin: 0 auto 6px auto;
                    }
                    .assinatura-nome {
                        font-weight: bold;
                        font-size: 11pt;
                    }
                    .assinatura-cro {
                        font-size: 9pt;
                        color: #333;
                        margin-top: 2px;
                    }
                    .assinatura-obs {
                        font-size: 8pt;
                        color: #555;
                        font-style: italic;
                        margin-top: 2px;
                    }

                    /* Rodapé */
                    .rodape {
                        margin-top: auto;
                        padding-top: 20px;
                        text-align: center;
                        font-size: 8.5pt;
                        color: #555;
                        border-top: 1px solid #ccc;
                    }
                </style>
            </head>
            <body>
            <div class="page">
                <!-- Cabeçalho do profissional -->
                <div class="cabecalho-profissional">
                    <div class="nome-prof">${profissional || 'Nome do Profissional Cirurgião Dentista'}</div>
                    <div class="cro-prof">${croLine}</div>
                </div>
                
                <!-- Título -->
                <div class="titulo-principal">Atestado Odontológico</div>
                <div class="subtitulo">(Regulamentado pelas Leis nº 5.081, de 24/08/66 e nº 6.215, de 30/06/75)</div>
                
                <hr class="divisor"/>
                
                <!-- Prontuário/Nº -->
                <div class="info-prontuario">
                    <div>
                        <strong>Prontuário nº</strong> <span class="linha" style="min-width:80px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                        &nbsp;&nbsp;&nbsp;
                        <strong>Nº</strong> <span class="linha" style="min-width:60px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    </div>
                    <div class="vias">
                        1ª via – Paciente<br/>
                        2ª via – Profissional
                    </div>
                </div>
                
                <hr class="divisor"/>

                <!-- Corpo do atestado -->
                <div class="corpo">
                    <p class="texto-atestado">
                        ${tipoAtestado === 'dias'
                            ? `Atesto para os devidos fins que o(a) Sr(a) <strong>${patient.name}</strong>, portador(a) do CPF <strong>${patientCpf || '___________________'}</strong>, foi submetido(a) a tratamento odontológico nesta data e necessita de <strong>${qtdDias || '____'}</strong> dia(s) de repouso absoluto, a partir de ${dataEmissao}, por motivo de saúde.`
                            : `Atesto com o fim específico de dispensa de atividades, que <strong>${patient.name}</strong>, portador(a) do CPF <strong>${patientCpf || '___________________'}</strong>, esteve sob meus cuidados profissionais, no período das <strong>${horaEntrada || '___'}</strong> às <strong>${horaSaida || '___'}</strong> horas, do dia ${dataEmissao}.`
                        }
                    </p>
                    ${cidLine}
                </div>

                <!-- Data e Local -->
                <div class="data-local">
                    __________________, ${diaPrint} de ${new Date().toLocaleString('pt-BR', {month: 'long'})} de ${anoPrint}.
                </div>

                <!-- Assinatura -->
                <div class="assinatura">
                    <div class="linha-assinatura"></div>
                    <div class="assinatura-nome">${profissional || 'Assinatura do Profissional'}</div>
                    <div class="assinatura-cro">${croLine}</div>
                    <div class="assinatura-obs">(Carimbo contendo nome do CD e CRO)</div>
                </div>

                <!-- Rodapé -->
                <div class="rodape">
                    Endereço e telefone do consultório
                </div>
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
                            <h2 className="text-lg font-semibold text-gray-800">Emitir Atestado Odontológico</h2>
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
                    
                    {/* Tipo de Atestado */}
                    <div className="flex items-center gap-6 mb-5">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                            <input 
                                type="radio" 
                                name="tipoAtestado" 
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                                checked={tipoAtestado === 'dias'}
                                onChange={() => setTipoAtestado('dias')}
                            />
                            Atestado de Repouso (dias)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                            <input 
                                type="radio" 
                                name="tipoAtestado" 
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                                checked={tipoAtestado === 'comparecimento'}
                                onChange={() => setTipoAtestado('comparecimento')}
                            />
                            Atestado de Comparecimento
                        </label>
                    </div>

                    {/* Profissional e Paciente */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-[13px] font-semibold text-gray-600">Nome do Profissional (Dentista)</label>
                            <input 
                                type="text"
                                placeholder="Dr(a). Nome do Dentista"
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

                    {/* CRO e CPF do Paciente */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-semibold text-gray-600">CRO nº</label>
                            <input 
                                type="text"
                                placeholder="Número do CRO"
                                value={croProfissional}
                                onChange={e => setCroProfissional(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-semibold text-gray-600">UF (Estado)</label>
                            <input 
                                type="text"
                                placeholder="Ex: SP, RO, MG..."
                                value={ufProfissional}
                                onChange={e => setUfProfissional(e.target.value.toUpperCase().slice(0, 2))}
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full"
                                maxLength={2}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 opacity-80 pointer-events-none">
                            <label className="text-[13px] font-semibold text-gray-600">CPF do Paciente</label>
                            <input 
                                type="text" 
                                value={patientCpf || 'Não informado no cadastro'}
                                readOnly
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none bg-gray-100 w-full"
                            />
                        </div>
                    </div>

                    {/* Data e CID */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-semibold text-gray-600">* Data de Emissão</label>
                            <input 
                                type="text" 
                                value={dataEmissao}
                                onChange={e => setDataEmissao(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-[13px] font-semibold text-gray-600">CID-10 (opcional)</label>
                            <input 
                                type="text" 
                                placeholder="Digite o código ou descrição"
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

                    {/* Campos condicionais */}
                    <div className="grid grid-cols-2 gap-4 mb-5 animate-in slide-in-from-top-2 duration-300">
                        {tipoAtestado === 'dias' ? (
                            <div className="flex flex-col gap-1.5 col-span-1">
                                <label className="text-[13px] font-semibold text-gray-600">* Quantidade de dias de repouso</label>
                                <input 
                                    type="number" 
                                    placeholder="Ex: 2"
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

                    {/* Aviso se CPF não encontrado */}
                    {!patientCpf && (
                        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[13px]">
                            ⚠️ O CPF do paciente não está cadastrado. Acesse o cadastro do paciente para adicioná-lo.
                        </div>
                    )}

                    {/* Preview Area */}
                    <div className="mt-2 p-4 rounded-lg bg-blue-50 border border-blue-100 flex flex-col gap-3">
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
