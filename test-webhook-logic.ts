import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // we use anon key for now, or if service role is needed

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
  console.log("Fetching recent receitas...");
  const { data: receitas, error: rErr } = await supabase
    .from('receitas')
    .select('id, stripe_payment_intent_id, stripe_status, is_paga')
    .order('created_at', { ascending: false })
    .limit(5);

  if (rErr) {
    console.error("Error fetching receitas:", rErr);
    return;
  }
  
  console.log(receitas);
  return;
  console.log("Found receita:", receita.id);
  console.log("  tratamento_id:", receita.tratamento_id);
  console.log("  payment_id:", receita.payment_id);
  console.log("  orcamento_id:", receita.orcamento_id);

  console.log("Fetching orcamento...");
  const { data: orcamento, error: oErr } = await supabase
    .from('orcamentos')
    .select('*')
    .eq('id', receita.orcamento_id)
    .single();

  if (oErr || !orcamento) {
    console.error("Error fetching orcamento:", oErr);
    return;
  }

  const treatments = orcamento.tratamentos || orcamento.treatments || [];
  let modified = false;

  for (let t of treatments) {
    console.log(`Checking treatment: ${t.id} === ${receita.tratamento_id}`);
    if (t.id === receita.tratamento_id && t.payments) {
      for (let p of t.payments) {
        console.log(`  Checking payment: ${p.id} === ${receita.payment_id}`);
        if (p.id === receita.payment_id) {
          console.log("  Match found! Modifying...");
          p.status_asaas = 'RECEIVED';
          modified = true;
        }
      }
    }
  }

  console.log("Modified?", modified);
  if (modified) {
    console.log("Updating orcamento...");
    const { error: updErr } = await supabase
        .from('orcamentos')
        .update({ tratamentos: treatments, treatments: treatments })
        .eq('id', orcamento.id);
    if (updErr) {
        console.error("Error updating orcamento:", updErr);
    } else {
        console.log("Orcamento updated successfully!");
    }
  }
}

runTest();
