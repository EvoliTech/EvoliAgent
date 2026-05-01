const fs = require('fs');

let f = fs.readFileSync('components/MessageCenter.tsx', 'utf8');

if (!f.includes('useLocation')) {
  f = f.replace(
    "import React, { useState, useEffect } from 'react';", 
    "import React, { useState, useEffect } from 'react';\nimport { useLocation, useNavigate } from 'react-router-dom';"
  );
}

const syncMessageCenter = `
   const location = useLocation();
   const navigate = useNavigate();

   useEffect(() => {
      const parts = location.pathname.split('/');
      if (parts[1] === 'mensagens') {
         const type = parts[2];
         const instanceId = parts[3];

         if (type && activeTab !== type) {
            setActiveTab(type);
         }
         
         if (instanceId && (!selectedInstance || selectedInstance.id !== instanceId)) {
            if (activeCampaigns.length > 0) {
               const inst = activeCampaigns.find(c => c.id === instanceId);
               if (inst) {
                  setSelectedInstance(inst);
               }
            }
         } else if (!instanceId && selectedInstance) {
            setSelectedInstance(null);
         }
      }
   }, [location.pathname, activeCampaigns]);

   const handleTabChange = (type: string) => {
      setActiveTab(type);
      setSelectedInstance(null);
      navigate(\`/mensagens/\${type}\`, { replace: true });
   };

   const handleInstanceChange = (inst: any) => {
      setSelectedInstance(inst);
      if (inst) {
         navigate(\`/mensagens/\${activeTab}/\${inst.id}\`, { replace: true });
      } else {
         navigate(\`/mensagens/\${activeTab}\`, { replace: true });
      }
   };
`;

f = f.replace(
  "const [activeTab, setActiveTab] = useState<string>('aniversariantes');",
  "const [activeTab, setActiveTab] = useState<string>('aniversariantes');\n" + syncMessageCenter
);

f = f.replace(/onClick=\{\(\) => \{ setActiveTab\(type as string\); setSelectedInstance\(null\); \}\}/g, "onClick={() => handleTabChange(type as string)}");
f = f.replace(/onClick=\{\(\) => setSelectedInstance\(null\)\}/g, "onClick={() => handleInstanceChange(null)}");
f = f.replace(/onClick=\{\(\) => setSelectedInstance\(inst\)\}/g, "onClick={() => handleInstanceChange(inst)}");

fs.writeFileSync('components/MessageCenter.tsx', f, 'utf8');
