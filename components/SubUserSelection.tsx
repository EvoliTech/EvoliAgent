import React, { useState, useEffect } from 'react';
import { Crown, Briefcase, Headphones, Stethoscope, User, Shield, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { subUserService, SubUserProfile } from '../services/userService';

interface SubUserSelectionProps {
  empresaId: number;
  onLoginSuccess: (role: string, name: string, permissions: string[]) => void;
}

const iconConfig: Record<string, { icon: React.ComponentType<any>, colorClass: string, iconColor: string }> = {
  crown: {
    icon: Crown,
    colorClass: 'bg-blue-600/10 text-blue-400 border-blue-500/30 group-hover:border-blue-400 group-hover:bg-blue-600/20 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]',
    iconColor: 'text-blue-500 group-hover:scale-110 transition-transform'
  },
  briefcase: {
    icon: Briefcase,
    colorClass: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30 group-hover:border-emerald-400 group-hover:bg-emerald-600/20 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
    iconColor: 'text-emerald-500 group-hover:scale-110 transition-transform'
  },
  headphones: {
    icon: Headphones,
    colorClass: 'bg-amber-600/10 text-amber-400 border-amber-500/30 group-hover:border-amber-400 group-hover:bg-amber-600/20 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    iconColor: 'text-amber-500 group-hover:scale-110 transition-transform'
  },
  stethoscope: {
    icon: Stethoscope,
    colorClass: 'bg-rose-600/10 text-rose-400 border-rose-500/30 group-hover:border-rose-400 group-hover:bg-rose-600/20 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]',
    iconColor: 'text-rose-500 group-hover:scale-110 transition-transform'
  },
  user: {
    icon: User,
    colorClass: 'bg-purple-600/10 text-purple-400 border-purple-500/30 group-hover:border-purple-400 group-hover:bg-purple-600/20 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    iconColor: 'text-purple-500 group-hover:scale-110 transition-transform'
  },
  shield: {
    icon: Shield,
    colorClass: 'bg-cyan-600/10 text-cyan-400 border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-600/20 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]',
    iconColor: 'text-cyan-500 group-hover:scale-110 transition-transform'
  }
};

export const SubUserSelection: React.FC<SubUserSelectionProps> = ({ empresaId, onLoginSuccess }) => {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Carregando perfis de acesso...</p>
      </div>
    );
  }

  const selectedProfile = selectedProfileId ? profiles[selectedProfileId] : null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden py-12 px-4">
      {/* Background Neon Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl text-center flex flex-col items-center">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 w-full max-w-4xl justify-center">
          {Object.values(profiles).map((p) => {
            const config = iconConfig[p.icon] || iconConfig.user;
            const Icon = config.icon;
            
            return (
              <div
                key={p.id}
                onClick={() => handleSelectProfile(p.id)}
                className="group flex flex-col items-center bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5"
              >
                {/* Profile Avatar Icon Container */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 mb-4 ${config.colorClass}`}>
                  <Icon size={28} className={config.iconColor} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors text-center truncate w-full px-2">
                  {p.name}
                </h3>
                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  {p.id === 'admin' ? 'Acesso total' : `${p.permissions.length} permissões`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Password Entry Modal */}
        {selectedProfileId && selectedProfile && (
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
                  Senha para {selectedProfile.name}
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
                    onClick={() => setSelectedProfileId(null)}
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
                  Dica: Senha padrão de teste é <code className="text-blue-400 font-bold bg-slate-900 px-1 py-0.5 rounded">'{selectedProfileId}'</code>
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
