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
    const { empresa_id, paciente_id, valor, vencimento, externalReference, name, cpf, email } = body

    if (!empresa_id || !valor || !externalReference) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios ausentes' }), {
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
      throw new Error('Conta Stripe não encontrada para esta empresa. O onboarding foi concluído?')
    }

    const stripeAccountId = empresa.stripe_account_id;

    // Cria Customer se não existir na subconta
    let customerId = undefined;
    if (cpf) {
      // Tenta achar o customer pelo metadata
      const existingCustomers = await stripe.customers.search({
        query: `metadata['cpf']:'${cpf}'`,
      }, { stripeAccount: stripeAccountId });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          name: name,
          email: email,
          metadata: { cpf, paciente_id },
        }, { stripeAccount: stripeAccountId });
        customerId = newCustomer.id;
      }
    }

    // Cria o PaymentIntent (Boleto)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(valor * 100), // Converte para centavos
      currency: 'brl',
      payment_method_types: ['boleto'],
      customer: customerId,
      metadata: {
        receita_id: externalReference, // Importante para o webhook associar
        paciente_id: paciente_id
      },
    }, { stripeAccount: stripeAccountId });

    const boletoData = paymentIntent.next_action?.boleto_display_details;

    return new Response(JSON.stringify({ 
      success: true, 
      stripe_payment_intent_id: paymentIntent.id,
      link_boleto: boletoData?.hosted_voucher_url || null,
      linha_digitavel: boletoData?.number || null,
      customer_id: customerId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Error creating boleto:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
