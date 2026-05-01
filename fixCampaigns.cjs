const fs = require('fs');

let f = fs.readFileSync('components/Campaigns.tsx', 'utf8');

if (!f.includes('useLocation')) {
  f = f.replace(
    "import React, { useState, useEffect } from 'react';", 
    "import React, { useState, useEffect } from 'react';\nimport { useLocation, useNavigate } from 'react-router-dom';"
  );
}

const syncCampaigns = `
   const location = useLocation();
   const navigate = useNavigate();

   // Sync URL to State
   useEffect(() => {
      const parts = location.pathname.split('/');
      if (parts[1] === 'campanhas') {
         if (!parts[2]) {
            if (step !== 1) setStep(1);
            if (selectedType !== null) setSelectedType(null);
         } else {
            const type = parts[2];
            const action = parts[3];
            if (selectedType !== type) setSelectedType(type);
            
            if (action === 'configurar' && step !== 2) setStep(2);
            else if (action === 'revisao' && step !== 3) setStep(3);
            else if (action === 'sucesso' && step !== 4) setStep(4);
            else if (!action && step !== 1) setStep(1);
         }
      }
   }, [location.pathname]);

   // Methods to update URL (which will update state via useEffect)
   const goStep1 = () => { navigate('/campanhas'); };
   const goStep2 = (type: string) => { navigate(\`/campanhas/\${type}/configurar\`); };
   const goStep3 = (type: string) => { navigate(\`/campanhas/\${type}/revisao\`); };
   const goStep4 = (type: string) => { navigate(\`/campanhas/\${type}/sucesso\`); };

   const handleNext = () => {
      if (step === 1 && selectedType) goStep2(selectedType);
      else if (step === 2 && message && selectedType) goStep3(selectedType);
   };

   const handleBack = () => {
      if (step === 2) goStep1();
      else if (step === 3 && selectedType) goStep2(selectedType);
      else if (step === 4) goStep1();
   };
`;

// Replace standard state hooks if necessary
f = f.replace(
  "const [step, setStep] = useState(1);\n   const [selectedType, setSelectedType] = useState<string | null>(null);",
  "const [step, setStep] = useState(1);\n   const [selectedType, setSelectedType] = useState<string | null>(null);\n" + syncCampaigns
);

// Replace the old handleNext and handleBack
f = f.replace(
  `   const handleNext = () => {\n      if (step === 1 && selectedType) setStep(2);\n      else if (step === 2 && message) setStep(3);\n   };\n\n   const handleBack = () => {\n      if (step > 1) setStep(step - 1);\n   };`,
  ""
);

// We need to also patch step 4 success navigation
f = f.replace(
  "onClick={() => { setStep(1); setSelectedType(null); setMessage(''); }}",
  "onClick={() => { goStep1(); setMessage(''); }}"
);

// On "Ir para a Lista", navigate to "/mensagens" instead of hash
f = f.replace(
  "onClick={() => { window.location.hash = '#message-center'; window.dispatchEvent(new Event('hashchange')); }}",
  "onClick={() => { navigate('/mensagens'); }}"
);

// On "Cancelar" (step 1 back button)
f = f.replace(
  "onClick={() => { setStep(1); setSelectedType(null); }}",
  "onClick={() => { goStep1(); }}"
);

// On "Ativar Campanha", setStep(4) needs to be goStep4(selectedType)
// Wait, in saveCampaign:
f = f.replace(
  "setStep(4);",
  "goStep4(selectedType);"
);

fs.writeFileSync('components/Campaigns.tsx', f, 'utf8');
