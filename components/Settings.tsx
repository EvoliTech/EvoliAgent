import React, { useState, useEffect } from 'react';
import { PageType } from '../types';
import { useCompany } from '../contexts/CompanyContext';
import { subUserService } from '../services/userService';
import { Modal } from './ui/Modal';
import { Lock, Eye, EyeOff, Loader2, Save, Crown, Briefcase, Headphones } from 'lucide-react';

interface SettingsProps {
  onNavigate: (page: PageType) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { empresaId } = useCompany();
  const subUserRole = localStorage.getItem('clinica_sub_user_role') || 'admin';

  // Modal State
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  
  // Passwords State
  const [passwords, setPasswords] = useState({
    admin: '',
    gestor: '',
    concierge: ''
  });

  // Show/Hide Password toggles
  const [showPass, setShowPass] = useState({
    admin: false,
    gestor: false,
    concierge: false
  });

  // Fetch passwords when modal opens
  useEffect(() => {
    if (isAccessModalOpen && empresaId) {
      setLoading(true);
      setStatus('');
      subUserService.getSubUsers(empresaId)
        .then(data => {
          setPasswords({
            admin: data.admin?.password || 'admin',
            gestor: data.gestor?.password || 'gestor',
            concierge: data.concierge?.password || 'concierge'
          });
        })
        .catch(err => {
          console.error('Erro ao carregar senhas:', err);
          setStatus('Erro ao carregar as senhas salvas.');
        })
        .finally(() => setLoading(false));
    }
  }, [isAccessModalOpen, empresaId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    setSaving(true);
    setStatus('');
    try {
      await subUserService.saveSubUsers(empresaId, {
        admin: { password: passwords.admin },
        gestor: { password: passwords.gestor },
        concierge: { password: passwords.concierge }
      });
      setStatus('Senhas atualizadas com sucesso!');
      setTimeout(() => {
        setIsAccessModalOpen(false);
        setStatus('');
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar senhas:', err);
      setStatus('Erro ao atualizar as senhas.');
    } finally {
      setSaving(false);
    }
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
      description: 'Convide profissionais para fazer parte da sua clínica, gerencie suas permissões de acesso e defina seus horários de trabalho.',
      iconPath: '/gestaodeprofissionais.svg',
      action: () => onNavigate('professionals')
    },
    {
      id: 'integrations',
      title: 'Integrações',
      description: 'Conecte sua clínica a ferramentas e serviços externos para automatizar tarefas e melhorar o atendimento.',
      iconPath: '/integracoes.svg',
      action: () => onNavigate('integrations')
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
    // Conditionally show Access Control panel ONLY to the Admin
    ...(subUserRole === 'admin' ? [{
      id: 'access-control',
      title: 'Gestão de Usuários e Senhas',
      description: 'Defina e altere as senhas de acesso para os perfis de Administrador, Gestor e Concierge.',
      iconPath: '/gestaodeprofissionais.svg',
      action: () => setIsAccessModalOpen(true)
    }] : [])
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-semibold text-gray-800 mb-8 tracking-tight">Configurações gerais</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {settingsOptions.map((option) => (
          <div 
            key={option.id}
            onClick={option.action}
            className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-blue-100 transition-all cursor-pointer group flex flex-col items-center text-center justify-center min-h-[250px]"
          >
            <div className="w-48 h-32 mb-4 flex items-center justify-center transition-transform group-hover:scale-105">
              <img src={option.iconPath} alt={option.title} className="max-w-full max-h-full object-contain" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">{option.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed px-4">{option.description}</p>
          </div>
        ))}
      </div>

      {/* Access Control / Password Management Modal */}
      <Modal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        title="Gestão de Usuários e Senhas"
      >
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium animate-pulse">Carregando senhas de usuários...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <p className="text-sm text-gray-500">
              Como administrador, você pode visualizar e alterar as senhas de acesso de todos os perfis. Estas senhas serão utilizadas na tela de login de perfis.
            </p>

            {status && (
              <div className={`p-3 rounded-xl text-center text-xs font-semibold border ${
                status.includes('sucesso') 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {status}
              </div>
            )}

            {/* Profile Password List */}
            <div className="space-y-4">
              {/* Profile 1: Admin */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <Crown size={16} />
                  <span>Administrador</span>
                </div>
                <div className="relative">
                  <input
                    type={showPass.admin ? 'text' : 'password'}
                    required
                    value={passwords.admin}
                    onChange={e => setPasswords({ ...passwords, admin: e.target.value })}
                    className="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none transition-all pr-10"
                    placeholder="Digite a senha do Administrador"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, admin: !showPass.admin })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPass.admin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">Acesso completo e controle de senhas de outros perfis.</p>
              </div>

              {/* Profile 2: Gestor */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <Briefcase size={16} />
                  <span>Gestor</span>
                </div>
                <div className="relative">
                  <input
                    type={showPass.gestor ? 'text' : 'password'}
                    required
                    value={passwords.gestor}
                    onChange={e => setPasswords({ ...passwords, gestor: e.target.value })}
                    className="w-full bg-white border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none transition-all pr-10"
                    placeholder="Digite a senha do Gestor"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, gestor: !showPass.gestor })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPass.gestor ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">Acesso completo às clínicas (sem controle de senhas).</p>
              </div>

              {/* Profile 3: Concierge */}
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                  <Headphones size={16} />
                  <span>Concierge</span>
                </div>
                <div className="relative">
                  <input
                    type={showPass.concierge ? 'text' : 'password'}
                    required
                    value={passwords.concierge}
                    onChange={e => setPasswords({ ...passwords, concierge: e.target.value })}
                    className="w-full bg-white border border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none transition-all pr-10"
                    placeholder="Digite a senha da Concierge"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, concierge: !showPass.concierge })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPass.concierge ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">Acesso restrito para recepção e agendamento. Menu Financeiro bloqueado.</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAccessModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Salvar Senhas</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
