const fs = require('fs');

// FINANCIAL.TSX
let fFin = fs.readFileSync('components/Financial.tsx', 'utf8');

if (!fFin.includes('useLocation')) {
  fFin = fFin.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';\nimport { useLocation, useNavigate } from 'react-router-dom';");
}

const syncFin = `
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'financeiro' && parts[2]) {
      const tab = parts[2] as 'painel' | 'fluxo' | 'comissoes';
      if (['painel', 'fluxo', 'comissoes'].includes(tab) && activeTab !== tab) {
        setActiveTab(tab);
      }
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'painel' | 'fluxo' | 'comissoes') => {
    setActiveTab(tab);
    navigate(\`/financeiro/\${tab}\`, { replace: true });
  };
`;

fFin = fFin.replace(
  "const [activeTab, setActiveTab] = useState<'painel' | 'fluxo' | 'comissoes'>('painel');",
  "const [activeTab, setActiveTab] = useState<'painel' | 'fluxo' | 'comissoes'>('painel');\n" + syncFin
);

fFin = fFin.replace(/onClick=\{\(\) => setActiveTab\('painel'\)\}/g, "onClick={() => handleTabChange('painel')}");
fFin = fFin.replace(/onClick=\{\(\) => setActiveTab\('fluxo'\)\}/g, "onClick={() => handleTabChange('fluxo')}");
fFin = fFin.replace(/onClick=\{\(\) => setActiveTab\('comissoes'\)\}/g, "onClick={() => handleTabChange('comissoes')}");

fs.writeFileSync('components/Financial.tsx', fFin, 'utf8');

// INVENTORY.TSX
let fInv = fs.readFileSync('components/Inventory.tsx', 'utf8');

if (!fInv.includes('useLocation')) {
  fInv = fInv.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { useLocation, useNavigate } from 'react-router-dom';");
}

const syncInv = `
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'estoque' && parts[2]) {
      const tab = parts[2] as 'produtos' | 'historico';
      if (['produtos', 'historico'].includes(tab) && activeTab !== tab) {
        setActiveTab(tab);
      }
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'produtos' | 'historico') => {
    setActiveTab(tab);
    navigate(\`/estoque/\${tab}\`, { replace: true });
  };
`;

fInv = fInv.replace(
  "const [activeTab, setActiveTab] = useState<'produtos' | 'historico'>('produtos');",
  "const [activeTab, setActiveTab] = useState<'produtos' | 'historico'>('produtos');\n" + syncInv
);

fInv = fInv.replace(/onClick=\{\(\) => setActiveTab\('produtos'\)\}/g, "onClick={() => handleTabChange('produtos')}");
fInv = fInv.replace(/onClick=\{\(\) => setActiveTab\('historico'\)\}/g, "onClick={() => handleTabChange('historico')}");

fs.writeFileSync('components/Inventory.tsx', fInv, 'utf8');
