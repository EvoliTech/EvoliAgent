CREATE OR REPLACE FUNCTION public.processar_campanhas_aniversario()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    aniv RECORD;
    mensagem_personalizada TEXT;
    cliente_nome_primeiro TEXT;
    response_content TEXT;
BEGIN
    FOR aniv IN
        SELECT 
            cl.id AS cliente_id,
            cl."IDEmpresa" AS empresa_id,
            COALESCE(cl."nome", 'Cliente') AS cliente_nome,
            cl."telefoneWhatsapp",
            e."nome" AS empresa_nome,
            e."apikey",
            e."instance",
            c.id AS campaign_id,
            c.message_template
        FROM public."Cliente" cl
        JOIN public.campaigns c ON c.empresa_id::text = cl."IDEmpresa"::text AND c.type IN ('aniversario', 'aniversariantes') AND c.status = 'active'
        JOIN public."Empresa" e ON e.id::text = cl."IDEmpresa"::text
        WHERE cl."dataNascimento" IS NOT NULL
          AND EXTRACT(MONTH FROM cl."dataNascimento"::date) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(DAY FROM cl."dataNascimento"::date) = EXTRACT(DAY FROM NOW())
    LOOP
        -- Prevenção de Spam (verifica se já enviou nos últimos 300 dias)
        IF EXISTS (
            SELECT 1 FROM public.campaign_logs 
            WHERE campaign_id = aniv.campaign_id 
              AND cliente_id::text = aniv.cliente_id::text 
              AND data_envio > NOW() - INTERVAL '300 days'
        ) THEN
            CONTINUE;
        END IF;

        cliente_nome_primeiro := split_part(aniv.cliente_nome, ' ', 1);
        mensagem_personalizada := replace(aniv.message_template, '{nome_cliente}', cliente_nome_primeiro);
        mensagem_personalizada := replace(mensagem_personalizada, '{nome}', cliente_nome_primeiro);
        mensagem_personalizada := replace(mensagem_personalizada, '{nome_completo}', aniv.cliente_nome);
        mensagem_personalizada := replace(mensagem_personalizada, '{nome_clinica}', aniv.empresa_nome);

        BEGIN
            -- DISPARO VIA WEBHOOK N8N/RAILWAY
            SELECT content INTO response_content
            FROM http((
              'POST',
              'https://primary-production-ec254.up.railway.app/webhook/disparo-campanha',
              ARRAY[http_header('Content-Type', 'application/json')],
              'application/json',
              json_build_object(
                'telefone', aniv."telefoneWhatsapp",
                'id_empresa', aniv.empresa_id,
                'apikey', aniv."apikey",
                'instancia', aniv."instance",
                'mensagem', mensagem_personalizada,
                'campaign_id', aniv.campaign_id,
                'tipo_campanha', 'aniversariantes'
              )::text
            )::http_request);

            -- Log do envio
            INSERT INTO public.campaign_logs (campaign_id, cliente_id, empresa_id, data_envio)
            VALUES (aniv.campaign_id, aniv.cliente_id::text, aniv.empresa_id::integer, NOW());
            
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;
END;
$function$;
