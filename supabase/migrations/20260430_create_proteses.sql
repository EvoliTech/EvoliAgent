-- Migration for Controle de Próteses

CREATE TABLE IF NOT EXISTS "public"."protese_laboratorios" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "empresa_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."protese_solicitacoes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "empresa_id" INTEGER NOT NULL,
    "paciente_id" TEXT,
    "paciente_nome" TEXT NOT NULL,
    "responsavel_nome" TEXT NOT NULL,
    "laboratorio_id" UUID REFERENCES "public"."protese_laboratorios"("id"),
    "dentes" TEXT,
    "cor" TEXT,
    "descricao_servico" TEXT,
    "trabalho_executado" TEXT,
    "observacoes_internas" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Solicitação',
    "data_envio" DATE,
    "prazo_entrega" DATE,
    "forma_envio" TEXT,
    "responsavel_retirada" TEXT,
    "observacoes_envio" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."protese_historico" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "empresa_id" INTEGER NOT NULL,
    "solicitacao_id" UUID NOT NULL REFERENCES "public"."protese_solicitacoes"("id") ON DELETE CASCADE,
    "status_anterior" TEXT,
    "status_novo" TEXT NOT NULL,
    "usuario_nome" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY ("id")
);

-- RLS
ALTER TABLE "public"."protese_laboratorios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."protese_solicitacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."protese_historico" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for authenticated users based on IDEmpresa" ON "public"."protese_laboratorios"
AS PERMISSIVE FOR ALL TO authenticated
USING (empresa_id IN (SELECT "IDEmpresa" FROM users WHERE auth_user_id = auth.uid()))
WITH CHECK (empresa_id IN (SELECT "IDEmpresa" FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Enable ALL for authenticated users based on IDEmpresa" ON "public"."protese_solicitacoes"
AS PERMISSIVE FOR ALL TO authenticated
USING (empresa_id IN (SELECT "IDEmpresa" FROM users WHERE auth_user_id = auth.uid()))
WITH CHECK (empresa_id IN (SELECT "IDEmpresa" FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Enable ALL for authenticated users based on IDEmpresa" ON "public"."protese_historico"
AS PERMISSIVE FOR ALL TO authenticated
USING (empresa_id IN (SELECT "IDEmpresa" FROM users WHERE auth_user_id = auth.uid()))
WITH CHECK (empresa_id IN (SELECT "IDEmpresa" FROM users WHERE auth_user_id = auth.uid()));
