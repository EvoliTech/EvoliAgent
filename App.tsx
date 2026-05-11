import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { PageType } from './types';
import { TopHeader } from './components/Layout/TopHeader';
import { Dashboard } from './components/Dashboard';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
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

  // Mapping of logical pages to paths (used for navigation UI)
  const pageToPath: Record<PageType, string> = {
    'dashboard': '/dashboard',
    'agenda': '/agenda',
    'appointments': '/agendamentos',
    'patients': '/pacientes',
    'patient-registration-update': '/pacientes-cadastro',
    'inventory': '/estoque',
    'financeiro': '/financeiro',
    'gallery': '/galeria',
    'campaigns': '/campanhas',
    'message-center': '/mensagens',
    'professionals': '/profissionais',
    'settings': '/configuracoes',
    'clinic-settings': '/configuracoes/clinica',
    'integrations': '/configuracoes/integracoes',
    'plans-management': '/configuracoes/planos',
    'fees-settings': '/configuracoes/taxas',
    'prosthesis-control': '/proteses',
    'google-callback': '/settings/callback'
  };

    const path = location.pathname;
    
    // Ignore anamnese routing
    if (path.startsWith('/anamnese/')) return;
    // Ignore prostese routing
    if (path.startsWith('/protese/')) return;

    // Handle explicit login route
    if (location.pathname === '/login') {
      if (session) {
        // User already logged in, redirect to dashboard
        navigate('/dashboard', { replace: true });
        return;
      }
      return;
    }

    if (path === '/' || path === '') {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Identify page from path
    let matchedPage: PageType = 'dashboard';
    
    if (path.startsWith('/pacientes/')) {
       matchedPage = 'patients';
       const parts = path.split('/');
       if (parts[2]) {
         // Local storage selectedPatient is still used inside Patients.tsx, 
         // but we can set the id in App.tsx just in case.
         // Actually, Patients.tsx controls its own selectedPatient state.
       }
    } else {
       // match exactly or startswith
       const exactMatch = pathToPage[path];
       if (exactMatch) {
          matchedPage = exactMatch;
       } else {
          // fallback search
          const found = Object.keys(pathToPage).sort((a,b)=>b.length-a.length).find(p => path.startsWith(p));
          if (found) matchedPage = pathToPage[found];
       }
    }

    if (matchedPage !== currentPage) {
       _setCurrentPage(matchedPage);
    }
  }, [location.pathname]);

  const setCurrentPage = (page: PageType) => {
    _setCurrentPage(page);
    const path = pageToPath[page] || '/dashboard';
    
    // Preserve patient selection if navigating to patients
    if (page === 'patients' && selectedPatientId) {
      navigate(path + '/' + selectedPatientId);
    } else if (page === 'patient-registration-update' && selectedPatientId) {
      navigate(path + '/' + selectedPatientId);
    } else {
      navigate(path);
    }
  };

  const [currentPage, _setCurrentPage] = useState<PageType>(() => {
    try {
      const saved = localStorage.getItem('appState_currentPage');
      if (saved) return saved as PageType;
    } catch {}
    return 'dashboard';
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('appState_selectedPatientId');
    } catch {}
    return null;
  });

  useEffect(() => {
    localStorage.setItem('appState_currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (selectedPatientId) {
      localStorage.setItem('appState_selectedPatientId', selectedPatientId);
    } else {
      localStorage.removeItem('appState_selectedPatientId');
    }
  }, [selectedPatientId]);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { empresaId, loading: companyLoading } = useCompany();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch((err) => {
        console.error('Session load error:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Check for callback
    if (window.location.pathname.includes('/settings/callback')) {
      setCurrentPage('google-callback');
    }

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    return (
      <div className="w-full h-full relative">
        {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
        {currentPage === 'agenda' && <Agenda />}
        {currentPage === 'appointments' && <AppointmentsList />}
        {currentPage === 'patients' && (
           <div className="w-full h-full">
              <Patients
                 onUpdateRegistration={(id) => {
                    setSelectedPatientId(id);
                    setCurrentPage('patient-registration-update');
                 }}
                 onNavigate={setCurrentPage}
              />
           </div>
        )}
        {currentPage === 'patient-registration-update' && selectedPatientId && (
           <div className="w-full h-full">
              <PatientRegistrationUpdate
                 patientId={selectedPatientId}
                 onBack={() => setCurrentPage('patients')}
              />
           </div>
        )}
        {currentPage === 'inventory' && <Inventory />}
        {currentPage === 'financeiro' && <Financial />}
        {currentPage === 'gallery' && <Gallery />}
        {currentPage === 'campaigns' && <Campaigns />}
        {currentPage === 'message-center' && <MessageCenter />}
        {currentPage === 'professionals' && <Professionals onBack={() => setCurrentPage('settings')} />}
        {currentPage === 'settings' && <Settings onNavigate={setCurrentPage} />}
        {currentPage === 'clinic-settings' && <ClinicSettings initialTab="general" onBack={() => setCurrentPage('settings')} />}
        {currentPage === 'integrations' && <ClinicSettings initialTab="integrations" onBack={() => setCurrentPage('settings')} />}
        {currentPage === 'plans-management' && <PlansManagement onBack={() => setCurrentPage('settings')} />}
        {currentPage === 'fees-settings' && <FeesSettings onNavigate={setCurrentPage} />}
        {currentPage === 'prosthesis-control' && (
           <div className="w-full h-full">
              <ProsthesisControl />
           </div>
        )}
        {currentPage === 'google-callback' && <GoogleCallback onNavigate={setCurrentPage} />}
      </div>
    );
  };

  if (window.location.pathname.startsWith('/anamnese/')) {
    return <PublicAnamnese />;
  }

  if (window.location.pathname.startsWith('/proteses/')) {
    return <PublicProsthesisView />;
  }

  // Public login route handling
  if (location.pathname === '/login') {
    if (session) {
      navigate('/dashboard', { replace: true });
      return null;
    }
    return <Login />;
  }

  if (loading || (session && companyLoading)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 text-sm animate-pulse">
          {loading ? 'Carregando sessão...' : 'Carregando dados da empresa...'}
        </p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!empresaId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">
            Seu usuário não possui uma empresa vinculada. Entre em contato com o administrador.
          </p>
          <button
            onClick={handleLogout}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Global Navigation */}
      <TopHeader
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        userEmail={session.user.email}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50 relative flex flex-col">
          {renderContent()}
      </div>
    </div>
  );
}
