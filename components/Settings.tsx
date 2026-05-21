import React from 'react';
import { PageType } from '../types';

interface SettingsProps {
  onNavigate: (page: PageType) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const subUserRole = localStorage.getItem('clinica_sub_user_role') || 'admin';
  const savedPerms = localStorage.getItem('clinica_sub_user_permissions');
  const subUserPermissions: string[] = savedPerms ? JSON.parse(savedPerms) : [];

  const hasAccess = (permission: string) => {
    if (subUserRole === 'admin') return true;
    return subUserPermissions.includes(permission);
  };

  const settingsOptions = [
    {
      id: 'clinic-settings',
      title: 'Configurações Gerais',
      description: 'Edite os dados da sua clínica e gerencie quais recursos serão utilizados pela sua equipe.',
      iconPath: '/configuracoesGerais.svg',
      action: () => onNavigate('clinic-settings')
    },
    {
      id: 'professionals',
      title: 'Gestão de profissionais',
      description: 'Convide profissionais para fazer parte da sua clínica, gerencie suas permissões de acesso e define seus horários de trabalho.',
      iconPath: '/gestaodeprofissionais.svg',
      action: () => onNavigate('professionals')
    },
    {
      id: 'integrations',
      title: 'Integrações',
      description: 'Conecte sua clínica a ferramentas e serviços externos para automatizar tarefas e melhorar o atendimento.',
      iconPath: '/integracoes.svg',
      action: () => {
        if (!hasAccess('integrations')) return;
        onNavigate('integrations');
      },
      disabled: !hasAccess('integrations')
    },
    {
      id: 'plans-management',
      title: 'Gestão de Planos',
      description: 'Gerencie os planos de saúde, valores e coberturas de forma simples e rápida.',
      iconPath: '/gestaodeplanos.svg',
      action: () => onNavigate('plans-management')
    },
    {
      id: 'fees-settings',
      title: 'Configurar Taxas',
      description: 'Defina as taxas para as opções de pagamento (Pix, Débito, Boleto, Crédito em até 12x).',
      iconPath: '/financeiro.svg',
      action: () => onNavigate('fees-settings')
    },
    // Conditionally show Access Control panel to profiles with security permission
    ...(hasAccess('security') ? [{
      id: 'access-control',
      title: 'Gestão de Usuários e Senhas',
      description: 'Defina e altere as senhas de acesso para os perfis cadastrados no sistema.',
      iconPath: '/gestaodeprofissionais.svg',
      action: () => onNavigate('security')
    }] : [])
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-semibold text-gray-800 mb-8 tracking-tight">Configurações gerais</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {settingsOptions.map((option) => {
          const isDisabled = 'disabled' in option && option.disabled;
          return (
            <div 
              key={option.id}
              onClick={isDisabled ? undefined : option.action}
              className={`bg-white border border-gray-100 rounded-xl p-6 flex flex-col items-center text-center justify-center min-h-[250px] transition-all
                ${isDisabled 
                  ? 'opacity-40 cursor-not-allowed filter grayscale' 
                  : 'shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-blue-100 cursor-pointer group'
                }`}
            >
              <div className={`w-48 h-32 mb-4 flex items-center justify-center transition-transform ${isDisabled ? '' : 'group-hover:scale-105'}`}>
                <img src={option.iconPath} alt={option.title} className="max-w-full max-h-full object-contain" />
              </div>
              <h3 className={`text-lg font-bold mb-2 transition-colors ${isDisabled ? 'text-gray-400' : 'text-gray-800 group-hover:text-blue-600'}`}>{option.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed px-4">{option.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
