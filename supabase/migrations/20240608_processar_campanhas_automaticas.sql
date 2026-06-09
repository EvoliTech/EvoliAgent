CREATE OR REPLACE FUNCTION public.processar_campanhas_automaticas()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    r RECORD;
    mensagem_personalizada TEXT;
    cliente_nome_primeiro TEXT;
    response_content TEXT;
BEGIN
    -- ==============================================================
    -- PARTE 1: CAMPANHAS DE SNAPSHOT (Recuperação, etc)
    -- ==============================================================
    FOR r IN
        SELECT 
            cc.id AS contact_id,
            cc.campaign_id,
            cc.cliente_id,
            c.type,
            c.message_template,
            c.empresa_id,
            COALESCE(cl."nome", 'Cliente') AS cliente_nome,
            cl."telefoneWhatsapp",
            cl."IDEmpresa",
            e."nome" AS empresa_nome,
            e."apikey",
            e."instance"
        FROM public.campaign_contacts cc
        JOIN public.campaigns c ON c.id = cc.campaign_id
        JOIN public."Cliente" cl ON cl.id::text = cc.cliente_id::text
        JOIN public."Empresa" e ON e.id::text = cl."IDEmpresa"::text
        WHERE cc.status = 'pendente' 
          AND c.status = 'active'
          AND c.type NOT IN ('aniversario', 'aniversariantes')
    LOOP
        -- Prevenção de Spam
        IF EXISTS (SELECT 1 FROM public.campaign_logs WHERE campaign_id = r.campaign_id AND cliente_id::text = r.cliente_id::text) THEN
            UPDATE public.campaign_contacts SET status = 'bloqueado_spam' WHERE id = r.contact_id;
            CONTINUE;
        END IF;

        cliente_nome_primeiro := split_part(r.cliente_nome, ' ', 1);
        mensagem_personalizada := replace(r.message_template, '{nome_cliente}', cliente_nome_primeiro);
        mensagem_personalizada := replace(mensagem_personalizada, '{nome}', cliente_nome_primeiro);
        mensagem_personalizada := replace(mensagem_personalizada, '{nome_completo}', r.cliente_nome);
        mensagem_personalizada := replace(mensagem_personalizada, '{nome_clinica}', r.empresa_nome);

        BEGIN
            -- DISPARO USANDO O PADRÃO DE FOLLOW-UP
            SELECT content INTO response_content
            FROM http((
              'POST',
              'https://primary-production-ec254.up.railway.app/webhook/disparo-campanha',
              ARRAY[http_header('Content-Type', 'application/json')],
              'application/json',
              json_build_object(
                'telefone', r."telefoneWhatsapp",
                'id_empresa', r."IDEmpresa",
                'apikey', r."apikey",
                'instancia', r."instance",
                'mensagem', mensagem_personalizada,
                'campaign_id', r.campaign_id,
                'tipo_campanha', r.type
              )::text
            )::http_request);

            UPDATE public.campaign_contacts SET status = 'enviado', data_envio = NOW() WHERE id = r.contact_id;
            INSERT INTO public.campaign_logs (campaign_id, cliente_id, empresa_id, data_envio)
            VALUES (r.campaign_id, r.cliente_id, r.empresa_id, NOW());
            
        EXCEPTION WHEN OTHERS THEN
            UPDATE public.campaign_contacts SET status = 'falha_envio' WHERE id = r.contact_id;
        END;
    END LOOP;
END;
$function$;
