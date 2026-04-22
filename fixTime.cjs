const fs = require('fs');
let f = fs.readFileSync('components/MessageCenter.tsx', 'utf8');
f = f.replace(/timeZone:\s*'UTC'/g, "timeZone: 'America/Sao_Paulo'");
fs.writeFileSync('components/MessageCenter.tsx', f, 'utf8');
