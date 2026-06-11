-- Habilita RLS na tabela receitas
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

-- Remove a política se ela já existir para evitar erro
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.receitas;

-- Cria a política que permite inserção/seleção/atualização para usuários autenticados
CREATE POLICY "Allow all actions for authenticated users" 
ON public.receitas 
FOR ALL 
USING (auth.role() = 'authenticated');
