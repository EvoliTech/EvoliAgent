import React, { useState } from 'react';
import {
  CalendarDays,
  User,
  BarChart2,
  LayoutGrid,
  Settings,
  LogOut,
  Search,
  Bell,
  MessageSquare,
  CheckSquare,
  ChevronDown,
  Calendar1Icon,
  Archive,
  PieChart,
  Globe,
  MessageSquare as MessageSquareIcon,
  Video,
  MessageCircle,
  CircleDollarSign
} from 'lucide-react';
import { PageType } from '../../types';

interface TopHeaderProps {
  activePage: PageType;
  onNavigate: (page: PageType) => void;
  onLogout?: () => void;
  userEmail?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ activePage, onNavigate, onLogout, userEmail }) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);

  // Remapeando para manter a navegação existente mas parecer com o print
  const menuItems = [
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'appointments', label: 'Agendamentos', icon: Calendar1Icon },
    { id: 'patients', label: 'Pacientes', icon: User },
    { id: 'financeiro', label: 'Financeiro', icon: CircleDollarSign },
  ];

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10 w-full">
      <div className="flex items-center space-x-8">
        {/* Brand Logo */}
        <div className="flex items-center h-full">
          <img
            src="/logo.png"
            onError={(e) => {
              // fallback if logo.png doesn't exist
              const target = e.target as HTMLImageElement;
              target.src = '/logo_sidebar.png';
            }}
            alt="Logo"
            className="h-8 w-auto cursor-pointer"
            onClick={() => onNavigate('dashboard')}
          />
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as PageType)}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="relative">
            <button
              onClick={() => setGridMenuOpen(!gridMenuOpen)}
              className={`
                flex items-center justify-center p-2 rounded-md transition-colors border
                ${gridMenuOpen || activePage === 'dashboard'
                  ? 'text-blue-600 bg-blue-50 border-blue-200'
                  : 'text-gray-400 border-transparent hover:border-gray-200 hover:text-blue-600 hover:bg-gray-50'
                }
              `}
            >
              <LayoutGrid size={18} />
            </button>

            {gridMenuOpen && (
              <div className="absolute top-full mt-3 -left-1/2 transform -translate-x-1/4 w-[400px] bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
                <div className="grid grid-cols-2 gap-4">
                  {/* Item 1 - Dashboard (Relatórios de Inteligência) */}
                  <button
                    onClick={() => { onNavigate('dashboard'); setGridMenuOpen(false); }}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all text-left"
                  >
                    <PieChart className="text-gray-400 shrink-0" size={24} />
                    <span className="text-sm font-medium text-gray-700 leading-tight">Visão geral<br />da Clínica</span>
                  </button>

                  {/* Item 2 - Controle de Estoque */}
                  <button 
                    onClick={() => { onNavigate('inventory'); setGridMenuOpen(false); }}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all text-left"
                  >
                    <Archive className="text-gray-400 shrink-0" size={24} />
                    <span className="text-sm font-medium text-gray-700 leading-tight">Controle de<br />Estoque</span>
                  </button>

                  {/* Item 3 - Campanhas */}
                  <button className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all text-left">
                    <MessageSquareIcon className="text-gray-400 shrink-0" size={24} />
                    <span className="text-sm font-medium text-gray-700 leading-tight">Campanhas<br />automáticas</span>
                  </button>

                  {/* Item 4 - Galeria */}
                  <button className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all text-left">
                    <Video className="text-gray-400 shrink-0" size={24} />
                    <span className="text-sm font-medium text-gray-700 leading-tight">Galeria de<br />Vídeos</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Right Side Icons & Account */}
      <div className="flex items-center space-x-4">
        {/* Placeholder Button */}
        <a 
          href="https://api.whatsapp.com/send/?phone=5547996777572&text=Ol%C3%A1%21+Estava+usando+o+EvoliSync+e+preciso+de+ajuda." 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden lg:flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
        >
          <span>👋 Chamar especialista</span>
        </a>

        {/* Action Icons */}
        <div className="flex items-center space-x-2 text-gray-500">
          <button onClick={() => onNavigate('patients')} className={`p-2 rounded-full transition-colors ${activePage === 'patients' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`} title="Buscar Pacientes"><Search size={20} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Bell size={20} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><MessageSquare size={20} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><CheckSquare size={20} /></button>
          <button onClick={() => onNavigate('settings')} className={`p-2 rounded-full transition-colors ${activePage === 'settings' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}><Settings size={20} /></button>
        </div>

        {/* Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="flex items-center space-x-2 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
              {userEmail ? userEmail.substring(0, 2) : 'US'}
            </div>
            <span className="text-sm font-medium text-gray-700">Conta</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {accountMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm text-gray-900 truncate">{userEmail || 'Usuário'}</p>
              </div>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut size={16} />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
