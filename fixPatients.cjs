const fs = require('fs');

let f = fs.readFileSync('components/Patients.tsx', 'utf8');

if (!f.includes('useLocation')) {
  f = f.replace("import React, { useState, useMemo, useEffect } from 'react';", "import React, { useState, useMemo, useEffect } from 'react';\nimport { useLocation, useNavigate } from 'react-router-dom';");
}

const syncLogic = `
  const location = useLocation();
  const navigate = useNavigate();

  // Sync selected patient from URL
  useEffect(() => {
     if (patients.length > 0) {
        const parts = location.pathname.split('/');
        if (parts[1] === 'pacientes' && parts[2]) {
           const id = parts[2];
           if (!selectedPatient || selectedPatient.id !== id) {
              const p = patients.find(p => p.id === id);
              if (p) {
                 setSelectedPatient(p);
              }
           }
        } else if (parts[1] === 'pacientes' && !parts[2] && selectedPatient) {
           // URL says no patient, but we have one selected (e.g. back button)
           setSelectedPatient(null);
        }
     }
  }, [location.pathname, patients]);

  const handleSelectPatient = (patient: Patient) => {
     setSelectedPatient(patient);
     navigate(\`/pacientes/\${patient.id}/visao-geral\`);
  };

  const handleBackFromPatient = () => {
     setSelectedPatient(null);
     navigate('/pacientes');
  };
`;

// Insert the sync logic after `const [isLoading, setIsLoading] = useState(true);`
f = f.replace(
  "const [isLoading, setIsLoading] = useState(true);",
  "const [isLoading, setIsLoading] = useState(true);\n" + syncLogic
);

f = f.replace(/onClick=\{\(\) => setSelectedPatient\(patient\)\}/g, "onClick={() => handleSelectPatient(patient)}");
f = f.replace(/onBack=\{\(\) => setSelectedPatient\(null\)\}/g, "onBack={handleBackFromPatient}");

fs.writeFileSync('components/Patients.tsx', f, 'utf8');
