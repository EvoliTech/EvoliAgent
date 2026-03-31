import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, ChevronDown, Check, Trash2, Link } from 'lucide-react';
import { tarefaService, Tarefa } from '../services/tarefaService';

interface TarefasModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
  paciente: { id: string | number; name: string };
}

const LISTAS = ['Minhas tarefas', 'Tarefas da equipe'];

// Returns a friendly label for an ISO date string (YYYY-MM-DD)
function getPrazoLabel(prazo?: string): string {
  if (!prazo) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(prazo + 'T00:00:00');
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff < 0) return `Atrasado · ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getPrazoColor(prazo?: string): string {
  if (!prazo) return '#64748b';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(prazo + 'T00:00:00');
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return '#dc2626'; // overdue — red
  if (diff === 0) return '#dc2626'; // today — red
  if (diff === 1) return '#ea580c'; // tomorrow — orange
  return '#2563eb'; // future — blue
}

// ------- Nova Tarefa Sub-modal -------
interface NovaTarefaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dados: Pick<Tarefa, 'titulo' | 'descricao' | 'prazo' | 'lista'>) => void;
  pacienteNome: string;
}

const NovaTarefaModal: React.FC<NovaTarefaModalProps> = ({ isOpen, onClose, onSave, pacienteNome }) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazo, setPrazo] = useState('');
  const [lista, setLista] = useState('Minhas tarefas');
  const [showListaDropdown, setShowListaDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitulo('');
      setDescricao('');
      setPrazo('');
      setLista('Minhas tarefas');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!titulo.trim()) return;
    onSave({ titulo: titulo.trim(), descricao: descricao.trim(), prazo, lista });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200"
        style={{ zIndex: 201 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-[#1e293b]">Nova tarefa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Título */}
          <div>
            <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Qual tarefa você precisa fazer?"
              className="w-full border border-[#3b82f6] rounded-lg px-3.5 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Adicione detalhes sobre a tarefa..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
            />
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Prazo</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-gray-400 pointer-events-none">
                <Calendar size={15} />
              </span>
              <input
                type="date"
                value={prazo}
                onChange={e => setPrazo(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-9 py-2.5 text-[14px] text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all bg-white cursor-pointer"
                style={{ colorScheme: 'light' }}
              />
              {prazo && (
                <button
                  type="button"
                  onClick={() => setPrazo('')}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Lista e Paciente */}
          <div className="grid grid-cols-2 gap-3">
            {/* Lista */}
            <div>
              <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Lista</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowListaDropdown(p => !p)}
                  className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] text-gray-600 hover:border-gray-300 transition-all bg-white"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    {lista}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${showListaDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showListaDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-10 py-1 animate-in fade-in zoom-in-95 duration-150">
                    {LISTAS.map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => { setLista(l); setShowListaDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-blue-50 flex items-center justify-between transition-colors ${lista === l ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          {l}
                        </span>
                        {lista === l && <Check size={14} className="text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Paciente (fixed) */}
            <div>
              <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Paciente</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-[13px] text-gray-700">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400 shrink-0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                <span className="truncate font-medium text-gray-700">{pacienteNome}</span>
                <span className="ml-auto text-gray-400 hover:text-gray-500 cursor-default">
                  <X size={12} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[14px] font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!titulo.trim()}
            className="px-5 py-2 text-[14px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
          >
            Criar tarefa
          </button>
        </div>
      </div>
    </div>
  );
};

// ------- Main Tarefas Modal -------
export const TarefasModal: React.FC<TarefasModalProps> = ({ isOpen, onClose, empresaId, paciente }) => {
  const pacienteId = Number(paciente.id);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [showNovaTarefa, setShowNovaTarefa] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      tarefaService.fetch(empresaId, pacienteId).then(data => {
        setTarefas(data);
        setLoading(false);
      });
    }
  }, [isOpen, empresaId, pacienteId]);

  if (!isOpen) return null;

  const handleCriarTarefa = async (dados: Pick<Tarefa, 'titulo' | 'descricao' | 'prazo' | 'lista'>) => {
    // Optimistic insert with temp id
    const temp: Tarefa = {
      id: 'temp-' + Date.now(),
      ...dados,
      paciente_id: pacienteId,
      paciente_nome: paciente.name,
      empresa_id: empresaId,
      concluida: false,
      created_at: new Date().toISOString(),
    };
    setTarefas(prev => [temp, ...prev]);

    const nova = await tarefaService.create(empresaId, pacienteId, paciente.name, dados);
    if (nova) {
      setTarefas(prev => prev.map(t => t.id === temp.id ? nova : t));
    } else {
      // rollback on error
      setTarefas(prev => prev.filter(t => t.id !== temp.id));
    }
  };

  const handleToggle = async (id: string, concluida: boolean) => {
    // Optimistic update
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, concluida } : t));
    const ok = await tarefaService.toggle(id, concluida);
    if (!ok) {
      // rollback
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, concluida: !concluida } : t));
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic delete
    setTarefas(prev => prev.filter(t => t.id !== id));
    await tarefaService.delete(id);
  };

  const pendentes = tarefas.filter(t => !t.concluida);
  const concluidas = tarefas.filter(t => t.concluida);

  return (
    <>
      <div className="fixed inset-0 z-[150] flex items-center justify-center">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col animate-in fade-in zoom-in-95 duration-200"
          style={{ zIndex: 151, maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-[18px] font-bold text-[#1e293b]">Tarefas</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>

          {/* Sub-header */}
          <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div>
                <p className="text-[12px] text-gray-500">Tarefas de</p>
                <p className="text-[15px] font-bold text-[#1e293b]">{paciente.name}</p>
              </div>
            </div>
            <button
              onClick={() => setShowNovaTarefa(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-[13px] shadow-sm transition-all"
            >
              <Plus size={15} />
              Nova tarefa
            </button>
          </div>

          {/* Count */}
          {tarefas.length > 0 && (
            <div className="px-7 pt-3 pb-1 shrink-0">
              <span className="text-[13px] text-gray-500 font-medium">
                {tarefas.length} {tarefas.length === 1 ? 'tarefa' : 'tarefas'}
              </span>
            </div>
          )}

          {/* Task list */}
          <div className="px-7 py-4 overflow-y-auto flex-1 flex flex-col gap-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tarefas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <img src="/tarefa.png" alt="Sem tarefas" className="w-48 h-auto opacity-80 mb-5 drop-shadow-sm" />
                <p className="text-[15px] font-semibold text-gray-600 mb-1">Nenhuma tarefa ainda</p>
                <p className="text-[13px] text-gray-400">Clique em "Nova tarefa" para começar</p>
              </div>
            ) : (
              <>
                {/* Pendentes */}
                {pendentes.map(tarefa => (
                  <TarefaItem
                    key={tarefa.id}
                    tarefa={tarefa}
                    onToggle={() => handleToggle(tarefa.id, !tarefa.concluida)}
                    onDelete={() => handleDelete(tarefa.id)}
                  />
                ))}

                {/* Concluídas */}
                {concluidas.length > 0 && (
                  <>
                    <div className="mt-4 mb-2">
                      <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">
                        Concluídas ({concluidas.length})
                      </span>
                    </div>
                    {concluidas.map(tarefa => (
                      <TarefaItem
                        key={tarefa.id}
                        tarefa={tarefa}
                        onToggle={() => handleToggle(tarefa.id, !tarefa.concluida)}
                        onDelete={() => handleDelete(tarefa.id)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modal: Nova Tarefa */}
      <NovaTarefaModal
        isOpen={showNovaTarefa}
        onClose={() => setShowNovaTarefa(false)}
        onSave={handleCriarTarefa}
        pacienteNome={paciente.name}
      />
    </>
  );
};

// ------- Tarefa Item -------
interface TarefaItemProps {
  tarefa: Tarefa;
  onToggle: () => void;
  onDelete: () => void;
}

const TarefaItem: React.FC<TarefaItemProps> = ({ tarefa, onToggle, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all group ${
        tarefa.concluida
          ? 'border-gray-100 bg-gray-50/50 opacity-70'
          : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          tarefa.concluida
            ? 'border-blue-500 bg-blue-500 text-white'
            : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {tarefa.concluida && <Check size={11} strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold leading-snug ${tarefa.concluida ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {tarefa.titulo}
        </p>
        {tarefa.descricao && (
          <p className={`text-[13px] mt-0.5 ${tarefa.concluida ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
            {tarefa.descricao}
          </p>
        )}

        {/* Tags */}
        <div className="flex items-center flex-wrap gap-2 mt-2">
          {tarefa.prazo && (
            <span
              className="flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: getPrazoColor(tarefa.prazo),
                backgroundColor: getPrazoColor(tarefa.prazo) + '18',
              }}
            >
              <Calendar size={11} />
              {getPrazoLabel(tarefa.prazo)}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11.5px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {tarefa.lista}
          </span>
          <span className="flex items-center gap-1 text-[11.5px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            <Link size={10} />
            {tarefa.paciente_nome}
          </span>
        </div>
      </div>

      {/* Delete (visible on hover) */}
      {hovered && (
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};
