-- Migration to add fields for Patient Registration Update
-- Table: Cliente

ALTER TABLE "public"."Cliente" 
ADD COLUMN IF NOT EXISTS "cpf" TEXT,
ADD COLUMN IF NOT EXISTS "rg" TEXT,
ADD COLUMN IF NOT EXISTS "data_nascimento" DATE,
ADD COLUMN IF NOT EXISTS "genero" TEXT,
ADD COLUMN IF NOT EXISTS "estado_civil" TEXT,
ADD COLUMN IF NOT EXISTS "contato_emergencia_nome" TEXT,
ADD COLUMN IF NOT EXISTS "contato_emergencia_telefone" TEXT,
ADD COLUMN IF NOT EXISTS "cep" TEXT,
ADD COLUMN IF NOT EXISTS "endereco_rua" TEXT,
ADD COLUMN IF NOT EXISTS "endereco_numero" TEXT,
ADD COLUMN IF NOT EXISTS "endereco_bairro" TEXT,
ADD COLUMN IF NOT EXISTS "endereco_cidade" TEXT,
ADD COLUMN IF NOT EXISTS "endereco_estado" TEXT,
ADD COLUMN IF NOT EXISTS "endereco_complemento" TEXT,
ADD COLUMN IF NOT EXISTS "carteirinha_numero" TEXT,
ADD COLUMN IF NOT EXISTS "carteirinha_validade" DATE,
ADD COLUMN IF NOT EXISTS "possui_alergias" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "alergias_observacoes" TEXT;

-- Comments for better documentation
COMMENT ON COLUMN "public"."Cliente"."cpf" IS 'CPF do paciente';
COMMENT ON COLUMN "public"."Cliente"."rg" IS 'RG do paciente';
COMMENT ON COLUMN "public"."Cliente"."data_nascimento" IS 'Data de nascimento';
COMMENT ON COLUMN "public"."Cliente"."genero" IS 'Gênero do paciente';
COMMENT ON COLUMN "public"."Cliente"."estado_civil" IS 'Estado civil do paciente';
COMMENT ON COLUMN "public"."Cliente"."contato_emergencia_nome" IS 'Nome do contato de emergência';
COMMENT ON COLUMN "public"."Cliente"."contato_emergencia_telefone" IS 'Telefone do contato de emergência';
COMMENT ON COLUMN "public"."Cliente"."cep" IS 'CEP residencial';
COMMENT ON COLUMN "public"."Cliente"."endereco_rua" IS 'Logradouro/Rua';
COMMENT ON COLUMN "public"."Cliente"."endereco_numero" IS 'Número da residência';
COMMENT ON COLUMN "public"."Cliente"."endereco_bairro" IS 'Bairro';
COMMENT ON COLUMN "public"."Cliente"."endereco_cidade" IS 'Cidade';
COMMENT ON COLUMN "public"."Cliente"."endereco_estado" IS 'UF/Estado';
COMMENT ON COLUMN "public"."Cliente"."endereco_complemento" IS 'Complemento do endereço';
COMMENT ON COLUMN "public"."Cliente"."carteirinha_numero" IS 'Número da carteirinha do plano';
COMMENT ON COLUMN "public"."Cliente"."carteirinha_validade" IS 'Data de validade da carteirinha';
COMMENT ON COLUMN "public"."Cliente"."possui_alergias" IS 'Indica se possui alergias conhecidas';
COMMENT ON COLUMN "public"."Cliente"."alergias_observacoes" IS 'Detalhamento de alergias e observações';
