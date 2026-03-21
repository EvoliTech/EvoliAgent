import React, { useState } from 'react';
import { Patient } from '../types';
import { 
  ChevronLeft, Edit2, MessageCircle, Tag, CheckSquare, Plus, 
  MapPin, Phone, Calendar, User, FileText, ChevronRight 
} from 'lucide-react';
import { Odontogram } from './Odontogram';

interface PatientDetailsProps {
  patient: Patient;
  onBack: () => void;
  onEdit: () => void;
}

type TabType = 'Visão Geral' | 'Anamneses' | 'Orçamentos' | 'Tratamentos' | 'Pagamentos' | 'Evoluções' | 'Documentos' | 'Arquivos';

export const PatientDetails: React.FC<PatientDetailsProps> = ({ patient, onBack, onEdit }) => {
  const [activeTab, setActiveTab] = useState<TabType>('Visão Geral');

  const tabs: TabType[] = [
    'Visão Geral', 'Anamneses', 'Orçamentos', 'Tratamentos', 
    'Pagamentos', 'Evoluções', 'Documentos', 'Arquivos'
  ];

  // Helper to calculate age nicely
  const getAgeText = (birthDateStr?: string) => {
    if (!birthDateStr) return '';
    // Assume format YYYY-MM-DD or parseable by Date
    // If it comes as DD/MM/YYYY from BR input, we need to convert to parseable
    let isoStr = birthDateStr;
    if (birthDateStr.includes('/')) {
      const [d, m, y] = birthDateStr.split('/');
      isoStr = `${y}-${m}-${d}`;
    }
    const birth = new Date(isoStr);
    if (isNaN(birth.getTime())) return '';
    
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (now.getDate() < birth.getDate()) {
      months--;
    }
    if (months < 0) {
      months = 11;
    }
    return `${years} anos${months > 0 ? ` e ${months} meses` : ''}`;
  };

  const getFormattedPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 11) { // 5511999999999
      let noCountry = clean;
      if (clean.startsWith('55') && clean.length > 11) {
         noCountry = clean.substring(2);
      }
      return `(${noCountry.substring(0,2)}) ${noCountry.substring(2,7)}-${noCountry.substring(7)}`;
    }
    return phone;
  };

  const ageText = getAgeText(patient.dataNascimento);
  const displayPhone = getFormattedPhone(patient.phone);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 w-full h-full flex flex-col bg-[#f1f5f9] min-h-screen pb-10">
      {/* Top Banner & Header */}
      <div className="bg-white px-6 pt-6 pb-0 border-b border-gray-200">
        <button onClick={onBack} className="flex items-center text-[#64748b] hover:text-[#334155] text-[13px] font-medium mb-4 transition-colors">
          <ChevronLeft size={16} className="mr-1" />
          Voltar para lista
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 bg-[#f1f5f9] text-[#cbd5e1] rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mt-4"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            
            <div className="flex flex-col pt-0.5">
              <h1 className="text-xl font-bold text-[#1e293b]">{patient.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-[13px] text-[#64748b]">
                <div className="flex items-center gap-1.5 font-medium">
                  <a href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#10b981] transition-colors">
                    <MessageCircle size={14} className="text-[#94a3b8]" />
                  </a>
                  {displayPhone}
                </div>
                {ageText && (
                  <span className="font-medium text-[#475569]">{ageText}</span>
                )}
              </div>
              <button className="flex items-center gap-1.5 text-[12.5px] text-[#64748b] hover:text-[#3b82f6] transition-colors mt-2 cursor-pointer w-fit p-1 -ml-1 rounded">
                <Tag size={13} /> Categorizar
              </button>
            </div>
          </div>
          
          <button 
            onClick={onEdit}
            className="flex items-center border border-[#cbd5e1] text-[#475569] px-3 py-1.5 rounded-md hover:bg-[#f8fafc] transition-colors space-x-2 text-[13px] font-semibold"
          >
            <Edit2 size={14} />
            <span>Editar</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-8 mt-8 border-b border-white hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[14.5px] font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === tab 
                  ? 'text-[#2563eb]' 
                  : 'text-[#64748b] hover:text-[#475569]'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {activeTab === 'Visão Geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full max-w-[1400px] mx-auto">
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              
              {/* Tarefas Box */}
              <div className="bg-white border text-[#475569] border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="bg-[#f1f5f9] p-2 rounded-lg text-[#94a3b8] group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                    <CheckSquare size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-[#334155]">Tarefas</span>
                    <span className="text-[12px] text-[#94a3b8]">Nenhuma tarefa cadastrada</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[#94a3b8] group-hover:text-blue-500 text-[13px] font-semibold">
                  <span>+ Nova</span>
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* Informações Box */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative">
                <h3 className="text-[17px] font-bold text-[#1e293b] mb-6">Informações</h3>
                
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Código do paciente</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.id}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Preferência de lembretes</span>
                    <span className="text-[14px] font-medium text-[#334155]">WhatsApp</span>
                  </div>

                  <div className="flex flex-col border-b border-gray-100 pb-5">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Celular</span>
                    <span className="text-[14px] font-medium text-[#334155]">{displayPhone}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Data de nascimento</span>
                    <span className="text-[14px] font-medium text-[#334155]">
                      {patient.dataNascimento ? `${patient.dataNascimento} - ${ageText.split(' ')[0]} anos` : '-'}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Gênero</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.genero || 'Masculino'}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#64748b] mb-0.5">Convênio</span>
                    <span className="text-[14px] font-medium text-[#334155]">{patient.plano || 'Particular'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              
              {/* Odontograma Component */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[17px] font-bold text-[#1e293b]">Odontograma</h3>
                </div>
                <div className="w-full flex items-center justify-center bg-gray-50/50 rounded-xl border border-gray-100/50 border-dashed">
                  <Odontogram patientName={patient.name} />
                </div>
              </div>

              {/* Últimas Evoluções Box */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 min-h-[300px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[17px] font-bold text-[#1e293b]">Últimas Evoluções</h3>
                  <button className="flex items-center gap-2 border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] hover:border-[#94a3b8] transition-colors rounded-md px-3 py-1.5 text-[13px] font-semibold">
                    <FileText size={14} /> Adicionar
                  </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                   <div className="relative w-24 h-24 mb-4">
                     <span className="absolute -top-2 -left-2 text-yellow-400 text-2xl">⭐</span>
                     <span className="absolute bottom-2 right-0 text-yellow-200 text-xl">🌙</span>
                     <div className="w-20 h-20 bg-blue-100 rounded-fullmx-auto mt-4 border-[3px] border-blue-200"></div>
                   </div>
                   <p className="text-[14px] text-[#64748b]">Nenhum registro nas evoluções ainda.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Other Tabs content placeholder */}
        {activeTab !== 'Visão Geral' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center min-h-[400px] flex flex-col justify-center items-center">
            <span className="text-gray-400 mb-2"><FileText size={48} /></span>
            <h3 className="text-lg font-medium text-gray-700">Aba em desenvolvimento</h3>
            <p className="text-gray-500 text-sm mt-1">O conteúdo de "{activeTab}" será exibido aqui.</p>
          </div>
        )}
      </div>

    </div>
  );
};
