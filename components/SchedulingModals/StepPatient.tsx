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
                <button className="w-full py-4 border-2 border-blue-600 text-blue-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                    <UserPlus size={18} /> Novo paciente
                </button>

                <div className="flex items-center justify-between py-2">
                    <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">VOU USAR UM ORÇAMENTO</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={useBudget}
                            onChange={(e) => onToggleBudget(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

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
