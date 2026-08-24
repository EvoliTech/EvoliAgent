import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PageType } from './types';
import { TopHeader } from './components/Layout/TopHeader';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Agenda } from './components/Agenda';
import { AppointmentsList } from './components/AppointmentsList';
import { Patients } from './components/Patients';
import { CRM } from './components/CRM';
import { PatientRegistrationUpdate } from './components/PatientRegistrationUpdate';
import { Inventory } from './components/Inventory';
import { Financial } from './components/Financial';
import { Gallery } from './components/Gallery';
import { Campaigns } from './components/Campaigns';
import { MessageCenter } from './components/MessageCenter';
import { Professionals } from './components/Professionals';
import { Settings } from './components/Settings';
import { ClinicSettings } from './components/ClinicSettings';
import { PlansManagement } from './components/PlansManagement';
import { FeesSettings } from './components/FeesSettings';
import { ProsthesisControl } from './components/ProsthesisControl';
import { PublicAnamnese } from './components/PublicAnamnese';
import { PublicProsthesisView } from './components/PublicProsthesisView';
import { PublicBudgetView } from './components/PublicBudgetView';
import { GoogleCallback } from './components/GoogleCallback';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { useCompany } from './contexts/CompanyContext';
import ProtectedRoute from './components/ProtectedRoute';
import { SubUserSelection } from './components/SubUserSelection';
import { OnboardingTour } from './components/OnboardingTour';
import { FirstAccessSetupModal } from './components/FirstAccessSetupModal';
import { subUserService } from './services/userService';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { empresaId, loading: companyLoading } = useCompany();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFirstAccessTour, setIsFirstAccessTour] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  const [subUserRole, setSubUserRole] = useState<string | null>(null);
  const [subUserName, setSubUserName] = useState<string>('');
  const [subUserPermissions, setSubUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    const savedRole = localStorage.getItem('clinica_sub_user_role');
    const savedName = localStorage.getItem('clinica_sub_user_name') || '';
    const isAuthenticated = localStorage.getItem('clinica_sub_user_authenticated') === 'true';
    const savedPerms = localStorage.getItem('clinica_sub_user_permissions');
    
    if (savedRole && isAuthenticated) {
      setSubUserRole(savedRole);
      setSubUserName(savedName);
      if (savedPerms) {
        try {
          setSubUserPermissions(JSON.parse(savedPerms));
        } catch (e) {
          console.error("Erro ao analisar permissões do sub-usuário:", e);
        }
      } else if (savedRole === 'admin') {
        setSubUserPermissions(['agenda', 'appointments', 'patients', 'financeiro', 'campaigns', 'inventory', 'gallery', 'prosthesis-control', 'integrations', 'security']);
      }
    }
  }, []);

  const handleSubUserLoginSuccess = (role: string, name: string, permissions: string[]) => {
    localStorage.setItem('clinica_sub_user_role', role);
    localStorage.setItem('clinica_sub_user_name', name);
    localStorage.setItem('clinica_sub_user_permissions', JSON.stringify(permissions));
    localStorage.setItem('clinica_sub_user_authenticated', 'true');
    setSubUserRole(role);
    setSubUserName(name);
    setSubUserPermissions(permissions);
  };

  const handleSwitchProfile = () => {
    localStorage.removeItem('clinica_sub_user_role');
    localStorage.removeItem('clinica_sub_user_name');
    localStorage.removeItem('clinica_sub_user_permissions');
    localStorage.removeItem('clinica_sub_user_authenticated');
    setSubUserRole(null);
    setSubUserName('');
    setSubUserPermissions([]);
  };

  // Map page types to base paths
  const pageToPath: Record<PageType, string> = {
    dashboard: '/dashboard',
    agenda: '/agenda',
    appointments: '/agendamentos',
    crm: '/crm',
    patients: '/pacientes',
    'patient-registration-update': '/pacientes-cadastro',
    reports: '/relatorios',
    inventory: '/estoque',
    financeiro: '/financeiro',
    gallery: '/galeria',
    campaigns: '/campanhas',
    'message-center': '/mensagens',
    professionals: '/profissionais',
    settings: '/configuracoes',
    'clinic-settings': '/configuracoes/clinica',
    integrations: '/configuracoes/integracoes',
    security: '/configuracoes/seguranca',
    'plans-management': '/configuracoes/planos',
    'fees-settings': '/configuracoes/taxas',
    'prosthesis-control': '/proteses',
    'google-callback': '/settings/callback',
  };

  // Sync URL to currentPage
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/anamnese/') || path.startsWith('/proteses/') || path.startsWith('/protese/') || path.startsWith('/orcamento/')) return; // public routes handled later

    if (path === '/login') {
      if (session) {
        navigate('/dashboard', { replace: true });
        return;
      }
      return; // let Login component render below
    }

    if (path === '/' || path === '') {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Find exact matching page
    const match = (Object.entries(pageToPath) as [PageType, string][]).find(([_, p]) => p === path);
    if (match) {
      setCurrentPage(match[0]);
      return;
    }



    // Check for subpath prefix match (e.g., /financeiro/fluxo)
    // Sort by length descending to ensure more specific paths (like /configuracoes/clinica) match before broader ones (/configuracoes)
    const prefixMatch = (Object.entries(pageToPath) as [PageType, string][])
      .sort((a, b) => b[1].length - a[1].length)
      .find(([_, p]) => path.startsWith(p + '/'));

    if (prefixMatch) {
      setCurrentPage(prefixMatch[0]);
    } else {
      // fuzzy match for nested patient routes
      if (path.startsWith('/pacientes/')) {
        setCurrentPage('patients');
      } else {
        // fallback to dashboard
        setCurrentPage('dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [location.pathname, session, navigate]);

  // Load Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => console.error('Session load error:', err));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('clinica_sub_user_role');
    localStorage.removeItem('clinica_sub_user_name');
    localStorage.removeItem('clinica_sub_user_permissions');
    localStorage.removeItem('clinica_sub_user_authenticated');
    setSubUserRole(null);
    setSubUserName('');
    setSubUserPermissions([]);
    navigate('/login', { replace: true });
  };

  // Navigation helper used by child components
  const navigateTo = (page: PageType) => {
    const base = pageToPath[page] || '/dashboard';
    if (page === 'patients') {
      const globalLastPatientId = localStorage.getItem('global_last_patient_id');
      if (globalLastPatientId) {
        const lastPath = localStorage.getItem(`patient_path_${globalLastPatientId}`) || 'visao-geral';
        navigate(`${base}/${globalLastPatientId}/${lastPath}`);
      } else {
        navigate(base);
      }
    } else if (page === 'patient-registration-update' && selectedPatientId) {
      navigate(`${base}/${selectedPatientId}`);
    } else {
      navigate(base);
    }
    setCurrentPage(page);
  };

  // Render main authenticated area
  const renderProtected = () => {
    const activeRole = isFirstAccessTour ? 'admin' : subUserRole;
    const activePerms = isFirstAccessTour ? ['agenda', 'appointments', 'patients', 'financeiro', 'campaigns', 'inventory', 'gallery', 'prosthesis-control', 'integrations', 'security'] : subUserPermissions;

    const hasAccess = (permission: string) => {
      if (!activeRole) return false;
      if (activeRole === 'admin') return true;
      return activePerms.includes(permission);
    };

    return (
      <div className="flex app-h-screen bg-transparent font-sans w-full">
        <Sidebar
          activePage={currentPage}
          onNavigate={(page) => { navigateTo(page); setIsMobileMenuOpen(false); }}
          subUserRole={activeRole || 'admin'}
          subUserPermissions={activePerms}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden">
          <TopHeader
            activePage={currentPage}
            onNavigate={navigateTo}
            onLogout={handleLogout}
            onSwitchProfile={handleSwitchProfile}
            subUserRole={activeRole || 'admin'}
            subUserPermissions={activePerms}
            subUserName={subUserName}
            userEmail={session?.user.email || ''}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
          <main className="flex-1 overflow-auto bg-transparent relative p-2 lg:p-4">
            {currentPage === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
          {currentPage === 'agenda' && (
            !hasAccess('agenda') ? <Navigate to="/dashboard" replace /> : <Agenda />
          )}
          {currentPage === 'appointments' && (
            !hasAccess('appointments') ? <Navigate to="/dashboard" replace /> : <AppointmentsList />
          )}
          {currentPage === 'crm' && (
            !hasAccess('patients') ? <Navigate to="/dashboard" replace /> : <CRM />
          )}
          {currentPage === 'reports' && (
            !hasAccess('reports') ? <Navigate to="/dashboard" replace /> : <Reports />
          )}
          {currentPage === 'patients' && (
            !hasAccess('patients') ? <Navigate to="/dashboard" replace /> : (
              <Patients
                onUpdateRegistration={id => { setSelectedPatientId(id); navigateTo('patient-registration-update'); }}
                onNavigate={navigateTo}
              />
            )
          )}
          {currentPage === 'patient-registration-update' && selectedPatientId && (
            !hasAccess('patients') ? <Navigate to="/dashboard" replace /> : (
              <PatientRegistrationUpdate patientId={selectedPatientId} onBack={() => navigateTo('patients')} />
            )
          )}
          {currentPage === 'inventory' && (
            !hasAccess('inventory') ? <Navigate to="/dashboard" replace /> : <Inventory />
          )}
          {currentPage === 'financeiro' && (
            !hasAccess('financeiro') ? <Navigate to="/dashboard" replace /> : <Financial />
          )}
          {currentPage === 'gallery' && (
            !hasAccess('gallery') ? <Navigate to="/dashboard" replace /> : <Gallery />
          )}
          {currentPage === 'campaigns' && (
            !hasAccess('campaigns') ? <Navigate to="/dashboard" replace /> : <Campaigns />
          )}
          {currentPage === 'message-center' && <MessageCenter />}
          {currentPage === 'professionals' && <Professionals onBack={() => navigateTo('settings')} />}
          {currentPage === 'settings' && <Settings onNavigate={navigateTo} />}
          {(currentPage === 'clinic-settings' || currentPage === 'integrations' || currentPage === 'security') && (
            <ClinicSettings 
              initialTab={currentPage === 'integrations' ? 'integrations' : currentPage === 'security' ? 'security' : 'general'} 
              onBack={() => navigateTo('settings')} 
            />
          )}
          {currentPage === 'plans-management' && <PlansManagement onBack={() => navigateTo('settings')} />}
          {currentPage === 'fees-settings' && <FeesSettings onNavigate={navigateTo} />}
          {currentPage === 'prosthesis-control' && (
            !hasAccess('prosthesis-control') ? <Navigate to="/dashboard" replace /> : <ProsthesisControl />
          )}
            {currentPage === 'google-callback' && <GoogleCallback onNavigate={navigateTo} />}
          </main>
        </div>
      </div>
    );
  };

  // Public routes (anamnese, prosthesis view, login)
  if (window.location.pathname.startsWith('/anamnese/')) return <PublicAnamnese />;
  if (window.location.pathname.startsWith('/proteses/') || window.location.pathname.startsWith('/protese/')) return <PublicProsthesisView />;
  if (window.location.pathname.startsWith('/orcamento/')) return <PublicBudgetView />;
  if (location.pathname === '/login') {
    if (session) return <Navigate to="/dashboard" replace />;
    return <Login />;
  }

  // Loading / auth guards
  if (loading || companyLoading) {
    return (
      <div className="min-h-screen bg-slate-50/30 flex flex-col">
        {/* Barra de progresso linear no topo */}
        <div className="fixed top-0 left-0 w-full h-1 z-50 overflow-hidden bg-slate-100">
          <div className="h-full bg-blue-600 rounded-r-full absolute left-0 top-0 w-1/3 animate-[slide_1.5s_ease-in-out_infinite]"></div>
          <style>{`
            @keyframes slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;
  if (!empresaId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-transparent p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">Seu usuário não possui uma empresa vinculada. Entre em contato com o administrador.</p>
          <button onClick={handleLogout} className="text-blue-600 hover:text-blue-700 font-medium">Sair da conta</button>
        </div>
      </div>
    );
  }

  if (!subUserRole && !isFirstAccessTour && !showSetupModal) {
    return <SubUserSelection 
      empresaId={empresaId} 
      onLoginSuccess={handleSubUserLoginSuccess} 
      onLogout={handleLogout} 
      onFirstAccess={() => setIsFirstAccessTour(true)} 
      onRequireSetupModal={() => {
        setIsFirstAccessTour(true);
        setShowSetupModal(true);
      }}
    />;
  }

  // Render protected area inside ProtectedRoute for future extensibility
  return (
    <ProtectedRoute>
      {renderProtected()}
      {isFirstAccessTour && !showSetupModal && (
        <OnboardingTour onTourFinish={async () => {
          // Marca no localStorage que o tour já foi concluído/pulado (Garantia à prova de falhas)
          localStorage.setItem('clinica_tour_skipped', 'true');
          
          // Garante que o modal vai aparecer de qualquer forma
          setShowSetupModal(true);
        }} />
      )}
      {showSetupModal && (
        <FirstAccessSetupModal 
          empresaId={empresaId!}
          onSetupComplete={(adminName) => {
            setShowSetupModal(false);
            setIsFirstAccessTour(false);
            // Simulate login as admin to proceed
            handleSubUserLoginSuccess('admin', adminName, ['agenda', 'appointments', 'patients', 'financeiro', 'campaigns', 'inventory', 'gallery', 'prosthesis-control', 'integrations', 'security']);
          }}
        />
      )}
    </ProtectedRoute>
  );
}
