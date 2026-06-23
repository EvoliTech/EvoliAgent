CREATE OR REPLACE FUNCTION public.processar_campanhas_aniversario()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    aniv RECORD;
BEGIN
    FOR aniv IN
        SELECT 
            cl.id AS cliente_id,
            c.id AS campaign_id
        FROM public."Cliente" cl
        JOIN public.campaigns c ON c.empresa_id::text = cl."IDEmpresa"::text AND c.type IN ('aniversario', 'aniversariantes') AND c.status = 'active'
        WHERE cl.data_nascimento IS NOT NULL
          AND EXTRACT(MONTH FROM cl.data_nascimento::date) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(DAY FROM cl.data_nascimento::date) = EXTRACT(DAY FROM NOW())
    LOOP
        -- Prevenção de Spam / Duplicidade
        IF EXISTS (
            SELECT 1 FROM public.campaign_logs 
            WHERE campaign_id = aniv.campaign_id 
              AND cliente_id::text = aniv.cliente_id::text 
              AND data_envio > NOW() - INTERVAL '300 days'
        ) OR EXISTS (
            SELECT 1 FROM public.campaign_contacts
            WHERE campaign_id = aniv.campaign_id
              AND cliente_id::text = aniv.cliente_id::text
              AND status = 'pendente'
        ) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.campaign_contacts (id, campaign_id, cliente_id, status)
        VALUES (gen_random_uuid(), aniv.campaign_id, aniv.cliente_id::text, 'pendente');
    END LOOP;
END;
$function$;

