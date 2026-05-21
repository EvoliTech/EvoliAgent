import React, { useState, useEffect } from 'react';
import { Crown, Briefcase, Headphones, Stethoscope, User, Shield, Lock, Eye, EyeOff, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { subUserService, SubUserProfile } from '../services/userService';

interface SubUserSelectionProps {
  empresaId: number;
  onLoginSuccess: (role: string, name: string, permissions: string[]) => void;
  onLogout: () => void;
}

const iconConfig: Record<string, { icon: React.ComponentType<any>, colorClass: string, iconColor: string }> = {
  crown: {
    icon: Crown,
    colorClass: 'bg-blue-50 text-blue-600 border-blue-100 group-hover:border-blue-300 group-hover:bg-blue-100 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.1)]',
    iconColor: 'text-blue-500 group-hover:scale-110 transition-transform'
  },
  briefcase: {
    icon: Briefcase,
    colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:border-emerald-300 group-hover:bg-emerald-100 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    iconColor: 'text-emerald-500 group-hover:scale-110 transition-transform'
  },
  headphones: {
    icon: Headphones,
    colorClass: 'bg-amber-50 text-amber-600 border-amber-100 group-hover:border-amber-300 group-hover:bg-amber-100 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    iconColor: 'text-amber-500 group-hover:scale-110 transition-transform'
  },
  stethoscope: {
    icon: Stethoscope,
    colorClass: 'bg-rose-50 text-rose-600 border-rose-100 group-hover:border-rose-300 group-hover:bg-rose-100 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    iconColor: 'text-rose-500 group-hover:scale-110 transition-transform'
  },
  user: {
    icon: User,
    colorClass: 'bg-purple-50 text-purple-600 border-purple-100 group-hover:border-purple-300 group-hover:bg-purple-100 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.1)]',
    iconColor: 'text-purple-500 group-hover:scale-110 transition-transform'
  },
  shield: {
    icon: Shield,
    colorClass: 'bg-cyan-50 text-cyan-600 border-cyan-100 group-hover:border-cyan-300 group-hover:bg-cyan-100 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]',
    iconColor: 'text-cyan-500 group-hover:scale-110 transition-transform'
  }
};

export const SubUserSelection: React.FC<SubUserSelectionProps> = ({ empresaId, onLoginSuccess, onLogout }) => {
  const [profiles, setProfiles] = useState<Record<string, SubUserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
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

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleLogin = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!selectedProfileId) return;

    setVerifying(true);
    setError('');

    // Simulate verification lag for premium feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    const profile = profiles[selectedProfileId];
    const expectedPassword = profile?.password || '';
    if (password === expectedPassword) {
      onLoginSuccess(profile.id, profile.name, profile.permissions);
    } else {
      setError('Senha incorreta. Tente novamente.');
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-800">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 text-sm animate-pulse">Carregando perfis de acesso...</p>
      </div>
    );
  }

  const selectedProfile = selectedProfileId ? profiles[selectedProfileId] : null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden py-12 px-4">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl text-center flex flex-col items-center">
        {/* Logo */}
        <img
          src="/logo_login.png"
          alt="Evolitech Logo"
          className="h-16 w-auto mb-8 opacity-95"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          Quem está acessando o sistema?
        </h1>
        <p className="text-gray-500 text-sm sm:text-base max-w-md mb-12">
          Selecione seu perfil de acesso e insira sua senha para continuar.
        </p>

        {/* Centered Profile Cards Flex Container */}
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl px-4">
          {Object.values(profiles).map((p) => {
            const config = iconConfig[p.icon] || iconConfig.user;
            const Icon = config.icon;
            
            return (
              <div
                key={p.id}
                onClick={() => handleSelectProfile(p.id)}
                className="group flex flex-col items-center bg-white hover:bg-gray-50 border border-gray-200/80 hover:border-blue-500/30 hover:shadow-md rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 w-full sm:w-52 text-center"
              >
                {/* Profile Avatar Icon Container */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 mb-4 ${config.colorClass}`}>
                  <Icon size={28} className={config.iconColor} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors text-center truncate w-full px-2">
                  {p.name}
                </h3>
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  {p.id === 'admin' ? 'Acesso total' : `${p.permissions.length} permissões`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="mt-12 px-5 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50/50 hover:border-red-200 border border-gray-200/80 bg-white shadow-sm rounded-xl transition-all duration-300 text-sm font-bold flex items-center gap-2 transform hover:-translate-y-0.5"
        >
          <LogOut size={16} />
          Sair da conta
        </button>

        {/* Password Entry Modal */}
        {selectedProfileId && selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="bg-white border border-gray-150 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3">
                  <Lock size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Senha para {selectedProfile.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Insira a senha de acesso para liberar a sessão.
                </p>
              </div>

              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl text-center font-medium animate-bounce">
                    {error}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' } as React.CSSProperties}
                    required
                    autoFocus
                    autoComplete="off"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password && !verifying) {
                        handleLogin(e);
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-gray-900 text-center tracking-widest text-sm font-semibold outline-none transition-all placeholder:tracking-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setSelectedProfileId(null)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogin()}
                    disabled={verifying || !password}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
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
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 text-xs text-gray-400">
        © 2024 ClínicaSync — Gestão Médica Inteligente
      </div>
    </div>
  );
};
