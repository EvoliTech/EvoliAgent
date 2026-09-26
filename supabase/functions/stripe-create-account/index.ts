import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Variáveis de ambiente ausentes.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const body = await req.json()
    const { empresa_id, email, name, cnpj } = body

    if (!empresa_id) {
      return new Response(JSON.stringify({ error: 'empresa_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const forwardedFor = req.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1'

    // 1. Cria a subconta na Stripe (Custom Account)
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'BR',
      email: email,
      business_type: 'company',
      company: {
        name: name,
        tax_id: cnpj,
      },
      capabilities: {
        boleto_payments: { requested: true },
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        empresa_id: empresa_id
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: ipAddress,
      }
    });

    // 2. Salva no banco de dados da empresa
    const { error } = await supabase
      .from('Empresa')
      .update({ stripe_account_id: account.id })
      .eq('id', empresa_id)

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, stripe_account_id: account.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Error creating stripe account:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
