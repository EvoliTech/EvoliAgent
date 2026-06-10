import React, { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';

interface StepBudgetTypeProps {
    useBudget: boolean;
    patientId?: number;
    selectedType?: string;
    selectedBudget?: number;
    onSelectType: (type: string) => void;
    onSelectBudget: (budgetId: number) => void;
}

export const StepBudgetType: React.FC<StepBudgetTypeProps> = ({ 
    useBudget, 
    patientId, 
    selectedType, 
    selectedBudget, 
    onSelectType, 
    onSelectBudget 
}) => {
    const { empresaId } = useCompany();
    const [search, setSearch] = useState('');
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Tipos de compromisso (mock baseado na imagem)
    const appointmentTypes = [
        "Acompanhamento De Doenças Crônicas",
        "Aplicação De Toxina Botulínica",
        "Atendimento Pós-Operatório",
        "Atendimento Pré-Operatório",
        "Avaliação E Diagnóstico De Sintomas",
        "Consulta de Rotina",
        "Emergência"
    ];

    const filteredTypes = appointmentTypes.filter(t => t.toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        const fetchBudgets = async () => {
            if (!empresaId || !patientId || !useBudget) return;
            setLoading(true);
            try {
                // Supondo que existe uma tabela Orcamento no backend do usuário
                const { data } = await supabase
                    .from('Orcamento')
                    .select('id, data, valorTotal, status')
                    .eq('IDEmpresa', empresaId)
                    .eq('IDCliente', patientId)
                    .in('status', ['Pendente', 'Aprovado']) // Orçamentos abertos
                    .order('data', { ascending: false });

                if (data) setBudgets(data);
            } catch (error) {
                console.error("Erro ao buscar orçamentos", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBudgets();
    }, [empresaId, patientId, useBudget]);

    return (
        <div className="w-full max-w-md mx-auto flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">
                {useBudget ? 'Vincular Orçamento' : 'Tipo de Compromisso'}
            </h3>
            
            <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder={useBudget ? "Buscar orçamento" : "Buscar atendimento"} 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                {useBudget ? (
                    // View: Lista de Orçamentos
                    loading ? (
                        <div className="text-center py-8 text-slate-400 text-sm font-medium">Buscando orçamentos...</div>
                    ) : budgets.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm font-medium">Nenhum orçamento aberto encontrado para este paciente.</div>
                    ) : (
                        budgets.map(b => (
                            <button
                                key={b.id}
                                onClick={() => onSelectBudget(b.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                    selectedBudget === b.id 
                                        ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100/50' 
                                        : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                        <FileText size={18} className="text-orange-600" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-slate-700">Orçamento #{b.id}</span>
                                        <span className="text-xs text-slate-500 font-medium">{new Date(b.data).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                                <span className="font-bold text-slate-800">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.valorTotal)}
                                </span>
                            </button>
                        ))
                    )
                ) : (
                    // View: Tipo de Compromisso
                    filteredTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => onSelectType(type)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                selectedType === type 
                                    ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100/50 text-blue-700' 
                                    : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-sm text-slate-700'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedType === type ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {selectedType === type && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                            <span className="font-bold text-sm">{type}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
