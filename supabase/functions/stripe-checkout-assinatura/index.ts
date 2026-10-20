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
    const { empresaId: reqEmpresaId, empresaNome, email, cpfCnpj, phone, successUrl, cancelUrl, priceId } = body

    let empresaId = reqEmpresaId

    // 1. Criar ou validar a empresa no Supabase (Tabela "Empresa")
    if (!empresaId) {
      if (!email || !empresaNome || !priceId) {
        return new Response(JSON.stringify({ error: 'email, empresaNome e priceId são obrigatórios' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from('Empresa')
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
        throw new Error(`Erro ao criar empresa na tabela Empresa: ${empresaError.message}`)
      }

      empresaId = empresaData.id
    }

    // 2. Criar ou buscar o Customer no Stripe
    let customer
    const existingCustomers = await stripe.customers.list({ email: email, limit: 1 })
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
      // Atualiza o metadata com o ID da Empresa se ainda não tiver
      if (customer.metadata?.empresa_id !== empresaId.toString()) {
        await stripe.customers.update(customer.id, {
          metadata: { empresa_id: empresaId.toString() }
        })
      }
    } else {
      customer = await stripe.customers.create({
        email: email,
        name: empresaNome,
        metadata: {
          empresa_id: empresaId.toString()
        }
      })
    }

    // 3. Atualizar a empresa com o stripe_customer_id na tabela "Empresa"
    // Salva exclusivamente na coluna stripe_customer_id (nunca em stripe_account_id ou stripe_subaccount_id)
    const { error: updateCusError } = await supabase
      .from('Empresa')
      .update({ stripe_customer_id: customer.id })
      .eq('id', empresaId)

    if (updateCusError) {
      console.error(`Erro ao atualizar stripe_customer_id na Empresa ${empresaId}:`, updateCusError.message)
    }

    // 4. Criar a sessão de Checkout para Assinatura do SaaS
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
      subscription_data: {
        metadata: {
          empresa_id: empresaId.toString()
        }
      },
      success_url: successUrl || 'https://sua-landing-page.com/sucesso?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'https://sua-landing-page.com/cancelado',
      metadata: {
        empresa_id: empresaId.toString()
      }
    })

    return new Response(JSON.stringify({ url: session.url, empresaId: empresaId, sessionId: session.id, customerId: customer.id }), {
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
