import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { PageType } from './types';
import { TopHeader } from './components/Layout/TopHeader';
import { Dashboard } from './components/Dashboard';
import { Agenda } from './components/Agenda';
import { Professionals } from './components/Professionals';
import { Patients } from './components/Patients';
import { ClinicSettings } from './components/ClinicSettings';
import { PlansManagement } from './components/PlansManagement';
import { Settings } from './components/Settings';
import { GoogleCallback } from './components/GoogleCallback';
import { AppointmentsList } from './components/AppointmentsList';
import { PatientRegistrationUpdate } from './components/PatientRegistrationUpdate';
import { FeesSettings } from './components/FeesSettings';
import { Inventory } from './components/Inventory';
import { Financial } from './components/Financial';
import { Gallery } from './components/Gallery';
import { Campaigns } from './components/Campaigns';
import { MessageCenter } from './components/MessageCenter';
import { Login } from './components/Login';
import { PublicAnamnese } from './components/PublicAnamnese';
import { ProsthesisControl } from './components/ProsthesisControl';
import { PublicProsthesisView } from './components/PublicProsthesisView';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { useCompany } from './contexts/CompanyContext';

export default function App() {

  const location = useLocation();
  const navigate = useNavigate();

  // Mapping logic
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

  const pathToPage = Object.entries(pageToPath).reduce((acc, [page, path]) => {
    acc[path] = page as PageType;
    return acc;
  }, {} as Record<string, PageType>);

  useEffect(() => {
    const path = location.pathname;
    
    // Ignore anamnese routing
    if (path.startsWith('/anamnese/')) return;
    // Ignore prostese routing
    if (path.startsWith('/protese/')) return;

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
        <div className={currentPage === 'dashboard' ? 'block' : 'hidden'}>
           <Dashboard onNavigate={setCurrentPage} />
        </div>
        <div className={currentPage === 'agenda' ? 'block' : 'hidden'}>
           <Agenda />
        </div>
        <div className={currentPage === 'appointments' ? 'block' : 'hidden'}>
           <AppointmentsList />
        </div>
        <div className={currentPage === 'patients' ? 'block w-full h-full' : 'hidden'}>
           <Patients
             onUpdateRegistration={(id) => {
               setSelectedPatientId(id);
               setCurrentPage('patient-registration-update');
             }}
             onNavigate={setCurrentPage}
           />
        </div>
        <div className={currentPage === 'patient-registration-update' ? 'block w-full h-full' : 'hidden'}>
           {selectedPatientId ? (
             <PatientRegistrationUpdate
               patientId={selectedPatientId}
               onBack={() => setCurrentPage('patients')}
             />
           ) : null}
        </div>
        <div className={currentPage === 'inventory' ? 'block' : 'hidden'}>
           <Inventory />
        </div>
        <div className={currentPage === 'financeiro' ? 'block' : 'hidden'}>
           <Financial />
        </div>
        <div className={currentPage === 'gallery' ? 'block' : 'hidden'}>
           <Gallery />
        </div>
        <div className={currentPage === 'campaigns' ? 'block' : 'hidden'}>
           <Campaigns />
        </div>
        <div className={currentPage === 'message-center' ? 'block' : 'hidden'}>
           <MessageCenter />
        </div>
        <div className={currentPage === 'professionals' ? 'block' : 'hidden'}>
           <Professionals onBack={() => setCurrentPage('settings')} />
        </div>
        <div className={currentPage === 'settings' ? 'block' : 'hidden'}>
           <Settings onNavigate={setCurrentPage} />
        </div>
        <div className={currentPage === 'clinic-settings' ? 'block' : 'hidden'}>
           <ClinicSettings initialTab="general" onBack={() => setCurrentPage('settings')} />
        </div>
        <div className={currentPage === 'integrations' ? 'block' : 'hidden'}>
           <ClinicSettings initialTab="integrations" onBack={() => setCurrentPage('settings')} />
        </div>
        <div className={currentPage === 'plans-management' ? 'block' : 'hidden'}>
           <PlansManagement onBack={() => setCurrentPage('settings')} />
        </div>
        <div className={currentPage === 'fees-settings' ? 'block' : 'hidden'}>
           <FeesSettings onNavigate={setCurrentPage} />
        </div>
        <div className={currentPage === 'prosthesis-control' ? 'block w-full h-full' : 'hidden'}>
           <ProsthesisControl />
        </div>
        <div className={currentPage === 'google-callback' ? 'block' : 'hidden'}>
           <GoogleCallback onNavigate={setCurrentPage} />
        </div>
      </div>
    );
  };

  if (window.location.pathname.startsWith('/anamnese/')) {
    return <PublicAnamnese />;
  }

  if (window.location.pathname.startsWith('/protese/')) {
    return <PublicProsthesisView />;
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
