const fs = require('fs');

let f = fs.readFileSync('App.tsx', 'utf8');

// Replace standard react imports with router imports
f = f.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';"
);

// We need to inject the URL mapper inside App component
const appStartStr = "export default function App() {";
const routerLogic = `
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
          const found = Object.keys(pathToPage).find(p => path.startsWith(p));
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
`;

// Rename original setCurrentPage to _setCurrentPage
f = f.replace(
  "const [currentPage, setCurrentPage] = useState<PageType>",
  "const [currentPage, _setCurrentPage] = useState<PageType>"
);

f = f.replace(appStartStr, appStartStr + "\n" + routerLogic);

fs.writeFileSync('App.tsx', f, 'utf8');
