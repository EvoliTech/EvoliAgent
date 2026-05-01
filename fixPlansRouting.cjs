const fs = require('fs');

let f = fs.readFileSync('components/PlansManagement.tsx', 'utf8');

if (!f.includes('useLocation')) {
  f = f.replace(
    "import React, { useState, useEffect } from 'react';", 
    "import React, { useState, useEffect } from 'react';\nimport { useLocation, useNavigate } from 'react-router-dom';"
  );
}

const syncPlansManagement = `
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'configuracoes' && parts[2] === 'planos') {
      const planId = parts[3];
      if (planId && (!selectedPlanToEdit || selectedPlanToEdit.id !== planId)) {
        if (plans.length > 0) {
          const p = plans.find(p => p.id === planId);
          if (p) setSelectedPlanToEdit(p);
        }
      } else if (!planId && selectedPlanToEdit) {
        setSelectedPlanToEdit(null);
      }
    }
  }, [location.pathname, plans]);

  const handleSelectPlan = (plan: HealthPlan | null) => {
    setSelectedPlanToEdit(plan);
    if (plan) {
      navigate(\`/configuracoes/planos/\${plan.id}\`, { replace: true });
    } else {
      navigate(\`/configuracoes/planos\`, { replace: true });
    }
  };
`;

if (!f.includes('const location = useLocation();')) {
  f = f.replace(
    "const [copyFromSourceId, setCopyFromSourceId] = useState<string>('zero');",
    "const [copyFromSourceId, setCopyFromSourceId] = useState<string>('zero');\n" + syncPlansManagement
  );
}

f = f.replace(/onClick=\{\(\) => setSelectedPlanToEdit\(plan\)\}/g, "onClick={() => handleSelectPlan(plan)}");
f = f.replace(/onBack=\{\(\) => \{ setSelectedPlanToEdit\(null\); loadPlans\(\); \}\}/g, "onBack={() => { handleSelectPlan(null); loadPlans(); }}");

fs.writeFileSync('components/PlansManagement.tsx', f, 'utf8');
