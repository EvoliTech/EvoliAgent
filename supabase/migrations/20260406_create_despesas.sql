CREATE TABLE "public"."despesas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "empresa_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT,
    "data_vencimento" DATE NOT NULL,
    "valor" NUMERIC NOT NULL DEFAULT 0,
    "is_recorrente" BOOLEAN DEFAULT false,
    "periodo_recorrencia" TEXT,
    "duracao_meses" INTEGER,
    "grupo_recorrente" UUID,
    "is_paga" BOOLEAN DEFAULT false,
    "data_pagamento" DATE,
    "forma_pagamento" TEXT,
    "observacoes" TEXT,
    "anexo_url" TEXT,
    PRIMARY KEY ("id")
);

-- RLS policies
ALTER TABLE "public"."despesas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for authenticated users based on empresa_id" ON "public"."despesas"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    empresa_id IN (
        SELECT "IDEmpresa" 
        FROM users 
        WHERE auth_user_id = auth.uid()
    )
)
WITH CHECK (
    empresa_id IN (
        SELECT "IDEmpresa" 
        FROM users 
        WHERE auth_user_id = auth.uid()
    )
);
