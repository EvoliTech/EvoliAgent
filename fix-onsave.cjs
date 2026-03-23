const fs = require('fs');
const path = 'components/PatientDetails.tsx';
let c = fs.readFileSync(path, 'utf8');

const regex = /onSave=\{\(budget\) => \{([\s\S]*?)\}\}\s*\/>\s*<\/ErrorBoundary>\s*<\/div>\s*\);\s*\};/;

const replacement = `onSave={async (budget) => {
          if (empresaId && patient?.id) {
             const saved = await budgetService.saveBudget(empresaId, Number(patient.id), budget);
             if (saved) {
                setBudgets(prev => {
                   const existIdx = prev.findIndex(b => b.id === saved.id || b.id === budget.id);
                   if (existIdx >= 0) {
                      const copy = [...prev];
                      copy[existIdx] = saved;
                      return copy;
                   }
                   return [saved, ...prev];
                });
             } else {
                alert('Erro ao salvar o orçamento no banco de dados!');
             }
          }
        }}
      />
      </ErrorBoundary>
    </div>
  );
};`;

c = c.replace(regex, replacement);
fs.writeFileSync(path, c);
console.log('REPLACED');
