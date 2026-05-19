import React, { useState, useEffect } from 'react';
import { Crown, Briefcase, Headphones, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { subUserService } from '../services/userService';

interface SubUserSelectionProps {
  empresaId: number;
  onLoginSuccess: (role: 'admin' | 'gestor' | 'concierge', name: string) => void;
}

export const SubUserSelection: React.FC<SubUserSelectionProps> = ({ empresaId, onLoginSuccess }) => {
  const [profiles, setProfiles] = useState<Record<string, { password: string }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'gestor' | 'concierge' | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSubUsers = async () => {
      try {
        const data = await subUserService.getSubUsers(empresaId);
        setProfiles(data);
      } catch (err) {
        console.error("Erro ao carregar senhas de usuários:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSubUsers();
  }, [empresaId]);

  const handleSelectProfile = (role: 'admin' | 'gestor' | 'concierge') => {
    setSelectedRole(role);
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setVerifying(true);
    setError('');

    // Simulate verification lag for premium feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    const expectedPassword = profiles[selectedRole]?.password || selectedRole;
    if (password === expectedPassword) {
      const nameMap = {
        admin: 'Administrador',
        gestor: 'Gestor da Clínica',
        concierge: 'Concierge (Recepção)'
      };
      onLoginSuccess(selectedRole, nameMap[selectedRole]);
    } else {
      setError('Senha incorreta. Tente novamente.');
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Carregando perfis de acesso...</p>
      </div>
    );
  }

  const profileCards = [
    {
      role: 'admin' as const,
      title: 'Administrador',
      desc: 'Acesso total + Gestão de senhas',
      icon: Crown,
      colorClass: 'bg-blue-600/10 text-blue-400 border-blue-500/30 group-hover:border-blue-400 group-hover:bg-blue-600/20 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]',
      iconColor: 'text-blue-500 group-hover:scale-110 transition-transform'
    },
    {
      role: 'gestor' as const,
      title: 'Gestor',
      desc: 'Acesso total às clínicas',
      icon: Briefcase,
      colorClass: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30 group-hover:border-emerald-400 group-hover:bg-emerald-600/20 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
      iconColor: 'text-emerald-500 group-hover:scale-110 transition-transform'
    },
    {
      role: 'concierge' as const,
      title: 'Concierge',
      desc: 'Recepção e Atendimento (Financeiro Bloqueado)',
      icon: Headphones,
      colorClass: 'bg-amber-600/10 text-amber-400 border-amber-500/30 group-hover:border-amber-400 group-hover:bg-amber-600/20 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
      iconColor: 'text-amber-500 group-hover:scale-110 transition-transform'
    }
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden py-12 px-4">
      {/* Background Neon Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-4xl text-center flex flex-col items-center">
        {/* Logo */}
        <img
          src="/logo_login.png"
          alt="Evolitech Logo"
          className="h-16 w-auto mb-8 opacity-90 filter invert brightness-200"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Quem está acessando o sistema?
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-md mb-12">
          Selecione seu perfil de acesso e insira sua senha para continuar.
        </p>

        {/* Profile Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-3xl">
          {profileCards.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.role}
                onClick={() => handleSelectProfile(p.role)}
                className="group flex flex-col items-center bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5"
              >
                {/* Profile Avatar Icon Container */}
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border transition-all duration-300 mb-5 ${p.colorClass}`}>
                  <Icon size={36} className={p.iconColor} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {p.title}
                </h3>
                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Password Entry Modal */}
        {selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-blue-400 mb-3">
                  <Lock size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Senha para {selectedRole === 'admin' ? 'Administrador' : selectedRole === 'gestor' ? 'Gestor' : 'Concierge'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Insira a senha de acesso para liberar a sessão.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-950/50 border border-red-500/30 text-red-400 text-xs rounded-xl text-center font-medium animate-bounce">
                    {error}
                  </div>
                )}

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-white text-center tracking-widest text-sm font-semibold outline-none transition-all placeholder:tracking-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-bold rounded-xl transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={verifying || !password}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center justify-center gap-1.5"
                  >
                    {verifying ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Entrar <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Informative Default Password Callout */}
              <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                <span className="text-[11px] text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
                  Dica: Senha padrão de teste é <code className="text-blue-400 font-bold bg-slate-900 px-1 py-0.5 rounded">'{selectedRole}'</code>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 text-xs text-slate-600">
        © 2024 ClínicaSync — Gestão Médica Inteligente
      </div>
    </div>
  );
};
