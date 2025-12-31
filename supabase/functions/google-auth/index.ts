
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, ...payload } = await req.json().catch(() => ({}));
        const url = new URL(req.url);
        const getAction = url.searchParams.get('action');
        const finalAction = action || getAction;

        // 1. Get Auth URL
        if (finalAction === 'auth-url') {
            const { data: config, error } = await supabase
                .from('integrations_config')
                .select('*')
                .eq('service', 'google_calendar')
                .single();

            if (error || !config) {
                throw new Error('Credenciais do Google Calendar não configuradas.');
            }

            const redirectUri = payload.redirectUri || url.searchParams.get('redirectUri');
            if (!redirectUri) throw new Error('redirectUri is required');

            const scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ].join(' ');

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.client_id}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;

            return new Response(JSON.stringify({ url: authUrl }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Exchange Token
        if (finalAction === 'exchange-token') {
            const { code, redirectUri, userEmail } = payload;

            if (!code || !redirectUri || !userEmail) {
                throw new Error('Missing parameters: code, redirectUri, or userEmail');
            }

            const { data: config } = await supabase
                .from('integrations_config')
                .select('*')
                .eq('service', 'google_calendar')
                .single();

            if (!config) throw new Error('Credenciais não encontradas.');

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    code,
                    client_id: config.client_id,
                    client_secret: config.client_secret,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
            });

            const tokens = await tokenRes.json();
            if (tokens.error) {
                throw new Error(tokens.error_description || JSON.stringify(tokens));
            }

            const expiresAt = Date.now() + (tokens.expires_in * 1000);

            // Save to especialistas table
            // Note: We use the email to match the specialist.
            const updateData: any = {
                google_access_token: tokens.access_token,
                google_token_expires_at: expiresAt,
                google_email: userEmail // We assume the user authorizes the same email or we just store what they used
            };

            if (tokens.refresh_token) {
                updateData.google_refresh_token = tokens.refresh_token;
            }

            const { data, error: updateError } = await supabase
                .from('especialistas')
                .update(updateData)
                .eq('email', userEmail)
                .select();

            if (updateError) throw new Error(`Erro ao salvar tokens: ${updateError.message}`);

            // Check if any row was actually updated
            if (!data || data.length === 0) {
                // Fallback: Try to find if the user exists at all or if specific columns are missing?
                // For now, return a clear error.
                throw new Error(`Perfil de especialista não encontrado para o email: ${userEmail}. Verifique se seu cadastro está completo.`);
            }



            return new Response(JSON.stringify({ success: true, email: userEmail }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }


        // 3. Fetch Events (Proxy)
        if (finalAction === 'fetch-events') {
            const { userEmail, timeMin, timeMax } = payload;
            if (!userEmail) throw new Error('userEmail is required');

            // Get tokens
            let { data: specialist } = await supabase
                .from('especialistas')
                .select('google_access_token, google_refresh_token, google_token_expires_at')
                .eq('email', userEmail)
                .single();

            if (!specialist || !specialist.google_access_token) {
                throw new Error('Usuário não conectado ao Google.');
            }

            let accessToken = specialist.google_access_token;
            const expiresAt = specialist.google_token_expires_at || 0;

            // Check if expired (buffer 1 min)
            if (Date.now() > expiresAt - 60000) {
                console.log("Token expired, refreshing...");
                if (!specialist.google_refresh_token) {
                    throw new Error('Token expirado e sem refresh token. Reconecte a conta.');
                }

                // Get Client Secret
                const { data: config } = await supabase
                    .from('integrations_config')
                    .select('*')
                    .eq('service', 'google_calendar')
                    .single();

                if (!config) throw new Error('Credenciais de integração perdidas.');

                // Refresh
                const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: config.client_id,
                        client_secret: config.client_secret,
                        refresh_token: specialist.google_refresh_token,
                        grant_type: 'refresh_token'
                    })
                });

                const newTokens = await refreshRes.json();
                if (newTokens.error) throw new Error('Falha ao atualizar token: ' + JSON.stringify(newTokens));

                accessToken = newTokens.access_token;
                const newExpiresAt = Date.now() + (newTokens.expires_in * 1000);

                // Update DB
                await supabase.from('especialistas').update({
                    google_access_token: accessToken,
                    google_token_expires_at: newExpiresAt
                }).eq('email', userEmail);
            }

            // Fetch Calendar Events
            const calendarId = 'primary';
            const params = new URLSearchParams({
                timeMin: timeMin || new Date().toISOString(),
                timeMax: timeMax || new Date(Date.now() + 86400000 * 30).toISOString(), // +30 days default
                singleEvents: 'true',
                orderBy: 'startTime'
            });

            const eventsRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!eventsRes.ok) {
                const errText = await eventsRes.text();
                throw new Error(`Google API Error: ${errText}`);
            }

            const eventsData = await eventsRes.json();
            return new Response(JSON.stringify(eventsData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Unknown action: ${finalAction}`);


    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
