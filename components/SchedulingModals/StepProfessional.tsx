import React, { useState } from 'react';
import { Search, User } from 'lucide-react';
import { Specialist } from '../../types';

interface StepProfessionalProps {
    specialists: Specialist[];
    selected?: Specialist;
    onSelect: (s: Specialist) => void;
}

export const StepProfessional: React.FC<StepProfessionalProps> = ({ specialists, selected, onSelect }) => {
    const [search, setSearch] = useState('');

    const filtered = specialists.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="w-full max-w-md mx-auto flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Profissional</h3>
            
            <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar profissional" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                {filtered.map(spec => (
                    <button
                        key={spec.id}
                        onClick={() => onSelect(spec)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                            selected?.id === spec.id 
                                ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100/50' 
                                : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-sm'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${spec.color || 'bg-slate-100'}`}>
                            <User size={18} className="text-white drop-shadow-sm" />
                        </div>
                        <span className="font-bold text-slate-700">{spec.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
