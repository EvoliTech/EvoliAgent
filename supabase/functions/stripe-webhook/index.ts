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
      const paymentIntentId: string = paymentIntent.id;
      const receitaId = paymentIntent.metadata?.receita_id;
      console.log(`PaymentIntent ${paymentIntentId} | metadata.receita_id=${receitaId}`);

      let statusStr = 'PENDING';
      let statusAsaas = 'PENDING';
      let isPaga = false;
      let dataPagamento: string | null = null;

      if (event.type === 'payment_intent.succeeded') {
        statusStr = 'Pago';
        statusAsaas = 'RECEIVED';
        isPaga = true;
        dataPagamento = new Date().toISOString().split('T')[0];
      } else if (event.type === 'payment_intent.payment_failed') {
        statusStr = 'Falhou';
      } else if (event.type === 'payment_intent.canceled') {
        statusStr = 'Cancelado';
        statusAsaas = 'DELETED';
      }

      // 1. Localiza a receita de origem (por metadata, com fallback pelo payment intent)
      let triggerReceita: any = null;
      if (receitaId) {
        const { data, error } = await supabase.from('receitas').select('*').eq('id', receitaId).maybeSingle();
        if (error) console.error(`Erro buscando receita ${receitaId}: ${error.message}`);
        triggerReceita = data;
      }
      if (!triggerReceita) {
        const { data, error } = await supabase.from('receitas').select('*').eq('stripe_payment_intent_id', paymentIntentId).limit(1);
        if (error) console.error(`Erro buscando receita por PI: ${error.message}`);
        triggerReceita = data?.[0] || null;
      }
      if (!triggerReceita) {
        console.error(`Nenhuma receita encontrada para PI ${paymentIntentId}`);
        return new Response(JSON.stringify({ error: 'Receita not found' }), { status: 404 });
      }
      console.log(`Receita origem: ${triggerReceita.id} | payment_id=${triggerReceita.payment_id} | orcamento=${triggerReceita.orcamento_id}`);

      // 2. Atualiza TODAS as receitas ligadas a este boleto (mesmo payment_id ou mesmo PI)
      const receitaUpdate = {
        stripe_status: statusStr,
        status_asaas: statusAsaas,
        is_paga: isPaga,
        data_pagamento: dataPagamento,
      };
      const orFilter = triggerReceita.payment_id
        ? `payment_id.eq.${triggerReceita.payment_id},stripe_payment_intent_id.eq.${paymentIntentId}`
        : `stripe_payment_intent_id.eq.${paymentIntentId},id.eq.${triggerReceita.id}`;

      const { data: receitasUpdated, error: updateErr } = await supabase
        .from('receitas')
        .update(receitaUpdate)
        .or(orFilter)
        .select('id, orcamento_id, payment_id');

      if (updateErr) {
        console.error(`Erro atualizando receitas: ${updateErr.message}`);
        return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
      }
      console.log(`Receitas atualizadas: ${receitasUpdated?.length ?? 0}`);

      // 3. Atualiza o JSON de pagamentos em todos os orçamentos envolvidos
      const allReceitas = receitasUpdated?.length ? receitasUpdated : [triggerReceita];
      const paymentIds = new Set(allReceitas.map((r: any) => r.payment_id).filter(Boolean));
      const orcamentoIds = Array.from(new Set(allReceitas.map((r: any) => r.orcamento_id).filter(Boolean)));

      for (const orcId of orcamentoIds) {
        const { data: orcamento, error: orcErr } = await supabase
          .from('orcamentos')
          .select('id, tratamentos')
          .eq('id', orcId)
          .maybeSingle();

        if (orcErr || !orcamento) {
          console.error(`Orçamento ${orcId} não encontrado: ${orcErr?.message}`);
          continue;
        }

        const treatments = Array.isArray(orcamento.tratamentos) ? orcamento.tratamentos : [];
        let modified = 0;

        for (const t of treatments) {
          if (!Array.isArray(t?.payments)) continue;
          for (const p of t.payments) {
            if (paymentIds.has(p?.id) || p?.stripe_payment_intent_id === paymentIntentId) {
              p.status = statusStr;
              p.status_stripe = statusStr;
              p.stripe_status = statusStr;
              p.status_asaas = statusAsaas;
              p.isPaid = isPaga;
              if (isPaga) p.paymentDate = dataPagamento;
              modified++;
            }
          }
        }

        console.log(`Orçamento ${orcId}: ${modified} pagamento(s) marcados`);
        if (modified > 0) {
          // IMPORTANTE: a tabela orcamentos só possui a coluna "tratamentos"
          const { error: orcUpdErr } = await supabase
            .from('orcamentos')
            .update({ tratamentos: treatments })
            .eq('id', orcamento.id);
          if (orcUpdErr) {
            console.error(`Erro atualizando orçamento ${orcId}: ${orcUpdErr.message}`);
            return new Response(JSON.stringify({ error: orcUpdErr.message }), { status: 500 });
          }
        }
      }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const empresaIdStr = session.metadata?.empresa_id;
      if (empresaIdStr) {
        await supabase
          .from('empresas')
          .update({ 
            status_assinatura: 'active',
            stripe_subscription_id: session.subscription
          })
          .eq('id', parseInt(empresaIdStr));
        console.log(`Empresa ${empresaIdStr} signature updated to active`);
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const status = subscription.status; // 'active', 'past_due', 'canceled', etc
      const customerId = subscription.customer;

      const newStatus = (status === 'active' || status === 'trialing') ? 'active' : 'inactive';

      const { data, error } = await supabase
        .from('empresas')
        .update({ status_assinatura: newStatus })
        .eq('stripe_customer_id', customerId)
        .select('id');
      
      if (error) console.error(`Erro atualizando status da empresa: ${error.message}`);
      if (data) console.log(`Empresa status updated for customer ${customerId} to ${newStatus}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})
