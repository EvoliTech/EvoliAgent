import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Variáveis de ambiente ausentes.')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const signature = req.headers.get('stripe-signature')
    if (!signature || !endpointSecret) {
       // Permite teste simples sem assinatura
       console.log("No signature or webhook secret found, attempting to parse raw body");
    }

    const bodyText = await req.text();
    let event;

    try {
      if (signature && endpointSecret) {
        event = await stripe.webhooks.constructEventAsync(bodyText, signature, endpointSecret);
      } else {
        event = JSON.parse(bodyText);
      }
    } catch (err: any) {
      console.error(`Webhook signature verification failed.`, err.message);
      return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }

    console.log(`Received event type: ${event.type}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      const paymentIntent = event.data.object;
      const receitaId = paymentIntent.metadata?.receita_id;

      if (!receitaId) {
        console.log("No receita_id in metadata, ignoring event.");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      let statusStr = 'PENDING';
      let isPaga = false;
      let dataPagamento = null;
      let valorLiquido = null;

      if (event.type === 'payment_intent.succeeded') {
        statusStr = 'Pago';
        isPaga = true;
        dataPagamento = new Date().toISOString().split('T')[0];
        // Calculo taxa da Stripe aprox (ou pegue das charges)
        valorLiquido = (paymentIntent.amount_received / 100); 
      } else if (event.type === 'payment_intent.payment_failed') {
        statusStr = 'Falhou';
      } else if (event.type === 'payment_intent.canceled') {
        statusStr = 'Cancelado';
      }

      // Update receita
      const { data: receita, error: updateErr } = await supabase
         .from('receitas')
         .update({
            stripe_status: statusStr,
            valor_liquido_asaas: valorLiquido, // Reutilizando a coluna antiga para não quebrar relatórios
            is_paga: isPaga,
            data_pagamento: dataPagamento
         })
         .eq('id', receitaId)
         .select()
         .single();

      if (updateErr) {
         console.error(`Error updating receita: ${updateErr?.message}`);
      }

      // Update orcamento (Mesma logica do asaas-webhook)
      if (receita && receita.orcamento_id) {
         const { data: orcamento, error: orcErr } = await supabase
            .from('orcamentos')
            .select('*')
            .eq('id', receita.orcamento_id)
            .single();
            
         if (!orcErr && orcamento) {
            const treatments = orcamento.tratamentos || orcamento.treatments || [];
            let modified = false;
            
            for (let t of treatments) {
               if (t.id === receita.tratamento_id && t.payments) {
                  for (let p of t.payments) {
                     if (p.id === receita.payment_id) {
                         p.status_stripe = statusStr;
                         // Atualiza status antigo pra manter UI
                         p.status_asaas = event.type === 'payment_intent.canceled' ? 'DELETED' : (event.type === 'payment_intent.succeeded' ? 'RECEIVED' : 'PENDING');
                         p.isPaid = isPaga;
                         p.status = statusStr;
                         modified = true;
                     }
                  }
               }
            }
            
            if (modified) {
               await supabase.from('orcamentos').update({ tratamentos: treatments, treatments: treatments }).eq('id', orcamento.id);
            }
         }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})
