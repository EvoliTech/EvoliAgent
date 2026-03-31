import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { MessageSquare as MessageSquareIcon } from 'lucide-react';

interface CampaignType {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
}

export const Campaigns: React.FC = () => {
  const { empresaId } = useCompany();

  // Persist active state to localStorage
  const [activeCampaigns, setActiveCampaigns] = useState<Record<string, boolean>>(() => {
    if (!empresaId) return {};
    try {
      const saved = localStorage.getItem(`campaigns_config_${empresaId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCampaign = (id: string) => {
    setActiveCampaigns(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      if (empresaId) {
        localStorage.setItem(`campaigns_config_${empresaId}`, JSON.stringify(newState));
      }
      return newState;
    });
  };

  const campaigns: CampaignType[] = [
    {
      id: 'aniversariantes',
      title: 'Aniversariantes',
      description: 'Parabenize os pacientes aniversariantes de forma automática.',
      imageSrc: '/Aniversário.png'
    },
    {
      id: 'retorno_semestral',
      title: 'Retorno semestral',
      description: 'Convide pacientes que fizeram a última consulta há mais de 6 meses para uma revisão.',
      imageSrc: '/retorno.png'
    }
  ];

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 font-sans bg-gray-50 flex flex-col min-h-screen">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-blue-100 rounded-xl">
          <MessageSquareIcon className="text-blue-600 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campanhas Automáticas</h1>
          <p className="text-sm text-gray-500 mt-1">Configure disparos automatizados de mensagens para engajar seus pacientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {campaigns.map((campaign) => {
          const isActive = activeCampaigns[campaign.id];
          return (
            <div 
              key={campaign.id} 
              className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-all shadow-sm
                ${isActive ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {/* Image Container */}
              <div className="h-48 w-full flex items-center justify-center p-6 bg-white relative">
                 {isActive && (
                    <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-in zoom-in duration-200 shadow-sm border border-emerald-200">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      Ativo
                    </div>
                 )}
                 <img 
                   src={campaign.imageSrc} 
                   alt={campaign.title} 
                   className="h-full object-contain mix-blend-multiply"
                 />
              </div>

              {/* Text Content */}
              <div className="p-6 pt-2 flex flex-col flex-1">
                <h3 className="text-lg font-medium text-gray-800 mb-2">{campaign.title}</h3>
                <p className="text-sm text-gray-500 mb-6 flex-1">{campaign.description}</p>
                
                {/* Actions */}
                <button
                  onClick={() => toggleCampaign(campaign.id)}
                  className={`w-fit px-6 py-2 rounded-lg font-medium text-sm transition-colors border
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  {isActive ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
