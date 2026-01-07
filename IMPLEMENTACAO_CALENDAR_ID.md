# Implementação: Separação de Calendar ID e Email

## 📋 Resumo das Mudanças

Foi implementada a separação entre o **ID da Agenda (Google Calendar)** e o **E-mail do Especialista**, permitindo que:

1. O ID da agenda seja armazenado em um campo separado (`calendar_id`)
2. O e-mail seja editável pelo usuário
3. Ao sincronizar do Google Calendar, o e-mail seja preenchido automaticamente com o e-mail do proprietário

---

## 🔧 Modificações Realizadas

### 1. **Tipo `Specialist` (types.ts)**
- ✅ Adicionado campo `calendarId?: string` para armazenar o Google Calendar ID
- ✅ Campo `email` agora é independente e editável

### 2. **Serviço de Especialistas (specialistService.ts)**

#### `createSpecialist()` - Criação Manual
- Cria um Google Calendar e armazena o ID em `calendar_id`
- O campo `email` usa o valor fornecido pelo usuário ou o e-mail do proprietário como padrão
- O e-mail é **editável** no formulário

#### `createSpecialistFromGoogle()` - Sincronização
- Armazena o Google Calendar ID em `calendar_id`
- Preenche automaticamente o `email` com o e-mail do proprietário
- O e-mail **não é editável** após sincronização (mas pode ser alterado manualmente)

#### `updateSpecialist()`
- Atualiza ambos os campos: `calendar_id` e `email`

#### `deleteSpecialist()`
- Usa `calendar_id` para deletar o calendário do Google

### 3. **Formulário de Especialistas (Professionals.tsx)**

#### Campo ID (Novo)
- **Visível apenas** quando `calendarId` existe
- **Não editável** (disabled)
- Mostra o ID completo do Google Calendar
- Inclui tooltip explicativo

#### Campo E-mail
- **Sempre editável**
- Placeholder: "email@exemplo.com"
- Texto de ajuda dinâmico:
  - **Novo especialista**: "Será preenchido automaticamente com seu e-mail se deixado em branco"
  - **Editando**: "E-mail do especialista"

### 4. **Sincronização (Settings.tsx)**
- Atualizado para usar `calendarId` ao verificar duplicatas
- Passa o `calendar_id` ao criar especialistas do Google
- Email é preenchido automaticamente pelo serviço

---

## 🗄️ Migração do Banco de Dados

### ⚠️ **IMPORTANTE: Execute esta migração no Supabase**

Um arquivo SQL foi criado em:
```
supabase/migrations/add_calendar_id.sql
```

**Passos para executar:**

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para o seu projeto
3. Navegue até **SQL Editor**
4. Abra o arquivo `add_calendar_id.sql`
5. Copie e cole o conteúdo no editor
6. Clique em **Run** para executar a migração

**O que a migração faz:**
- ✅ Adiciona coluna `calendar_id` (TEXT)
- ✅ Cria índice para melhor performance
- ✅ Adiciona comentários explicativos
- ⚠️ **Opcional**: Migra dados existentes (comentado por padrão)

---

## 🎯 Comportamento Esperado

### Criação Manual de Especialista
1. Usuário preenche o formulário
2. Campo **E-mail** pode ser:
   - Deixado em branco → usa e-mail do proprietário
   - Preenchido → usa o e-mail fornecido
3. Google Calendar é criado automaticamente
4. `calendar_id` armazena o ID do Google Calendar
5. `email` armazena o e-mail escolhido/padrão

### Sincronização do Google Calendar
1. Usuário clica em "Re-sincronizar agora"
2. Para cada calendário encontrado:
   - `calendar_id` = ID do Google Calendar
   - `email` = E-mail do proprietário (automático)
3. Especialista aparece na lista com ambos os campos preenchidos

### Edição de Especialista
1. Ao abrir o modal de edição:
   - Campo **ID** aparece (se `calendarId` existe) - **não editável**
   - Campo **E-mail** aparece - **editável**
2. Usuário pode alterar o e-mail a qualquer momento
3. O `calendar_id` permanece inalterado

---

## 📸 Exemplo Visual

### Formulário - Novo Especialista
```
┌─────────────────────────────────────┐
│ Nome Completo                       │
│ [Dr. João Silva                  ]  │
├─────────────────────────────────────┤
│ Especialidade Principal             │
│ [Cardiologia                     ]  │
├─────────────────────────────────────┤
│ E-mail                              │
│ [email@exemplo.com               ]  │
│ ℹ️ Será preenchido automaticamente  │
│    com seu e-mail se deixado em     │
│    branco                           │
├─────────────────────────────────────┤
│ Telefone                            │
│ [(11) 99999-9999                 ]  │
└─────────────────────────────────────┘
```

### Formulário - Especialista Sincronizado
```
┌─────────────────────────────────────┐
│ Nome Completo                       │
│ [Dr. Bruno Idemori               ]  │
├─────────────────────────────────────┤
│ Especialidade Principal             │
│ [Google Calendar                 ]  │
├─────────────────────────────────────┤
│ ID da Agenda (Google Calendar)      │
│ [39dedd02858d85f882a655f3afdfb...] │
│ ℹ️ Este ID é gerado automaticamente │
│    pelo Google Calendar             │
├─────────────────────────────────────┤
│ E-mail                              │
│ [proprietario@clinica.com        ]  │
│ ℹ️ E-mail do especialista           │
├─────────────────────────────────────┤
│ Telefone                            │
│ [                                ]  │
└─────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

- [x] Tipo `Specialist` atualizado
- [x] `specialistService.ts` refatorado
- [x] Formulário atualizado com campo ID
- [x] Campo e-mail com texto de ajuda
- [x] Sincronização atualizada
- [x] Migração SQL criada
- [ ] **Migração executada no Supabase** ⚠️ (Você precisa fazer isso)

---

## 🚀 Próximos Passos

1. **Execute a migração SQL** no Supabase Dashboard
2. Teste criar um novo especialista manualmente
3. Teste sincronizar calendários do Google
4. Verifique se os campos estão sendo preenchidos corretamente
5. Teste editar um especialista existente

---

## 📝 Notas Técnicas

- O campo `calendar_id` é usado internamente para operações com Google Calendar
- O campo `email` é para uso do usuário e pode ser diferente do ID do calendário
- A migração é **não destrutiva** - não afeta dados existentes
- Índice criado para melhor performance em buscas por `calendar_id`
