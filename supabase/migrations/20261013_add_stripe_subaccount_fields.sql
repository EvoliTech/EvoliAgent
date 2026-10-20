-- ==============================================================================
-- MIGRAÇÃO STRIPE: Adiciona novos campos de Subconta Connect e Gateway Ativo
-- Execute este script no SQL Editor do Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Campos na tabela "Empresa" (Subconta Stripe Connect e Controle de Gateway)
ALTER TABLE public."Empresa" 
ADD COLUMN IF NOT EXISTS stripe_subaccount_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_gateway_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS status_assinatura VARCHAR(50) DEFAULT 'active';

-- Comentários para documentação das colunas
COMMENT ON COLUMN public."Empresa".stripe_subaccount_id IS 'ID da conta conectada Stripe Connect (ex: acct_...) para recebimento de boletos da clínica';
COMMENT ON COLUMN public."Empresa".stripe_gateway_active IS 'Indica se a clínica ativou o processamento de pagamentos via gateway Stripe no app';
COMMENT ON COLUMN public."Empresa".stripe_customer_id IS 'ID do cliente Stripe para cobrança de assinatura SaaS da clínica';
COMMENT ON COLUMN public."Empresa".stripe_subscription_id IS 'ID da assinatura Stripe do plano da clínica';

-- 2. Campos na tabela "receitas" (Controle de Boletos e Pagamentos Stripe)
ALTER TABLE public.receitas 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Comentários para documentação das colunas de receitas
COMMENT ON COLUMN public.receitas.stripe_payment_intent_id IS 'ID do Payment Intent do boleto gerado na Stripe';
COMMENT ON COLUMN public.receitas.stripe_status IS 'Status do pagamento na Stripe (ex: requires_action, succeeded, canceled)';
COMMENT ON COLUMN public.receitas.stripe_customer_id IS 'ID do Customer (paciente) criado na conta Stripe conectada';
