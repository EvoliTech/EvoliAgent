const fs = require('fs');

let f = fs.readFileSync('components/PatientDetails.tsx', 'utf8');

if (!f.includes('useLocation')) {
  f = f.replace("import React from 'react';", "import React, { useEffect } from 'react';\nimport { useLocation, useNavigate } from 'react-router-dom';");
}

const syncLogic = `
  const location = useLocation();
  const navigate = useNavigate();

  const tabToPath: Record<string, string> = {
    'Visão Geral': 'visao-geral',
    'Evoluções': 'evolucoes',
    'Anamnese': 'anamnese',
    'Odontograma': 'odontograma',
    'Planos de Tratamento': 'planos-de-tratamento',
    'Documentos': 'documentos',
    'Arquivos': 'arquivos',
    'Financeiro': 'financeiro'
  };

  const pathToTab = Object.entries(tabToPath).reduce((acc, [tab, path]) => {
    acc[path] = tab as TabType;
    return acc;
  }, {} as Record<string, TabType>);

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'pacientes' && parts[2] === patient.id) {
       const tabPath = parts[3];
       if (tabPath && pathToTab[tabPath]) {
          if (activeTab !== pathToTab[tabPath]) {
             setActiveTab(pathToTab[tabPath]);
          }
       }
    }
  }, [location.pathname, patient.id]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(\`/pacientes/\${patient.id}/\${tabToPath[tab]}\`, { replace: true });
  };
`;

f = f.replace(
  "const [activeTab, setActiveTab] = React.useState<TabType>('Visão Geral');",
  "const [activeTab, setActiveTab] = React.useState<TabType>('Visão Geral');\n" + syncLogic
);

f = f.replace(/onClick=\{\(\) => setActiveTab\(tab\)\}/g, "onClick={() => handleTabChange(tab)}");

fs.writeFileSync('components/PatientDetails.tsx', f, 'utf8');
