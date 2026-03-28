import React, { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { documentoService, DocumentoData } from '../services/documentoService';

export interface TermoConsentimentoModalProps {
    patient: any;
    empresaId: number;
    existingDocumentData?: DocumentoData | null;
    onClose: () => void;
    onSaved?: () => void;
}

export const TermoConsentimentoModal: React.FC<TermoConsentimentoModalProps> = ({ patient, empresaId, existingDocumentData, onClose, onSaved }) => {
    
    // Helper para montar endereco completo
    const getEnderecoCompleto = () => {
        const partes = [];
        if (patient?.enderecoRua) partes.push(patient.enderecoRua);
        if (patient?.enderecoNumero) partes.push(patient.enderecoNumero);
        if (patient?.enderecoBairro) partes.push(patient.enderecoBairro);
        if (patient?.enderecoCidade) partes.push(patient.enderecoCidade);
        if (patient?.enderecoEstado) partes.push(patient.enderecoEstado);
        return partes.join(', ');
    };

    const [formData, setFormData] = useState({
        nomePaciente: patient?.name || '',
        nomeResponsavelMenor: '',
        cpf: patient?.cpf || '',
        enderecoCompleto: getEnderecoCompleto() || '',
        nomeEspecialista: '',
        croEspecialista: '',
        periodoTratamento: '',
        condicoesSaude: '',
        cuidados: '',
        riscos: '',
        cidadeContratada: patient?.enderecoCidade || ''
    });
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (existingDocumentData && existingDocumentData.conteudo) {
            setFormData(existingDocumentData.conteudo);
        }
    }, [existingDocumentData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isComplete = () => {
        return formData.nomePaciente && 
               formData.cpf && 
               formData.enderecoCompleto && 
               formData.nomeEspecialista && 
               formData.croEspecialista && 
               formData.periodoTratamento &&
               formData.condicoesSaude &&
               formData.cuidados &&
               formData.riscos &&
               formData.cidadeContratada;
    };

    const renderHighlight = (value: string, placeholder: string) => {
        if (!value || value.trim() === '') {
            return <span className="bg-[#ef5350] text-white px-1.5 py-0.5 rounded text-[13px] font-medium leading-tight inline-block my-0.5 shadow-sm">{placeholder}</span>;
        }
        return <span className="bg-[#fbbf24] text-amber-900 px-1.5 py-0.5 rounded text-[13px] font-medium leading-tight inline-block my-0.5 shadow-sm whitespace-pre-wrap">{value}</span>;
    };

    const getFormattedDate = () => {
        const date = new Date();
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    };

    const handleSave = async () => {
        if (!isComplete()) return;
        setIsSaving(true);
        try {
            await documentoService.saveDocumento({
                id: existingDocumentData?.id,
                IDEmpresa: empresaId,
                patient_id: patient.id,
                tipo: 'Termo de Consentimento',
                conteudo: formData
            });
            if (onSaved) onSaved();
            else onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar documento. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('termo-print-area');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita pop-ups no seu navegador para imprimir.');
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Impressão Termo de Consentimento - ${patient.name}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 30px;
                            color: #000;
                            font-size: 14px;
                        }
                        .print-container {
                            max-width: 100%;
                            margin: 0 auto;
                        }
                        h1 {
                            text-align: center;
                            font-size: 16px;
                            margin-bottom: 25px;
                            font-weight: bold;
                        }
                        p {
                            margin-bottom: 12px;
                            text-align: justify;
                        }
                        .highlight {
                            font-weight: bold;
                        }
                        .flex-center {
                            text-align: center;
                            margin: 40px 0;
                        }
                        .signatures {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin-top: 60px;
                        }
                        .signature-block {
                            text-align: center;
                            width: 350px;
                        }
                        .signature-line {
                            border-top: 1px solid #000;
                            padding-top: 5px;
                            font-size: 13px;
                        }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        ${printContent.innerHTML
                            // Convert valid amber spans into bold text
                            .replace(/<span class="bg-\[#fbbf24\][^>]*>(.*?)<\/span>/g, '<span class="highlight">$1</span>')
                            // Convert empty red spans into blank lines
                            .replace(/<span class="bg-\[#ef5350\][^>]*>(.*?)<\/span>/g, '<span class="highlight">_______________________</span>')
                            // Fix layout formatting
                            .replace(/<div class="flex justify-center mb-16">/g, '<div class="flex-center">')
                            .replace(/<div class="flex flex-col gap-12 max-w-sm mx-auto">/g, '<div class="signatures">')
                            .replace(/<div class="text-center">/g, '<div class="signature-block">')
                            .replace(/<div class="border-t border-black pt-2 text-\[13px\]">/g, '<div class="signature-line">')
                        }
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
            <div className="bg-[#f0f2f5] rounded-xl shadow-2xl w-full max-w-[1300px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                
                {/* Header */}
                <div className="bg-white px-6 py-4 flex items-center justify-between shadow-sm shrink-0 z-10 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="text-amber-600 font-bold text-[15px]">{existingDocumentData ? 'Visualizando/Editando Termo' : 'Novo Termo de Consentimento'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-wide disabled:opacity-50">
                            Fechar
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded shadow-sm transition-colors uppercase tracking-wide flex items-center gap-2"
                        >
                            <Printer size={16} /> Imprimir
                        </button>
                        <button 
                            disabled={!isComplete() || isSaving}
                            onClick={handleSave}
                            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded shadow-sm transition-colors uppercase tracking-wide flex items-center gap-2"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Termo'}
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Form Sidebar */}
                    <div className="w-[340px] bg-white border-r border-gray-200 overflow-y-auto shrink-0 custom-scrollbar pb-10">
                        <div className="p-5 flex flex-col gap-6">
                            
                            {/* Section Paciente */}
                            <div className="flex flex-col gap-4">
                                <h3 className="font-bold text-[15px] text-amber-600 flex items-center gap-1.5 pt-2">
                                    Dados do Paciente
                                </h3>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Nome do Paciente*</label>
                                    <input type="text" name="nomePaciente" value={formData.nomePaciente} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 bg-white" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-400 bg-white px-1 absolute top-0 left-2 z-10">Resp. (se menor)</label>
                                    <input type="text" name="nomeResponsavelMenor" value={formData.nomeResponsavelMenor} onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-400 bg-white placeholder:text-gray-300" placeholder="Opcional" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2 mt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">CPF*</label>
                                    <input type="text" name="cpf" value={formData.cpf} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 bg-white" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Endereço Completo*</label>
                                    <textarea name="enderecoCompleto" value={formData.enderecoCompleto} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 bg-white min-h-[60px] resize-none" />
                                </div>
                            </div>

                            {/* Section Profissional */}
                            <div className="flex flex-col gap-4 mt-2">
                                <h3 className="font-bold text-[15px] text-amber-600 flex items-center gap-1.5 pt-2">
                                    Profissional e Tratamento
                                </h3>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Nome do Especialista*</label>
                                    <input type="text" name="nomeEspecialista" value={formData.nomeEspecialista} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 bg-white" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">CRO*</label>
                                    <input type="text" name="croEspecialista" value={formData.croEspecialista} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 bg-white" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2 mt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Período de Tratamento*</label>
                                    <input type="text" name="periodoTratamento" value={formData.periodoTratamento} onChange={handleInputChange} placeholder="Ex: 6 meses" className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 bg-white" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Cidade para Assinatura*</label>
                                    <input type="text" name="cidadeContratada" value={formData.cidadeContratada} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 bg-white" />
                                </div>
                            </div>

                            {/* Section Esclarecimentos Clínicos */}
                            <div className="flex flex-col gap-4 mt-2">
                                <h3 className="font-bold text-[15px] text-amber-600 flex items-center gap-1.5 pt-2">
                                    Esclarecimentos Clínicos
                                </h3>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1 absolute top-0 left-2 z-10 rounded-sm font-semibold">Condições de saúde atuais*</label>
                                    <textarea name="condicoesSaude" value={formData.condicoesSaude} onChange={handleInputChange} placeholder="Ex: Paciente apresenta boa saúde geral, porém..." className="w-full border border-amber-300 bg-amber-50/30 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[80px] resize-none" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1 absolute top-0 left-2 z-10 rounded-sm font-semibold">Cuidados a se tomar*</label>
                                    <textarea name="cuidados" value={formData.cuidados} onChange={handleInputChange} placeholder="Ex: Repouso por 48h, alimentos pastosos..." className="w-full border border-amber-300 bg-amber-50/30 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[80px] resize-none" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1 absolute top-0 left-2 z-10 rounded-sm font-semibold">Riscos do tratamento*</label>
                                    <textarea name="riscos" value={formData.riscos} onChange={handleInputChange} placeholder="Ex: Inchaço, sensibilidade, dor temporária..." className="w-full border border-amber-300 bg-amber-50/30 rounded px-3 py-2 text-[13px] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[80px] resize-none" />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Right Document Preview - Styled like Editor Document */}
                    <div className="flex-1 bg-gray-200/60 p-6 overflow-y-auto">
                        <div className="max-w-[850px] mx-auto bg-white rounded shadow-sm border border-gray-300 min-h-full">
                            
                            {/* Toolbar mockup */}
                            <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-4 text-gray-500 bg-gray-50 sticky top-0 z-10">
                                <span className="font-serif italic cursor-not-allowed">Undo Redo &nbsp;&nbsp;|&nbsp;&nbsp; </span>
                                <span className="font-bold cursor-not-allowed">B</span>
                                <span className="italic cursor-not-allowed">I</span>
                                <span className="underline cursor-not-allowed">U</span>
                                <span className="line-through cursor-not-allowed">S</span>
                            </div>

                            <div id="termo-print-area" className="p-10 text-[14px] leading-relaxed text-gray-800 font-sans">
                                <h1 className="text-center font-extrabold text-[18px] mb-8 uppercase text-gray-900 tracking-wide">
                                    Termo de Consentimento Livre e Esclarecido
                                </h1>

                                <p className="mb-4 text-justify">
                                    Pelo presente termo de consentimento livre e esclarecido, eu, {renderHighlight(formData.nomePaciente, 'Nome do Paciente')}{formData.nomeResponsavelMenor ? ` (ou responsável legal do (a) menor ${renderHighlight(formData.nomeResponsavelMenor, 'Nome do Responsável Menor')})` : ' (ou responsável legal do (a) menor ____________________________)'}, CPF nº {renderHighlight(formData.cpf, 'CPF')}, residente a {renderHighlight(formData.enderecoCompleto, 'Endereço Completo')}, declaro que o (a) cirurgião (ã)-dentista {renderHighlight(formData.nomeEspecialista, 'Nome do Especialista')}, devidamente inscrito (a) no CRO sob o nº {renderHighlight(formData.croEspecialista, 'CRO')}, profissional escolhido para realizar o tratamento descrito no planejamento de tratamento e custos, constante em meu prontuário declaro que:
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>I -</strong> A ficha de anamnese apresenta informações que correspondem à realidade dos fatos, não tendo omitido informações, ciente de que a omissão de dados sobre a minha saúde geral e bucal e podem alterar o planejamento e andamento de tratamento, podendo ocasionar danos irreversíveis à minha saúde;
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>II -</strong> Considerando minha queixa principal e, após avaliação clínica e de eventuais exames complementares, o (a) profissional me esclareceu sobre o diagnóstico e planejamento de tratamento, com alternativas e informações claras sobre os objetivos e riscos do planejamento escolhido, bem como sobre minha responsabilidade de colaborar e contribuir para o tratamento;
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>III -</strong> É de meu conhecimento de que o tratamento proposto será realizado aproximadamente em {renderHighlight(formData.periodoTratamento, 'Especificar período')}, podendo, todavia, sofrer alteração de prazo, de acordo com eventual complexidade que o caso apresentar no decorrer do tratamento, bem como pela resposta biológica do meu organismo à técnica empregada, assiduidade às consultas e seguimento das orientações fornecidas pelo (a) profissional;
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>IV -</strong> Declaro, ainda, que estou ciente que eventuais ausências às consultas e o não atendimento das orientações profissionais prejudicarão o resultado pretendido;
                                </p>
                                
                                <p className="mb-4 text-justify">
                                    <strong>V -</strong> Declaro que estou ciente de que deverei comparecer pontualmente no consultório do(a) profissional, nas sessões, previamente agendadas, devendo seguir, rigorosamente, as prescrições, encaminhamentos a outros especialistas da área odontológica ou profissionais da área de saúde e demais orientações fornecidas pelo(a) profissional, sob pena de ser declarado interrompido o tratamento;
                                </p>
                                
                                <p className="mb-4 text-justify">
                                    <strong>VI -</strong> É de meu conhecimento de que devo informar ao (à) profissional qualquer alteração em decorrência do tratamento realizado, insatisfações ou dúvidas sobre o tratamento em execução;
                                </p>
                                
                                <p className="mb-4 text-justify">
                                    <strong>VII -</strong> Estou ciente de que a Odontologia não é uma ciência exata e que os resultados esperados, a partir do diagnóstico, poderão não se concretizar em face da resposta biológica do meu organismo e de minha colaboração, assim como da própria limitação da ciência, assumindo responsabilidade pelos serviços prestados;
                                </p>
                                
                                <p className="mb-4 text-justify">
                                    <strong>VIII -</strong> Caso seja solicitada a devolução da documentação radiográfica e outros exames, o (a) profissional se compromete a me devolver os documentos originais, após sua duplicação para arquivo do consultório.
                                </p>
                                
                                <p className="mb-4 text-justify">
                                    <strong>IX -</strong> Declaro estar ciente do plano de tratamento odontológico em anexo, também de possíveis alterações e intercorrências que por ventura venham a ocorrer e concordo com a possibilidade, se necessária, da realização de extrações parciais ou totais de dentes, que somente serão realizadas após meu consentimento expresso;
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>X -</strong> Fui esclarecido (a) que, caso o tratamento proposto, durante a sua execução ou ao final, não alcançar a perspectiva almejada, com cura da doença ou reabilitação necessária, o profissional apresentará esclarecimentos, a todo instante, sobre as limitações enfrentadas propondo alternativas, quando houver;
                                </p>

                                <p className="mb-2 text-justify">
                                    <strong>XI -</strong> Fui esclarecido (a) pelo (a) profissional que minhas condições atuais de saúde bucal ou geral se apresentam da seguinte forma:
                                </p>
                                <div className="mb-5 pl-8 border-l-2 border-amber-200 py-1">
                                    {renderHighlight(formData.condicoesSaude, 'Descreva as condições atuais e particularidades')}
                                </div>

                                <p className="mb-2 text-justify">
                                    <strong>XII -</strong> Fui esclarecido (a) pelo (a) profissional que em razão das condições descritas no item anterior, deverei observar os seguintes cuidados:
                                </p>
                                <div className="mb-5 pl-8 border-l-2 border-amber-200 py-1">
                                    {renderHighlight(formData.cuidados, 'Descreva os cuidados que o paciente deve adotar')}
                                </div>

                                <p className="mb-2 text-justify">
                                    <strong>XIII -</strong> Fui esclarecido (a) pelo (a) profissional que o tratamento escolhido apresenta os seguintes riscos:
                                </p>
                                <div className="mb-6 pl-8 border-l-2 border-amber-200 py-1">
                                    {renderHighlight(formData.riscos, 'Descreva os possíveis riscos clínicos')}
                                </div>

                                <p className="mb-4 text-justify">
                                    <strong>XIV -</strong> Declaro, ainda, que tenho conhecimento de que ao término do tratamento deverei retornar para consultas de acompanhamento de acordo com os critérios estabelecidos pelo profissional, visando resguardar e manter o tratamento realizado, sendo certo que não é possível garantir o tempo de durabilidade dos procedimentos odontológicos, pois referida avaliação deverá observar as condições de minha saúde e eventuais alterações bucais, hábitos em geral, adequada higienização oral, além de outros fatores internos ou externos que podem danificar o serviço prestado. O profissional não se eximirá de avaliar eventual dano ou prejuízo sofrido e alegado, reparando-o, quando o caso, dentro do limite de sua responsabilidade;
                                </p>

                                <p className="mb-10 text-justify">
                                    <strong>XV -</strong> Por fim, declaro que permito a utilização do meu prontuário para uso em publicações científicas ou com finalidade acadêmica, permitindo a exibição de imagens e exames com finalidade didático-acadêmicas, conforme previsto no Código de Ética Odontológica.
                                </p>

                                <div className="flex justify-center mb-16">
                                    <span className="bg-[#fbbf24] text-amber-900 px-1.5 py-0.5 rounded text-[13px] font-medium leading-tight shadow-sm" style={{ visibility: formData.cidadeContratada ? 'visible' : 'hidden' }}>{formData.cidadeContratada || 'Cidade'}</span>
                                    <span>,&nbsp;{getFormattedDate()}</span>
                                </div>

                                <div className="flex flex-col gap-12 max-w-sm mx-auto">
                                    <div className="text-center">
                                        <div className="border-t border-black pt-2 text-[13px]">
                                            Assinatura do paciente ou seu Responsável legal
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
