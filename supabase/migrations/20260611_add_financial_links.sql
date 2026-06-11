-- Add missing linking columns to receitas
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS cliente_id integer;
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS orcamento_id text;
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS tratamento_id text;
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS payment_id text;

-- Add index for fast deletion and lookup
CREATE INDEX IF NOT EXISTS idx_receitas_tratamento_id ON receitas(tratamento_id);
CREATE INDEX IF NOT EXISTS idx_receitas_orcamento_id ON receitas(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_receitas_cliente_id ON receitas(cliente_id);

-- Ensure existing columns are text
ALTER TABLE receitas ALTER COLUMN orcamento_id TYPE text;
ALTER TABLE receitas ALTER COLUMN tratamento_id TYPE text;
