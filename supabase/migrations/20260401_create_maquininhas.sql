CREATE TABLE "public"."maquininhas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "empresa_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "pix_fee" NUMERIC DEFAULT 0,
    "debito_dias" TEXT,
    "debito_fee" NUMERIC DEFAULT 0,
    "credito_forma" TEXT,
    "credito_dias_uma_vez" TEXT,
    "credito_fees" JSONB DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
    PRIMARY KEY ("id")
);

-- RLS policies
ALTER TABLE "public"."maquininhas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for authenticated users based on IDEmpresa" ON "public"."maquininhas"
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
