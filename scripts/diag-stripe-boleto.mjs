import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data: receitas, error } = await supabase
  .from('receitas')
  .select('id, payment_id, orcamento_id, tratamento_id, stripe_payment_intent_id, stripe_status, status_asaas, is_paga, created_at')
  .not('stripe_payment_intent_id', 'is', null)
  .order('created_at', { ascending: false })
  .limit(5);
console.log('RECEITAS STRIPE:', error || receitas);

// Testa se a coluna "treatments" existe em orcamentos
const probe = await supabase.from('orcamentos').select('treatments').limit(1);
console.log('PROBE orcamentos.treatments:', probe.error ? probe.error.message : 'coluna existe');

if (receitas?.[0]?.orcamento_id) {
  const r = receitas[0];
  const { data: orc } = await supabase.from('orcamentos').select('id, tratamentos').eq('id', r.orcamento_id).single();
  for (const t of orc?.tratamentos || []) {
    for (const p of t.payments || []) {
      if (p.method === 'Boleto') console.log('PAYMENT JSON:', t.id, { id: p.id, status: p.status, status_asaas: p.status_asaas, isPaid: p.isPaid, match: p.id === r.payment_id });
    }
  }
}
