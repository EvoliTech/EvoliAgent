import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PageType } from './types';
import { TopHeader } from './components/Layout/TopHeader';
import { Dashboard } from './components/Dashboard';
import { Agenda } from './components/Agenda';
import { AppointmentsList } from './components/AppointmentsList';
import { Patients } from './components/Patients';
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
import { GoogleCallback } from './components/GoogleCallback';
import { Login } from './components/Login';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { useCompany } from './contexts/CompanyContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { empresaId, loading: companyLoading } = useCompany();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Map page types to base paths
  const pageToPath: Record<PageType, string> = {
    dashboard: '/dashboard',
    agenda: '/agenda',
    appointments: '/agendamentos',
    patients: '/pacientes',
    'patient-registration-update': '/pacientes-cadastro',
    inventory: '/estoque',
    financeiro: '/financeiro',
    gallery: '/galeria',
    campaigns: '/campanhas',
    'message-center': '/mensagens',
    professionals: '/profissionais',
    settings: '/configuracoes',
    'clinic-settings': '/configuracoes/clinica',
    integrations: '/configuracoes/integracoes',
    'plans-management': '/configuracoes/planos',
    'fees-settings': '/configuracoes/taxas',
    'prosthesis-control': '/proteses',
    'google-callback': '/settings/callback',
  };

  // Sync URL to currentPage
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/anamnese/') || path.startsWith('/proteses/')) return; // public routes handled later

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

    // Find matching page
    const match = (Object.entries(pageToPath) as [PageType, string][]).find(([_, p]) => p === path);
    if (match) {
      setCurrentPage(match[0]);
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
    navigate('/login', { replace: true });
  };

  // Navigation helper used by child components
  const navigateTo = (page: PageType) => {
    const base = pageToPath[page] || '/dashboard';
    if (page === 'patients' && selectedPatientId) {
      navigate(`${base}/${selectedPatientId}`);
    } else if (page === 'patient-registration-update' && selectedPatientId) {
      navigate(`${base}/${selectedPatientId}`);
    } else {
      navigate(base);
    }
    setCurrentPage(page);
  };

  // Render main authenticated area
  const renderProtected = () => (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <TopHeader activePage={currentPage} onNavigate={navigateTo} onLogout={handleLogout} userEmail={session?.user.email || ''} />
      <div className="flex-1 overflow-auto bg-gray-50 relative flex flex-col">
        {currentPage === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
        {currentPage === 'agenda' && <Agenda />}
        {currentPage === 'appointments' && <AppointmentsList />}
        {currentPage === 'patients' && (
          <Patients
            onUpdateRegistration={id => { setSelectedPatientId(id); navigateTo('patient-registration-update'); }}
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'patient-registration-update' && selectedPatientId && (
          <PatientRegistrationUpdate patientId={selectedPatientId} onBack={() => navigateTo('patients')} />
        )}
        {currentPage === 'inventory' && <Inventory />}
        {currentPage === 'financeiro' && <Financial />}
        {currentPage === 'gallery' && <Gallery />}
        {currentPage === 'campaigns' && <Campaigns />}
        {currentPage === 'message-center' && <MessageCenter />}
        {currentPage === 'professionals' && <Professionals onBack={() => navigateTo('settings')} />}
        {currentPage === 'settings' && <Settings onNavigate={navigateTo} />}
        {currentPage === 'clinic-settings' && <ClinicSettings initialTab="general" onBack={() => navigateTo('settings')} />}
        {currentPage === 'integrations' && <ClinicSettings initialTab="integrations" onBack={() => navigateTo('settings')} />}
        {currentPage === 'plans-management' && <PlansManagement onBack={() => navigateTo('settings')} />}
        {currentPage === 'fees-settings' && <FeesSettings onNavigate={navigateTo} />}
        {currentPage === 'prosthesis-control' && <ProsthesisControl />}
        {currentPage === 'google-callback' && <GoogleCallback onNavigate={navigateTo} />}
      </div>
    </div>
  );

  // Public routes (anamnese, prosthesis view, login)
  if (window.location.pathname.startsWith('/anamnese/')) return <PublicAnamnese />;
  if (window.location.pathname.startsWith('/proteses/')) return <PublicProsthesisView />;
  if (location.pathname === '/login') {
    if (session) return <Navigate to="/dashboard" replace />;
    return <Login />;
  }

  // Loading / auth guards
  if (loading || companyLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 text-sm animate-pulse">{loading ? 'Carregando sessão...' : 'Carregando dados da empresa...'}</p>
      </div>
    );
  }

  if (!session) return <Login />;
  if (!empresaId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">Seu usuário não possui uma empresa vinculada. Entre em contato com o administrador.</p>
          <button onClick={handleLogout} className="text-blue-600 hover:text-blue-700 font-medium">Sair da conta</button>
        </div>
      </div>
    );
  }

  // Render protected area inside ProtectedRoute for future extensibility
  return <ProtectedRoute>{renderProtected()}</ProtectedRoute>;
}
