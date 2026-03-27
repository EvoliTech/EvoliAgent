import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

export interface ContratoModalProps {
    patient: any;
    budgets: any[];
    onClose: () => void;
}

export const ContratoModal: React.FC<ContratoModalProps> = ({ patient, budgets, onClose }) => {
    const [formData, setFormData] = useState({
        nomePaciente: patient?.name || '',
        dataNascimento: patient?.dataNascimento || '',
        nomeResponsavel: patient?.name || '',
        cpfResponsavel: patient?.cpf || '',
        cep: patient?.cep || '',
        rua: patient?.enderecoRua || '',
        bairro: patient?.enderecoBairro || '',
        cidade: patient?.enderecoCidade || '',
        estado: patient?.enderecoEstado || '',
        nomeContratada: '',
        cnpjCpfContratada: '',
        cidadeContratada: '',
        valorContrato: '',
        tratamentos: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isComplete = () => {
        return formData.nomeResponsavel && formData.cpfResponsavel && formData.rua && formData.bairro && formData.cidade && formData.cep && formData.nomeContratada && formData.cnpjCpfContratada && formData.cidadeContratada && formData.valorContrato && formData.tratamentos;
    };

    const availableTreatments = budgets
       ?.filter(b => b.status === 'Aprovado')
       .flatMap(b => b.treatments)
       .filter(t => t && !t.isExtraction) || [];

    const handleAddTreatment = (treatmentName: string) => {
        setFormData(prev => {
            let trats = prev.tratamentos.trim();
            // If it already ends with the treatment, just ignore (basic deduplication)
            if (trats.endsWith(treatmentName)) return prev;
            
            if (trats.length > 0 && !trats.endsWith(';')) trats += ';';
            if (trats.length > 0) trats += ' ';
            return {
                ...prev,
                tratamentos: trats + treatmentName
            };
        });
    };

    const renderHighlight = (value: string, placeholder: string) => {
        if (!value || value.trim() === '') {
            return <span className="bg-[#ef5350] text-white px-1.5 py-0.5 rounded text-[13px] font-medium leading-tight inline-block my-0.5 shadow-sm whitespace-pre-wrap">{placeholder}</span>;
        }
        return <span className="bg-[#5c9ce6] text-white px-1.5 py-0.5 rounded text-[13px] font-medium leading-tight inline-block my-0.5 shadow-sm whitespace-pre-wrap">{value}</span>;
    };

    const getFormattedDate = () => {
        const date = new Date();
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#f0f2f5] rounded-xl shadow-2xl w-full max-w-[1300px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                
                {/* Header */}
                <div className="bg-white px-6 py-4 flex items-center justify-between shadow-sm shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="text-[#1976d2] font-semibold text-[15px]">Como funciona o contrato</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-wide">
                            Fechar
                        </button>
                        <button 
                            disabled={!isComplete()}
                            className="px-6 py-2.5 bg-[#4caf50] hover:bg-[#43a047] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded shadow-sm transition-colors uppercase tracking-wide"
                        >
                            Salvar Contrato
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Form Sidebar */}
                    <div className="w-[320px] bg-white border-r border-gray-200 overflow-y-auto shrink-0 custom-scrollbar pb-10">
                        <div className="p-5 flex flex-col gap-6">
                            {/* Section Contratante */}
                            <div className="flex flex-col gap-4">
                                <h3 className="font-bold text-[17px] text-gray-800">Contratante</h3>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Nome paciente*</label>
                                    <input type="text" name="nomePaciente" value={formData.nomePaciente} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Data de nascimento*</label>
                                    <input type="text" name="dataNascimento" value={formData.dataNascimento} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white" placeholder="DD/MM/AAAA" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2 mt-2">
                                    <label className="text-[11px] text-[#1976d2] font-semibold bg-blue-50/80 px-1 absolute top-0 left-2 z-10">Nome responsável*</label>
                                    <input type="text" name="nomeResponsavel" value={formData.nomeResponsavel} onChange={handleInputChange} className="w-full border border-blue-200 bg-blue-50/30 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 text-blue-900" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">CPF responsável*</label>
                                    <input type="text" name="cpfResponsavel" value={formData.cpfResponsavel} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white" />
                                </div>
                            </div>

                            {/* Section Endereço */}
                            <div className="flex flex-col gap-4">
                                <h3 className="font-bold text-[15px] text-[#1976d2] flex items-center gap-1.5 pt-2">
                                    Endereço contratante
                                    <div className="w-4 h-4 rounded-full border border-[#1976d2] flex items-center justify-center text-[10px] font-bold">i</div>
                                </h3>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-red-500 bg-white px-1 absolute top-0 left-2 z-10">CEP*</label>
                                    <input type="text" name="cep" value={formData.cep} onChange={handleInputChange} className="w-full border border-red-400 bg-red-50/20 rounded px-3 py-2 text-[13px] outline-none focus:border-red-500" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Rua*</label>
                                    <input type="text" name="rua" value={formData.rua} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-[#1976d2] bg-blue-50/80 px-1 font-semibold absolute top-0 left-2 z-10">Bairro*</label>
                                    <input type="text" name="bairro" value={formData.bairro} onChange={handleInputChange} className="w-full border border-blue-200 bg-blue-50/30 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white text-blue-900" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-[#1976d2] bg-blue-50/80 px-1 font-semibold absolute top-0 left-2 z-10">Cidade*</label>
                                    <input type="text" name="cidade" value={formData.cidade} onChange={handleInputChange} className="w-full border border-blue-200 bg-blue-50/30 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white text-blue-900" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Estado*</label>
                                    <select name="estado" value={formData.estado} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white">
                                        <option value="">Selecione...</option>
                                        <option value="AC">Acre</option>
                                        <option value="AL">Alagoas</option>
                                        <option value="AP">Amapá</option>
                                        <option value="AM">Amazonas</option>
                                        <option value="BA">Bahia</option>
                                        <option value="CE">Ceará</option>
                                        <option value="DF">Distrito Federal</option>
                                        <option value="ES">Espírito Santo</option>
                                        <option value="GO">Goiás</option>
                                        <option value="MA">Maranhão</option>
                                        <option value="MT">Mato Grosso</option>
                                        <option value="MS">Mato Grosso do Sul</option>
                                        <option value="MG">Minas Gerais</option>
                                        <option value="PA">Pará</option>
                                        <option value="PB">Paraíba</option>
                                        <option value="PR">Paraná</option>
                                        <option value="PE">Pernambuco</option>
                                        <option value="PI">Piauí</option>
                                        <option value="RJ">Rio de Janeiro</option>
                                        <option value="RN">Rio Grande do Norte</option>
                                        <option value="RS">Rio Grande do Sul</option>
                                        <option value="RO">Rondônia</option>
                                        <option value="RR">Roraima</option>
                                        <option value="SC">Santa Catarina</option>
                                        <option value="SP">São Paulo</option>
                                        <option value="SE">Sergipe</option>
                                        <option value="TO">Tocantins</option>
                                    </select>
                                </div>
                            </div>

                            {/* Section Contratada */}
                            <div className="flex flex-col gap-4 mt-4">
                                <h3 className="font-bold text-[17px] text-gray-800">Contratada</h3>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Nome contratada*</label>
                                    <input type="text" name="nomeContratada" value={formData.nomeContratada} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">CNPJ/CPF*</label>
                                    <input type="text" name="cnpjCpfContratada" value={formData.cnpjCpfContratada} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Cidade*</label>
                                    <input type="text" name="cidadeContratada" value={formData.cidadeContratada} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white" />
                                </div>
                                
                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Valor contrato*</label>
                                    <input type="text" name="valorContrato" value={formData.valorContrato} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white" placeholder="R$ 0,00" />
                                </div>

                                <div className="flex flex-col gap-1 relative pt-2">
                                    <label className="text-[11px] text-gray-500 bg-white px-1 absolute top-0 left-2 z-10">Tratamentos*</label>
                                    <textarea name="tratamentos" value={formData.tratamentos} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white min-h-[80px] resize-none" />
                                </div>
                                
                                {availableTreatments.length > 0 && (
                                    <div className="flex flex-col gap-2 -mt-1">
                                       <span className="text-[11px] text-gray-500 font-semibold">Adicionar Tratamentos da Ficha:</span>
                                       <div className="flex flex-wrap gap-1.5">
                                          {availableTreatments.map((t: any, i: number) => (
                                              <button 
                                                  key={i} 
                                                  onClick={() => handleAddTreatment(t.treatmentName)}
                                                  className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded transition-colors text-left font-medium"
                                              >
                                                  + {t.treatmentName}
                                              </button>
                                          ))}
                                       </div>
                                    </div>
                                )}
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

                            <div className="p-10 text-[14px] leading-relaxed text-gray-800 font-sans">
                                <h1 className="text-center font-extrabold text-[18px] mb-6">CONTRATO DE PRESTAÇÃO DE SERVIÇOS ODONTOLÓGICOS</h1>

                                <p className="mb-4">São partes do presente instrumento:</p>

                                <p className="mb-4 text-justify">
                                    {renderHighlight(formData.nomeResponsavel, 'Nome responsável')}, portador do documento {renderHighlight(formData.cpfResponsavel, 'CPF responsável')} residente e domiciliado em {renderHighlight(formData.cidade, 'Cidade')}, à rua {renderHighlight(formData.rua, 'Rua')}, bairro {renderHighlight(formData.bairro, 'Bairro')}, CEP {renderHighlight(formData.cep, 'CEP')}, doravante denominado CONTRATANTE e de outro lado {renderHighlight(formData.nomeContratada, 'Nome contratada')}, CPF/CNPJ nº {renderHighlight(formData.cnpjCpfContratada, 'CNPJ/CPF contratada')} doravante denominada CONTRATADA, resolvem de comum acordo celebrar o presente Contrato para Prestação de Serviços Odontológicos, com fulcro no Código Civil, Código de Defesa do Consumidor e no Código de Ética Odontológico o qual se regerá pelas seguintes cláusulas e condições:
                                </p>

                                <p className="font-bold mb-4 mt-6">DO OBJETO DO CONTRATO:</p>

                                <p className="mb-4 text-justify">
                                    <strong>CLÁUSULA 1ª:</strong> O presente instrumento tem por objeto a prestação de serviços pela CONTRATADA(O) apta(o) e habilitada(o) à realização plena e segura do(s) procedimento(s) abaixo descriminado(s) no(a) paciente {renderHighlight(formData.nomePaciente, 'Nome paciente')}
                                </p>
                                
                                <div className="mb-4">
                                    {renderHighlight(formData.tratamentos, 'Descrição dos tratamentos')}
                                </div>

                                <p className="mb-4 text-justify">
                                    <strong>Parágrafo Primeiro:</strong> Os serviços odontológicos contratados compreendem na realização dos procedimentos contratados nas datas e horários de acordo com agendamento prévio.
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>Parágrafo Segundo:</strong> A CONTRATADA resta também autorizada a realizar procedimentos não referidos na Cláusula Primeira, desde que no decorrer do ato odontológico (planejamento e execução) verifique-se a sua viabilidade para o procedimento ou para qualquer outra situação que seja tecnicamente realizável ao(à) CONTRATANTE, desde que, por óbvio, haja anuência por ele(a).
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>Parágrafo Terceiro:</strong> A CONTRATANTE, a partir deste instrumento se declara ciente do produto e materiais utilizados em todos os seus detalhamentos, bem como tem plena consciência que, apesar de uma previsão industrial de durabilidade, tal prazo tende a sofrer latentes oscilações em razão de todos os vetores imponderáveis que passarão a influenciar no tratamento, especialmente a conduta da(o) CONTRATANTE frente aos serviços prestados e sua postura enquanto paciente.
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>CLÁUSULA 2ª:</strong> O paciente declara, a partir deste contrato travado de boa fé e plena autonomia, que A(O) CONTRATADO(A) foi claro, didático e transparente no que se refere ao procedimento a ser realizado, informando a sua necessidade, conceito, dores, riscos, desconfortos, efeitos colaterais possíveis, alternativas, expectativas em relação ao potencial resultado, entre outras situações que podem gerar modificações no cenário. Além disso, que o(s) procedimento(s) gerará(ão) os resultados alinhados com as condições fisiológicas, anatômicas e orgânicas do paciente.
                                </p>

                                <p className="mb-4 text-justify">
                                    <strong>Parágrafo Único.</strong> Declara, ademais, que tem consciência de que não há garantia de satisfação ou felicidade com o procedimento e sim o dever do profissional da saúde de seguir o roteiro técnico mais adequado e fazer o melhor possível dentro das condições e circunstâncias presentes.
                                </p>

                                <p className="font-bold mb-4 mt-6">DOS CUSTOS:</p>

                                <p className="mb-4 text-justify">
                                    <strong>CLÁUSULA 3ª:</strong> As partes ajustam que, o valor cobrado corresponde aos custos dos materiais utilizados, bem como os materiais descartáveis e a mão de obra, totalizando o valor de {renderHighlight('R$ ' + (formData.valorContrato || ''), 'Valor contrato')}.
                                </p>

                                <p className="font-bold mb-4 mt-6">OBRIGAÇÕES DO(A) PACIENTE CONTRATANTE:</p>

                                <p className="mb-4">
                                    <strong>CLÁUSULA 4ª:</strong> São obrigações do(a) PACIENTE:
                                </p>
                                <ol className="list-lower-alpha pl-8 mb-4 flex flex-col gap-2 text-justify" style={{ listStyleType: 'lower-alpha' }}>
                                    <li>Compreender sua posição de corresponsável no tratamento e seguir rigorosamente todas as orientações do profissional relacionadas ao tratamento/procedimento(s) efetuado(s), em âmbito pré e pós-procedimental e informar ao profissional qualquer desconforto sentido, de qualquer natureza, sob pena de incorrer em responsabilidade pelo potencial insucesso do tratamento;</li>
                                    <li>Manter atualizado o cadastro junto à CONTRATADA, para que se tenha a máxima eficiência na comunicação e também agilidade dos agendamentos das consultas;</li>
                                    <li>Honrar com o pagamento dos honorários profissionais do(a) CONTRATADO(A), de acordo com as condições pactuadas, sob pena de suspensão do tratamento, com os devidos cuidados de saúde;</li>
                                    <li>Informar ao(à) CONTRATADO(A) a respeito de seu histórico em relação à sensibilidade e alergias para medicamentos e anestésicos, e ainda a respeito de problemas de sangramento, alergias, infecções recentes, bem como fornecer documentos e informações acerca de seus anteriores tratamentos equivalentes ou assemelhados;</li>
                                    <li>Comparecer pontualmente às consultas agendadas, buscando desmarcá-las apenas em casos justificados e com antecedência;</li>
                                    <li>Caso a CONTRATANTE não compareça nas datas e horários pré-definidos, abandonando o tratamento, A(O) CONTRATADO(A) exime-se de qualquer responsabilidade no que diz respeito a resultados esperados dos procedimentos, restando rescindido o presente contrato de pleno direito, sem necessidade de qualquer outra formalidade, sendo devido pagamento os valores contratados A(O) CONTRATADO(A) em sua integralidade como forma de compensação por perdas e danos;</li>
                                    <li>Acatar todas as recomendações e prescrições efetuadas pelo(a) CONTRATADO(A), seja em relação a medicamentos, controles e cuidados antes, durante e após o tratamento, conforme instruções repassadas por escrito a cada procedimento realizado;</li>
                                    <li>Realizar todos os exames solicitados pelo(a) CONTRATADO(A), de modo a propiciar condições para o perfeito diagnóstico e desenrolar do tratamento, ficando o profissional livre para negar-se a efetuar os procedimentos dos quais não tenha os subsídios necessários à realização do tratamento em razão de desídia ou negligência do(a) paciente;</li>
                                    <li>Comparecer às consultas agendadas, em especial naquelas marcadas para continuidade de tratamento já iniciado ou que se mostre urgente, sob risco de comprometer o sucesso dos serviços contratados;</li>
                                    <li>Nos casos em que os serviços foram integralmente prestados ou, se parcialmente prestados, superarem os honorários já pagos, fica ciente desde já o paciente que deverá arcar com os custos remanescentes dos procedimentos que foram realizados e não adimplidos, sob pena de cobranças extrajudiciais e judiciais, se necessário;</li>
                                    <li>Avisar imediatamente qualquer sinal, indício ou fato que denote uma reação adversa, intercorrência ou complicação, devendo a(o) paciente ir diretamente ao encontro da(o) contratante e não de outro profissional sem o devido conhecimento do histórico odontológico.</li>
                                </ol>

                                <p className="font-bold mb-4 mt-6">OBRIGAÇÕES DO(A) CONTRATADO(A):</p>
                                <p className="mb-4">
                                    <strong>CLÁUSULA 5ª:</strong> São obrigações do(a) CONTRATADO(A):
                                </p>
                                <ol className="list-lower-alpha pl-8 mb-4 flex flex-col gap-2 text-justify" style={{ listStyleType: 'lower-alpha' }}>
                                    <li>Executar o tratamento indicado em ambiente de trabalho seguro ao paciente, observando os padrões de higiene e sanitários em geral aplicáveis ao caso;</li>
                                    <li>Realizar os procedimentos de acordo com a melhor técnica, observando o estado atual da ciência, o zelo, a prudência e a honestidade;</li>
                                    <li>Esclarecer previamente o CONTRATANTE, diante das especificações de cada procedimento, contratado ou eventual, a respeito das vantagens, riscos, consequências e valores (honorários);</li>
                                    <li>Informar o CONTRATANTE a cada procedimento realizado, a respeito do plano de tratamento e sua sequência (evolução), se o caso;</li>
                                    <li>Observar todos os preceitos éticos contidos no Código de Ética de sua profissão, além de todas as outras legislações pertinentes ao procedimento;</li>
                                    <li>Resguardar a privacidade do CONTRATANTE durante todo o tratamento, bem como após, notadamente o seu prontuário e todas as informações e dados sensíveis (Lei Geral de Proteção de Dados);</li>
                                    <li>Dar assistência necessária ao Contratante durante o período pós-procedimental, até sua completa recuperação;</li>
                                    <li>Fornecer o prontuário odontológico e tudo que dele faz parte quando do pedido da(o) contratante para retirada presencial do titular no estabelecimento odontológico mediante marcação prévia de agenda para tal.</li>
                                </ol>
                                <p className="mb-4 text-justify">
                                    <strong>Parágrafo Único:</strong> A alínea "g)" ficará vinculada a uma série de variáveis, especialmente o comprometimento da(o) paciente frente ao procedimento realizado, não sendo responsáveis a profissional e a empresa CONTRATADA por eventual abandono ou interrupção precoce dos procedimentos, nem tampouco pelo mero descontentamento do paciente.
                                </p>

                                <p className="font-bold mb-4 mt-6">DA RESPONSABILIDADE</p>
                                <p className="mb-4 text-justify"><strong>CLÁUSULA 6ª:</strong> A responsabilidade assumida pelo(a) CONTRATADO(A) por força do presente instrumento é de meio, ou seja, incumbe ao profissional agir dentro da melhor técnica na execução dos serviços, despendendo todos os esforços e meios necessários para alcance do objetivo possível no tratamento, todavia, sem responsabilizar-se pelo resultado, uma vez que SEMPRE permeado pelo imponderável da vida humana e outras variáveis óbvias que envolvem o serviço.</p>
                                <p className="mb-4 text-justify"><strong>Parágrafo Primeiro:</strong> O(A) CONTRATADO(A) não se responsabilizará por quaisquer consequências ao tratamento, bem como por prejuízos financeiros, estéticos e morais gerados ao(à) CONTRATANTE em virtude de sua não cooperação no antes, durante e após o tratamento, ou ainda pela omissão de informações relevantes para o diagnóstico (anamnese) e prognóstico do caso.</p>
                                <p className="mb-4 text-justify"><strong>Parágrafo Segundo:</strong> Considera-se como não cooperação do paciente, para fins do presente instrumento, o não comparecimento às consultas agendadas, atrasos injustificados, o abandono do tratamento e a não observação das recomendações prescritas pelo profissional cirurgião dentista, dentre outras possíveis que não se exaurem com hipóteses explicitadas neste clausulado.</p>
                                <p className="mb-4 text-justify"><strong>Parágrafo Terceiro:</strong> O(A) CONTRATADO(A), considerando os riscos inerentes ao tratamento, não se responsabilizará por eventuais efeitos imprevisíveis ou de baixíssima previsibilidade que venham ocorrer pela execução dos serviços, desde que observadas a boa técnica recomendável, bem como considerando para as diretrizes contidas no §1° do art. 14 da Lei n.° 8.078/90 (Código de Defesa do Consumidor), Código de Ética Odontológico, bem como as causas excludentes de responsabilidade e culpabilidade.</p>
                                <p className="mb-4 text-justify"><strong>Parágrafo Quarto:</strong> A(O) CONTRATADO(A) não se responsabiliza, salvo nos casos de manejo inadequado, por qualquer defeito proveniente da máquina/equipamento/material/substância, sendo responsável o fornecedor do produto.</p>

                                <p className="font-bold mb-4 mt-6">DA PROTEÇÃO DE DADOS</p>
                                <p className="mb-4 text-justify"><strong>CLÁUSULA 7ª:</strong> Em cumprimento à Lei Geral de Proteção de Dados - LGPD (Lei 13.709/2018) a CONTRATADA informa a CONTRATANTE que os dados pessoais coletados no contexto da contratação serão utilizados para a finalidade de viabilizar a execução do presente Contrato e serão armazenados durante a sua vigência ou por período superior nos casos em que sua manutenção se justificar em outra hipótese legal prevista na LGPD.</p>
                                <p className="mb-4 text-justify"><strong>Parágrafo Único:</strong> As Partes declaram-se cientes dos direitos, obrigações e penalidades aplicáveis constantes da Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018) ("LGPD"), e obrigam-se a adotar todas as medidas razoáveis para garantir, por si, bem como seu pessoal, colaboradores, empregados e subcontratados que utilizem os Dados Protegidos na extensão autorizada na referida LGPD.</p>

                                <p className="font-bold mb-4 mt-6">DA RESCISÃO CONTRATUAL</p>
                                <p className="mb-4 text-justify"><strong>CLÁUSULA 8ª:</strong> Além das hipóteses legais, o presente instrumento poderá ser rescindido pelas partes, uma vez verificada a ocorrência do descumprimento de qualquer cláusula ou condição pactuada, bem como pela falência do relacionamento profissional-paciente, sob efeitos das consequências de estilo e daquelas neste instrumento dispostas.</p>
                                <p className="mb-4 text-justify"><strong>Parágrafo Primeiro:</strong> A parte que der causa à rescisão do contrato permanecerá responsável por todas as perdas e danos ocasionados e provados à parte inocente.</p>

                                <p className="font-bold mb-4 mt-6">DO EQUILÍBRIO CONTRATUAL</p>
                                <p className="mb-4 text-justify"><strong>CLÁUSULA 9ª:</strong> Ajustam as partes, nos termos dos arts. 317, 478 e 479 do Código Civil, e demais dispositivos legais aplicáveis à espécie, que na hipótese da ocorrência, por motivos imprevisíveis, de desproporção manifesta entre o custo do serviço estipulado no momento da contratação da prestação devida e aquele do momento de sua execução, será realizado o reequilíbrio econômico-financeiro da avença de sorte a que se adeque o custo do serviço ao seu valor real, majorando-o.</p>

                                <p className="font-bold mb-4 mt-6">DA ASSINATURA DIGITAL</p>
                                <p className="mb-4 text-justify"><strong>CLÁUSULA 10ª:</strong> As partes reconhecem como válida e se comprometem a não impugnar a assinatura digital ou eletrônica do presente instrumento, conforme permitido pela legislação vigente, dispensada a assinatura física para a contração das obrigações aqui previstas.</p>

                                <p className="font-bold mb-4 mt-6">DA AUTORIZAÇÃO DE IMAGEM</p>
                                <p className="mb-4 text-justify"><strong>CLÁUSULA 11ª:</strong> Eu autorizo a disponibilidade dos registros de meu tratamento para estudos com fins científicos, ainda que em rede social on line, estando sempre preservada minha identidade.</p>

                                <p className="font-bold mb-4 mt-6">TÍTULO EXTRAJUDICIAL</p>
                                <p className="mb-4 text-justify"><strong>CLÁUSULA 12ª:</strong> As partes reconhecem o presente contrato como título executivo extrajudicial, nos termos do artigo 585, II, do Código de Processo Civil.</p>

                                <p className="font-bold mb-4 mt-6">DO FORO:</p>
                                <p className="mb-4 text-justify"><strong>CLÁUSULA 13ª:</strong> As partes elegem, para dirimir quaisquer dúvidas a respeito do presente contrato, o foro da Comarca sede da clínica ou então o foro mais próximo dentro da circunscrição.</p>

                                <p className="mb-12 text-justify">E, por estarem justos e contratados, firmam o presente Contrato em 02 (duas) vias de igual teor e forma.</p>


                                <div className="flex justify-center mb-16">
                                    <span className="bg-[#5c9ce6] text-white px-1.5 py-0.5 rounded text-[13px] font-medium leading-tight shadow-sm" style={{ visibility: formData.cidadeContratada ? 'visible' : 'hidden' }}>{formData.cidadeContratada || 'Cidade'}</span>
                                    <span>,&nbsp;{getFormattedDate()}</span>
                                </div>

                                <div className="flex flex-col gap-12 max-w-sm mx-auto">
                                    <div className="text-center">
                                        <div className="border-t border-black pt-2 text-[13px]">
                                            <strong>CONTRATANTE</strong><br />
                                            Paciente (contratante)
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <div className="border-t border-black pt-2 text-[13px]">
                                            <strong>CONTRATADO</strong><br />
                                            Responsável
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
