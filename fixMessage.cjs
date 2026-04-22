const fs = require('fs');
let f = fs.readFileSync('components/MessageCenter.tsx', 'utf8');

f = f.replace(
    /const handleSaveTemplate = \(\) => {[\s\S]*?setIsEditingTemplate\(false\);\s*};/,
    `const handleSaveTemplate = async () => {
      localStorage.setItem(\`\${activeTab}_template\`, templateToEdit);
      
      const campToUse = (activeTab === 'aniversariantes') ? activeCampaigns.find(c => c.type === 'aniversariantes') : selectedInstance;
      if (campToUse && campToUse.id !== 'aniversariantes' && supabase) {
         try {
            await supabase.from('campaigns').update({ message_template: templateToEdit }).eq('id', campToUse.id);
            setActiveCampaigns(prev => prev.map(c => c.id === campToUse.id ? { ...c, messageTemplate: templateToEdit } : c));
            if (selectedInstance && selectedInstance.id === campToUse.id) {
               setSelectedInstance({ ...selectedInstance, messageTemplate: templateToEdit });
            }
         } catch(e) { console.error('Erro ao salvar template na nuvem:', e); }
      }
      
      setIsEditingTemplate(false);
   };`
);

fs.writeFileSync('components/MessageCenter.tsx', f, 'utf8');
