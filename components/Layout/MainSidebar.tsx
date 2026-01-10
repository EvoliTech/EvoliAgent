import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  Settings,
  LogOut
} from 'lucide-react';
import { PageType } from '../../types';

interface MainSidebarProps {
  activePage: PageType;
  onNavigate: (page: PageType) => void;
  onLogout?: () => void;
  userEmail?: string;
}

export const MainSidebar: React.FC<MainSidebarProps> = ({ activePage, onNavigate, onLogout, userEmail }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'professionals', label: 'Especialistas', icon: Stethoscope },
  ];

  const isSettingsActive = activePage === 'settings';

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full flex-shrink-0 transition-all duration-300">
      {/* Brand */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800">
        <img
          src="/logo_sidebar.png"
          alt="Evolitech Logo"
          className="h-10 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as PageType)}
              className={`
                w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}
              `}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => onNavigate('settings')}
          className={`
            flex items-center space-x-3 w-full px-3 py-2 text-sm font-medium transition-colors rounded-lg mb-1
            ${isSettingsActive
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'}
          `}
        >
          <Settings size={20} />
          <span>Configurações</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors w-full px-3 py-2 text-sm font-medium"
        >
          <LogOut size={20} />
          <span>Sair</span>
        </button>

        <div className="mt-4 flex items-center px-3 pt-4 border-t border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
            {userEmail ? userEmail.substring(0, 2) : 'US'}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-white truncate" title={userEmail || 'Usuário'}>
              {userEmail || 'Usuário'}
            </p>
            <p className="text-xs text-slate-500">Conectado</p>
          </div>
        </div>
      </div>
    </aside>
  );
};