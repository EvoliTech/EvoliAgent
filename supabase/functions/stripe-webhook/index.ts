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
      console.error(`Webhook signature verification failed:`, err.message);
      return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }

    console.log(`Received Stripe event type: ${event.type}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // =========================================================================
    // 1. EVENTOS DE BOLETOS DE PACIENTES (PaymentIntent na subconta conectada)
    // =========================================================================
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

      // 1.1 Localiza a receita de origem
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

      // 1.2 Atualiza TODAS as receitas ligadas a este boleto
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

      // 1.3 Atualiza o JSON de tratamentos/pagamentos em todos os orçamentos envolvidos
      const allReceitas = receitasUpdated?.length ? receitasUpdated : [triggerReceita];
      const paymentIds = new Set(allReceitas.map((r: any) => r.payment_id).filter(Boolean));
      const orcamentoIds = Array.from(new Set(allReceitas.map((r: any) => r.orcamento_id).filter(Boolean)));

      for (const orcId of orcamentoIds) {
        const { data: orcamento, error: orcErr } = await supabase
          .from('orcamentos')
          .select('id, tratamentos')
          .eq('id', orcId)
          .maybeSingle();

        if (orcErr || !orcamento) continue;

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

        if (modified > 0) {
          await supabase
            .from('orcamentos')
            .update({ tratamentos: treatments })
            .eq('id', orcamento.id);
        }
      }
    }

    // =========================================================================
    // 2. EVENTO DE CHECKOUT DE ASSINATURA CONCLUÍDO (SaaS Subscription)
    // =========================================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const empresaIdStr = session.metadata?.empresa_id;
      const customerId = session.customer ? String(session.customer) : null;
      const subscriptionId = session.subscription ? String(session.subscription) : null;

      console.log(`checkout.session.completed: empresa_id=${empresaIdStr}, customer=${customerId}, subscription=${subscriptionId}`);

      const updateData: Record<string, any> = {
        status_assinatura: 'active'
      };
      if (customerId) updateData.stripe_customer_id = customerId;
      if (subscriptionId) updateData.stripe_subscription_id = subscriptionId;

      let empresaIdentified = false;

      // 2.1 Identificação prioritária por metadata.empresa_id
      if (empresaIdStr) {
        const empresaIdNum = parseInt(empresaIdStr, 10);
        if (!isNaN(empresaIdNum)) {
          const { error: updErr } = await supabase
            .from('Empresa')
            .update(updateData)
            .eq('id', empresaIdNum);

          if (updErr) {
            console.error(`Erro ao atualizar Empresa ${empresaIdNum}:`, updErr.message);
          } else {
            console.log(`Empresa ${empresaIdNum} atualizada com sucesso para ativa com subscription ${subscriptionId}`);
            empresaIdentified = true;
          }
        }
      }

      // 2.2 Fallback: busca por stripe_customer_id se não identificou pelo metadata
      if (!empresaIdentified && customerId) {
        const { data: updatedByCus, error: updCusErr } = await supabase
          .from('Empresa')
          .update(updateData)
          .eq('stripe_customer_id', customerId)
          .select('id');

        if (updCusErr) {
          console.error(`Erro ao atualizar Empresa por stripe_customer_id ${customerId}:`, updCusErr.message);
        } else if (updatedByCus && updatedByCus.length > 0) {
          console.log(`Empresa ${updatedByCus[0].id} atualizada por stripe_customer_id`);
          empresaIdentified = true;
        }
      }

      // 2.3 Fallback 2: busca por e-mail do cliente na sessão
      if (!empresaIdentified && session.customer_details?.email) {
        const clientEmail = session.customer_details.email;
        const { data: updatedByEmail, error: updEmailErr } = await supabase
          .from('Empresa')
          .update(updateData)
          .eq('email', clientEmail)
          .select('id');

        if (updEmailErr) {
          console.error(`Erro ao atualizar Empresa por email ${clientEmail}:`, updEmailErr.message);
        } else if (updatedByEmail && updatedByEmail.length > 0) {
          console.log(`Empresa ${updatedByEmail[0].id} atualizada por email ${clientEmail}`);
          empresaIdentified = true;
        }
      }
    }

    // =========================================================================
    // 3. EVENTOS DE CICLO DE VIDA DA ASSINATURA (Created, Updated, Deleted)
    // =========================================================================
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object;
      const status = subscription.status; // 'active', 'trialing', 'past_due', 'canceled', etc.
      const customerId = subscription.customer ? String(subscription.customer) : null;
      const subscriptionId = subscription.id ? String(subscription.id) : null;
      const empresaIdStr = subscription.metadata?.empresa_id;

      const newStatus = (status === 'active' || status === 'trialing') ? 'active' : 'inactive';

      console.log(`customer.subscription event (${event.type}): customer=${customerId}, sub=${subscriptionId}, status=${status} -> ${newStatus}`);

      const updateData: Record<string, any> = {
        status_assinatura: newStatus,
      };
      if (subscriptionId) updateData.stripe_subscription_id = subscriptionId;
      if (customerId) updateData.stripe_customer_id = customerId;

      let updated = false;

      // 3.1 Se houver metadata.empresa_id
      if (empresaIdStr) {
        const empresaIdNum = parseInt(empresaIdStr, 10);
        if (!isNaN(empresaIdNum)) {
          const { error } = await supabase
            .from('Empresa')
            .update(updateData)
            .eq('id', empresaIdNum);
          if (!error) updated = true;
        }
      }

      // 3.2 Por stripe_customer_id
      if (!updated && customerId) {
        const { data, error } = await supabase
          .from('Empresa')
          .update(updateData)
          .eq('stripe_customer_id', customerId)
          .select('id');
        if (!error && data && data.length > 0) updated = true;
      }

      // 3.3 Por stripe_subscription_id
      if (!updated && subscriptionId) {
        const { data, error } = await supabase
          .from('Empresa')
          .update(updateData)
          .eq('stripe_subscription_id', subscriptionId)
          .select('id');
        if (!error && data && data.length > 0) updated = true;
      }

      if (!updated) {
        console.warn(`Aviso: Nenhuma empresa encontrada para atualizar assinatura sub=${subscriptionId}, cus=${customerId}`);
      }
    }

    // =========================================================================
    // 4. EVENTOS DE FATURAS DA ASSINATURA (Invoice payment succeeded / failed)
    // =========================================================================
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const customerId = invoice.customer ? String(invoice.customer) : null;
      const subscriptionId = invoice.subscription ? String(invoice.subscription) : null;

      if (customerId) {
        await supabase
          .from('Empresa')
          .update({
            status_assinatura: 'active',
            ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {})
          })
          .eq('stripe_customer_id', customerId);
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const customerId = invoice.customer ? String(invoice.customer) : null;

      if (customerId) {
        await supabase
          .from('Empresa')
          .update({
            status_assinatura: 'inactive'
          })
          .eq('stripe_customer_id', customerId);
      }
    }

    // =========================================================================
    // 5. EVENTO DE CONTA CONECTADA STRIPE CONNECT (account.updated)
    // =========================================================================
    if (event.type === 'account.updated') {
      const account = event.data.object;
      const accountId = account.id;
      const empresaIdStr = account.metadata?.empresa_id;

      console.log(`Stripe Connect account.updated: ${accountId}, charges_enabled=${account.charges_enabled}, details_submitted=${account.details_submitted}`);

      if (empresaIdStr && accountId && accountId.startsWith('acct_')) {
        const empresaIdNum = parseInt(empresaIdStr, 10);
        if (!isNaN(empresaIdNum)) {
          const updateObj: Record<string, any> = {
            stripe_subaccount_id: accountId
          };
          if (account.charges_enabled && account.details_submitted) {
            updateObj.stripe_gateway_active = true;
          }
          await supabase
            .from('Empresa')
            .update(updateObj)
            .eq('id', empresaIdNum);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})
