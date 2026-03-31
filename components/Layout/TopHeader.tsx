import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  User,
  BarChart2,
  LayoutGrid,
  Settings,
  LogOut,
  Search,
  Gift,
  ChevronDown,
  Calendar1Icon,
  Archive,
  PieChart,
  Globe,
  MessageSquare as MessageSquareIcon,
  Video,
  Image as ImageIcon,
  MessageCircle,
  CircleDollarSign,
  X
} from 'lucide-react';
import { PageType } from '../../types';
import { patientService } from '../../services/patientService';
import { useCompany } from '../../contexts/CompanyContext';

interface TopHeaderProps {
  activePage: PageType;
  onNavigate: (page: PageType) => void;
  onLogout?: () => void;
  userEmail?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ activePage, onNavigate, onLogout, userEmail }) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const { empresaId } = useCompany();
  const [hasBirthday, setHasBirthday] = useState(false);
  const [showBirthdayToast, setShowBirthdayToast] = useState(false);

  useEffect(() => {
    const checkBirthdays = async () => {
      if (!empresaId) return;
      try {
        const allPatients = await patientService.fetchPatients(empresaId);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        const tmrwMonth = tomorrow.getMonth() + 1;
        const tmrwDay = tomorrow.getDate();

        const todayISO = today.toISOString().split('T')[0];
        const sentSaved = localStorage.getItem(`sent_messages_${empresaId}_${todayISO}`);
        const sentMsgs = sentSaved ? JSON.parse(sentSaved) : [];

        let anyTodayUnsent = false;
        let anyBirthday = false;

        allPatients.forEach(p => {
          if (!p.dataNascimento) return;
          const [, monthStr, dayStr] = p.dataNascimento.split('-');
          if (!monthStr || !dayStr) return;
          
          const bMonth = parseInt(monthStr, 10);
          const bDay = parseInt(dayStr, 10);
          
          const isToday = bMonth === currentMonth && bDay === currentDay;
          const isTomorrow = bMonth === tmrwMonth && bDay === tmrwDay;
          
          if (isToday || isTomorrow) {
             anyBirthday = true;
          }
          if (isToday && !sentMsgs.includes(p.id)) {
             anyTodayUnsent = true;
          }
        });

        setHasBirthday(anyBirthday || anyTodayUnsent);
        if (anyTodayUnsent) {
           setShowBirthdayToast(true);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkBirthdays();
    
    // Listen for storage changes in case they send a message and we want to hide the red dot automatically
    const handleStorageChange = () => checkBirthdays();
    window.addEventListener('storage', handleStorageChange);
    // Also add a custom event dispatch from MessageCenter just in case it's in the same tab
    window.addEventListener('messages_sent_updated', handleStorageChange);
    
    return () => {
       window.removeEventListener('storage', handleStorageChange);
       window.removeEventListener('messages_sent_updated', handleStorageChange);
    };
  }, [empresaId]);

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
                  <button 
                    onClick={() => { onNavigate('campaigns'); setGridMenuOpen(false); }}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all text-left"
                  >
                    <MessageSquareIcon className="text-gray-400 shrink-0" size={24} />
                    <span className="text-sm font-medium text-gray-700 leading-tight">Campanhas<br />automáticas</span>
                  </button>

                  {/* Item 4 - Galeria */}
                  <button 
                    onClick={() => { onNavigate('gallery'); setGridMenuOpen(false); }}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all text-left"
                  >
                    <ImageIcon className="text-gray-400 shrink-0" size={24} />
                    <span className="text-sm font-medium text-gray-700 leading-tight">Galeria de<br />Fotos</span>
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
          
          <button 
            onClick={() => onNavigate('message-center')} 
            className={`p-2 rounded-full transition-all relative ${hasBirthday ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'hover:bg-gray-100'}`}
            title="Central de Mensagens"
          >
            <MessageCircle size={20} />
            {hasBirthday && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
            )}
          </button>

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
      {/* Birthday Toast Popup */}
      {showBirthdayToast && (
         <div className="fixed bottom-6 right-6 z-[100] bg-white border border-indigo-100 shadow-2xl shadow-indigo-500/10 rounded-2xl p-5 w-80 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex items-start justify-between mb-3">
               <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center -mt-1 -ml-1">
                  <Gift className="text-indigo-600 w-5 h-5" />
               </div>
               <button onClick={() => setShowBirthdayToast(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 rounded-full p-1.5 -mt-1 -mr-1">
                  <X size={16} />
               </button>
            </div>
            <h4 className="font-bold text-gray-800 text-base mb-1">Aniversariantes do dia!</h4>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
               Você tem mensagens de aniversário pendentes para enviar hoje. Não deixe passar em branco! 🎉
            </p>
            <button 
               onClick={() => { setShowBirthdayToast(false); onNavigate('message-center'); }} 
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-sm"
            >
               Enviar mensagens agora
            </button>
         </div>
      )}
    </header>
  );
};
