-- Adiciona as colunas de anexos específicos na tabela despesas
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS comprovante_url text;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS nota_fiscal_url text;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS boleto_url text;

-- (Opcional) Migrar o anexo antigo para comprovante_url caso faça sentido, 
-- ou deixar como anexo_url legado. Vamos migrar para comprovante_url se for pago, 
-- ou boleto_url se não for pago.
UPDATE public.despesas 
SET comprovante_url = anexo_url 
WHERE anexo_url IS NOT NULL AND is_paga = true AND comprovante_url IS NULL;

UPDATE public.despesas 
SET boleto_url = anexo_url 
WHERE anexo_url IS NOT NULL AND is_paga = false AND boleto_url IS NULL;
