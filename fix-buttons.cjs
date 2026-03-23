const fs = require('fs');
const path = 'components/PatientDetails.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/onClick=\{\(\) => setBudgets\(prev => prev.map\(b => b.id === budget.id \? \{ \.\.\.b, status: 'Aprovado' \} : b\)\)\}/, 
`onClick={async () => {
    if (!empresaId || !patient?.id) return;
    const upd = { ...budget, status: 'Aprovado' };
    const saved = await budgetService.saveBudget(empresaId, Number(patient.id), upd);
    if (saved) setBudgets(prev => prev.map(b => b.id === budget.id ? saved : b));
}}`);

c = c.replace(/onClick=\{\(\) => setBudgets\(prev => prev.filter\(b => b.id !== budget.id\)\)\}/,
`onClick={async () => {
   const success = await budgetService.deleteBudget(budget.id);
   if (success) setBudgets(prev => prev.filter(b => b.id !== budget.id));
   else alert("Erro ao excluir orçamento!");
}}`);

fs.writeFileSync(path, c);
console.log('REPLACED APROVAR AND DELETE');
