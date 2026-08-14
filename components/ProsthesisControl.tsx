import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProteseSolicitacao, ProteseLaboratorio, ProteseStatus, Patient, Specialist } from '../types';
import { Loader2, Plus, Phone, Calendar, Clock, ArrowRight, User, Search, Edit2, Camera, X, Paperclip, Download, ExternalLink } from 'lucide-react';
import { patientService } from '../services/patientService';
import { specialistService } from '../services/specialistService';

const COLUMNS: ProteseStatus[] = [
  'Solicitação',
  'Reenviado ao Laboratório',
  'Enviado para laboratório',
  'Retornado à Clínica',
  'Instalado'
];

const COLUMN_COLORS: Record<ProteseStatus, { text: string, bg: string, dot: string, border: string }> = {
  'Solicitação': { text: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-100' },
  'Reenviado ao Laboratório': { text: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-600', border: 'border-orange-200' },
  'Enviado para laboratório': { text: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500', border: 'border-orange-100' },
  'Retornado à Clínica': { text: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500', border: 'border-purple-100' },
  'Instalado': { text: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', border: 'border-green-100' }
};

export const ProsthesisControl: React.FC = () => {
  const { empresaId } = useCompany();
  const [solicitacoes, setSolicitacoes] = useState<ProteseSolicitacao[]>([]);
  const [laboratorios, setLaboratorios] = useState<ProteseLaboratorio[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<ProteseSolicitacao | null>(null);

  const [reenvioPrompt, setReenvioPrompt] = useState<{
    isOpen: boolean;
    cardId: string;
    coluna: ProteseStatus;
  } | null>(null);
  const [motivoReenvio, setMotivoReenvio] = useState('');
  const [nomeReenvio, setNomeReenvio] = useState('');

  useEffect(() => {
    if (empresaId) {
      fetchData();
    }
  }, [empresaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Laboratorios
      const { data: labsData, error: labsError } = await supabase
        .from('protese_laboratorios')
        .select('*')
        .eq('empresa_id', empresaId);

      if (labsError) throw labsError;
      setLaboratorios(labsData || []);

      // Fetch Solicitacoes
      const { data: solData, error: solError } = await supabase
        .from('protese_solicitacoes')
        .select(`
          *,
          laboratorio:laboratorio_id (*)
        `)
        .eq('empresa_id', empresaId)
        .order('updated_at', { ascending: false });

      if (solError) throw solError;
      setSolicitacoes(solData || []);
    } catch (error) {
      console.error('Error fetching prosthesis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (solicitacao?: ProteseSolicitacao) => {
    if (solicitacao) {
      setSelectedSolicitacao(solicitacao);
    } else {
      setSelectedSolicitacao(null);
    }
    setIsModalOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, card: ProteseSolicitacao) => {
    e.dataTransfer.setData('cardId', card.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, coluna: ProteseStatus) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) {
      const card = solicitacoes.find(s => s.id === cardId);
      if (card && card.status !== coluna) {
        
          if (coluna === 'Reenviado ao Laboratório') {
            if (card.status === 'Solicitação') {
              alert('Um card em "Solicitação" não pode ser movido direto para "Reenviado ao Laboratório". Ele deve primeiro passar pelas etapas adequadas.');
              return;
            }
            if (card.status !== 'Retornado à Clínica' && card.status !== 'Instalado') {
              alert('Apenas cards que já retornaram à clínica podem ser reenviados ao laboratório.');
              return;
            }
            
            setReenvioPrompt({ isOpen: true, cardId: card.id, coluna });
            return;
          }

          try {
            const { data: userData } = await supabase.auth.getUser();
            const userName = userData.user?.email || 'Usuário';

            await supabase.from('protese_solicitacoes').update({ status: coluna }).eq('id', card.id);
            await supabase.from('protese_historico').insert({
              empresa_id: empresaId,
              solicitacao_id: card.id,
              status_anterior: card.status,
              status_novo: coluna,
              usuario_nome: userName
            });
            
            if (card.status === 'Solicitação' && coluna === 'Enviado para laboratório') {
              const updatedCard = { ...card, status: coluna };
              setSelectedSolicitacao(updatedCard);
              setIsModalOpen(true);
            }
            
            fetchData(); // update background
          } catch (error) {
            console.error(error);
          }
      }
    }
  };

  const confirmReenvioDrop = async () => {
    if (!motivoReenvio.trim() || !nomeReenvio.trim()) {
      alert("O motivo e o nome são obrigatórios.");
      return;
    }
    const cardId = reenvioPrompt!.cardId;
    const coluna = reenvioPrompt!.coluna;
    const card = solicitacoes.find(s => s.id === cardId);
    if (!card) return;

    try {
      let newList = [];
      try {
        if (card.observacoes_internas) {
          newList = JSON.parse(card.observacoes_internas);
        }
      } catch(e) {}
      
      newList.push({
         text: `Motivo do Reenvio: ${motivoReenvio}`,
         date: new Date().toISOString(),
         user: nomeReenvio.trim()
      });
      
      const observacoes_internas = JSON.stringify(newList);

      await supabase.from('protese_solicitacoes').update({ status: coluna, observacoes_internas }).eq('id', card.id);
      await supabase.from('protese_historico').insert({
        empresa_id: empresaId,
        solicitacao_id: card.id,
        status_anterior: card.status,
        status_novo: coluna,
        usuario_nome: nomeReenvio.trim()
      });
      
      setReenvioPrompt(null);
      setMotivoReenvio('');
      setNomeReenvio('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSolicitacao(null);
    fetchData(); // Refresh list after closing
  };

  const handleSolicitarColetaCard = async (card: ProteseSolicitacao) => {
    let clinicName = "Nossa Clínica";
    try {
      const { data } = await supabase.from('empresas').select('Nome').eq('id', empresaId).single();
      if (data?.Nome) clinicName = data.Nome;
    } catch (e) {}

    const publicLink = `${window.location.origin}/protese/${card.id}`;
    const msg = `Olá! Aqui é da Clínica ${clinicName}. Solicitamos a coleta referente ao serviço "${card.descricao_servico || 'Prótese'}". Para visualizar os detalhes da solicitação, clique no link abaixo: ${publicLink}\n\nFicamos no aguardo da confirmação. Obrigado(a)!`;

    const labPhone = card.laboratorio?.telefone || '';
    const phoneFormatted = labPhone.replace(/\D/g, '');
    
    if (!phoneFormatted) {
      alert('O laboratório vinculado não possui um telefone válido.');
      return;
    }

    const waUrl = `https://wa.me/55${phoneFormatted}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-600">Controle de Prótese</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Paciente, laboratório ou responsável"
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full sm:w-80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <Plus size={18} />
            Nova solicitação
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 pb-4 md:pb-6 pr-2">
        <div className="flex gap-4 h-full min-h-[600px] min-w-max items-start pb-2">
            {COLUMNS.map((coluna) => {
              const columnCards = solicitacoes.filter(s => s.status === coluna);
              const colors = COLUMN_COLORS[coluna];

              return (
                <div 
                  key={coluna} 
                  className="flex flex-col w-72 lg:w-80 max-h-full bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, coluna)}
                >
                  <div className={`p-4 border-b ${colors.border} flex items-center justify-between ${colors.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
                      <h3 className={`font-bold text-sm ${colors.text}`}>{coluna}</h3>
                    </div>
                    <span className={`${colors.bg} ${colors.text} bg-opacity-50 text-xs font-bold px-2 py-0.5 rounded-full border ${colors.border}`}>
                      {columnCards.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/30">
                    {columnCards.map((card) => (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card)}
                        onClick={() => handleOpenModal(card)}
                        className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:border-blue-300"
                      >
                        <h4 className="font-bold text-slate-800 text-sm mb-1">{card.paciente_nome}</h4>
                        <p className="text-xs text-slate-500 mb-3">
                          {card.descricao_servico || 'Sem descrição'}
                        </p>

                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">🦷</span>
                            <span className="truncate">{card.dentes || 'Não informado'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User size={12} className="text-slate-400" />
                            <span className="truncate">{card.responsavel_nome}</span>
                          </div>
                        </div>

                        {coluna === 'Reenviado ao Laboratório' && card.observacoes_internas && (() => {
                          try {
                            const obsList = JSON.parse(card.observacoes_internas);
                            const lastMotivo = [...obsList].reverse().find((o: any) => o.text && o.text.startsWith('Motivo do Reenvio:'));
                            if (lastMotivo) {
                              return (
                                <div className="mt-3 bg-orange-50 border border-orange-100 p-2.5 rounded-md text-xs text-orange-800 animate-in fade-in">
                                  <span className="font-bold">Motivo do reenvio:</span>
                                  <p className="mt-0.5 leading-relaxed">{lastMotivo.text.replace('Motivo do Reenvio: ', '')}</p>
                                  <span className="text-[10px] text-orange-600 font-semibold opacity-80 block mt-1">Por: {lastMotivo.user}</span>
                                </div>
                              );
                            }
                          } catch (e) {}
                          return null;
                        })()}

                        {(coluna === 'Solicitação' || coluna === 'Retornado à Clínica') && card.laboratorio?.telefone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSolicitarColetaCard(card);
                            }}
                            className="mt-3 flex items-center gap-1.5 w-max text-green-600 hover:text-green-700 transition-colors text-xs font-medium"
                          >
                            <Phone size={12} />
                            Solicitar Coleta
                          </button>
                        )}
                      </div>
                    ))}
                    {columnCards.length === 0 && (
                      <div className="flex items-center justify-center p-4 h-24 border-2 border-dashed border-slate-200 rounded-lg bg-transparent">
                        <span className="text-xs text-slate-400 font-medium">Arraste o card</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {reenvioPrompt?.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
             <div className="flex items-center gap-3 text-orange-600 mb-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-bold text-slate-800 text-lg">Reenviar ao Laboratório</h3>
             </div>
             <p className="text-sm text-slate-600 mb-4 bg-orange-50 border border-orange-100 p-3 rounded-lg">
               O serviço retornará para a etapa de <strong>"Reenviado ao laboratório"</strong>. Por favor, informe o motivo do retorno e quem está realizando a movimentação:
             </p>
             <textarea
               value={motivoReenvio}
               onChange={e => setMotivoReenvio(e.target.value)}
               className="w-full border border-slate-300 rounded-lg p-3 text-sm resize-none mb-3 focus:ring-2 focus:ring-orange-500 focus:outline-none"
               rows={3}
               placeholder="Motivo (Ex: Refazer a cor)"
             />
             <input
               type="text"
               value={nomeReenvio}
               onChange={e => setNomeReenvio(e.target.value)}
               className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-orange-500 focus:outline-none"
               placeholder="Seu nome (Ex: João Silva)"
             />
             <div className="flex justify-end gap-3">
               <button onClick={() => { setReenvioPrompt(null); setMotivoReenvio(''); setNomeReenvio(''); }} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
               <button onClick={confirmReenvioDrop} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Confirmar</button>
             </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <ProsthesisModal
          solicitacao={selectedSolicitacao}
          laboratorios={laboratorios}
          onClose={handleCloseModal}
          empresaId={empresaId!}
        />
      )}
    </div>
  );
};

// Modal Component

interface ProsthesisModalProps {
  solicitacao: ProteseSolicitacao | null;
  laboratorios: ProteseLaboratorio[];
  onClose: () => void;
  empresaId: number;
}

const ProsthesisModal: React.FC<ProsthesisModalProps> = ({ solicitacao, laboratorios, onClose, empresaId }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dados' | 'envio'>(
    solicitacao && solicitacao.status !== 'Solicitação' ? 'envio' : 'dados'
  );
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ProteseSolicitacao>>(
    solicitacao || {
      status: 'Solicitação',
      paciente_nome: '',
      responsavel_nome: '',
      laboratorio_id: '',
      dentes: '',
      cor: '',
      descricao_servico: '',
      trabalho_executado: '',
      observacoes_internas: ''
    }
  );

  const [isCreatingLab, setIsCreatingLab] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabPhone, setNewLabPhone] = useState('');

  const [showReenvioPrompt, setShowReenvioPrompt] = useState(false);
  const [motivoReenvio, setMotivoReenvio] = useState('');
  const [nomeReenvio, setNomeReenvio] = useState('');

  const [historico, setHistorico] = useState<any[]>([]);
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [localLaboratorios, setLocalLaboratorios] = useState<ProteseLaboratorio[]>(laboratorios);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Observations and Files
  const [observacoesList, setObservacoesList] = useState<{text: string, date: string, user: string}[]>([]);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<{name: string, url: string}[]>([]);

  useEffect(() => {
    if (empresaId) {
      patientService.fetchPatients(empresaId).then(setPatients);
      specialistService.fetchSpecialists(empresaId).then(setSpecialists);
    }
    if (solicitacao?.id) {
      loadHistorico();
      // Fetch files
      supabase.storage.from('proteses').list(solicitacao.id).then(({ data }) => {
        if (data) {
          const files = data.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({
            name: f.name,
            url: supabase.storage.from('proteses').getPublicUrl(`${solicitacao.id}/${f.name}`).data.publicUrl
          }));
          setExistingFiles(files);
        }
      });
    }
    if (solicitacao?.paciente_nome) {
      setPatientSearch(solicitacao.paciente_nome);
    }
    if (solicitacao?.observacoes_internas) {
      try {
        const parsed = JSON.parse(solicitacao.observacoes_internas);
        if (Array.isArray(parsed)) setObservacoesList(parsed);
        else setObservacoesList([{ text: solicitacao.observacoes_internas, date: new Date().toISOString(), user: 'Sistema' }]);
      } catch (e) {
        setObservacoesList([{ text: solicitacao.observacoes_internas, date: new Date().toISOString(), user: 'Sistema' }]);
      }
    }
  }, [solicitacao, empresaId]);

  const loadHistorico = async () => {
    const { data } = await supabase
      .from('protese_historico')
      .select('*')
      .eq('solicitacao_id', solicitacao!.id)
      .order('created_at', { ascending: false });
    if (data) setHistorico(data);
  };

  const handleChange = (field: keyof ProteseSolicitacao, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
    (p.phone && p.phone.includes(patientSearch)) || 
    (p.cpf && p.cpf.includes(patientSearch))
  ).slice(0, 5);

  const handleStatusChange = async (newStatus: ProteseStatus, customUserName?: string) => {
    if (!solicitacao?.id || newStatus === formData.status) return;

    handleChange('status', newStatus);

    // Auto save status change
    try {
      let userName = customUserName;
      if (!userName) {
        const { data: userData } = await supabase.auth.getUser();
        userName = userData.user?.email || 'Usuário';
      }

      await supabase
        .from('protese_solicitacoes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', solicitacao.id);

      await supabase
        .from('protese_historico')
        .insert({
          empresa_id: empresaId,
          solicitacao_id: solicitacao.id,
          status_anterior: solicitacao.status,
          status_novo: newStatus,
          usuario_nome: userName
        });

      loadHistorico();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLab = async () => {
    if (!newLabName || !newLabPhone) return;
    try {
      const { data, error } = await supabase
        .from('protese_laboratorios')
        .insert({
          empresa_id: empresaId,
          nome: newLabName,
          telefone: newLabPhone
        })
        .select()
        .single();

      if (error) throw error;

      setLocalLaboratorios(prev => [...prev, data]);
      handleChange('laboratorio_id', data.id);
      setIsCreatingLab(false);
      setNewLabName('');
      setNewLabPhone('');
    } catch (e: any) {
      console.error(e);
      alert('Erro ao criar laboratório: ' + (e.message || 'Erro desconhecido'));
    }
  };

  const handleAddObservacao = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!novaObservacao.trim()) return;
    const { data } = await supabase.auth.getUser();
    const userName = data.user?.email || 'Usuário';
    const newList = [...observacoesList, { text: novaObservacao, date: new Date().toISOString(), user: userName }];
    setObservacoesList(newList);
    handleChange('observacoes_internas', JSON.stringify(newList));
    setNovaObservacao('');
  };

  const handleSolicitarColeta = async () => {
    let clinicName = "Nossa Clínica";
    try {
      const { data } = await supabase.from('empresas').select('Nome').eq('id', empresaId).single();
      if (data?.Nome) clinicName = data.Nome;
    } catch (e) {}

    const publicLink = `${window.location.origin}/protese/${solicitacao?.id}`;
    const msg = `Olá! Aqui é da Clínica ${clinicName}. Solicitamos a coleta referente ao serviço "${formData.descricao_servico || 'Prótese'}". Para visualizar os detalhes da solicitação, clique no link abaixo: ${publicLink}\n\nFicamos no aguardo da confirmação. Obrigado(a)!`;

    const labPhone = localLaboratorios.find(l => l.id === formData.laboratorio_id)?.telefone || '';
    const phoneFormatted = labPhone.replace(/\D/g, '');
    
    if (!phoneFormatted) {
      alert('O laboratório selecionado não possui um telefone válido.');
      return;
    }

    const waUrl = `https://wa.me/55${phoneFormatted}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userName = userData.user?.email || 'Usuário';

      const payload = { ...formData, empresa_id: empresaId, updated_at: new Date().toISOString() };
      delete payload.laboratorio;

      let savedId = solicitacao?.id;

      if (solicitacao?.id) {
        await supabase
          .from('protese_solicitacoes')
          .update(payload)
          .eq('id', solicitacao.id);
      } else {
        const { data, error } = await supabase
          .from('protese_solicitacoes')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        savedId = data.id;

        await supabase
          .from('protese_historico')
          .insert({
            empresa_id: empresaId,
            solicitacao_id: data.id,
            status_novo: data.status,
            usuario_nome: userName
          });
      }

      // Upload files
      if (savedId && selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          await supabase.storage.from('proteses').upload(`${savedId}/${fileName}`, file, { upsert: true });
        }
      }

      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">

      {showReenvioPrompt && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 rounded-xl">
           <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex items-center gap-3 text-orange-600 mb-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-bold text-slate-800 text-lg">Reenviar ao Laboratório</h3>
             </div>
             <p className="text-sm text-slate-600 mb-4 bg-orange-50 border border-orange-100 p-3 rounded-lg">
               O serviço retornará para a etapa de <strong>"Reenviado ao laboratório"</strong>. Por favor, informe o motivo do retorno e quem está realizando a movimentação:
             </p>
             <textarea
               value={motivoReenvio}
               onChange={e => setMotivoReenvio(e.target.value)}
               className="w-full border border-slate-300 rounded-lg p-3 text-sm resize-none mb-3 focus:ring-2 focus:ring-orange-500 focus:outline-none"
               rows={3}
               placeholder="Motivo (Ex: Refazer a cor)"
             />
             <input
               type="text"
               value={nomeReenvio}
               onChange={e => setNomeReenvio(e.target.value)}
               className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-orange-500 focus:outline-none"
               placeholder="Seu nome (Ex: João Silva)"
             />
             <div className="flex justify-end gap-3">
               <button onClick={() => { setShowReenvioPrompt(false); setMotivoReenvio(''); setNomeReenvio(''); }} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
               <button onClick={async () => {
                 if (!motivoReenvio.trim() || !nomeReenvio.trim()) { alert('O motivo e o nome são obrigatórios.'); return; }

                 let newList = [...observacoesList];
                 newList.push({
                    text: `Motivo do Reenvio: ${motivoReenvio}`,
                    date: new Date().toISOString(),
                    user: nomeReenvio.trim()
                 });
                 setObservacoesList(newList);
                 const observacoes_internas = JSON.stringify(newList);

                 handleChange('observacoes_internas', observacoes_internas);
                 handleStatusChange('Reenviado ao Laboratório', nomeReenvio.trim());
                 setShowReenvioPrompt(false);
                 setMotivoReenvio('');
                 setNomeReenvio('');
               }} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Confirmar</button>
             </div>
           </div>
        </div>
      )}

        <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between bg-slate-50 gap-3 relative">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 pr-8 md:pr-0">
            <h2 className="text-xl font-bold text-slate-800">
              Detalhes da Solicitação
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Status:</span>
              <select
                value={formData.status}
                onChange={(e) => handleStatusChange(e.target.value as ProteseStatus)}
                className="text-sm font-medium border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-2">
            X
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          <div className="flex-1 overflow-y-auto p-4 md:p-6 md:border-r border-slate-200">

            {formData.status === 'Reenviado ao Laboratório' && observacoesList.length > 0 && (() => {
              const lastMotivo = [...observacoesList].reverse().find((o: any) => o.text && o.text.startsWith('Motivo do Reenvio:'));
              if (lastMotivo) {
                return (
                  <div className="mb-4 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95 shadow-sm">
                    <span className="text-xl mt-0.5">⚠️</span>
                    <div>
                      <h4 className="font-bold text-orange-800 text-sm">Serviço Retornado - Motivo:</h4>
                      <p className="text-sm text-orange-700 mt-1 leading-relaxed">{lastMotivo.text.replace('Motivo do Reenvio: ', '')}</p>
                      <p className="text-xs text-orange-600/80 mt-1.5 font-bold">Retornado por: {lastMotivo.user || 'Desconhecido'}</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setActiveTab('dados')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dados' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Dados da solicitação
              </button>
              <button
                onClick={() => setActiveTab('envio')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'envio' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Dados do envio
              </button>
            </div>

            {activeTab === 'envio' && solicitacao?.paciente_id && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{solicitacao.paciente_nome}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <User size={12} />
                    Paciente vinculado
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('appState_selectedPatientId', solicitacao.paciente_id!);
                    navigate(`/pacientes/cadastro/${solicitacao.paciente_id}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink size={14} />
                  Abrir Prontuário
                </button>
              </div>
            )}

            {activeTab === 'dados' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Paciente</label>
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value);
                          handleChange('paciente_nome', e.target.value);
                          setShowPatientDropdown(true);
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                        className="w-full px-3 py-2 border border-blue-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Busque por nome, telefone ou CPF"
                      />
                      {showPatientDropdown && patientSearch && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                          {filteredPatients.length === 0 && (
                            <div className="px-3 py-4 text-sm text-slate-400 text-center">Nenhum paciente encontrado.</div>
                          )}
                          {filteredPatients.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setPatientSearch(p.name);
                                handleChange('paciente_nome', p.name);
                                handleChange('paciente_id', p.id);
                                setShowPatientDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 truncate flex justify-between items-center group"
                            >
                              <span className="font-medium text-slate-700 group-hover:text-blue-700">{p.name}</span>
                              <span className="text-slate-400 text-xs">{p.cpf || p.phone || ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Responsável</label>
                      <select
                        value={formData.responsavel_nome || ''}
                        onChange={(e) => handleChange('responsavel_nome', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecionar</option>
                        {specialists.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Laboratório</label>
                      {isCreatingLab ? (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                          <input
                            type="text"
                            placeholder="Nome do Lab"
                            value={newLabName}
                            onChange={(e) => setNewLabName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                          />
                          <input
                            type="text"
                            placeholder="Telefone do Lab"
                            value={newLabPhone}
                            onChange={(e) => setNewLabPhone(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCreatingLab(false)} className="text-sm text-slate-500 px-2 py-1">Cancelar</button>
                            <button onClick={handleCreateLab} className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md">Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <select
                            value={formData.laboratorio_id || ''}
                            onChange={(e) => {
                              if (e.target.value === 'new') {
                                setIsCreatingLab(true);
                              } else {
                                handleChange('laboratorio_id', e.target.value);
                              }
                            }}
                            className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Selecionar</option>
                            {localLaboratorios.map(lab => (
                              <option key={lab.id} value={lab.id}>{lab.nome}</option>
                            ))}
                            <option value="new" className="font-bold text-blue-600">+ Cadastrar novo laboratório</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dente(s)</label>
                      <select
                        value={formData.dentes || ''}
                        onChange={(e) => handleChange('dentes', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                      >
                        <option value="">Selecionar</option>
                        {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(d => (
                          <option key={d} value={d}>Dente {d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cor</label>
                      <input
                        type="text"
                        value={formData.cor || ''}
                        onChange={(e) => handleChange('cor', e.target.value)}
                        placeholder="Ex: A2, B1, Bleach..."
                        className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição do serviço</label>
                    <input
                      type="text"
                      value={formData.descricao_servico || ''}
                      onChange={(e) => handleChange('descricao_servico', e.target.value)}
                      placeholder="Ex: Coroa em zircônia, Prótese parcial removível..."
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Trabalho a ser executado</label>
                    <textarea
                      rows={4}
                      value={formData.trabalho_executado || ''}
                      onChange={(e) => handleChange('trabalho_executado', e.target.value)}
                      placeholder="Descreva o trabalho a ser realizado pelo laboratório..."
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                      <span>Anexos</span>
                      <span className="text-xs text-slate-400 font-normal">Arquivos serão salvos ao clicar em Salvar</span>
                    </label>
                    <label className="w-full border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer bg-white">
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files) {
                            const maxSizeBytes = 48 * 1024 * 1024;
                            const validFiles = Array.from(e.target.files).filter(f => {
                              if (f.size > maxSizeBytes) {
                                alert('Tamanho do arquivo maior que o permitido, caso queira subir esse arquivo contate o suporte - Limite atingido-');
                                return false;
                              }
                              return true;
                            });
                            if (validFiles.length > 0) setSelectedFiles(prev => [...prev, ...validFiles]);
                            e.target.value = '';
                          }
                        }} 
                      />
                      <div className="flex items-center gap-2 font-medium">
                        <Camera size={18} />
                        <span className="text-sm">Anexar imagens ou documentos</span>
                      </div>
                    </label>
                    
                    {/* Lista de Arquivos */}
                    {(existingFiles.length > 0 || selectedFiles.length > 0) && (
                      <div className="mt-3 space-y-2">
                        {existingFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm">
                            <div className="flex items-center gap-2 truncate">
                              <Paperclip size={14} className="text-blue-500 flex-shrink-0" />
                              <a href={file.url} target="_blank" rel="noreferrer" className="text-slate-700 hover:text-blue-600 truncate">{file.name}</a>
                            </div>
                            <a href={file.url} download target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 p-1">
                              <Download size={14} />
                            </a>
                          </div>
                        ))}
                        {selectedFiles.map((file, i) => (
                          <div key={`new-${i}`} className="flex items-center justify-between p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-sm">
                            <div className="flex items-center gap-2 truncate">
                              <Paperclip size={14} className="text-blue-500 flex-shrink-0" />
                              <span className="text-slate-700 truncate">{file.name}</span>
                              <span className="text-xs text-slate-400 bg-white px-1.5 rounded border border-slate-100">Novo</span>
                            </div>
                            <button onClick={() => setSelectedFiles(prev => prev.filter((_, index) => index !== i))} className="text-slate-400 hover:text-red-500 p-1">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observações internas</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={novaObservacao}
                        onChange={(e) => setNovaObservacao(e.target.value)}
                        placeholder="Adicionar observação..."
                        className="flex-1 px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddObservacao(e as any);
                          }
                        }}
                      />
                      <button onClick={handleAddObservacao} className="px-4 py-2 bg-[#8da5e0] text-white font-semibold text-sm rounded-lg hover:bg-[#7a92cc] transition-colors flex items-center gap-1">
                        <Plus size={16} />
                        Adicionar
                      </button>
                    </div>
                    <div className="text-right text-xs text-slate-400 mt-1 mb-3">
                      {novaObservacao.length}/255
                    </div>

                    <div className="space-y-2 mt-2">
                      {observacoesList.map((obs, i) => (
                        <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm">
                          <p className="text-slate-700 mb-1">{obs.text}</p>
                          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                            <span>{obs.user}</span>
                            <span>{new Date(obs.date).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data do envio</label>
                    <input
                      type="date"
                      value={formData.data_envio || ''}
                      onChange={(e) => handleChange('data_envio', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prazo de entrega</label>
                    <input
                      type="date"
                      value={formData.prazo_entrega || ''}
                      onChange={(e) => handleChange('prazo_entrega', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Forma de envio</label>
                    <input
                      type="text"
                      value={formData.forma_envio || ''}
                      onChange={(e) => handleChange('forma_envio', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Responsável pela retirada</label>
                    <input
                      type="text"
                      value={formData.responsavel_retirada || ''}
                      onChange={(e) => handleChange('responsavel_retirada', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações sobre o envio</label>
                  <textarea
                    rows={4}
                    value={formData.observacoes_envio || ''}
                    onChange={(e) => handleChange('observacoes_envio', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
                    placeholder="Informações extras referentes ao envio..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-80 bg-slate-50 p-4 md:p-6 flex flex-col min-h-[300px] md:min-h-0 border-t md:border-t-0 border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={18} />
              Histórico
            </h3>
            <div className="flex-1 overflow-y-auto relative pl-4 border-l-2 border-slate-200 space-y-6">
              {historico.map((hist, index) => (
                <div key={hist.id} className="relative">
                  <div className="absolute -left-[21px] w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {hist.status_anterior ? `${hist.status_anterior} > ${hist.status_novo}` : hist.status_novo}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {hist.usuario_nome} - {new Date(hist.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {historico.length === 0 && (
                <p className="text-sm text-slate-400">Nenhum histórico registrado.</p>
              )}
            </div>
          </div>

        </div>

        <div className="px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col-reverse md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            {solicitacao?.id && (
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (window.confirm('Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.')) {
                      try {
                        await supabase.from('protese_solicitacoes').delete().eq('id', solicitacao.id);
                        onClose();
                      } catch (e) {
                        console.error(e);
                        alert('Erro ao excluir solicitação.');
                      }
                    }
                  }}
                  className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 font-medium"
                >
                  Excluir
                </button>
                {(solicitacao.status === 'Solicitação' || solicitacao.status === 'Retornado à Clínica') && (
                  <button
                    onClick={handleSolicitarColeta}
                    className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                  >
                    <Phone size={16} />
                    Solicitar Coleta
                  </button>
                )}
                {solicitacao.status === 'Retornado à Clínica' && (
                  <button
                    onClick={() => setShowReenvioPrompt(true)}
                    className="px-4 py-2 text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2 font-bold text-sm"
                  >
                    <span className="text-lg leading-none">🔄</span>
                    Reenviar ao laboratório
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
