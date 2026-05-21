import React from 'react';
import {
  PieChart,
  CalendarDays,
  Calendar1Icon,
  User,
  CircleDollarSign,
  Archive,
  MessageSquare,
  ImageIcon,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { PageType } from '../../types';

interface SidebarProps {
  activePage: PageType;
  onNavigate: (page: PageType) => void;
  subUserRole: string;
  subUserPermissions?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, subUserRole, subUserPermissions }) => {
  const hasAccess = (permission: string) => {
    if (subUserRole === 'admin') return true;
    return subUserPermissions?.includes(permission);
  };

  const mainNavigation = [
    { id: 'dashboard', label: 'Visão Geral', icon: PieChart },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'appointments', label: 'Agendamentos', icon: Calendar1Icon },
    { id: 'patients', label: 'Pacientes', icon: User },
    { id: 'financeiro', label: 'Financeiro', icon: CircleDollarSign },
  ];

  const toolsNavigation = [
    { id: 'inventory', label: 'Estoque', icon: Archive },
    { id: 'campaigns', label: 'Campanhas', icon: MessageSquare },
    { id: 'gallery', label: 'Galeria', icon: ImageIcon },
    { id: 'prosthesis-control', label: 'Próteses', icon: Stethoscope },
  ];

  return (
    <aside className="w-64 glass border-r border-white/50 flex flex-col h-screen flex-shrink-0 relative z-20">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-gray-200/30">
        <img
          src="/logo.png"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/logo_sidebar.png';
          }}
          alt="Logo"
          className="h-8 w-auto cursor-pointer"
          onClick={() => onNavigate('dashboard')}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-6 px-4 space-y-8">
        
        {/* Main Nav */}
        <div>
          <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Navegação</p>
          <nav className="space-y-1">
            {mainNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              const isDisabled = item.id !== 'dashboard' && !hasAccess(item.id);

              return (
                <button
                  key={item.id}
                  disabled={isDisabled}
                  onClick={() => onNavigate(item.id as PageType)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isDisabled
                      ? 'text-gray-300 bg-transparent cursor-not-allowed opacity-50'
                      : isActive
                        ? 'text-indigo-600 bg-indigo-50/80 shadow-sm border border-indigo-100/50'
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-white/60'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={18} className={isDisabled ? 'text-gray-300' : isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'} />
                    <span>{item.label}</span>
                  </div>
                  {!isDisabled && <ChevronRight size={14} className={`opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 ${isActive ? 'opacity-100 translate-x-0 text-indigo-400' : 'text-gray-300'}`} />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tools Nav */}
        <div>
          <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Ferramentas</p>
          <nav className="space-y-1">
            {toolsNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              const isDisabled = !hasAccess(item.id);

              return (
                <button
                  key={item.id}
                  disabled={isDisabled}
                  onClick={() => onNavigate(item.id as PageType)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isDisabled
                      ? 'text-gray-300 bg-transparent cursor-not-allowed opacity-50'
                      : isActive
                        ? 'text-indigo-600 bg-indigo-50/80 shadow-sm border border-indigo-100/50'
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-white/60'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={18} className={isDisabled ? 'text-gray-300' : isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'} />
                    <span>{item.label}</span>
                  </div>
                  {!isDisabled && <ChevronRight size={14} className={`opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 ${isActive ? 'opacity-100 translate-x-0 text-indigo-400' : 'text-gray-300'}`} />}
                </button>
              );
            })}
          </nav>
        </div>

      </div>
    </aside>
  );
};
