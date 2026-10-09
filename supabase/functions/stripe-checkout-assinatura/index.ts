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

    const { empresaNome, email, cpfCnpj, phone, successUrl, cancelUrl, priceId } = await req.json()

    if (!email || !empresaNome || !priceId) {
      return new Response(JSON.stringify({ error: 'email, empresaNome e priceId são obrigatórios' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 1. Criar a empresa no Supabase
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .insert({
        nome: empresaNome,
        email: email,
        telefone: phone,
        cpf_cnpj: cpfCnpj,
        status_assinatura: 'pending'
      })
      .select('id')
      .single()

    if (empresaError) {
      throw new Error(`Erro ao criar empresa: ${empresaError.message}`)
    }

    const empresaId = empresaData.id

    // 2. Criar ou buscar o Customer no Stripe
    let customer
    const existingCustomers = await stripe.customers.list({ email: email, limit: 1 })
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      customer = await stripe.customers.create({
        email: email,
        name: empresaNome,
        metadata: {
          empresa_id: empresaId.toString()
        }
      })
    }

    // 3. Atualizar a empresa com o stripe_customer_id
    await supabase.from('empresas').update({ stripe_customer_id: customer.id }).eq('id', empresaId)

    // 4. Criar a sessão de Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'boleto', 'pix'],
      line_items: [
        {
          price: priceId, // ID do preço criado no Stripe (ex: price_1xxxx)
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || 'https://sua-landing-page.com/sucesso?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'https://sua-landing-page.com/cancelado',
      metadata: {
        empresa_id: empresaId.toString()
      }
    })

    return new Response(JSON.stringify({ url: session.url, empresaId: empresaId, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Erro na função stripe-checkout-assinatura:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
