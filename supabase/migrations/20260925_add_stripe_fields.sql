-- Adiciona campos para Stripe na tabela empresas
ALTER TABLE public."Empresa" ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);

-- Adiciona campos para Stripe na tabela receitas
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS stripe_status VARCHAR(50);
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
