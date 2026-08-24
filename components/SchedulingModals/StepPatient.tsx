import React, { useState, useEffect } from 'react';
import { Search, User, UserPlus } from 'lucide-react';
import { SupabaseCustomer } from '../../types';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';

interface StepPatientProps {
    selected?: SupabaseCustomer;
    useBudget: boolean;
    onSelectPatient: (p: SupabaseCustomer) => void;
    onToggleBudget: (v: boolean) => void;
    onNext: () => void;
}

export const StepPatient: React.FC<StepPatientProps> = ({ selected, useBudget, onSelectPatient, onToggleBudget, onNext }) => {
    const { empresaId } = useCompany();
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState<SupabaseCustomer[]>([]);
    const [loading, setLoading] = useState(false);

    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchPatients = async () => {
            if (!empresaId || search.length < 2) return;
            setLoading(true);
            const { data } = await supabase
                .from('Cliente')
                .select('*')
                .eq('IDEmpresa', empresaId)
                .ilike('nome', `%${search}%`)
                .limit(10);
            
            if (data) setPatients(data);
            setLoading(false);
        };

        const debounce = setTimeout(fetchPatients, 300);
        return () => clearTimeout(debounce);
    }, [search, empresaId]);

    const handleCreatePatient = async () => {
        if (!empresaId || !newName || !newPhone) return;
        setIsSaving(true);
        try {
            const phoneClean = newPhone.replace(/\D/g, '');
            const newCustomer = {
                nome: newName,
                nome_completo: newName,
                telefoneWhatsapp: phoneClean,
                IDEmpresa: empresaId,
                botAtivo: 'true',
                status_lead_no_crm: 'Novo'
            };

            const { data, error } = await supabase
                .from('Cliente')
                .insert(newCustomer)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                onSelectPatient(data);
                setIsCreating(false);
                setNewName('');
                setNewPhone('');
            }
        } catch (error: any) {
            alert('Erro ao criar paciente: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isCreating) {
        return (
            <div className="w-full max-w-md mx-auto flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Novo Paciente</h3>
                
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Ex: João da Silva"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (WhatsApp)</label>
                        <input 
                            type="text" 
                            value={newPhone}
                            onChange={e => setNewPhone(e.target.value)}
                            placeholder="Ex: 11999999999"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="mt-auto pt-6 flex gap-3">
                    <button 
                        onClick={() => setIsCreating(false)}
                        className="flex-1 py-4 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleCreatePatient}
                        disabled={isSaving || !newName || !newPhone}
                        className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar e Usar'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Paciente</h3>
            
            <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar paciente" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                {selected && search === '' ? (
                    <div className="w-full flex flex-col p-4 rounded-2xl border border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100/50 relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                <User size={18} className="text-white" />
                            </div>
                            <span className="font-bold text-blue-900 text-lg">{selected.nome}</span>
                        </div>
                        <div className="text-sm text-blue-800/70 ml-13 flex flex-col gap-1">
                            <span>Telefone: {selected.telefoneWhatsapp || 'N/A'}</span>
                        </div>
                    </div>
                ) : (
                    patients.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { onSelectPatient(p); setSearch(''); }}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <User size={18} className="text-slate-400" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-slate-700">{p.nome}</span>
                                <span className="text-xs text-slate-500">{p.telefoneWhatsapp}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Ações e Switch no rodapé do painel */}
            <div className="mt-auto pt-6 border-t border-slate-200/50 flex flex-col gap-4">
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full py-4 border-2 border-blue-600 text-blue-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                >
                    <UserPlus size={18} /> Novo paciente
                </button>



                <button 
                    onClick={onNext}
                    disabled={!selected}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200"
                >
                    Avançar
                </button>
            </div>
        </div>
    );
};
