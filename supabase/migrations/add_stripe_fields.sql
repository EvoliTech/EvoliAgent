-- Adicionar campos de assinatura na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS status_assinatura VARCHAR(50) DEFAULT 'active';

-- Opcional: Para garantir que as empresas antigas continuem tendo acesso, definimos o default como 'active'
