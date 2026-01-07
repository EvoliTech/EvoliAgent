
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Top-level try-catch
    try {
        if (req.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase Config');
            throw new Error('Server Config Error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        let body: any = {};
        const url = new URL(req.url);

        // Robust body parsing
        if (req.method !== 'GET') {
            try {
                const text = await req.text();
                // If body is empty, ignore
                if (text && text.trim().length > 0) {
                    body = JSON.parse(text);
                }
            } catch (e) {
                console.warn('Failed to parse body:', e);
            }
        }

        const action = body.action || url.searchParams.get('action');
        console.log(`[GoogleAuth] Action request: ${action}`);

        if (!action) throw new Error('Action required');

        // =================================================================================
        // ROUTING
        // =================================================================================

        if (action === 'auth-url') {
            const redirectUri = body.redirectUri || url.searchParams.get('redirectUri');
            if (!redirectUri) throw new Error('Missing redirectUri');

            const { data: config, error } = await supabase
                .from('integrations_config')
                .select('*')
                .eq('service', 'google_calendar')
                .single();

            if (error || !config) {
                console.error('Config fetch error:', error);
                throw new Error('Credenciais do Google Calendar não configuradas no Settings.');
            }

            const scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ].join(' ');

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.client_id?.trim()}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;

            return new Response(JSON.stringify({ url: authUrl }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'exchange-token') {
            const { code, redirectUri, userEmail } = body;
            if (!code || !redirectUri || !userEmail) throw new Error('Missing code, redirectUri, or userEmail');

            const { data: config } = await supabase
                .from('integrations_config')
                .select('*')
                .eq('service', 'google_calendar')
                .single();

            if (!config) throw new Error('Credenciais não configuradas no sistema.');

            console.log(`Exchanging token for ${userEmail}`);

            // Exchange Code
            const tokenParams = new URLSearchParams({
                code,
                client_id: config.client_id?.trim(),
                client_secret: config.client_secret?.trim(),
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            });

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenParams,
            });

            let tokens;
            try {
                tokens = await tokenRes.json();
            } catch (e) {
                const raw = await tokenRes.text();
                console.error('Google Raw Error:', raw);
                throw new Error(`Google returned non-JSON: ${raw}`);
            }

            if (tokens.error) {
                console.error('Google Auth Error:', tokens);
                throw new Error(`Google Error: ${tokens.error_description || tokens.error}`);
            }

            // Save Tokens
            const expiresAt = Date.now() + (tokens.expires_in * 1000);

            // Check if user exists in users table (admin/owner)
            const { data: userCheck } = await supabase.from('users').select('id').eq('email', userEmail).single();

            if (!userCheck) {
                // Create user if doesn't exist
                const { error: insertError } = await supabase.from('users').insert({
                    email: userEmail,
                    google_access_token: tokens.access_token,
                    google_refresh_token: tokens.refresh_token,
                    google_token_expires_at: expiresAt,
                    google_email: userEmail,
                    role: 'admin'
                });

                if (insertError) throw new Error(`DB Error: ${insertError.message}`);
            } else {
                // Update existing user
                const updatePayload: any = {
                    google_access_token: tokens.access_token,
                    google_token_expires_at: expiresAt,
                    google_email: userEmail
                };
                if (tokens.refresh_token) updatePayload.google_refresh_token = tokens.refresh_token;

                const { error: dbError } = await supabase
                    .from('users')
                    .update(updatePayload)
                    .eq('email', userEmail);

                if (dbError) throw new Error(`DB Error: ${dbError.message}`);
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // =================================================================================
        // CALENDAR ACTIONS
        // =================================================================================

        if (['fetch-events', 'create-event', 'update-event', 'delete-event', 'list-calendars', 'create-calendar', 'delete-calendar'].includes(action)) {
            return handleCalendarAction(action, body, supabase);
        }

        if (action === 'disconnect') {
            try {
                // Nuclear option: Clear tokens for ANY user that has them.
                // This runs with Service Role, so it bypasses RLS.
                const { error } = await supabase
                    .from('users')
                    .update({
                        google_access_token: null,
                        google_refresh_token: null,
                        google_token_expires_at: null,
                        google_email: null
                    })
                    .not('google_access_token', 'is', null);

                if (error) throw error;

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } catch (e: any) {
                console.error('Disconnect failed:', e);
                return new Response(JSON.stringify({ error: e.message }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error: any) {
        console.error('[GoogleAuth] Catch:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Internal Error',
            details: error.toString()
        }), {
            status: 200, // Return 200 to ensure client displays error
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Helper for calendar actions
async function handleCalendarAction(action: string, payload: any, supabase: any) {
    const { userEmail } = payload;
    const accessToken = await getGoogleAccessToken(supabase, userEmail);

    if (action === 'list-calendars') {
        const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!listRes.ok) throw new Error(await listRes.text());
        return new Response(JSON.stringify(await listRes.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create-calendar') {
        const { summary } = payload;
        const r = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary })
        });
        if (!r.ok) throw new Error(await r.text());
        return new Response(JSON.stringify(await r.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete-calendar') {
        const { calendarId } = payload;
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!r.ok) throw new Error(await r.text());
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'fetch-events') {
        const { timeMin, timeMax, calendarId } = payload;
        const targetCalendarId = calendarId || 'primary';
        const params = new URLSearchParams({
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax || new Date(Date.now() + 86400000 * 30).toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime'
        });
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?${params}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!r.ok) throw new Error(await r.text());
        return new Response(JSON.stringify(await r.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create-event') {
        const { event, calendarId } = payload;
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
        if (!r.ok) throw new Error(await r.text());
        return new Response(JSON.stringify(await r.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update-event') {
        const { eventId, event, calendarId } = payload;
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
        if (!r.ok) throw new Error(await r.text());
        return new Response(JSON.stringify(await r.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete-event') {
        const { eventId, calendarId } = payload;
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!r.ok) throw new Error(await r.text());
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not implemented' }), { status: 400, headers: corsHeaders });
}

async function getGoogleAccessToken(supabase: any, userEmail: string) {
    if (!userEmail) throw new Error('userEmail is required');

    // Try to get token from users table (admin/owner)
    const { data: user } = await supabase
        .from('users')
        .select('google_access_token, google_refresh_token, google_token_expires_at')
        .eq('email', userEmail)
        .single();

    if (!user || !user.google_access_token) {
        throw new Error('Usuário não conectado ao Google. Conecte sua conta em Configurações > Integrações.');
    }

    let accessToken = user.google_access_token;
    const expiresAt = user.google_token_expires_at || 0;

    // Refresh if expiring in < 5 mins
    if (Date.now() > expiresAt - 300000) {
        console.log("Token expiring/expired, refreshing...");
        if (!user.google_refresh_token) throw new Error('Token expirado e sem refresh token.');

        const { data: config } = await supabase.from('integrations_config').select('*').eq('service', 'google_calendar').single();
        if (!config) throw new Error('Credenciais de app perdidas.');

        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: config.client_id?.trim(),
                client_secret: config.client_secret?.trim(),
                refresh_token: user.google_refresh_token,
                grant_type: 'refresh_token'
            })
        });

        const newTokens = await refreshRes.json();
        if (newTokens.error) throw new Error('Falha refresh: ' + JSON.stringify(newTokens));

        accessToken = newTokens.access_token;
        const newExpiresAt = Date.now() + (newTokens.expires_in * 1000);

        await supabase.from('users').update({
            google_access_token: accessToken,
            google_token_expires_at: newExpiresAt
        }).eq('email', userEmail);

        console.log("Token refreshed successfully.");
    }

    return accessToken;
}
