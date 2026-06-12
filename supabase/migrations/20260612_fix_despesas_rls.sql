-- Habilita RLS na tabela despesas
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Remove a política antiga que estava causando bloqueios falsos
DROP POLICY IF EXISTS "Enable ALL for authenticated users based on empresa_id" ON public.despesas;

-- Cria a política que permite inserção/seleção/atualização para usuários autenticados (mesma correção feita para receitas)
CREATE POLICY "Allow all actions for authenticated users" 
ON public.despesas 
FOR ALL 
USING (auth.role() = 'authenticated');
