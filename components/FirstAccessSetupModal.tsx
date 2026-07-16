import React, { useState } from 'react';
import { Loader2, Crown, Users, CheckCircle, Shield } from 'lucide-react';
import { subUserService } from '../services/userService';

interface FirstAccessSetupModalProps {
  empresaId: number;
  onSetupComplete: () => void;
}

export const FirstAccessSetupModal: React.FC<FirstAccessSetupModalProps> = ({ empresaId, onSetupComplete }) => {
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [createOthers, setCreateOthers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !adminPassword) {
      setError('Por favor, preencha o nome e a senha do administrador.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Começamos com os defaults que o sanitize provê
      const config: any = {
        admin: {
          name: adminName,
          password: adminPassword,
          icon: 'crown',
          permissions: ['agenda', 'appointments', 'patients', 'financeiro', 'campaigns', 'inventory', 'gallery', 'prosthesis-control', 'integrations', 'security']
        }
      };

      if (createOthers) {
        config.gestor = {
          name: 'Gestor',
          password: '123',
          icon: 'briefcase',
          permissions: ['agenda', 'appointments', 'patients', 'financeiro', 'campaigns', 'inventory', 'gallery', 'prosthesis-control', 'integrations', 'security']
        };
        config.concierge = {
          name: 'Recepcionista',
          password: '123',
          icon: 'headphones',
          permissions: ['agenda', 'appointments', 'patients']
        };
      }

      await subUserService.saveSubUsers(empresaId, config);
      onSetupComplete();
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao criar a equipe. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <Crown size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">Criação da Equipe</h2>
          <p className="text-blue-100 text-sm mt-2">
            Chegou a hora de configurar quem terá acesso ao sistema.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-800">1. Conta Administrador (Obrigatório)</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Gestor/Administrador</label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex: Dr. Carlos Silva"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha de Acesso</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="Crie uma senha forte"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input
                  id="createOthers"
                  type="checkbox"
                  checked={createOthers}
                  onChange={(e) => setCreateOthers(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <label htmlFor="createOthers" className="text-sm text-gray-600 cursor-pointer">
                <span className="font-medium text-gray-800 block mb-1">Criar perfis adicionais (Opcional)</span>
                Isso criará automaticamente os perfis de "Gestor" e "Recepcionista" com a senha padrão <b>123</b> para você configurar depois nas Configurações.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <CheckCircle size={20} />
                Concluir Setup e Acessar o Sistema
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
