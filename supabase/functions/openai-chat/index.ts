import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Tratamento de preflight CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase Configuração do Servidor ausente.');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { text, empresaId } = await req.json();

        if (!text || !empresaId) {
            throw new Error('text e empresaId são obrigatórios.');
        }

        // Buscar a chave da OpenAI na tabela integrations_config
        let configData = null;
        const res = await supabase
            .from('integrations_config')
            .select('client_secret, is_active')
            .eq('service', 'OpenAi')
            .eq('IDEmpresa', empresaId)
            .maybeSingle();
            
        configData = res.data;

        // Fallback temporário caso a coluna esteja com outro nome ou tenha algum problema de schema
        if (res.error && res.error.code === '42703') {
            const fallback = await supabase
                .from('integrations_config')
                .select('client_secret')
                .in('service', ['openai', 'OpenAi'])
                .eq('IDEmpresa', empresaId)
                .maybeSingle();
            configData = fallback.data;
        }

        const dbKey = (configData && configData.is_active !== false) ? configData.client_secret : null;
        
        // Se não tiver no banco, tenta buscar do .env da Edge Function (VITE_OPENAI_API_KEY ou OPENAI_API_KEY)
        const finalKey = dbKey || Deno.env.get('VITE_OPENAI_API_KEY') || Deno.env.get('OPENAI_API_KEY');

        if (!finalKey) {
            return new Response(JSON.stringify({ error: 'Sua chave de API da IA não foi informada. Vá até Menu > Configurações > Integrações, e salve a sua chave OpenAI.' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Fazer a requisição para a OpenAI
        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Você é um assistente especializado em odontologia. Sua tarefa é receber um texto de evolução clínica (frequentemente transcrito por voz, podendo conter erros ou falta de formatação), corrigir erros, melhorar a coesão, usar terminologia técnica adequada e formatar o texto em tom altamente profissional. Mantenha o sentido original e seja direto e objetivo sem blábláblá. Não adicione informações clínicas não citadas no original.'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3
            })
        });

        if (!openAiRes.ok) {
            if (openAiRes.status === 401) {
                 return new Response(JSON.stringify({ error: 'Sua chave de API OpenAI salva nas configurações é inválida ou incorreta.' }), {
                     status: 401,
                     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                 });
            }
            throw new Error(`OpenAI retornou status ${openAiRes.status}`);
        }

        const apiData = await openAiRes.json();
        const improvedText = apiData.choices[0].message.content;

        return new Response(JSON.stringify({ result: improvedText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
})
