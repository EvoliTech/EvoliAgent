const fs = require('fs');

let app = fs.readFileSync('App.tsx', 'utf8');

// 1. Import
if (!app.includes('import { ProsthesisControl }')) {
    app = app.replace(
        "import { PublicAnamnese } from './components/PublicAnamnese';",
        "import { PublicAnamnese } from './components/PublicAnamnese';\nimport { ProsthesisControl } from './components/ProsthesisControl';"
    );
}

// 2. pageToPath
if (!app.includes("'prosthesis-control': '/proteses'")) {
    app = app.replace(
        "'fees-settings': '/configuracoes/taxas',",
        "'fees-settings': '/configuracoes/taxas',\n    'prosthesis-control': '/proteses',"
    );
}

// 3. Render
if (!app.includes("currentPage === 'prosthesis-control'")) {
    app = app.replace(
        "<div className={currentPage === 'google-callback' ? 'block' : 'hidden'}>",
        "<div className={currentPage === 'prosthesis-control' ? 'block w-full h-full' : 'hidden'}>\n           <ProsthesisControl />\n        </div>\n        <div className={currentPage === 'google-callback' ? 'block' : 'hidden'}>"
    );
}

fs.writeFileSync('App.tsx', app);

let sidebar = fs.readFileSync('components/Layout/MainSidebar.tsx', 'utf8');

if (!sidebar.includes("id: 'prosthesis-control'")) {
    // Add Factory icon to lucide-react
    if (!sidebar.includes('Factory')) {
        sidebar = sidebar.replace(
            "import {\n  LayoutDashboard,",
            "import {\n  LayoutDashboard,\n  Factory,"
        );
    }
    
    // Add to menuItems
    sidebar = sidebar.replace(
        "{ id: 'financeiro', label: 'Financeiro', icon: CircleDollarSign },",
        "{ id: 'financeiro', label: 'Financeiro', icon: CircleDollarSign },\n    { id: 'prosthesis-control', label: 'Próteses', icon: Factory },"
    );
}

fs.writeFileSync('components/Layout/MainSidebar.tsx', sidebar);

console.log('App patched successfully');
