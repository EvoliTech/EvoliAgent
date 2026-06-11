import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, X, CreditCard, Info, Calculator, QrCode, Edit2 } from 'lucide-react';
import { PageType } from '../types';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';

interface FeesSettingsProps {
    onNavigate: (page: PageType) => void;
}

interface Machine {
    id: string;
    nome: string;
    tipo: 'Crédito e débito' | 'Crédito' | 'Débito';
    pixFee: number;
    debitoDias: string;
    debitoFee: number;
    creditoForma: string;
    creditoDiasUmaVez?: string;
    creditoFees: number[]; // 12 items
}

const DEFAULT_MACHINE: Partial<Machine> = {
    nome: '',
    tipo: 'Crédito e débito',
    pixFee: 0,
    debitoDias: '',
    debitoFee: 0,
    creditoForma: '',
    creditoDiasUmaVez: '',
    creditoFees: Array(12).fill(0)
};

export const FeesSettings: React.FC<FeesSettingsProps> = ({ onNavigate }) => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<Partial<Machine>>(DEFAULT_MACHINE);
    const [isLoading, setIsLoading] = useState(true);
    const { empresaId } = useCompany();

    const fetchMachines = async () => {
        if (!empresaId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('maquininhas')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            if (data) {
                // Map from snake_case db columns to camelCase TS interface
                const mappedMachines: Machine[] = data.map(dbMachine => ({
                    id: dbMachine.id,
                    nome: dbMachine.nome,
                    tipo: dbMachine.tipo,
                    pixFee: dbMachine.pix_fee || 0,
                    debitoDias: dbMachine.debito_dias || '',
                    debitoFee: dbMachine.debito_fee || 0,
                    creditoForma: dbMachine.credito_forma || '',
                    creditoDiasUmaVez: dbMachine.credito_dias_uma_vez || '',
                    creditoFees: dbMachine.credito_fees || Array(12).fill(0)
                }));
                setMachines(mappedMachines);
            }
        } catch (e) {
            console.error('Error loading machines', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMachines();
    }, [empresaId]);

    const handleSaveMachines = (newMachines: Machine[]) => {
        setMachines(newMachines);
        localStorage.setItem('appState_machines', JSON.stringify(newMachines));
    };

    const handleOpenModal = () => {
        setEditingMachine(DEFAULT_MACHINE);
        setIsModalOpen(true);
    };

    const handleSaveModal = async () => {
        if (!editingMachine.nome) {
            alert('Por favor, informe o nome da máquina.');
            return;
        }

        if (!empresaId) {
            alert('Erro: Empresa não identificada.');
            return;
        }

        const isUpdating = !!editingMachine.id;
        
        const dbPayload = {
            empresa_id: empresaId,
            nome: editingMachine.nome,
            tipo: editingMachine.tipo,
            pix_fee: editingMachine.pixFee || 0,
            debito_dias: editingMachine.debitoDias || '',
            debito_fee: editingMachine.debitoFee || 0,
            credito_forma: editingMachine.creditoForma || '',
            credito_dias_uma_vez: editingMachine.creditoDiasUmaVez || '',
            credito_fees: editingMachine.creditoFees || Array(12).fill(0)
        };

        try {
            if (isUpdating) {
                const { error } = await supabase
                    .from('maquininhas')
                    .update(dbPayload)
                    .eq('id', editingMachine.id)
                    .eq('empresa_id', empresaId);
                
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('maquininhas')
                    .insert([dbPayload]);
                
                if (error) throw error;
            }

            // Sync with local state and close
            await fetchMachines();
            setIsModalOpen(false);
        } catch (e) {
            console.error('Error saving machine:', e);
            alert('Ocorreu um erro ao salvar a máquina.');
        }
    };

    const removeMachine = async (id: string) => {
        if (confirm('Tem certeza que deseja remover esta máquina?')) {
            try {
                const { error } = await supabase
                    .from('maquininhas')
                    .delete()
                    .eq('id', id)
                    .eq('empresa_id', empresaId);

                if (error) throw error;

                setMachines(machines.filter(m => m.id !== id));
            } catch (e) {
                console.error('Error removing machine:', e);
                alert('Erro ao remover máquina.');
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onNavigate('settings')}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
                    >
                        <ArrowLeft size={20} /> <span className="ml-1 text-sm font-semibold">Voltar</span>
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight ml-4">Taxas de maquininhas</h1>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md shadow-blue-200 transition-all flex items-center gap-2 text-sm"
                >
                    Adicionar máquina
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[60vh] flex flex-col p-6">
                
                {machines.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-48 h-48 mb-6 relative">
                            {/* Um ícone ilustrativo provisório parecido com maquina */}
                            <div className="absolute inset-0 bg-blue-50/50 rounded-2xl flex items-center justify-center">
                                <Calculator size={80} className="text-blue-300" />
                                <div className="absolute top-4 left-4 bg-yellow-400 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-lg border-2 border-white">?</div>
                                <div className="absolute bottom-4 right-4 bg-blue-500 rounded-xl p-3 shadow-lg border-2 border-white">
                                    <CreditCard size={28} className="text-white" />
                                </div>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-3">Você ainda não cadastrou suas maquininhas!</h2>
                        <p className="text-slate-500 max-w-lg leading-relaxed">
                            Cadastre suas máquinas para que o sistema te ajude a controlar as taxas e dê a baixa automática nos pagamentos realizados nos cartões de crédito e débito.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {machines.map(m => (
                            <div key={m.id} className="border border-slate-200 rounded-xl p-5 relative group hover:border-blue-300 transition-colors">
                                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingMachine(m); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-500 bg-white rounded-full p-1.5 shadow-sm transition-colors" title="Editar">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => removeMachine(m.id)} className="text-slate-400 hover:text-red-500 bg-white rounded-full p-1.5 shadow-sm transition-colors" title="Remover">
                                        <X size={14} />
                                    </button>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1">{m.nome}</h3>
                                <p className="text-sm font-semibold text-blue-600 mb-4">{m.tipo}</p>
                                
                                <div className="space-y-2 text-sm text-slate-600">
                                    <div className="flex justify-between border-b border-slate-100 pb-1">
                                        <span>Taxa PIX:</span>
                                        <span className="font-semibold">{m.pixFee}%</span>
                                    </div>
                                    {(m.tipo === 'Débito' || m.tipo === 'Crédito e débito') && (
                                        <div className="flex justify-between border-b border-slate-100 pb-1">
                                            <span>Taxa Débito:</span>
                                            <span className="font-semibold">{m.debitoFee}%</span>
                                        </div>
                                    )}
                                    {(m.tipo === 'Crédito' || m.tipo === 'Crédito e débito') && (
                                        <div className="flex justify-between pt-1">
                                            <span>Crédito 1x:</span>
                                            <span className="font-semibold">{m.creditoFees[0]}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-start pt-[5vh] pb-[5vh] px-4 animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false) }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">Adicionar maquininha</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Nome da máquina *</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: Stone Pagamentos (Master, Visa)"
                                        value={editingMachine.nome}
                                        onChange={(e) => setEditingMachine({...editingMachine, nome: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Tipo de pagamento *</label>
                                    <select
                                        value={editingMachine.tipo}
                                        onChange={(e) => setEditingMachine({...editingMachine, tipo: e.target.value as any})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                    >
                                        <option value="Crédito e débito">Crédito e débito</option>
                                        <option value="Crédito">Crédito</option>
                                        <option value="Débito">Débito</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4 flex gap-3 shrink-0 border border-blue-100/50">
                                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Após cadastrar as taxas, os débitos pagos com cartão de crédito/débito serão atualizados automaticamente pelo sistema no dia do repasse.
                                </p>
                                <button className="ml-auto flex items-start text-slate-400 hover:text-slate-600"><X size={16} /></button>
                            </div>

                            {/* Configuração de PIX */}
                            <div className="shrink-0 space-y-4">
                                <h3 className="font-bold text-slate-700 text-base">Configure o PIX</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-600">Taxa em % *</label>
                                        <input 
                                            type="text"
                                            value={editingMachine.pixFee ? editingMachine.pixFee + '' : ''}
                                            onChange={(e) => setEditingMachine({...editingMachine, pixFee: parseFloat(e.target.value.replace(',', '.')) || 0})}
                                            placeholder="Ex: 0,99"
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            {(editingMachine.tipo === 'Débito' || editingMachine.tipo === 'Crédito e débito') && (
                                <div className="shrink-0 space-y-4">
                                    <h3 className="font-bold text-slate-700 text-base">Configure o débito</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-600">Dias para receber*</label>
                                            <select
                                                value={editingMachine.debitoDias}
                                                onChange={(e) => setEditingMachine({...editingMachine, debitoDias: e.target.value})}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                            >
                                                <option value="">Selecionar</option>
                                                <option value="Na hora">Na hora</option>
                                                <option value="1 dia útil">1 dia útil</option>
                                                <option value="2 dias úteis">2 dias úteis</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-600">Taxa em % *</label>
                                            <input 
                                                type="text"
                                                value={editingMachine.debitoFee ? editingMachine.debitoFee + '' : ''}
                                                onChange={(e) => setEditingMachine({...editingMachine, debitoFee: parseFloat(e.target.value.replace(',', '.')) || 0})}
                                                placeholder="Ex: 1,33"
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(editingMachine.tipo === 'Crédito' || editingMachine.tipo === 'Crédito e débito') && (
                                <div className="shrink-0 space-y-4">
                                    <h3 className="font-bold text-slate-700 text-base">Configure o crédito</h3>
                                    
                                    <div className="space-y-1.5 md:w-1/2">
                                        <label className="text-sm font-bold text-slate-600">Forma de recebimento*</label>
                                        <select
                                            value={editingMachine.creditoForma}
                                            onChange={(e) => setEditingMachine({...editingMachine, creditoForma: e.target.value, creditoDiasUmaVez: e.target.value === 'Uma vez (Dias úteis)' ? editingMachine.creditoDiasUmaVez || 'Mesmo dia' : ''})}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                        >
                                            <option value="">Selecionar</option>
                                            <option value="Parcelado (Dias corridos)">Parcelado (Dias corridos)</option>
                                            <option value="Uma vez (Dias úteis)">Uma vez (Dias úteis)</option>
                                        </select>
                                    </div>
                                    
                                    {editingMachine.creditoForma === 'Uma vez (Dias úteis)' && (
                                        <div className="space-y-1.5 md:w-1/2 mt-2">
                                            <label className="text-sm font-bold text-slate-600">Dias para receber*</label>
                                            <select
                                                value={editingMachine.creditoDiasUmaVez}
                                                onChange={(e) => setEditingMachine({...editingMachine, creditoDiasUmaVez: e.target.value})}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                            >
                                                <option value="Mesmo dia">Mesmo dia</option>
                                                <option value="1 dia util">1 dia útil</option>
                                                {Array.from({length: 30}).map((_, i) => (
                                                    <option key={i+2} value={`${i+2} dias uteis`}>{i+2} dias úteis</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                        {Array.from({length: 12}).map((_, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600">{i + 1}x (taxa %)</label>
                                                <input 
                                                    type="text"
                                                    value={editingMachine.creditoFees?.[i] || ''}
                                                    onChange={(e) => {
                                                        const newFees = [...(editingMachine.creditoFees || Array(12).fill(0))];
                                                        newFees[i] = parseFloat(e.target.value.replace(',', '.')) || 0;
                                                        setEditingMachine({...editingMachine, creditoFees: newFees});
                                                    }}
                                                    placeholder="Ex: 1,33"
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 mt-auto shrink-0">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors bg-white shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveModal}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md shadow-blue-200 transition-all flex items-center gap-2"
                            >
                                <Save size={16}/> Salvar
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};
