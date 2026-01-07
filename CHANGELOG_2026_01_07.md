# Changelog - 07/01/2026

## 🔄 Google Calendar Integration & Disconnection
- **Robusta Desconexão**: Refatorado o fluxo de desconexão para garantir a remoção completa dos tokens de acesso.
  - Implementada nova ação `disconnect` na Edge Function `google-auth` para limpar tokens de *qualquer* usuário no banco de dados, contornando limitações de RLS que causavam "conexões fantasmas".
  - Atualizado o frontend (`Settings.tsx`) para chamar essa função segura ao desconectar.
  - O status de integração agora atualiza imediatamente na interface.
- **Verificação de Conexão**: Melhorada a lógica em `userService.ts` para detectar qualquer conta conectada, não apenas o primeiro administrador encontrado.

## 📅 Agenda & Especialistas
- **Fonte de Dados Unificada**: A barra lateral da Agenda agora busca dados da tabela local de `especialistas` em vez da API do Google, garantindo consistência.
- **Filtro de Médicos**:
  - A barra lateral da Agenda agora exibe apenas especialistas cujo nome contém "Dr" ou "Dra".
  - A tela de gerenciamento de Profissionais (`Professionals.tsx`) também aplica esse mesmo filtro.
  - O modal de Novo Agendamento restringe a seleção para apenas esses especialistas.
- **Regra de Negócio**: Bloqueada a criação de novos agendamentos caso a integração com o Google Calendar não esteja ativa, com alerta explicativo para o usuário.

## ➕ Novo Agendamento (Modal)
- **Correção de Busca de Pacientes**: Corrigido o nome da tabela de busca de `clientes` para `Cliente`, permitindo que o autocomplete funcione corretamente.
- **Funcionalidade "Listar Todos"**: Adicionado um botão (seta/chevron) no campo de busca de participante. Ao clicar, lista os primeiros 50 pacientes cadastrados, facilitando a seleção sem necessidade de digitar.
- **Seleção de Agenda**: Atualizado para usar a lista de especialistas filtrada.

## 🛠️ Outras Correções
- Ajuste na renderização das cores dos especialistas na sidebar da Agenda (correção de classe Tailwind).
