# ClínicaSync – painel de agendamentos e pacientes

Aplicação React + TypeScript construída com Vite para gestão de clínicas: autenticação com Supabase, agenda semanal/mensal, cadastro de pacientes, gestão de especialistas e área de configurações/integracões. O Google Calendar é simulado por um serviço mock para demonstrar criação/edição/cancelamento de eventos.

## Funcionalidades
- Login e cadastro por e-mail/senha via Supabase, com manutenção de sessão no cliente.
- Dashboard com cards de métricas e listagem rápida de pacientes recentes.
- Agenda (visões semana/mês) com filtro por especialista, criação/edição/cancelamento de consultas via modal, e link direto para WhatsApp do paciente.
- Pacientes sincronizados com a tabela `Cliente` do Supabase (listagem, busca, filtros, criação e assinatura em tempo real).
- Gestão local de especialistas e tratamentos habilitados.
- Tela de Configurações com dados da clínica, regras de agenda, integrações (Google Calendar mock e placeholder de WhatsApp) e permissões.

## Stack
- React 19, TypeScript e Vite.
- Tailwind CSS via CDN (definido em `index.html`).
- Supabase JS para autenticação e CRUD em `Cliente`.
- Lucide React para ícones.

## Estrutura de pastas (principal)
- `App.tsx`: controle de sessão, navegação e renderização das páginas.
- `components/Agenda.tsx` e `components/Calendar/*`: agenda semanal/mensal, filtros e modais de agendamento.
- `components/Patients.tsx`: sincronização de pacientes com Supabase, busca/filtros e criação.
- `components/Professionals.tsx`: gestão local de especialistas e tratamentos.
- `components/Settings.tsx`: abas de dados da clínica, regras, integrações e segurança.
- `services/patientService.ts`: fetch/insert/assinatura em tempo real na tabela `Cliente`.
- `services/googleCalendarService.ts`: serviço mock que persiste eventos em memória.
- `constants.ts` e `types.ts`: mocks e tipagens compartilhadas.

## Configuração e execução local
1) Instale dependências:  
   `npm install`
2) Crie um arquivo `.env.local` na raiz com:
   - `VITE_SUPABASE_URL=<URL do seu projeto Supabase>`
   - `VITE_SUPABASE_ANON_KEY=<Chave anônima>`
3) Configure Supabase:
   - Habilite autenticação por e-mail/senha (ou use provedores de sua escolha).
   - Crie a tabela `Cliente` com colunas usadas pelo app: `id`, `created_at`, `nome`, `nome_completo`, `telefoneWhatsapp`, `botAtivo`, `status_lead_no_crm`, `email`. Habilite Realtime para essa tabela (o app se inscreve em `custom-all-channel`).
4) Rode em modo dev:  
   `npm run dev` (abre em http://localhost:5173 por padrão).
5) Build/preview de produção (opcionais):  
   `npm run build`  
   `npm run preview`

## Notas e limitações
- A integração com Google Calendar é apenas simulada; eventos ficam em memória e são usados para demonstrar fluxo de criação/edição/cancelamento.
- Especialistas, tratamentos e métricas do dashboard são mocks definidos em `constants.ts`.
- Tailwind é carregado via CDN; se desejar customização avançada, mova para build com PostCSS/Tailwind locais.
