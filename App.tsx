import React, { useState, useEffect } from 'react';
import { PageType } from './types';
import { MainSidebar } from './components/Layout/MainSidebar';
import { Dashboard } from './components/Dashboard';
import { Agenda } from './components/Agenda';
import { Professionals } from './components/Professionals';
import { Patients } from './components/Patients';
import { Settings } from './components/Settings';
import { GoogleCallback } from './components/GoogleCallback';
import { Login } from './components/Login';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'agenda':
        return <Agenda />;
      case 'patients':
        return <Patients />;
      case 'professionals':
        return <Professionals />;
      case 'settings':
        return <Settings />;
      case 'google-callback':
        return <GoogleCallback onNavigate={setCurrentPage} />;
      default:
        return <div className="p-8 text-gray-500">Página em construção.</div>;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Global Navigation */}
      <MainSidebar
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        userEmail={session.user.email}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50 relative">
        {renderContent()}
      </div>
    </div>
  );
}
