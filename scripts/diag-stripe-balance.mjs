import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });

const key = process.env.STRIPE_SECRET_KEY;
const auth = { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') };
const get = async (path, acct) => {
  const r = await fetch('https://api.stripe.com/v1/' + path, { headers: { ...auth, ...(acct ? { 'Stripe-Account': acct } : {}) } });
  return r.json();
};
const fmt = (ts) => ts ? new Date(ts * 1000).toISOString().slice(0, 10) : '-';

const accts = await get('accounts?limit=20');
const emps = (accts.data || []).map(a => ({ id: a.metadata?.empresa_id || a.email, stripe_account_id: a.id }));
console.log('CONTAS CONECTADAS:', emps);

const platformBal = await get('balance');
console.log('\n=== PLATAFORMA balance ===', JSON.stringify({ available: platformBal.available, pending: platformBal.pending }));

for (const e of emps) {
  const acct = e.stripe_account_id;
  const a = await get('accounts/' + acct);
  console.log(`\n=== CONTA ${acct} (empresa ${e.id}) ===`);
  console.log('charges_enabled:', a.charges_enabled, '| payouts_enabled:', a.payouts_enabled, '| details_submitted:', a.details_submitted);
  console.log('payout schedule:', JSON.stringify(a.settings?.payouts?.schedule));
  console.log('requirements due:', JSON.stringify(a.requirements?.currently_due), '| disabled_reason:', a.requirements?.disabled_reason);
  const bal = await get('balance', acct);
  console.log('balance:', JSON.stringify({ available: bal.available, pending: bal.pending }));
  const bts = await get('balance_transactions?limit=30', acct);
  for (const t of bts.data || []) {
    console.log(`${fmt(t.created)} | ${t.type.padEnd(10)} | ${(t.amount / 100).toFixed(2).padStart(9)} | net ${(t.net / 100).toFixed(2).padStart(9)} | status ${t.status.padEnd(9)} | available_on ${fmt(t.available_on)}`);
  }
  const pos = await get('payouts?limit=10', acct);
  for (const p of pos.data || []) console.log(`PAYOUT ${fmt(p.created)} ${(p.amount / 100).toFixed(2)} ${p.status} arrival ${fmt(p.arrival_date)} auto=${p.automatic}`);
}
