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

    // 0. Verifica se a empresa já possui uma conta Stripe conectada
    const { data: empresaAtual } = await supabase
      .from('Empresa')
      .select('stripe_subaccount_id')
      .eq('id', empresa_id)
      .single()

    if (empresaAtual?.stripe_subaccount_id) {
      // Reativa o gateway caso estivesse desativado
      await supabase
        .from('Empresa')
        .update({ stripe_gateway_active: true })
        .eq('id', empresa_id)

      const { force_onboarding } = body;
      // Se não foi explicitamente solicitado abrir a Stripe (force_onboarding), reativa 100% interno sem redirecionar
      if (!force_onboarding) {
        return new Response(JSON.stringify({ 
          success: true, 
          stripe_subaccount_id: empresaAtual.stripe_subaccount_id, 
          reactivated: true 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Se force_onboarding = true (ex: usuário clicou expressamente em 'Completar Cadastro na Stripe')
      const origin = req.headers.get('origin') || 'http://localhost:3000'
      const accountLink = await stripe.accountLinks.create({
        account: empresaAtual.stripe_subaccount_id,
        refresh_url: `${origin}/configuracoes/pagamentos`,
        return_url: `${origin}/configuracoes/pagamentos`,
        type: 'account_onboarding',
      });

      return new Response(JSON.stringify({ success: true, stripe_subaccount_id: empresaAtual.stripe_subaccount_id, account_link_url: accountLink.url }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Cria a subconta na Stripe (Standard Account)
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: {
        empresa_id: empresa_id
      }
    });

    // 2. Salva no banco de dados da empresa
    const { error } = await supabase
      .from('Empresa')
      .update({ stripe_subaccount_id: account.id, stripe_gateway_active: true })
      .eq('id', empresa_id)

    if (error) {
      // Se der erro ao salvar no banco, deletamos a conta recém criada na Stripe para não ficar orfã (duplicada)
      await stripe.accounts.del(account.id).catch(console.error)
      throw error;
    }

    // 3. Gera o link de onboarding da Stripe
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/configuracoes/pagamentos`,
      return_url: `${origin}/configuracoes/pagamentos`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ success: true, stripe_subaccount_id: account.id, account_link_url: accountLink.url }), {
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

