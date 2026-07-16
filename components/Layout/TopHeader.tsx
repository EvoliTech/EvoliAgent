import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  Stethoscope,
  Menu
} from 'lucide-react';
import { PageType } from '../../types';
import { patientService } from '../../services/patientService';
import { useCompany } from '../../contexts/CompanyContext';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useNavigate } from 'react-router-dom';

interface TopHeaderProps {
  activePage: PageType;
  onNavigate: (page: PageType) => void;
  onLogout?: () => void;
  onSwitchProfile?: () => void;
  subUserRole: string;
  subUserPermissions?: string[];
  subUserName?: string;
  subUserName?: string;
  userEmail?: string;
  onMenuClick?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ activePage, onNavigate, onLogout, onSwitchProfile, subUserRole, subUserPermissions, subUserName, userEmail, onMenuClick }) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const { empresaId } = useCompany();
  const [hasBirthday, setHasBirthday] = useState(false);
  const [showBirthdayToast, setShowBirthdayToast] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();

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

  // Navegação movida para o Sidebar

  return (
    <header className="h-16 glass border-b border-gray-200/50 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10 w-full sticky top-0">
      <div className="flex items-center md:hidden">
        {onMenuClick && (
          <button onClick={onMenuClick} className="p-2 -ml-2 text-gray-600 hover:text-indigo-600 hover:bg-white/50 rounded-lg transition-all">
            <Menu size={24} />
          </button>
        )}
      </div>
      <div className="hidden md:block flex-1"></div>

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
          <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded-full transition-colors hover:bg-gray-100" title="Busca Global"><Search size={20} /></button>
          
          <button 
            id="tour-message-center"
            onClick={() => onNavigate('message-center')} 
            className={`p-2 rounded-full transition-all relative ${hasBirthday ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'hover:bg-gray-100'}`}
            title="Central de Mensagens"
          >
            <MessageCircle size={20} />
            {hasBirthday && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
            )}
          </button>

          <button id="tour-settings" onClick={() => onNavigate('settings')} className={`p-2 rounded-full transition-colors ${activePage === 'settings' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}><Settings size={20} /></button>
        </div>

        {/* Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="flex items-center space-x-2 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase ${
              subUserRole === 'admin' ? 'bg-blue-600' : subUserRole === 'gestor' ? 'bg-emerald-600' : subUserRole === 'concierge' ? 'bg-amber-500' : 'bg-purple-600'
            }`}>
              {subUserName ? subUserName.substring(0, 2) : (subUserRole ? subUserRole.substring(0, 2) : 'US')}
            </div>
            <span className="text-sm font-medium text-gray-700">Conta</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {accountMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-48 glass rounded-2xl shadow-glass border border-white/50 py-1 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Perfil ativo</p>
                  <p className={`text-xs font-bold ${
                    subUserRole === 'admin' ? 'text-blue-600' : subUserRole === 'gestor' ? 'text-emerald-600' : subUserRole === 'concierge' ? 'text-amber-600' : 'text-purple-600'
                  }`}>
                    {subUserName || (subUserRole === 'admin' ? 'Administrador' : subUserRole === 'gestor' ? 'Gestor' : subUserRole === 'concierge' ? 'Concierge' : subUserRole)}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate mt-1">{userEmail}</p>
                </div>
                {onSwitchProfile && (
                  <button
                    onClick={() => { setAccountMenuOpen(false); onSwitchProfile(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100"
                  >
                    <User size={16} className="text-gray-400" />
                    <span>Alterar Perfil</span>
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Birthday Toast Popup */}
      {showBirthdayToast && createPortal(
         <div className="fixed bottom-6 right-6 z-[100] glass border border-white/50 shadow-glass rounded-2xl p-5 w-80 animate-in slide-in-from-bottom-5 fade-in duration-300">
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
               onClick={() => { 
                  setShowBirthdayToast(false); 
                  onNavigate('message-center');
                  setTimeout(() => window.dispatchEvent(new Event('open_aniversariantes')), 100);
               }} 
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-sm"
            >
               Enviar mensagens agora
            </button>
         </div>,
         document.body
      )}

      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onNavigateToPatient={(id) => navigate(`/pacientes/${id}/visao-geral`)}
      />
    </header>
  );
};
