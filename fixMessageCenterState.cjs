const fs = require('fs');
let f = fs.readFileSync('components/MessageCenter.tsx', 'utf8');

const regex = /const \[loading, setLoading\] = useState\(false\);[\s\S]*?const \[templateToEdit, setTemplateToEdit\] = useState\(''\);/;

f = f.replace(regex, '');

const stateVars = `const [loading, setLoading] = useState(false);
   const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
   const [selectedInstance, setSelectedInstance] = useState<any | null>(null);
   const [patientsList, setPatientsList] = useState<any[]>([]);

   const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
   const [customMessage, setCustomMessage] = useState('');

   // Anti-spam logs
   const [sentLogs, setSentLogs] = useState<{ patientId: string, campaignId: string, timestamp: number }[]>([]);

   const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});

   // Template Editor State
   const [isEditingTemplate, setIsEditingTemplate] = useState(false);
   const [templateToEdit, setTemplateToEdit] = useState('');`;

f = f.replace("const [activeTab, setActiveTab] = useState<string>('aniversariantes');", "const [activeTab, setActiveTab] = useState<string>('aniversariantes');\n" + stateVars);

fs.writeFileSync('components/MessageCenter.tsx', f, 'utf8');
