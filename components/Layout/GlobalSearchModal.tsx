import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, Loader2, ArrowRight } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { patientService } from '../../services/patientService';
import { Patient } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPatient: (patientId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigateToPatient }) => {
  const { empresaId } = useCompany();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Cache all patients to do client-side filtering since we don't have a large dataset yet
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && empresaId && allPatients.length === 0) {
      setIsLoading(true);
      patientService.fetchPatients(empresaId)
        .then(setAllPatients)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, empresaId]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    
    const filtered = allPatients.filter(p => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchCpf = qDigits.length > 0 && p.cpf ? p.cpf.replace(/\D/g, '').includes(qDigits) : false;
      const matchPhone = qDigits.length > 0 && p.phone ? p.phone.replace(/\D/g, '').includes(qDigits) : false;
      
      return matchName || matchCpf || matchPhone;
    });
    setResults(filtered.slice(0, 10)); // limit to top 10
  }, [query, allPatients]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 sm:pt-24 px-4 bg-gray-500/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[80vh] border border-gray-100 animate-in slide-in-from-top-4 duration-300">
        
        {/* Search Input Area */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100 relative">
          <Search className="text-blue-500 shrink-0 ml-2" size={24} />
          <input
            ref={inputRef}
            type="text"
            className="w-full text-lg border-0 focus:ring-0 px-4 py-2 text-gray-800 placeholder-gray-400 bg-transparent outline-none"
            placeholder="Buscar pacientes por nome, CPF ou telefone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results.length > 0) {
                 onNavigateToPatient(results[0].id);
                 onClose();
              }
            }}
          />
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors mr-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : query.trim() === '' ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
               <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                 <Search className="text-blue-300 w-8 h-8" />
               </div>
               <p className="text-gray-500 text-sm font-medium">Digite algo para buscar no sistema</p>
               <p className="text-gray-400 text-xs mt-1">Encontre rapidamente a ficha de qualquer paciente</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Pacientes encontrados
              </div>
              <ul className="flex flex-col">
                {results.map((patient) => (
                  <li key={patient.id}>
                    <button
                      onClick={() => {
                        onNavigateToPatient(patient.id);
                        onClose();
                      }}
                      className="w-full text-left px-6 py-3 hover:bg-blue-50 flex items-center justify-between group border-l-2 border-transparent hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-blue-600 shadow-sm transition-colors">
                           <User size={20} />
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium group-hover:text-blue-700 transition-colors">{patient.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                             <p className="text-xs text-gray-500">{patient.phone || 'Sem telefone'}</p>
                             {patient.cpf && <p className="text-xs text-gray-400">• CPF: {patient.cpf}</p>}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              Nenhum paciente encontrado com "{query}"
            </div>
          )}
        </div>
        
        <div className="bg-white border-t border-gray-100 px-4 py-3 text-xs text-gray-400 flex items-center justify-between">
           <span>Dica: Use as setas para navegar e <b>Enter</b> para selecionar</span>
           <span className="flex items-center gap-1"><kbd className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-mono">ESC</kbd> para fechar</span>
        </div>

      </div>
    </div>
  );
};
