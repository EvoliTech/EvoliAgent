-- Adiciona a coluna tipo para diferenciar despesas de receitas manuais
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS tipo varchar(50) DEFAULT 'despesa';

-- Atualiza todas as linhas existentes para o tipo 'despesa' para garantir compatibilidade
UPDATE public.despesas SET tipo = 'despesa' WHERE tipo IS NULL;
