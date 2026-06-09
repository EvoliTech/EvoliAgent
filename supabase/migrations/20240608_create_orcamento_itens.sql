-- Criação da tabela orcamento_itens
CREATE TABLE IF NOT EXISTS public.orcamento_itens (
    id text primary key,
    orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
    treatment_name text,
    categoria text,
    valor numeric,
    dente text,
    faces text,
    profissional text,
    convenio text,
    status text,
    observacoes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas de RLS (Row Level Security) se necessário
-- Adicione as políticas caso a tabela orcamentos também possua RLS. Exemplo:
-- ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Acesso total orcamento_itens" ON public.orcamento_itens FOR ALL USING (true);

-- Script de Migração: Extrai os dados do JSON da tabela orcamentos e insere na nova tabela
DO $$
DECLARE
    orcamento_record record;
    tratamento_item jsonb;
    new_id text;
    tratamento_valor numeric;
BEGIN
    FOR orcamento_record IN SELECT id, tratamentos FROM public.orcamentos WHERE tratamentos IS NOT NULL AND jsonb_typeof(tratamentos) = 'array' AND jsonb_array_length(tratamentos) > 0
    LOOP
        FOR tratamento_item IN SELECT * FROM jsonb_array_elements(orcamento_record.tratamentos)
        LOOP
            new_id := COALESCE(tratamento_item->>'id', gen_random_uuid()::text);
            
            -- Tratar valor vazio ou null para numeric
            BEGIN
                tratamento_valor := NULLIF(TRIM(tratamento_item->>'valor'), '')::numeric;
            EXCEPTION WHEN OTHERS THEN
                tratamento_valor := 0;
            END;

            INSERT INTO public.orcamento_itens (
                id,
                orcamento_id,
                treatment_name,
                categoria,
                valor,
                dente,
                faces,
                profissional,
                convenio,
                status,
                observacoes
            ) VALUES (
                new_id,
                orcamento_record.id,
                COALESCE(tratamento_item->>'treatmentName', tratamento_item->>'tratamento'),
                tratamento_item->>'categoria',
                tratamento_valor,
                tratamento_item->>'dente',
                tratamento_item->>'faces',
                tratamento_item->>'profissional',
                tratamento_item->>'convenio',
                COALESCE(tratamento_item->>'status', 'Aguardando'),
                tratamento_item->>'observacoes'
            ) ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
