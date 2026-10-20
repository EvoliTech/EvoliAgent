-- ==============================================================================
-- CORREÇÃO STRIPE: Migração de IDs e saneamento das colunas da tabela Empresa
-- Execute este script no SQL Editor do Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Migra qualquer ID de cliente (cus_...) que foi gravado indevidamente em stripe_account_id para stripe_customer_id
UPDATE public."Empresa"
SET 
  stripe_customer_id = stripe_account_id,
  stripe_account_id = NULL
WHERE stripe_account_id LIKE 'cus_%' 
  AND (stripe_customer_id IS NULL OR stripe_customer_id = '');

-- 2. Atualiza a assinatura e customer_id da conta recém criada nos testes
UPDATE public."Empresa"
SET 
  stripe_customer_id = 'cus_VTP7okNihTDGH4',
  stripe_subscription_id = 'sub_1USSJODPT1HQDGJzLFUtgkiz',
  status_assinatura = 'active',
  stripe_account_id = NULL
WHERE stripe_customer_id = 'cus_VTP7okNihTDGH4' 
   OR stripe_account_id = 'cus_VTP7okNihTDGH4'
   OR email = 'open.evertonai@gmail.com';

-- 3. Se houver alguma conta conectada (acct_...) em stripe_account_id e stripe_subaccount_id estiver nulo, transfere
UPDATE public."Empresa"
SET stripe_subaccount_id = stripe_account_id
WHERE (stripe_subaccount_id IS NULL OR stripe_subaccount_id = '')
  AND stripe_account_id LIKE 'acct_%';

-- 4. Limpa a coluna legada stripe_account_id para que a aplicação utilize 100% stripe_subaccount_id
UPDATE public."Empresa"
SET stripe_account_id = NULL
WHERE stripe_account_id IS NOT NULL;

-- 5. Documenta e reforça a função de cada coluna na tabela Empresa
COMMENT ON COLUMN public."Empresa".stripe_customer_id IS 'ID do Customer Stripe (cus_...) pagante da assinatura mensal do sistema SaaS';
COMMENT ON COLUMN public."Empresa".stripe_subscription_id IS 'ID da Assinatura Stripe (sub_...) do plano do sistema';
COMMENT ON COLUMN public."Empresa".stripe_subaccount_id IS 'ID da conta conectada Stripe Connect (acct_...) para receber pagamentos de boletos de pacientes';
COMMENT ON COLUMN public."Empresa".stripe_gateway_active IS 'Indica se a clínica está operando com gateway Stripe ativo (TRUE) ou controle interno manual (FALSE)';
COMMENT ON COLUMN public."Empresa".stripe_account_id IS '[DEPRECATED] Coluna legada substituída por stripe_subaccount_id';
