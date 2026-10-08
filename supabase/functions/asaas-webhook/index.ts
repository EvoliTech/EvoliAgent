import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json();
    console.log("Webhook Body:", body);

    if (body.action !== 'payment_received' && body.action !== 'payment_deleted') {
      return new Response(JSON.stringify({ message: "Ação ignorada" }), { status: 200 });
    }

    const receitaId = body.externalReference;
    if (!receitaId) {
       return new Response(JSON.stringify({ error: "Missing externalReference" }), { status: 400 });
    }

    const netValue = body.netValue ? parseFloat(body.netValue) : 0;
    const isCancel = body.action === 'payment_deleted';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase variables not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Busca a receita inicial para pegar o payment_id
    const { data: triggerReceita, error: triggerErr } = await supabase
       .from('receitas')
       .select('*')
       .eq('id', receitaId)
       .single();

    if (triggerErr || !triggerReceita) {
       throw new Error(`Receita original não encontrada: ${triggerErr?.message}`);
    }

    // 1. Update TODAS as receitas
    const { data: receitasUpdated, error: updateErr } = await supabase
       .from('receitas')
       .update({
          status_asaas: isCancel ? 'DELETED' : 'RECEIVED',
          valor_liquido_asaas: isCancel ? null : netValue,
          is_paga: !isCancel,
          data_pagamento: isCancel ? null : (body.paymentDate || new Date().toISOString().split('T')[0])
       })
       .eq('payment_id', triggerReceita.payment_id)
       .select();

    if (updateErr) {
       throw new Error(`Error updating receitas: ${updateErr?.message}`);
    }

    // 2. Update orcamento
    if (triggerReceita.orcamento_id) {
       const { data: orcamento, error: orcErr } = await supabase
          .from('orcamentos')
          .select('*')
          .eq('id', triggerReceita.orcamento_id)
          .single();
          
       if (!orcErr && orcamento) {
          const treatments = orcamento.tratamentos || orcamento.treatments || [];
          let modified = false;
          
          for (let t of treatments) {
             if (t.payments) {
                for (let p of t.payments) {
                   if (p.id === triggerReceita.payment_id) {
                       p.status_asaas = isCancel ? 'DELETED' : 'RECEIVED';
                       p.isPaid = !isCancel;
                       p.status = isCancel ? 'Cancelado' : 'Pago';
                       modified = true;
                   }
                }
             }
          }
          
          if (modified) {
             await supabase.from('orcamentos').update({ tratamentos: treatments }).eq('id', orcamento.id);
          }
       }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})
