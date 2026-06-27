-- Migration to add Asaas integration fields to the receitas table

ALTER TABLE public.receitas
ADD COLUMN IF NOT EXISTS asaas_payment_id text,
ADD COLUMN IF NOT EXISTS status_asaas text DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS link_boleto text,
ADD COLUMN IF NOT EXISTS linha_digitavel text,
ADD COLUMN IF NOT EXISTS valor_liquido_asaas numeric;
