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
    const { empresa_id } = body

    if (!empresa_id) {
      return new Response(JSON.stringify({ error: 'empresa_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Busca o stripe_account_id da empresa
    const { data: empresa, error: empErr } = await supabase
      .from('empresas')
      .select('stripe_account_id')
      .eq('id', empresa_id)
      .single()

    if (empErr || !empresa?.stripe_account_id) {
      throw new Error('Conta Stripe não encontrada para esta empresa.')
    }

    const stripeAccountId = empresa.stripe_account_id;

    // Busca saldo
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId
    });

    // Pega o saldo BRL
    const availableBrl = balance.available.find(b => b.currency === 'brl')?.amount || 0;
    const pendingBrl = balance.pending.find(b => b.currency === 'brl')?.amount || 0;

    return new Response(JSON.stringify({ 
      success: true, 
      balance: availableBrl / 100,
      pending: pendingBrl / 100
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Error fetching balance:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
